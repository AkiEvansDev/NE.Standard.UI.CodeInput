// A Markdown document as HTML. Every character is escaped on its way out and an address is kept only where the framework's one
// address rule takes it, so the markup is whatever the document says and nothing it could smuggle in.

import type { Urls } from "ne-standard-ui";
import type { MarkdownNames } from "./code-editor-dom.ts";
import { CoreNames, MarkdownRootClass } from "./code-editor-dom.ts";
import { escapeHtml } from "./highlighter.ts";
import type { Block, ListItem, TableAlignment } from "./markdown-blocks.ts";
import { parseMarkdown } from "./markdown-blocks.ts";
import type { Inline, LinkTarget } from "./markdown-inlines.ts";
import { parseInlines } from "./markdown-inlines.ts";

/** Highlights a code block's text as the language its info string names, as HTML; null leaves it plain. */
export type CodeHighlighter = (text: string, info: string) => string | null;

const ClassName = MarkdownRootClass;

/** The framework's address rule, as the plugin surface hands it over: a link's and a picture's, and whether a link leaves the page. */
export type MarkdownUrls = Pick<Urls, "isSafeLink" | "isExternalLink" | "isImageSource" | "asBrowserReads">;

/** What every block of one document is drawn against: its link references, the highlighter, and the framework's names and addresses. */
type Rendering = {
    readonly references: ReadonlyMap<string, LinkTarget>;
    readonly highlight: CodeHighlighter;
    readonly names: MarkdownNames;
    readonly urls: MarkdownUrls;
};

export function renderMarkdown(source: string, highlight: CodeHighlighter, names: MarkdownNames, urls: MarkdownUrls): string {
    const document = parseMarkdown(source);

    return renderBlocks(document.blocks, { references: document.references, highlight, names, urls }, false);
}

function renderBlocks(blocks: readonly Block[], rendering: Rendering, tight: boolean): string {
    let html = "";

    for (const block of blocks)
        html += renderBlock(block, rendering, tight);

    return html;
}

function renderBlock(block: Block, rendering: Rendering, tight: boolean): string {
    const { references, highlight } = rendering;
    const line = sourceLine(block.line, rendering);

    switch (block.type) {
        case "paragraph": {
            const content = renderInline(parseInlines(block.text, references), rendering);

            // A tight list's item holds its text bare, as the reader would space it by hand; the item carries the line.
            return tight ? content : `<p${line}>${content}</p>`;
        }
        case "heading":
            return `<h${block.level}${line}>${renderInline(parseInlines(block.text, references), rendering)}</h${block.level}>`;
        case "code": {
            const info = block.info.split(/\s+/, 1)[0];
            const highlighted = info.length > 0 ? highlight(block.text, info) : null;
            const language = info.length > 0 ? ` data-language="${escapeHtml(info)}"` : "";

            return `<pre class="${ClassName}__code"${language}${line}><code>${highlighted ?? escapeHtml(block.text)}</code></pre>`;
        }
        case "quote":
            return `<blockquote${line}>${renderBlocks(block.children, rendering, false)}</blockquote>`;
        case "list":
            return renderList(block.ordered, block.start, block.tight, block.items, rendering);
        case "table":
            return renderTable(block.line, block.alignments, block.head, block.rows, rendering);
        case "rule":
            return `<hr${line}>`;
    }
}

// The framework's scroll-group contract: a block says which source line it was drawn from, so an editor of the source scrolls level with it.
function sourceLine(line: number, rendering: Rendering): string {
    return ` ${rendering.names.sourceLine}="${line}"`;
}

function renderList(ordered: boolean, start: number, tight: boolean, items: readonly ListItem[], rendering: Rendering): string {
    const tag = ordered ? "ol" : "ul";
    const from = ordered && start !== 1 ? ` start="${start}"` : "";
    const tasks = items.some(item => item.checked !== null) ? ` class="${ClassName}__tasks"` : "";
    let html = `<${tag}${from}${tasks}>`;

    for (const item of items) {
        const content = renderBlocks(item.children, rendering, tight);

        if (item.checked === null) {
            html += `<li${sourceLine(item.line, rendering)}>${content}</li>`;
            continue;
        }

        // Read-only, not disabled, which would grey the state out; the framework refuses a click that reaches it.
        const checked = item.checked ? " checked" : "";
        const box = `${CoreNames.checkboxClass} ${CoreNames.smallInputClass} ${rendering.names.readOnlyClass} ${ClassName}__check`;

        html += `<li class="${ClassName}__task"${sourceLine(item.line, rendering)}><span class="${box}"><input class="${CoreNames.checkboxInputClass}" type="checkbox" tabindex="-1" aria-readonly="true"${checked}><span class="${CoreNames.checkboxBoxClass}"></span></span>${content}</li>`;
    }

    return `${html}</${tag}>`;
}

function renderTable(line: number, alignments: readonly TableAlignment[], head: readonly string[], rows: readonly (readonly string[])[], rendering: Rendering): string {
    const cell = (tag: string, text: string, column: number): string => {
        const alignment = alignments[column];
        const align = alignment === null || alignment === undefined ? "" : ` class="${ClassName}__cell--${alignment}"`;

        return `<${tag}${align}>${renderInline(parseInlines(text, rendering.references), rendering)}</${tag}>`;
    };

    let html = `<div class="${ClassName}__table"${sourceLine(line, rendering)}><table>`;

    // A head with no words is a key/value table's: its empty cells would draw a bare strip over the rows.
    if (head.some(text => text !== "")) {
        html += "<thead><tr>";

        for (const [column, text] of head.entries())
            html += cell("th", text, column);

        html += "</tr></thead>";
    }

    if (rows.length > 0) {
        html += "<tbody>";

        for (const row of rows) {
            html += "<tr>";

            for (const [column, text] of row.entries())
                html += cell("td", text, column);

            html += "</tr>";
        }

        html += "</tbody>";
    }

    return `${html}</table></div>`;
}

function renderInline(parent: Inline, rendering: Rendering): string {
    let html = "";

    for (let node = parent.firstChild; node !== null; node = node.next) {
        switch (node.type) {
            case "text":
                html += escapeHtml(node.literal);
                break;
            case "entity":
                // Checked by the parser to be one entity and nothing else, so it is written as the reader wrote it.
                html += node.literal;
                break;
            case "code":
                html += `<code>${escapeHtml(node.literal)}</code>`;
                break;
            case "emphasis":
                html += `<em>${renderInline(node, rendering)}</em>`;
                break;
            case "strong":
                html += `<strong>${renderInline(node, rendering)}</strong>`;
                break;
            case "strikethrough":
                html += `<del>${renderInline(node, rendering)}</del>`;
                break;
            case "link":
                html += renderLink(node, rendering);
                break;
            case "image":
                html += renderImage(node, rendering);
                break;
            case "hardbreak":
                html += "<br>";
                break;
            case "softbreak":
                html += "\n";
                break;
            default:
                html += renderInline(node, rendering);
                break;
        }
    }

    return html;
}

function renderLink(node: Inline, rendering: Rendering): string {
    const content = renderInline(node, rendering);
    const href = node.href.trim();

    if (!rendering.urls.isSafeLink(href))
        return content;

    const title = node.title.length > 0 ? ` title="${escapeHtml(node.title)}"` : "";
    // An address off the page — a web, mail or phone address, or another host as the browser reads it — opens beside it rather than
    // in place of the application, as the framework's own links do.
    const external = rendering.urls.isExternalLink(href) ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "";

    return `<a href="${escapeHtml(href)}"${title}${external}>${content}</a>`;
}

function renderImage(node: Inline, rendering: Rendering): string {
    const alt = escapeHtml(plainText(node));

    if (!rendering.urls.isImageSource(node.href))
        return alt;

    // Written as the browser reads it, as the framework writes a picture it takes.
    const src = rendering.urls.asBrowserReads(node.href);

    const title = node.title.length > 0 ? ` title="${escapeHtml(node.title)}"` : "";

    return `<img src="${escapeHtml(src)}" alt="${alt}"${title} loading="lazy">`;
}

/** An image's description is its words alone, whatever markup they carried. */
function plainText(parent: Inline): string {
    let text = "";

    for (let node = parent.firstChild; node !== null; node = node.next) {
        if (node.type === "text" || node.type === "code" || node.type === "entity")
            text += node.literal;
        else if (node.type === "softbreak" || node.type === "hardbreak")
            text += " ";
        else
            text += plainText(node);
    }

    return text;
}
