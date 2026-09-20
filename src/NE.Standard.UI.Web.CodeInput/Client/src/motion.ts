// Where a caret goes over the text alone: by character, by word, to the line's ends, and up or down a line to the column it keeps.

/** The text's lines by index: where each starts and ends, without its line break. */
export type Lines = {
    readonly count: number;
    start(index: number): number;
    end(index: number): number;
    /** The line a text offset falls on. */
    lineAt(offset: number): number;
};

/** Lines read off a text by scanning it; the editor's own come from the highlighter, which already holds every start. */
export function linesOf(text: string): Lines {
    const starts = [0];

    for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1))
        starts.push(i + 1);

    return {
        count: starts.length,
        start: index => starts[index],
        end: index => index + 1 < starts.length ? starts[index + 1] - 1 : text.length,
        lineAt: offset => {
            let low = 0;
            let high = starts.length - 1;

            while (low < high) {
                const middle = (low + high + 1) >> 1;

                if (starts[middle] <= offset)
                    low = middle;
                else
                    high = middle - 1;
            }

            return low;
        }
    };
}

/** One character back, stepping over a surrogate pair whole. */
export function previousCharacter(text: string, position: number): number {
    if (position <= 0)
        return 0;

    return position >= 2 && isLowSurrogate(text.charCodeAt(position - 1)) && isHighSurrogate(text.charCodeAt(position - 2)) ? position - 2 : position - 1;
}

/** One character on, stepping over a surrogate pair whole. */
export function nextCharacter(text: string, position: number): number {
    if (position >= text.length)
        return text.length;

    return position + 1 < text.length && isHighSurrogate(text.charCodeAt(position)) && isLowSurrogate(text.charCodeAt(position + 1)) ? position + 2 : position + 1;
}

function isHighSurrogate(code: number): boolean {
    return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
    return code >= 0xdc00 && code <= 0xdfff;
}

// Plain numbers rather than an enum: the tests run this file under Node's type stripping, which takes no enum.
const Space = 0;
const Word = 1;
const Punctuation = 2;
const LineBreak = 3;

const WordCharacter = /[\p{L}\p{N}_]/u;

function classify(character: string): number {
    if (character === "\n")
        return LineBreak;

    if (character === " " || character === "\t")
        return Space;

    return WordCharacter.test(character) ? Word : Punctuation;
}

/** Ctrl+Right: past the run the caret stands on and the spaces after it; a line break is a stop of its own. */
export function wordRight(text: string, position: number): number {
    if (position >= text.length)
        return text.length;

    if (text[position] === "\n")
        return position + 1;

    let i = position;
    const first = classify(text[i]);

    if (first !== Space) {
        while (i < text.length && classify(text[i]) === first)
            i++;
    }

    while (i < text.length && classify(text[i]) === Space)
        i++;

    return i;
}

/** Ctrl+Left: back over the spaces before the caret and the run before them; a line break is a stop of its own. */
export function wordLeft(text: string, position: number): number {
    if (position <= 0)
        return 0;

    if (text[position - 1] === "\n")
        return position - 1;

    let i = position;

    while (i > 0 && classify(text[i - 1]) === Space)
        i--;

    if (i === 0 || text[i - 1] === "\n")
        return i;

    const run = classify(text[i - 1]);

    while (i > 0 && classify(text[i - 1]) === run)
        i--;

    return i;
}

/** The word a caret touches, or null when it stands between two characters that are not a word's. */
export function wordAt(text: string, position: number): { readonly from: number; readonly to: number } | null {
    let from = position;
    let to = position;

    while (from > 0 && classify(text[from - 1]) === Word)
        from--;

    while (to < text.length && classify(text[to]) === Word)
        to++;

    return from === to ? null : { from, to };
}

/** Home: the line's first character that is not indent, and from there the line's very start. */
export function homePosition(text: string, lines: Lines, position: number): number {
    const line = lines.lineAt(position);
    const start = lines.start(line);
    const end = lines.end(line);
    let indentEnd = start;

    while (indentEnd < end && (text[indentEnd] === " " || text[indentEnd] === "\t"))
        indentEnd++;

    return position === indentEnd ? start : indentEnd;
}

/** The column a position is drawn at on its line, a tab reaching the next stop. */
export function visualColumn(text: string, lines: Lines, position: number, tabSize: number): number {
    let column = 0;

    for (let i = lines.start(lines.lineAt(position)); i < position; i = nextCharacter(text, i))
        column += text[i] === "\t" ? tabSize - (column % tabSize) : 1;

    return column;
}

/** The position on a line nearest a drawn column, or the line's end when the line is shorter. */
export function positionAtColumn(text: string, lines: Lines, line: number, column: number, tabSize: number): number {
    const end = lines.end(line);
    let at = 0;
    let i = lines.start(line);

    while (i < end) {
        const next = nextCharacter(text, i);
        const width = text[i] === "\t" ? tabSize - (at % tabSize) : 1;

        if (at + width > column)
            return column - at >= width / 2 ? next : i;

        at += width;
        i = next;
    }

    return end;
}

/** Up (a negative `step`) or down by lines to the column the caret keeps; past the first or the last line it goes to the text's end. */
export function verticalPosition(text: string, lines: Lines, position: number, step: number, column: number, tabSize: number): number {
    const line = lines.lineAt(position);
    const target = Math.min(Math.max(line + step, 0), lines.count - 1);

    if (target === line)
        return step < 0 ? 0 : text.length;

    return positionAtColumn(text, lines, target, column, tabSize);
}
