// Carets and selections over the text alone: ranges kept sorted and apart, the edits one command makes at every range and where
// they land afterwards, a selection's text occurrences, and how a paste is dealt out among carets.

/** One caret or selection: `anchor` stays where it began, `head` is where the caret stands. */
export type Selection = {
    readonly anchor: number;
    readonly head: number;
};

/** Every range the editor holds, sorted and apart; `primary` is the one the textarea itself shows. */
export type SelectionSet = {
    readonly ranges: readonly Selection[];
    readonly primary: number;
};

/** A span of the text replaced by `text`. */
export type Edit = {
    readonly from: number;
    readonly to: number;
    readonly text: string;
};

/** An edit made at one range, and where its caret lands, counted from the start of the text it inserts. */
export type RangeEdit = Edit & {
    readonly caret: number;
    /** Where the range's anchor lands, counted the same way; omitted, the edit leaves a caret at `caret` instead of a selection. */
    readonly anchor?: number;
};

export function rangeStart(range: Selection): number {
    return Math.min(range.anchor, range.head);
}

export function rangeEnd(range: Selection): number {
    return Math.max(range.anchor, range.head);
}

export function isCaret(range: Selection): boolean {
    return range.anchor === range.head;
}

export function caretAt(position: number): Selection {
    return { anchor: position, head: position };
}

export function singleSelection(anchor: number, head: number = anchor): SelectionSet {
    return { ranges: [{ anchor, head }], primary: 0 };
}

/** Sorts the ranges and merges those that overlap, or a caret that touches another range; a merge keeps the primary's direction. */
export function normalizeSelections(ranges: readonly Selection[], primary: number): SelectionSet {
    const order = ranges.map((range, index) => ({ range, index })).sort((a, b) => rangeStart(a.range) - rangeStart(b.range) || rangeEnd(a.range) - rangeEnd(b.range));
    const merged: Selection[] = [];
    let mergedPrimary = 0;

    for (const { range, index } of order) {
        const last = merged.at(-1);
        const isPrimary = index === primary;

        if (last !== undefined && touches(last, range)) {
            const from = rangeStart(last);
            const to = Math.max(rangeEnd(last), rangeEnd(range));
            const backward = isPrimary ? range.head < range.anchor : last.head < last.anchor;

            merged[merged.length - 1] = backward ? { anchor: to, head: from } : { anchor: from, head: to };
        }
        else
            merged.push(range);

        if (isPrimary)
            mergedPrimary = merged.length - 1;
    }

    return { ranges: merged, primary: mergedPrimary };
}

/** Whether a range that starts no earlier than `earlier` runs into it. */
function touches(earlier: Selection, later: Selection): boolean {
    const end = rangeEnd(earlier);
    const start = rangeStart(later);

    return start < end || (start === end && (isCaret(earlier) || isCaret(later)));
}

export function selectionsEqual(a: SelectionSet, b: SelectionSet): boolean {
    if (a.primary !== b.primary || a.ranges.length !== b.ranges.length)
        return false;

    for (let i = 0; i < a.ranges.length; i++) {
        if (a.ranges[i].anchor !== b.ranges[i].anchor || a.ranges[i].head !== b.ranges[i].head)
            return false;
    }

    return true;
}

/** The text with sorted, non-overlapping edits made. */
export function applyEdits(text: string, edits: readonly Edit[]): string {
    let result = "";
    let at = 0;

    for (const edit of edits) {
        result += text.slice(at, edit.from) + edit.text;
        at = edit.to;
    }

    return result + text.slice(at);
}

/** Where a position lands once the edits are made: a replaced span sends it to the span's start, an insertion at it leaves it before. */
export function mapPosition(position: number, edits: readonly Edit[]): number {
    let shift = 0;

    for (const edit of edits) {
        if (position < edit.from || (position === edit.from && edit.from === edit.to))
            break;

        if (position < edit.to)
            return edit.from + shift;

        shift += edit.text.length - (edit.to - edit.from);
    }

    return position + shift;
}

/**
 * One edit at every range, and the ranges afterwards: an edited range becomes a caret where its edit says, one `makeEdit` leaves
 * alone keeps its place. An edit reaching back over the one before it starts where that one ended.
 */
export function editRanges(set: SelectionSet, makeEdit: (range: Selection, index: number) => RangeEdit | null): { readonly edits: Edit[]; readonly after: SelectionSet } {
    const edits: Edit[] = [];
    const landings: (Selection | null)[] = [];
    let lastTo = 0;
    let shift = 0;

    for (let i = 0; i < set.ranges.length; i++) {
        const edit = makeEdit(set.ranges[i], i);

        if (edit === null) {
            landings.push(null);
            continue;
        }

        const from = Math.max(edit.from, lastTo);
        const to = Math.max(edit.to, from);
        const base = from + shift;
        const head = base + Math.min(edit.caret, edit.text.length);
        const anchor = edit.anchor === undefined ? head : base + Math.min(edit.anchor, edit.text.length);

        landings.push({ anchor, head });

        if (from === to && edit.text.length === 0)
            continue;

        edits.push({ from, to, text: edit.text });
        shift += edit.text.length - (to - from);
        lastTo = to;
    }

    const ranges = set.ranges.map((range, i) => landings[i] ?? { anchor: mapPosition(range.anchor, edits), head: mapPosition(range.head, edits) });

    return { edits, after: normalizeSelections(ranges, set.primary) };
}

/** Every place `needle` occurs, left to right and apart. */
export function findOccurrences(text: string, needle: string): number[] {
    const found: number[] = [];

    if (needle.length === 0)
        return found;

    for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + needle.length))
        found.push(i);

    return found;
}

/** The next place after the primary range where its own text occurs and no range already stands, wrapping to the top; -1 when none is left. */
export function nextOccurrence(text: string, set: SelectionSet): number {
    const primary = set.ranges[set.primary];
    const needle = text.slice(rangeStart(primary), rangeEnd(primary));
    const taken = new Set(set.ranges.map(rangeStart));
    const occurrences = findOccurrences(text, needle).filter(at => !taken.has(at) && !overlapsAny(set.ranges, at, at + needle.length));

    return occurrences.find(at => at >= rangeEnd(primary)) ?? occurrences[0] ?? -1;
}

function overlapsAny(ranges: readonly Selection[], from: number, to: number): boolean {
    return ranges.some(range => rangeStart(range) < to && rangeEnd(range) > from);
}

/**
 * The text each caret receives from a paste: one piece each when the pasted text has exactly as many lines as ranges copied;
 * otherwise null, and every caret receives the whole.
 */
export function distributePaste(text: string, count: number, copied: readonly string[] | null): readonly string[] | null {
    if (copied !== null && copied.length === count && copied.join("\n") === text)
        return copied;

    const lines = (text.endsWith("\n") ? text.slice(0, -1) : text).split("\n");

    return lines.length === count ? lines : null;
}
