// Tab and Shift+Tab over the text alone: which span is rewritten, what it becomes, and where the selection lands afterwards.

export type TabEdit = {
    /** The span of the value to replace. */
    readonly from: number;
    readonly to: number;
    /** What replaces it. */
    readonly text: string;
    /** The selection once the text is in place. */
    readonly selectionStart: number;
    readonly selectionEnd: number;
};

type MovedLine = {
    readonly start: number;
    readonly length: number;
    readonly removed: number;
    readonly inserted: number;
};

/** The edit a Tab (or Shift+Tab, `outdent`) makes with the selection `start`..`end`, or null when nothing would change. */
export function applyTab(value: string, start: number, end: number, tabSize: number, outdent: boolean): TabEdit | null {
    const firstLineStart = value.lastIndexOf("\n", start - 1) + 1;

    // A caret with no selection indents at the caret, to the next stop; everything else moves whole lines.
    if (!outdent && start === end) {
        const spaces = " ".repeat(tabSize - ((start - firstLineStart) % tabSize));

        return { from: start, to: end, text: spaces, selectionStart: start + spaces.length, selectionEnd: start + spaces.length };
    }

    let lastLineEnd = value.indexOf("\n", end > start ? end - 1 : end);

    if (lastLineEnd < 0)
        lastLineEnd = value.length;

    const moved: MovedLine[] = [];
    const text: string[] = [];
    let lineStart = firstLineStart;

    for (const line of value.slice(firstLineStart, lastLineEnd).split("\n")) {
        const removed = outdent ? outdentWidth(line, tabSize) : 0;
        const inserted = outdent || line.length === 0 ? 0 : tabSize;

        moved.push({ start: lineStart, length: line.length, removed, inserted });
        text.push(outdent ? line.slice(removed) : " ".repeat(inserted) + line);
        lineStart += line.length + 1;
    }

    if (moved.every(line => line.removed === 0 && line.inserted === 0))
        return null;

    return {
        from: firstLineStart,
        to: lastLineEnd,
        text: text.join("\n"),
        selectionStart: shiftPosition(start, moved),
        selectionEnd: shiftPosition(end, moved)
    };
}

/** What one Shift+Tab takes off a line: a leading tab whole, since text pasted from elsewhere is indented with tabs as often as spaces. */
function outdentWidth(line: string, tabSize: number): number {
    if (line.startsWith("\t"))
        return 1;

    return Math.min(tabSize, /^ */.exec(line)![0].length);
}

/** A position moved by what the lines before its own did and by its own line's edit; one at the line start stays there, so a selection keeps the indent it moved. */
function shiftPosition(position: number, lines: readonly MovedLine[]): number {
    let shift = 0;

    for (const line of lines) {
        if (position === line.start)
            return line.start + shift;

        if (position <= line.start + line.length)
            return line.start + shift + Math.max(0, position - line.start - line.removed) + line.inserted;

        shift += line.inserted - line.removed;
    }

    // Past the last moved line: a selection that ends right after a line break.
    return position + shift;
}
