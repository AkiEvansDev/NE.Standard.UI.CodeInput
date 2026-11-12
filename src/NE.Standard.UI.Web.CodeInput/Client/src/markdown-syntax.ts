// The block markers both Markdown readers share — the editor's line-at-a-time tokenizer and the display's parser — kept in one
// place so what the editor marks and what the display draws cannot drift apart.

/** A fence that opens a code block: its indentation, its marker and its info string. */
export type FenceOpening = {
    readonly indent: number;
    readonly marker: string;
    readonly info: string;
};

const FenceOpen = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const FenceClose = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

/** A quote's marker at the start of a line: up to three spaces, the `>`, and one space that belongs to the marker. */
export const QuoteMarker = /^ {0,3}> ?/;

/** How deep quotes and lists may nest inside each other; deeper markers read as text. */
export const MaxNesting = 64;

/** Three or more of one of `-`, `*` and `_`, spaces between them allowed. */
export const ThematicBreak = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;

/**
 * A table's delimiter row: cells of hyphens with a colon at either end to align, pipes between and optionally around them. Every
 * run of spaces stands on one side of a pipe only: a run that both a cell's end and the row's end can take is split every way over
 * before a line that is no row is let go, in time quadratic in its length.
 */
export const TableDelimiter = /^[ \t]*(?:\|[ \t]*)?:?-+:?(?:[ \t]*\|[ \t]*:?-+:?)*[ \t]*(?:\|[ \t]*)?$/;

/** The fence a line opens, or null; a backtick fence's info string holds no backtick, since such a line is inline code. */
export function openFence(line: string): FenceOpening | null {
    const match = FenceOpen.exec(line);

    if (match === null || (match[2][0] === "`" && match[3].includes("`")))
        return null;

    return { indent: match[1].length, marker: match[2], info: match[3] };
}

/** Whether a line closes the block a marker opened: the same character, at least as many of it, and nothing after but spaces. */
export function closesFence(line: string, marker: string): boolean {
    const closing = FenceClose.exec(line);

    return closing !== null && closing[1][0] === marker[0] && closing[1].length >= marker.length;
}

/** A run Markdown itself marks, by its type in the inline tree, which the author may style (UIMarkdownMark). */
export type MarkdownMark = "strong" | "emphasis" | "strikethrough" | "code" | "link";

/** An author's run: the marks that open and close it (or an empty `close` when `open` stands alone as a literal token). */
export type MarkdownSpanRule = {
    readonly open: string;
    readonly close: string;
};

/** An author's own run and the declarations it is drawn with. */
type MarkdownSpanStyle = MarkdownSpanRule & {
    readonly css: string;
};

/**
 * The display's and editor's styles, as their renderers write them: the CSS declarations of Markdown's own runs and of the
 * author's, built by the server from a theme's colours and a checked font list, so the markup only carries them.
 */
export type MarkdownStyles = {
    readonly marks: Readonly<Partial<Record<MarkdownMark, string>>>;
    readonly spans: readonly MarkdownSpanStyle[];
};

export const NoMarkdownStyles: MarkdownStyles = { marks: {}, spans: [] };

/** Parses the JSON written into `data-ui-markdown-styles` or `data-ui-code-styles`, falling back to `NoMarkdownStyles`. */
export function parseMarkdownStyles(json: string | null): MarkdownStyles {
    if (json === null || json.length === 0)
        return NoMarkdownStyles;

    try {
        return JSON.parse(json) as MarkdownStyles;
    }
    catch (error) {
        console.warn("NE.Standard.UI.Web.CodeInput: a Markdown display's styles could not be read; it is drawn without them.", error);

        return NoMarkdownStyles;
    }
}

/** A matched custom span or literal token within a text slice, ordered outer-before-inner when spans nest. */
export type SpanRange = {
    readonly id: number;
    readonly rule: number;
    readonly openStart: number;
    readonly openEnd: number;
    readonly closeStart: number;
    readonly closeEnd: number;
};

/** The rule whose opening mark comes first, -1 for none; of two at one place, the longer, so `«` and `<<` cannot both claim one run. */
export function firstOpening(openings: readonly number[], rules: readonly MarkdownSpanRule[]): number {
    let found = -1;

    for (let rule = 0; rule < openings.length; rule++) {
        const at = openings[rule];

        if (at < 0)
            continue;

        if (found < 0 || at < openings[found] || (at === openings[found] && rules[rule].open.length > rules[found].open.length))
            found = rule;
    }

    return found;
}

/**
 * Finds all closed custom spans and standalone tokens in `text[start..end)` using the same linear-time rule priority and
 * recursive nesting as `markSpans`.
 */
export function findSpanRanges(text: string, rules: readonly MarkdownSpanRule[], start = 0, end = text.length): SpanRange[] {
    const out: SpanRange[] = [];

    if (rules.length > 0 && start < end)
        scanSpanRanges(text, rules, start, end, out, { nextId: 0 });

    return out;
}

function scanSpanRanges(text: string, rules: readonly MarkdownSpanRule[], start: number, end: number, out: SpanRange[], state: { nextId: number }): void {
    const closeless = new Set<number>();
    const openings = rules.map(rule => findInSlice(text, rule.open, start, end));

    for (;;) {
        const ruleIndex = firstOpening(openings, rules);

        if (ruleIndex < 0)
            return;

        const openStart = openings[ruleIndex];
        const rule = rules[ruleIndex];
        const openEnd = openStart + rule.open.length;

        if (rule.close.length === 0) {
            out.push({ id: ++state.nextId, rule: ruleIndex, openStart, openEnd, closeStart: openEnd, closeEnd: openEnd });
            advanceSliceOpenings(openings, text, openEnd, end, rules, closeless);
            continue;
        }

        const closeStart = findInSlice(text, rule.close, openEnd, end);

        if (closeStart < 0) {
            closeless.add(ruleIndex);
            openings[ruleIndex] = -1;
            continue;
        }

        const closeEnd = closeStart + rule.close.length;

        out.push({ id: ++state.nextId, rule: ruleIndex, openStart, openEnd, closeStart, closeEnd });

        if (closeStart > openEnd)
            scanSpanRanges(text, rules, openEnd, closeStart, out, state);

        advanceSliceOpenings(openings, text, closeEnd, end, rules, closeless);
    }
}

function findInSlice(text: string, needle: string, from: number, end: number): number {
    if (needle.length === 0 || from + needle.length > end)
        return -1;

    const index = text.indexOf(needle, from);

    return index >= 0 && index + needle.length <= end ? index : -1;
}

function advanceSliceOpenings(openings: number[], text: string, from: number, end: number, rules: readonly MarkdownSpanRule[], closeless: ReadonlySet<number>): void {
    for (let rule = 0; rule < rules.length; rule++) {
        const at = openings[rule];

        if (closeless.has(rule) || at < 0 || at >= from)
            continue;

        openings[rule] = findInSlice(text, rules[rule].open, from, end);
    }
}
