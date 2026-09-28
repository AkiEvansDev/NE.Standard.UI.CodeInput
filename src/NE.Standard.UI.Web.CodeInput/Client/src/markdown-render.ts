// A Markdown document as HTML. Every character is escaped on its way out and an address is kept only for a scheme a reader can
// safely follow, so the markup is whatever the document says and nothing it could smuggle in.

import { escapeHtml } from "./highlighter.ts";
import type { Block, ListItem, TableAlignment } from "./markdown-blocks.ts";
import { parseMarkdown } from "./markdown-blocks.ts";
import type { Inline, LinkTarget } from "./markdown-inlines.ts";
import { parseInlines } from "./markdown-inlines.ts";

/** Highlights a code block's text as the language its info string names, as HTML; null leaves it plain. */
export type CodeHighlighter = (text: string, info: string) => string | null;

const ClassName = "ui-markdown";
// The framework's scroll-group contract: a block says which source line it was drawn from, so an editor of the source scrolls level with it.
const SourceLineAttribute = "data-ui-source-line";

export function renderMarkdown(source: string, highlight: CodeHighlighter): string {
    const document = parseMarkdown(source);

    return renderBlocks(document.blocks, document.references, highlight, false);
}

function renderBlocks(blocks: readonly Block[], references: ReadonlyMap<string, LinkTarget>, highlight: CodeHighlighter, tight: boolean): string {
    let html = "";

    for (const block of blocks)
        html += renderBlock(block, references, highlight, tight);

    return html;
}

function renderBlock(block: Block, references: ReadonlyMap<string, LinkTarget>, highlight: CodeHighlighter, tight: boolean): string {
    const line = sourceLine(block.line);

    switch (block.type) {
        case "paragraph": {
            const content = renderInline(parseInlines(block.text, references));

            // A tight list's item holds its text bare, as the reader would space it by hand; the item carries the line.
            return tight ? content : `<p${line}>${content}</p>`;
        }
        case "heading":
            return `<h${block.level}${line}>${renderInline(parseInlines(block.text, references))}</h${block.level}>`;
        case "code": {
            const info = block.info.split(/\s+/, 1)[0];
            const highlighted = info.length > 0 ? highlight(block.text, info) : null;
            const language = info.length > 0 ? ` data-language="${escapeHtml(info)}"` : "";

            return `<pre class="${ClassName}__code"${language}${line}><code>${highlighted ?? escapeHtml(block.text)}</code></pre>`;
        }
        case "quote":
            return `<blockquote${line}>${renderBlocks(block.children, references, highlight, false)}</blockquote>`;
        case "list":
            return renderList(block.ordered, block.start, block.tight, block.items, references, highlight);
        case "table":
            return renderTable(block.line, block.alignments, block.head, block.rows, references);
        case "rule":
            return `<hr${line}>`;
    }
}

function sourceLine(line: number): string {
    return ` ${SourceLineAttribute}="${line}"`;
}

function renderList(ordered: boolean, start: number, tight: boolean, items: readonly ListItem[], references: ReadonlyMap<string, LinkTarget>, highlight: CodeHighlighter): string {
    const tag = ordered ? "ol" : "ul";
    const from = ordered && start !== 1 ? ` start="${start}"` : "";
    const tasks = items.some(item => item.checked !== null) ? ` class="${ClassName}__tasks"` : "";
    let html = `<${tag}${from}${tasks}>`;

    for (const item of items) {
        const content = renderBlocks(item.children, references, highlight, tight);

        if (item.checked === null) {
            html += `<li${sourceLine(item.line)}>${content}</li>`;
            continue;
        }

        // The framework's own checkbox, drawn by hand and out of reach — not disabled, which would grey it out; the reader sees the
        // state, but the document is not a form.
        const checked = item.checked ? " checked" : "";

        html += `<li class="${ClassName}__task"${sourceLine(item.line)}><span class="ui-checkbox ui-input--small ${ClassName}__check"><input class="ui-checkbox__input" type="checkbox" tabindex="-1" aria-readonly="true"${checked}><span class="ui-checkbox__box"></span></span>${content}</li>`;
    }

    return `${html}</${tag}>`;
}

function renderTable(line: number, alignments: readonly TableAlignment[], head: readonly string[], rows: readonly (readonly string[])[], references: ReadonlyMap<string, LinkTarget>): string {
    const cell = (tag: string, text: string, column: number): string => {
        const alignment = alignments[column];
        const align = alignment === null || alignment === undefined ? "" : ` class="${ClassName}__cell--${alignment}"`;

        return `<${tag}${align}>${renderInline(parseInlines(text, references))}</${tag}>`;
    };

    let html = `<div class="${ClassName}__table"${sourceLine(line)}><table><thead><tr>`;

    for (const [column, text] of head.entries())
        html += cell("th", text, column);

    html += "</tr></thead>";

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

function renderInline(parent: Inline): string {
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
                html += `<em>${renderInline(node)}</em>`;
                break;
            case "strong":
                html += `<strong>${renderInline(node)}</strong>`;
                break;
            case "strikethrough":
                html += `<del>${renderInline(node)}</del>`;
                break;
            case "link":
                html += renderLink(node);
                break;
            case "image":
                html += renderImage(node);
                break;
            case "hardbreak":
                html += "<br>";
                break;
            case "softbreak":
                html += "\n";
                break;
            default:
                html += renderInline(node);
                break;
        }
    }

    return html;
}

function renderLink(node: Inline): string {
    const content = renderInline(node);
    const href = safeAddress(node.href, false);

    if (href === null)
        return content;

    const title = node.title.length > 0 ? ` title="${escapeHtml(node.title)}"` : "";
    // An address off the page opens beside it rather than in place of the application. Any http(s) address counts, since a browser
    // reads `http:host` without its slashes as another host too; it also reads a backslash as a slash and drops tabs and breaks
    // inside an address, so `\\host` and `/\host` are other hosts.
    const external = /^(?:https?:|[\\/]{2})/i.test(href.replace(/[\t\n\r]/g, "")) ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "";

    return `<a href="${escapeHtml(href)}"${title}${external}>${content}</a>`;
}

function renderImage(node: Inline): string {
    const alt = escapeHtml(plainText(node));
    const src = safeAddress(node.href, true);

    if (src === null)
        return alt;

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

const SafeSchemes = new Set(["http", "https", "mailto", "tel"]);

/**
 * The address when it's relative or names a safe scheme — never `javascript:` or `vbscript:` even behind stripped spaces or
 * control characters — plus a picture's data address for an image.
 */
export function safeAddress(address: string, image: boolean): string | null {
    // oxlint-disable-next-line no-control-regex -- the control characters are what it strips
    const compact = address.replace(/[\s\x00-\x1f\x7f]/g, "");
    const scheme = /^([A-Za-z][A-Za-z\d+.-]*):/.exec(compact);

    if (scheme === null)
        return address.trim();

    const name = scheme[1].toLowerCase();

    if (SafeSchemes.has(name))
        return address.trim();

    return image && name === "data" && /^data:image\/(?:png|gif|jpe?g|webp|avif|bmp);/i.test(compact) ? compact : null;
}
