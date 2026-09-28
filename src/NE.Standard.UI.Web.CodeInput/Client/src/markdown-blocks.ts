// A Markdown document's blocks: CommonMark's headings, paragraphs, rules, quotes, lists and code blocks, GitHub's tables and task
// items, and link reference definitions. HTML blocks are not markup here — their lines are a paragraph's text — and inline text is
// left unparsed for the inline pass.

import type { LinkTarget } from "./markdown-inlines.ts";
import { normalizeLabel, unescape } from "./markdown-inlines.ts";
import type { FenceOpening } from "./markdown-syntax.ts";
import { closesFence, MaxNesting, openFence, QuoteMarker, TableDelimiter, ThematicBreak } from "./markdown-syntax.ts";

export type TableAlignment = "left" | "center" | "right" | null;

export type ListItem = {
    /** The source line the item starts on, from 1. */
    readonly line: number;
    /** A task item's box: checked or not; null for an ordinary item. */
    readonly checked: boolean | null;
    readonly children: readonly Block[];
};

/** A block, with the source line it starts on, from 1 — what a scroll group keeps the source's editor level with. */
export type Block = { readonly line: number } & (
    | { readonly type: "paragraph"; readonly text: string }
    | { readonly type: "heading"; readonly level: number; readonly text: string }
    | { readonly type: "code"; readonly info: string; readonly text: string }
    | { readonly type: "quote"; readonly children: readonly Block[] }
    | { readonly type: "list"; readonly ordered: boolean; readonly start: number; readonly tight: boolean; readonly items: readonly ListItem[] }
    | { readonly type: "table"; readonly alignments: readonly TableAlignment[]; readonly head: readonly string[]; readonly rows: readonly (readonly string[])[] }
    | { readonly type: "rule" }
);

export type MarkdownDocument = {
    readonly blocks: readonly Block[];
    readonly references: ReadonlyMap<string, LinkTarget>;
};

const AtxHeading = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const ListStart = /^( {0,3})(?:([-*+])|(\d{1,9})([.)]))([ \t]+|$)/;
const SetextUnderline = /^ {0,3}(=+|-+)[ \t]*$/;
const TaskBox = /^\[([ xX])\](?:[ \t]+|$)/;
const ReferenceDefinition = /^ {0,3}\[((?:[^\]\\]|\\.){1,999})\]:[ \t]*(<[^>\n]*>|\S+)(?:[ \t]+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^()\\]|\\.)*\)))?[ \t]*$/;

/** Reads a document's blocks and the reference definitions among them. */
export function parseMarkdown(source: string): MarkdownDocument {
    const references = new Map<string, LinkTarget>();
    const lines = source.replace(/\r\n?/g, "\n").split("\n").map(expandTabs);

    return { blocks: parseLines(lines, 1, references, null, 0), references };
}

/** Leading tabs as spaces to the next stop of four, so every indentation below is counted in columns. */
function expandTabs(line: string): string {
    if (!line.includes("\t"))
        return line;

    let result = "";
    let i = 0;

    for (; i < line.length && (line.charAt(i) === " " || line.charAt(i) === "\t"); i++)
        result += line.charAt(i) === " " ? " " : " ".repeat(4 - result.length % 4);

    return result + line.slice(i);
}

type Layout = {
    /** A blank line stood between two of the blocks read, which makes the list item holding them loose. */
    separated: boolean;
};

/** Reads `lines`, the first of which is source line `firstLine`: a quote's and an item's lines are the source's one for one. */
function parseLines(lines: readonly string[], firstLine: number, references: Map<string, LinkTarget>, layout: Layout | null, depth: number): Block[] {
    const blocks: Block[] = [];
    let blankBefore = false;
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (isBlank(line)) {
            blankBefore = blocks.length > 0;
            i++;
            continue;
        }

        if (blankBefore && layout !== null)
            layout.separated = true;

        blankBefore = false;

        i = readBlock(lines, i, firstLine, references, blocks, depth);
    }

    return blocks;
}

/** Reads the block starting at line `start` into `blocks` and returns the line after it. */
function readBlock(lines: readonly string[], start: number, firstLine: number, references: Map<string, LinkTarget>, blocks: Block[], depth: number): number {
    const line = lines[start];
    const at = firstLine + start;

    if (indentOf(line) >= 4)
        return readIndentedCode(lines, start, at, blocks);

    const fence = openFence(line);

    if (fence !== null)
        return readFencedCode(lines, start, at, fence, blocks);

    const heading = AtxHeading.exec(line);

    if (heading !== null) {
        blocks.push({ line: at, type: "heading", level: heading[1].length, text: (heading[2] ?? "").trim() });

        return start + 1;
    }

    if (ThematicBreak.test(line)) {
        blocks.push({ line: at, type: "rule" });

        return start + 1;
    }

    // Past the deepest nesting a document can mean, a quote or a list marker is text: each level is a recursion, and a line of
    // thousands of markers ran the stack out.
    const nests = depth < MaxNesting;

    if (nests && QuoteMarker.test(line))
        return readQuote(lines, start, at, references, blocks, depth);

    const marker = nests ? ListStart.exec(line) : null;

    if (marker !== null)
        return readList(lines, start, at, marker, references, blocks, depth);

    if (isTableStart(lines, start))
        return readTable(lines, start, at, blocks);

    return readParagraph(lines, start, at, references, blocks);
}

function readIndentedCode(lines: readonly string[], start: number, at: number, blocks: Block[]): number {
    let end = start;

    while (end < lines.length && (isBlank(lines[end]) || indentOf(lines[end]) >= 4))
        end++;

    // Blank lines after the last indented one belong to whatever follows.
    let last = end;

    while (last > start && isBlank(lines[last - 1]))
        last--;

    blocks.push({ line: at, type: "code", info: "", text: lines.slice(start, last).map(line => line.slice(Math.min(4, indentOf(line)))).join("\n") });

    return last;
}

function readFencedCode(lines: readonly string[], start: number, at: number, fence: FenceOpening, blocks: Block[]): number {
    const indent = fence.indent;
    const marker = fence.marker;
    const content: string[] = [];
    let i = start + 1;

    for (; i < lines.length; i++) {
        if (closesFence(lines[i], marker)) {
            i++;
            break;
        }

        // The fence's own indentation is taken off each line inside it, no more.
        content.push(lines[i].slice(Math.min(indent, indentOf(lines[i]))));
    }

    blocks.push({ line: at, type: "code", info: unescape(fence.info.trim()), text: content.join("\n") });

    return i;
}

/** A quote: its lines less their markers, and the lazy lines that carry on its last paragraph without one. */
function readQuote(lines: readonly string[], start: number, at: number, references: Map<string, LinkTarget>, blocks: Block[], depth: number): number {
    const inner: string[] = [];
    // Whether the lines so far end in an open paragraph: kept while marked lines carry the paragraph on, read again otherwise.
    let lazy: boolean | null = null;
    let i = start;

    for (; i < lines.length; i++) {
        const line = lines[i];
        const marker = QuoteMarker.exec(line);

        if (marker !== null) {
            const text = line.slice(marker[0].length);

            inner.push(text);
            lazy = lazy === true && carriesParagraph(text) ? true : null;
            continue;
        }

        if (isBlank(line) || interruptsParagraph(line) || startsNonEmptyListItem(line))
            break;

        lazy ??= endsInOpenParagraph(inner, depth + 1);

        if (!lazy)
            break;

        inner.push(line);
    }

    blocks.push({ line: at, type: "quote", children: parseLines(inner, at, references, null, depth + 1) });

    return i;
}

/**
 * Whether lines at nesting `depth` end in a paragraph a lazy line may carry on — CommonMark's only lazy continuation: not after a
 * blank line, a fence open or closed, a heading, a rule or a table, and into a nested quote's paragraph as into one's own.
 */
function endsInOpenParagraph(lines: readonly string[], depth: number): boolean {
    // Read off the lines' shapes rather than a trial parse: a trial would run per lazy line at every level a quote nests, one
    // inside another.
    const last = lines.at(-1);

    if (last === undefined || isBlank(last) || endsInFence(lines))
        return false;

    // The nested quote the last line stands in answers for it, by its own lines less one marker each.
    if (depth < MaxNesting && QuoteMarker.test(last)) {
        let first = lines.length - 1;

        while (first > 0 && QuoteMarker.test(lines[first - 1]))
            first--;

        return endsInOpenParagraph(lines.slice(first).map(line => line.replace(QuoteMarker, "")), depth + 1);
    }

    if (endsInTable(lines) || (lines.length > 1 && !isBlank(lines[lines.length - 2]) && SetextUnderline.test(last)))
        return false;

    // A list item's own first line: what follows its markers is its block.
    let content = last;

    for (let marker = ListStart.exec(content); marker !== null && content.length > 0; marker = ListStart.exec(content))
        content = content.slice(marker[0].length);

    return !AtxHeading.test(content) && !ThematicBreak.test(content) && openFence(content) === null;
}

/** Whether the lines end inside a fence, or on the line that closes one. */
function endsInFence(lines: readonly string[]): boolean {
    let fence: string | null = null;
    let closed = false;

    for (const line of lines) {
        closed = false;

        if (fence === null)
            fence = openFence(line)?.marker ?? null;
        else if (closesFence(line, fence)) {
            fence = null;
            closed = true;
        }
    }

    return fence !== null || closed;
}

/** Whether the lines' last run, up from the last blank line or block that cuts a paragraph, holds a table's start: rows run to its end. */
function endsInTable(lines: readonly string[]): boolean {
    for (let i = lines.length - 1; i >= 0 && !isBlank(lines[i]); i--) {
        if (isTableStart(lines, i))
            return true;

        if (interruptsParagraph(lines[i]))
            return false;
    }

    return false;
}

function readList(lines: readonly string[], start: number, at: number, first: RegExpExecArray, references: Map<string, LinkTarget>, blocks: Block[], depth: number): number {
    const ordered = first[3] !== undefined;
    const delimiter = ordered ? first[4] : first[2];
    const items: ListItem[] = [];
    let tight = true;
    let i = start;

    while (i < lines.length) {
        const marker = ListStart.exec(lines[i]);

        if (marker === null || ThematicBreak.test(lines[i]) || (marker[3] !== undefined) !== ordered || (ordered ? marker[4] : marker[2]) !== delimiter)
            break;

        const markerEnd = marker[1].length + (ordered ? marker[3].length + 1 : 1);
        const spaces = marker[5].length;
        // Five spaces or more after the marker open an indented code block one space in; none at all leaves the item empty on its line.
        const contentIndent = markerEnd + (spaces === 0 || spaces > 4 ? 1 : spaces);
        const itemLine = at + (i - start);
        const itemLines = [lines[i].slice(Math.min(contentIndent, lines[i].length))];
        let lazy: boolean | null = null;

        i++;

        while (i < lines.length) {
            const line = lines[i];

            if (isBlank(line)) {
                itemLines.push("");
                lazy = null;
                i++;
                continue;
            }

            if (indentOf(line) >= contentIndent) {
                const text = line.slice(contentIndent);

                itemLines.push(text);
                lazy = lazy === true && carriesParagraph(text) ? true : null;
                i++;
                continue;
            }

            // A lazy line carries on the item's paragraph when nothing else could start on it.
            if (!interruptsParagraph(line) && !ListStart.test(line) && (lazy ??= endsInOpenParagraph(itemLines, depth + 1))) {
                itemLines.push(line.trimStart());
                i++;
                continue;
            }

            break;
        }

        // Blank lines at the item's end are between it and what follows: they loosen the list only when another item follows them.
        let trailing = 0;

        while (itemLines.length > 1 && isBlank(itemLines[itemLines.length - 1])) {
            itemLines.pop();
            trailing++;
        }

        const layout: Layout = { separated: false };

        items.push(readItem(itemLines, itemLine, references, depth + 1, layout));

        if (layout.separated)
            tight = false;

        const following = ListStart.exec(lines[i] ?? "");
        const continues = following !== null && !ThematicBreak.test(lines[i]) && (following[3] !== undefined) === ordered && (ordered ? following[4] : following[2]) === delimiter;

        if (trailing > 0) {
            if (continues)
                tight = false;
            else {
                i -= trailing;
                break;
            }
        }
    }

    blocks.push({ line: at, type: "list", ordered, start: ordered ? Number.parseInt(first[3], 10) : 1, tight, items });

    return i;
}

function readItem(itemLines: string[], line: number, references: Map<string, LinkTarget>, depth: number, layout: Layout): ListItem {
    const task = TaskBox.exec(itemLines[0]);
    let checked: boolean | null = null;

    if (task !== null && itemLines[0].length > task[0].length) {
        checked = task[1] !== " ";
        itemLines[0] = itemLines[0].slice(task[0].length);
    }

    const children = parseLines(itemLines, line, references, layout, depth);

    return { line, checked, children };
}

function isTableStart(lines: readonly string[], start: number): boolean {
    const delimiter = lines[start + 1];

    return lines[start].includes("|") && delimiter !== undefined && delimiter.includes("-") && TableDelimiter.test(delimiter) && splitRow(lines[start]).length === splitRow(delimiter).length;
}

/** A table: its head, its alignments and the rows under them, each cut to the head's width. */
function readTable(lines: readonly string[], start: number, at: number, blocks: Block[]): number {
    const head = splitRow(lines[start]);
    const alignments = splitRow(lines[start + 1]).map(alignmentOf);
    const rows: string[][] = [];
    let i = start + 2;

    for (; i < lines.length && !isBlank(lines[i]) && !interruptsParagraph(lines[i]); i++) {
        const cells = splitRow(lines[i]);

        rows.push(head.map((_, column) => cells[column] ?? ""));
    }

    blocks.push({ line: at, type: "table", alignments, head, rows });

    return i;
}

function alignmentOf(cell: string): TableAlignment {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");

    return left && right ? "center" : right ? "right" : left ? "left" : null;
}

/** A row's cells, split at the pipes not escaped, less the pipes that open and close it. */
function splitRow(line: string): string[] {
    let text = line.trim();

    if (text.startsWith("|"))
        text = text.slice(1);

    if (text.endsWith("|") && !text.endsWith("\\|"))
        text = text.slice(0, -1);

    const cells: string[] = [];
    let cell = "";

    for (let i = 0; i < text.length; i++) {
        const character = text.charAt(i);

        if (character === "\\" && text.charAt(i + 1) === "|") {
            cell += "|";
            i++;
        }
        else if (character === "|") {
            cells.push(cell.trim());
            cell = "";
        }
        else
            cell += character;
    }

    cells.push(cell.trim());

    return cells;
}

/** A paragraph up to a blank line or a block that may interrupt one; a setext underline makes it a heading, a definition a reference. */
function readParagraph(lines: readonly string[], start: number, at: number, references: Map<string, LinkTarget>, blocks: Block[]): number {
    // Only the leading spaces go: two trailing ones before a line break make it a hard break.
    const collected = [lines[start].trimStart()];
    let i = start + 1;

    for (; i < lines.length; i++) {
        const line = lines[i];
        const underline = SetextUnderline.exec(line);

        if (underline !== null && !onlyDefinitions(collected)) {
            blocks.push({ line: at, type: "heading", level: underline[1].startsWith("=") ? 1 : 2, text: collected.join("\n").trim() });

            return i + 1;
        }

        if (isBlank(line) || interruptsParagraph(line) || startsNonEmptyListItem(line) || isTableStart(lines, i))
            break;

        collected.push(line.trimStart());
    }

    const text = takeDefinitions(collected, references);

    if (text.length > 0)
        blocks.push({ line: at, type: "paragraph", text });

    return i;
}

/** Takes the reference definitions a paragraph opens with into `references`, the first definition of a label winning; returns the rest. */
function takeDefinitions(collected: readonly string[], references: Map<string, LinkTarget>): string {
    let first = 0;

    for (; first < collected.length; first++) {
        const definition = ReferenceDefinition.exec(collected[first].trimEnd());

        if (definition === null)
            break;

        const label = normalizeLabel(definition[1]);
        const destination = definition[2].startsWith("<") ? definition[2].slice(1, -1) : definition[2];

        if (label.length > 0 && !references.has(label))
            references.set(label, { href: unescape(destination), title: definition[3] === undefined ? "" : unescape(definition[3].slice(1, -1)) });
    }

    return collected.slice(first).join("\n").trimEnd();
}

function onlyDefinitions(collected: readonly string[]): boolean {
    return collected.every(line => ReferenceDefinition.test(line.trimEnd()));
}

/** What may cut a paragraph short: a heading, a fence, a rule or a quote. List items are judged apart, since only some may. */
function interruptsParagraph(line: string): boolean {
    return AtxHeading.test(line) || ThematicBreak.test(line) || QuoteMarker.test(line) || openFence(line) !== null;
}

/** Whether a line carries an open paragraph on rather than ending it or turning it into a heading or a table's head. */
function carriesParagraph(line: string): boolean {
    return !isBlank(line) && !interruptsParagraph(line) && !startsNonEmptyListItem(line) && !SetextUnderline.test(line) && !TableDelimiter.test(line);
}

/** A list item may interrupt a paragraph when it has text, and an ordered one only when it counts from one. */
function startsNonEmptyListItem(line: string): boolean {
    const marker = ListStart.exec(line);

    return marker !== null && marker[5].length > 0 && !isBlank(line.slice(marker[0].length)) && (marker[3] === undefined || marker[3] === "1");
}

function isBlank(line: string): boolean {
    return line.trim().length === 0;
}

function indentOf(line: string): number {
    let indent = 0;

    while (line.charAt(indent) === " ")
        indent++;

    return indent;
}
