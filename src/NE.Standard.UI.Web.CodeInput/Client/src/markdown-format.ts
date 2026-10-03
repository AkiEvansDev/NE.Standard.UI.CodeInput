// The format bar's edits on a Markdown text, off the page: a marker wrapped round each selection or taken off it — inside it or
// just outside — a link made of it, a list marker put on the selected lines or taken off them, and a heading of a chosen level.
// Every action is a toggle, so the bar can say which ones the selection already wears.

import type { Edit, RangeEdit, Selection, SelectionSet } from "./selections.ts";
import { editRanges, isCaret, mapPosition, normalizeSelections, rangeEnd, rangeStart } from "./selections.ts";

export type FormatAction = "bold" | "italic" | "strikethrough" | "code" | "link" | "heading" | "list";

/** What a press makes at once; the heading asks for its level first (`headingEdits`). */
export type EditAction = Exclude<FormatAction, "heading">;

/** The bar's buttons, in the order they stand. */
export const FormatActions: readonly FormatAction[] = ["bold", "italic", "strikethrough", "code", "link", "heading", "list"];

/** A heading's levels, `#` to `######`. */
const HeadingLevels = 6;

export type FormatResult = {
    readonly edits: Edit[];
    readonly after: SelectionSet;
};

/** A run of one character round the text: `*` once for italic, twice for bold, a run of three being both. */
type Emphasis = {
    readonly character: string;
    readonly length: number;
    holds(run: number): boolean;
};

const Emphases: Readonly<Record<"bold" | "italic" | "strikethrough", Emphasis>> = {
    bold: { character: "*", length: 2, holds: run => run >= 2 },
    italic: { character: "*", length: 1, holds: run => run === 1 || run >= 3 },
    strikethrough: { character: "~", length: 2, holds: run => run >= 2 }
};

const Backtick = "`";
const Space = /\s/;
const HeadingMark = /^( {0,3})(#{1,6})(?:[ \t]+|$)/;
const ListMark = /^([ \t]*)(?:[-*+]|\d{1,9}[.)])(?:[ \t]+\[[ xX]\])?(?:[ \t]+|$)/;
const LinkWhole = /^\[([^[\]\n]*)\]\([^()\s]*\)$/;
const LinkTail = /^\]\([^()\s]*\)/;
const Address = /^(?:https?:\/\/|mailto:)\S+$/;

/** The edits an action makes at every range, and the ranges afterwards; null when it changes nothing. */
export function formatEdits(text: string, set: SelectionSet, action: EditAction): FormatResult | null {
    if (action === "list") {
        const lines = markedLines(text, set.ranges, ListMark);
        const off = lines.every(line => line.mark !== null);

        // Off when every line is an item; else a marker on the lines without one, an item's own kept.
        return lineEdits(set, lines, line => off ? "" : line.mark ?? "- ");
    }

    const result = editRanges(set, range => inlineEdit(text, range, action));

    return result.edits.length === 0 ? null : result;
}

/**
 * Makes the lines the ranges touch headings of one level, in place of another level; where every one is that level already, takes
 * the heading off — the checked level chosen again.
 */
export function headingEdits(text: string, set: SelectionSet, level: number): FormatResult | null {
    const lines = markedLines(text, set.ranges, HeadingMark);
    const off = lines.every(line => levelOf(line) === level);

    return lineEdits(set, lines, () => off ? "" : "#".repeat(level) + " ");
}

/** The level every line the primary range touches is a heading of; 0 where one is none or they differ. */
export function headingLevel(text: string, set: SelectionSet): number {
    const range = set.ranges[set.primary];

    if (range === undefined)
        return 0;

    const levels = new Set(markedLines(text, [range], HeadingMark).map(levelOf));

    return levels.size === 1 ? [...levels][0] : 0;
}

/** The heading menu's entries, one per level, the level the lines are checked; none is where they are no one level. */
export function headingChoices(current: number): { readonly level: number; readonly checked: boolean }[] {
    return Array.from({ length: HeadingLevels }, (_, index) => ({ level: index + 1, checked: index + 1 === current }));
}

function levelOf(line: MarkedLine): number {
    return line.mark === null ? 0 : line.mark.trimEnd().length;
}

/** Whether the primary range already wears what an action puts on, so a press would take it off. */
export function isFormatted(text: string, set: SelectionSet, action: FormatAction): boolean {
    const range = set.ranges[set.primary];

    if (range === undefined)
        return false;

    if (action === "heading" || action === "list") {
        const lines = markedLines(text, [range], action === "heading" ? HeadingMark : ListMark);

        return lines.every(line => line.mark !== null);
    }

    return found(text, range, action) !== null;
}

/** What is already there to take off: the span the edit replaces and the text left in its place, which stays selected. */
type Found = {
    readonly from: number;
    readonly to: number;
    readonly inner: string;
};

function inlineEdit(text: string, range: Selection, action: Exclude<FormatAction, "heading" | "list">): RangeEdit | null {
    const present = found(text, range, action);

    if (present !== null) {
        // A caret between an empty pair stays where the pair was; a selection keeps the text the marks stood round.
        if (isCaret(range))
            return { from: present.from, to: present.to, text: "", caret: 0 };

        return selecting(range, present.from, present.to, present.inner, 0, present.inner.length);
    }

    if (isCaret(range))
        return emptyPair(range.head, action);

    const { from, to } = trimmed(text, range);

    if (from === to)
        return null;

    const inner = text.slice(from, to);

    if (action === "link")
        return linkEdit(from, to, inner);

    const { open, close } = action === "code" ? codeFence(inner) : { open: marker(action), close: marker(action) };

    return selecting(range, from, to, open + inner + close, open.length, open.length + inner.length);
}

/** An edit that leaves the range selecting `[start, end)` of its text, in the direction the range ran. */
function selecting(range: Selection, from: number, to: number, text: string, start: number, end: number): RangeEdit {
    const forward = range.anchor <= range.head;

    return { from, to, text, caret: forward ? end : start, anchor: forward ? start : end };
}

/** The pair a caret alone writes, the caret between; a link's caret stands where its words go. */
function emptyPair(position: number, action: Exclude<FormatAction, "heading" | "list">): RangeEdit {
    if (action === "link")
        return { from: position, to: position, text: "[]()", caret: 1 };

    const mark = action === "code" ? Backtick : marker(action);

    return { from: position, to: position, text: mark + mark, caret: mark.length };
}

function marker(action: "bold" | "italic" | "strikethrough"): string {
    const emphasis = Emphases[action];

    return emphasis.character.repeat(emphasis.length);
}

/**
 * The words a link is made of become its text, the caret left between the parentheses for the address; an address selected becomes
 * the address, the caret left where the words go.
 */
function linkEdit(from: number, to: number, inner: string): RangeEdit {
    if (Address.test(inner))
        return { from, to, text: `[](${inner})`, caret: 1 };

    return { from, to, text: `[${inner}]()`, caret: inner.length + 3 };
}

/**
 * A code span's fence: a run of backticks longer than any inside, and a space within it where the text begins or ends with one,
 * as CommonMark reads a span; one backtick round text with none.
 */
function codeFence(inner: string): { readonly open: string; readonly close: string } {
    let longest = 0;
    let run = 0;

    for (const character of inner) {
        run = character === Backtick ? run + 1 : 0;
        longest = Math.max(longest, run);
    }

    const fence = Backtick.repeat(longest + 1);
    const pad = inner.startsWith(Backtick) || inner.endsWith(Backtick) ? " " : "";

    return { open: fence + pad, close: pad + fence };
}

/**
 * The range less the white space at its ends — a double click takes the space after a word, and `**word **` is no emphasis — or, for a
 * caret, the caret itself.
 */
function trimmed(text: string, range: Selection): { readonly from: number; readonly to: number } {
    let from = rangeStart(range);
    let to = rangeEnd(range);

    while (from < to && Space.test(text[from]))
        from++;

    while (to > from && Space.test(text[to - 1]))
        to--;

    return { from, to };
}

/** What an action would take off at a range: the marks inside its ends or just outside them, or an empty pair round a caret. */
function found(text: string, range: Selection, action: Exclude<FormatAction, "heading" | "list">): Found | null {
    if (isCaret(range))
        return foundPair(text, range.head, action);

    const { from, to } = trimmed(text, range);

    if (from === to)
        return null;

    switch (action) {
        case "code":
            return foundCode(text, from, to);
        case "link":
            return foundLink(text, from, to);
        default:
            return foundEmphasis(text, from, to, Emphases[action]);
    }
}

/** An empty pair round a caret, as the bar's own press on a caret wrote it. */
function foundPair(text: string, position: number, action: Exclude<FormatAction, "heading" | "list">): Found | null {
    if (action === "link")
        return text.startsWith("[]()", position - 1) ? { from: position - 1, to: position + 3, inner: "" } : null;

    if (action === "code")
        return runBefore(text, position, Backtick) === 1 && runAfter(text, position, Backtick) === 1 ? { from: position - 1, to: position + 1, inner: "" } : null;

    const emphasis = Emphases[action];
    const before = runBefore(text, position, emphasis.character);
    const after = runAfter(text, position, emphasis.character);

    return emphasis.holds(before) && emphasis.holds(after) ? { from: position - emphasis.length, to: position + emphasis.length, inner: "" } : null;
}

function foundEmphasis(text: string, from: number, to: number, emphasis: Emphasis): Found | null {
    const inner = text.slice(from, to);
    const leading = runAfter(inner, 0, emphasis.character);
    const trailing = runBefore(inner, inner.length, emphasis.character);

    // Inside: the selection took the marks with the words.
    if (leading < inner.length && emphasis.holds(leading) && emphasis.holds(trailing))
        return { from, to, inner: inner.slice(emphasis.length, inner.length - emphasis.length) };

    // Just outside: the words alone were selected.
    if (emphasis.holds(runBefore(text, from, emphasis.character)) && emphasis.holds(runAfter(text, to, emphasis.character)))
        return { from: from - emphasis.length, to: to + emphasis.length, inner };

    return null;
}

/** A code span the selection is, or stands in, its fence's runs equal and the space a fence pads its text with taken off too. */
function foundCode(text: string, from: number, to: number): Found | null {
    const inner = text.slice(from, to);
    const leading = runAfter(inner, 0, Backtick);

    if (leading > 0 && leading * 2 < inner.length && runBefore(inner, inner.length, Backtick) === leading)
        return { from, to, inner: unpadded(inner.slice(leading, inner.length - leading)) };

    const padded = text[from - 1] === " " && text[to] === " " && text[from - 2] === Backtick && text[to + 1] === Backtick;
    const start = padded ? from - 1 : from;
    const end = padded ? to + 1 : to;
    const fence = runBefore(text, start, Backtick);

    return fence > 0 && runAfter(text, end, Backtick) === fence ? { from: start - fence, to: end + fence, inner } : null;
}

function unpadded(code: string): string {
    return code.length > 2 && code.startsWith(" ") && code.endsWith(" ") && code.trim().length > 0 ? code.slice(1, -1) : code;
}

/** A link the selection is, or whose words it is: the link gives way to its words. */
function foundLink(text: string, from: number, to: number): Found | null {
    const inner = text.slice(from, to);
    const whole = LinkWhole.exec(inner);

    if (whole !== null)
        return { from, to, inner: whole[1] };

    const tail = text[from - 1] === "[" ? LinkTail.exec(text.slice(to)) : null;

    return tail === null || inner.includes("\n") ? null : { from: from - 1, to: to + tail[0].length, inner };
}

/** How many of a character stand just before a position. */
function runBefore(text: string, position: number, character: string): number {
    let count = 0;

    while (position - count > 0 && text[position - count - 1] === character)
        count++;

    return count;
}

/** How many of a character stand from a position on. */
function runAfter(text: string, position: number, character: string): number {
    let count = 0;

    while (position + count < text.length && text[position + count] === character)
        count++;

    return count;
}

/** A line the ranges touch: where it starts, where its mark stands or would go (past its indentation), and the mark, or null. */
type MarkedLine = {
    readonly start: number;
    readonly indent: number;
    readonly mark: string | null;
};

/** Each line's mark replaced by the one `markFor` gives it — "" to take it off; a line keeping its mark is no edit. */
function lineEdits(set: SelectionSet, lines: readonly MarkedLine[], markFor: (line: MarkedLine) => string): FormatResult | null {
    const edits: Edit[] = [];

    for (const line of lines) {
        const at = line.start + line.indent;
        const mark = markFor(line);

        if (mark !== (line.mark ?? ""))
            edits.push({ from: at, to: at + (line.mark?.length ?? 0), text: mark });
    }

    if (edits.length === 0)
        return null;

    // A selection from a line's start takes the mark in; a caret, or a selection's end, stands after a mark put on where it stood.
    const ranges = set.ranges.map(range => {
        const forward = range.anchor <= range.head;
        const start = mapPosition(rangeStart(range), edits);
        const end = mapAfter(rangeEnd(range), edits);

        return isCaret(range) ? { anchor: end, head: end } : forward ? { anchor: start, head: end } : { anchor: end, head: start };
    });

    return { edits, after: normalizeSelections(ranges, set.primary) };
}

/** Where a position lands once the edits are made, after any text inserted right at it. */
function mapAfter(position: number, edits: readonly Edit[]): number {
    const inserted = edits.find(edit => edit.from === position && edit.to === position);

    return mapPosition(position, edits) + (inserted?.text.length ?? 0);
}

/**
 * The lines the ranges touch that hold words — or, where none does, every one they touch — each read for its mark, in order. A range
 * ending at a line's very start does not touch that line; a caret on an empty line does.
 */
function markedLines(text: string, ranges: readonly Selection[], pattern: RegExp): MarkedLine[] {
    const starts = new Set<number>();

    for (const range of ranges) {
        const from = rangeStart(range);
        let to = rangeEnd(range);

        if (to > from && text[to - 1] === "\n")
            to--;

        for (let start = text.lastIndexOf("\n", from - 1) + 1; start <= to; start = text.indexOf("\n", start) + 1) {
            starts.add(start);

            if (!text.includes("\n", start))
                break;
        }
    }

    const all: MarkedLine[] = [];
    const worded: MarkedLine[] = [];

    for (const start of [...starts].sort((a, b) => a - b)) {
        const end = text.includes("\n", start) ? text.indexOf("\n", start) : text.length;
        const line = text.slice(start, end);
        const match = pattern.exec(line);
        const marked: MarkedLine = match === null
            ? { start, indent: line.length - line.trimStart().length, mark: null }
            : { start, indent: match[1].length, mark: match[0].slice(match[1].length) };

        all.push(marked);

        if (line.trim().length > 0)
            worded.push(marked);
    }

    return worded.length > 0 ? worded : all;
}
