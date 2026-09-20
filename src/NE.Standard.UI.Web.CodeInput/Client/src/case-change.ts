// Ctrl+U (lower case) and Ctrl+Shift+U (upper case), Visual Studio's own keys: a selection is cased range by range and stays
// selected; a caret cases the identifier it touches and keeps its place in it.

import { wordAt } from "./motion.ts";
import type { Edit, SelectionSet } from "./selections.ts";
import { editRanges, isCaret, rangeEnd, rangeStart } from "./selections.ts";

/** The edits changing every range's case makes, and the ranges afterwards; null when nothing would change. */
export function caseChangeEdits(text: string, set: SelectionSet, upper: boolean): { readonly edits: Edit[]; readonly after: SelectionSet } | null {
    let changed = false;
    const cased = (piece: string): string => upper ? piece.toUpperCase() : piece.toLowerCase();

    const result = editRanges(set, range => {
        if (isCaret(range)) {
            const word = wordAt(text, range.head);

            if (word === null)
                return null;

            const replaced = cased(text.slice(word.from, word.to));

            if (replaced === text.slice(word.from, word.to))
                return null;

            changed = true;

            return { from: word.from, to: word.to, text: replaced, caret: range.head - word.from };
        }

        const from = rangeStart(range);
        const to = rangeEnd(range);
        const replaced = cased(text.slice(from, to));

        if (replaced === text.slice(from, to))
            return null;

        changed = true;

        // The selection stays, in whichever direction it already ran, over the whole cased text.
        const forward = range.anchor <= range.head;

        return { from, to, text: replaced, caret: forward ? replaced.length : 0, anchor: forward ? 0 : replaced.length };
    });

    return changed ? result : null;
}
