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

/** A table's delimiter row: cells of hyphens with a colon at either end to align, pipes between and optionally around them. */
export const TableDelimiter = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

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
