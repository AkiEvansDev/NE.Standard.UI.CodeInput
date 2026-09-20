// Tab, Shift+Tab and Enter's indent over the text alone: the edits they make at every caret, and where the carets land afterwards.

import type { Edit, SelectionSet } from "./selections.ts";
import { editRanges, isCaret, mapPosition, normalizeSelections, rangeEnd, rangeStart } from "./selections.ts";
import { linesOf, visualColumn } from "./motion.ts";

/** The edits a Tab (or Shift+Tab, `outdent`) makes, or null when nothing would change. */
export function applyTab(text: string, set: SelectionSet, tabSize: number, outdent: boolean): { readonly edits: Edit[]; readonly after: SelectionSet } | null {
    // Carets alone indent at each caret, to its next stop; anything else moves whole lines.
    if (!outdent && set.ranges.every(isCaret)) {
        const lines = linesOf(text);

        return editRanges(set, range => {
            const spaces = " ".repeat(tabSize - (visualColumn(text, lines, range.head, tabSize) % tabSize));

            return { from: range.head, to: range.head, text: spaces, caret: spaces.length };
        });
    }

    const edits: Edit[] = [];
    let lastLine = -1;

    for (const range of set.ranges) {
        const start = rangeStart(range);
        const end = rangeEnd(range);
        let lineStart = text.lastIndexOf("\n", start - 1) + 1;
        // A selection that ends right after a line break does not take the next line.
        let lastLineEnd = text.indexOf("\n", end > start ? end - 1 : end);

        if (lastLineEnd < 0)
            lastLineEnd = text.length;

        while (lineStart <= lastLineEnd) {
            let lineEnd = text.indexOf("\n", lineStart);

            if (lineEnd < 0)
                lineEnd = text.length;

            // Two carets on one line move it once.
            if (lineStart > lastLine) {
                const edit = lineEdit(text, lineStart, lineEnd, tabSize, outdent);

                if (edit !== null)
                    edits.push(edit);

                lastLine = lineStart;
            }

            lineStart = lineEnd + 1;
        }
    }

    if (edits.length === 0)
        return null;

    // A position at a line start stays there, so a selection keeps the indent it moved.
    const ranges = set.ranges.map(range => ({ anchor: mapPosition(range.anchor, edits), head: mapPosition(range.head, edits) }));

    return { edits, after: normalizeSelections(ranges, set.primary) };
}

function lineEdit(text: string, lineStart: number, lineEnd: number, tabSize: number, outdent: boolean): Edit | null {
    if (!outdent)
        return lineEnd === lineStart ? null : { from: lineStart, to: lineStart, text: " ".repeat(tabSize) };

    const removed = outdentWidth(text, lineStart, lineEnd, tabSize);

    return removed === 0 ? null : { from: lineStart, to: lineStart + removed, text: "" };
}

/** What one Shift+Tab takes off a line: a leading tab whole, since text pasted from elsewhere is indented with tabs as often as spaces. */
function outdentWidth(text: string, lineStart: number, lineEnd: number, tabSize: number): number {
    if (text[lineStart] === "\t")
        return 1;

    let spaces = 0;

    while (spaces < tabSize && lineStart + spaces < lineEnd && text[lineStart + spaces] === " ")
        spaces++;

    return spaces;
}

/** What Enter inserts at a position: the break and the line's indent, one stop deeper after an opening bracket or Python's colon. */
export function lineBreakText(text: string, position: number, tabSize: number, python: boolean): string {
    const lineStart = text.lastIndexOf("\n", position - 1) + 1;
    const line = text.slice(lineStart, position);
    let indent = /^[ \t]*/.exec(line)?.[0] ?? "";
    const before = line.trimEnd();
    const last = before.charAt(before.length - 1);

    if (last === "{" || last === "[" || last === "(" || (last === ":" && python))
        indent += " ".repeat(tabSize);

    return "\n" + indent;
}
