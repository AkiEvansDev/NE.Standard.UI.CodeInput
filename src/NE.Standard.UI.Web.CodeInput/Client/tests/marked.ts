// Texts with their ranges written in: `[` where a range starts and `]` where it ends, `[]` for a caret.

import type { SelectionSet } from "../src/selections.ts";

/** Reads a marked text; the ranges run forward, and the primary is the one `primary` counts to. */
export function parse(notation: string, primary = 0): { readonly text: string; readonly set: SelectionSet } {
    let text = "";
    let start = -1;
    const ranges: { anchor: number; head: number }[] = [];

    for (const character of notation) {
        if (character === "[")
            start = text.length;
        else if (character === "]")
            ranges.push({ anchor: start, head: text.length });
        else
            text += character;
    }

    return { text, set: { ranges, primary } };
}

/** Writes the ranges into the text. */
export function marked(text: string, set: SelectionSet): string {
    let result = "";
    let at = 0;

    for (const range of set.ranges) {
        const from = Math.min(range.anchor, range.head);
        const to = Math.max(range.anchor, range.head);

        result += text.slice(at, from) + "[" + text.slice(from, to) + "]";
        at = to;
    }

    return result + text.slice(at);
}
