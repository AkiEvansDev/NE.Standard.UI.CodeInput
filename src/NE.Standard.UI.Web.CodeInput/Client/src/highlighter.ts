import type { LineState, Token, TokenKind, Tokenizer } from "./tokenizer.ts";
import { statesEqual } from "./tokenizer.ts";

/** A find match on one line; a match that spans lines is a mark on each. */
export type Mark = {
    readonly from: number;
    readonly to: number;
    readonly current: boolean;
};

type CachedLine = {
    readonly text: string;
    readonly startState: LineState;
    readonly endState: LineState;
    readonly tokens: readonly Token[];
    marks: readonly Mark[];
};

/** Which line elements an update replaced: `removed` old ones from `from`, `added` new ones in their place. */
export type LineChange = {
    readonly from: number;
    readonly removed: number;
    readonly added: number;
};

const EmptyState: LineState = {};
const NoTokens: readonly Token[] = [];
const NoMarks: readonly Mark[] = [];

/**
 * The text as tokenized lines, re-read only where an edit landed: from each changed line until the tokenizer's state settles back
 * onto what the unchanged lines after it already had.
 */
export class Highlighter {
    private readonly tokenizer: Tokenizer | null;
    private lines: CachedLine[] = [];

    /** The offset each line starts at, so an absolute match position finds its line. */
    private starts: number[] = [0];

    public constructor(tokenizer: Tokenizer | null) {
        this.tokenizer = tokenizer;
    }

    public get lineCount(): number {
        return this.lines.length;
    }

    public lineText(index: number): string {
        return this.lines[index]?.text ?? "";
    }

    public lineStart(index: number): number {
        return this.starts[index] ?? 0;
    }

    /** The line a text offset falls on. */
    public lineAt(offset: number): number {
        let low = 0;
        let high = this.starts.length - 1;

        while (low < high) {
            const middle = (low + high + 1) >> 1;

            if (this.starts[middle] <= offset)
                low = middle;
            else
                high = middle - 1;
        }

        return low;
    }

    /**
     * Reads a new text and returns the runs of lines whose rendering changed, in order. A line is kept when its text and start
     * state match. The lines both texts end with stand opposite each other, so an edit of any size at one place meets the old
     * lines after it however far it shifted them; before them, old and new lines are walked side by side, looking ahead where
     * they diverge, so an edit at many carets re-reads only those places.
     */
    public update(text: string): LineChange[] {
        const texts = text.split("\n");
        const old = this.lines;
        const lines: CachedLine[] = [];
        const changes: LineChange[] = [];
        const tail = commonTail(texts, old);
        const newHead = texts.length - tail;
        const oldHead = old.length - tail;
        let state = this.tokenizer?.initialState ?? EmptyState;
        let from = -1;
        let removed = 0;
        let added = 0;
        let i = 0;
        let j = 0;

        while (i < texts.length) {
            // Into the common tail: whatever the old head still held is replaced, and the walks go on line for line.
            if (i === newHead && j < oldHead) {
                if (from < 0) {
                    from = i;
                    removed = 0;
                    added = 0;
                }

                removed += oldHead - j;
                j = oldHead;
            }

            const limit = i < newHead ? oldHead : old.length;

            if (j < limit && old[j].text === texts[i] && statesEqual(old[j].startState, state)) {
                if (from >= 0) {
                    changes.push({ from, removed, added });
                    from = -1;
                }

                lines.push(old[j]);
                state = old[j].endState;
                i++;
                j++;
                continue;
            }

            if (from < 0) {
                from = i;
                removed = 0;
                added = 0;
            }

            // The same text in another state is re-read in place; otherwise the lines added and removed before the two walks meet.
            const [newLines, oldLines] = j < limit && old[j].text === texts[i] ? [1, 1] : resync(texts, i, newHead, old, j, oldHead);

            for (let k = 0; k < newLines; k++) {
                const line = this.tokenize(texts[i + k], state);

                lines.push(line);
                state = line.endState;
            }

            added += newLines;
            removed += oldLines;
            i += newLines;
            j += oldLines;
        }

        if (j < old.length) {
            if (from < 0) {
                from = i;
                removed = 0;
                added = 0;
            }

            removed += old.length - j;
        }

        if (from >= 0)
            changes.push({ from, removed, added });

        this.lines = lines;
        this.rebuildStarts();

        return changes;
    }

    private tokenize(text: string, startState: LineState): CachedLine {
        if (this.tokenizer === null)
            return { text, startState: EmptyState, endState: EmptyState, tokens: NoTokens, marks: NoMarks };

        const tokens: Token[] = [];

        // A package's tokenizer that throws leaves its line plain: the text is drawn only by this layer, under a transparent
        // textarea, so a line not drawn is a line the reader types blind.
        try {
            const endState = this.tokenizer.tokenizeLine(text, startState, (from, to, kind) => tokens.push({ from, to, kind }));

            return { text, startState, endState, tokens, marks: NoMarks };
        }
        catch {
            return { text, startState, endState: startState, tokens: NoTokens, marks: NoMarks };
        }
    }

    private rebuildStarts(): void {
        const starts = new Array<number>(this.lines.length);
        let offset = 0;

        for (let i = 0; i < this.lines.length; i++) {
            starts[i] = offset;
            offset += this.lines[i].text.length + 1;
        }

        this.starts = starts;
    }

    /** Lays the matches over the lines and returns the indexes of the lines whose marks changed. */
    public setMatches(matches: readonly { readonly from: number; readonly to: number }[], current: number): number[] {
        const perLine = new Map<number, Mark[]>();

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const first = this.lineAt(match.from);
            const last = this.lineAt(Math.max(match.from, match.to - 1));

            for (let line = first; line <= last; line++) {
                const start = this.starts[line];
                const from = Math.max(0, match.from - start);
                const to = Math.min(this.lines[line].text.length, match.to - start);
                let marks = perLine.get(line);

                if (marks === undefined) {
                    marks = [];
                    perLine.set(line, marks);
                }

                marks.push({ from, to, current: i === current });
            }
        }

        const changed: number[] = [];

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];
            const marks = perLine.get(i) ?? NoMarks;

            if (!marksEqual(line.marks, marks)) {
                line.marks = marks;
                changed.push(i);
            }
        }

        return changed;
    }

    /** The token just before an offset — a comment or a string keeps a completion list from opening inside it. */
    public tokenKindAt(offset: number): TokenKind | null {
        const line = this.lineAt(offset);
        const data = this.lines[line];

        if (data === undefined || data.tokens.length === 0)
            return null;

        const local = Math.max(0, offset - this.starts[line] - 1);
        const token = data.tokens.find(candidate => local >= candidate.from && local < candidate.to);

        return token?.kind ?? null;
    }

    /** The inner HTML of one line's element. */
    public renderLine(index: number): string {
        const line = this.lines[index];

        if (line === undefined)
            return "";

        return line.text.length === 0 ? "<span class=\"ui-code-input__code\"><br></span>" : `<span class="ui-code-input__code">${renderSegments(line.text, line.tokens, line.marks)}</span>`;
    }
}

// How far apart two walks may part and still be found meeting again; past it, the lines are replaced one for one until they meet.
const ResyncWindow = 8;

/**
 * How many new and old lines to take before the walks meet again, fewest first, looking no further than each head's end; one of
 * each when they do not meet within the window.
 */
function resync(texts: readonly string[], i: number, newEnd: number, old: readonly CachedLine[], j: number, oldEnd: number): [number, number] {
    for (let distance = 1; distance <= 2 * ResyncWindow; distance++) {
        for (let newLines = Math.min(distance, ResyncWindow); newLines >= 0 && distance - newLines <= ResyncWindow; newLines--) {
            const oldLines = distance - newLines;

            if (i + newLines < newEnd && j + oldLines < oldEnd && texts[i + newLines] === old[j + oldLines].text)
                return [newLines, oldLines];
        }
    }

    return [i < newEnd ? 1 : 0, j < oldEnd ? 1 : 0];
}

/** How many lines the new text ends with that the old one ends with too. */
function commonTail(texts: readonly string[], old: readonly CachedLine[]): number {
    const most = Math.min(texts.length, old.length);
    let count = 0;

    while (count < most && texts[texts.length - 1 - count] === old[old.length - 1 - count].text)
        count++;

    return count;
}

function marksEqual(a: readonly Mark[], b: readonly Mark[]): boolean {
    if (a.length !== b.length)
        return false;

    for (let i = 0; i < a.length; i++) {
        if (a[i].from !== b[i].from || a[i].to !== b[i].to || a[i].current !== b[i].current)
            return false;
    }

    return true;
}

/** Tokens and marks cut into one run of spans: a span for every stretch where the token under it and the mark over it are constant. */
export function renderSegments(text: string, tokens: readonly Token[], marks: readonly Mark[]): string {
    if (tokens.length === 0 && marks.length === 0)
        return escapeHtml(text);

    const cuts = new Set<number>([0, text.length]);

    for (const token of tokens) {
        cuts.add(token.from);
        cuts.add(token.to);
    }

    for (const mark of marks) {
        cuts.add(mark.from);
        cuts.add(mark.to);
    }

    const points = [...cuts].sort((a, b) => a - b);
    let html = "";
    let tokenIndex = 0;
    let markIndex = 0;

    for (let i = 0; i + 1 < points.length; i++) {
        const from = points[i];
        const to = points[i + 1];

        while (tokenIndex < tokens.length && tokens[tokenIndex].to <= from)
            tokenIndex++;

        while (markIndex < marks.length && marks[markIndex].to <= from)
            markIndex++;

        const kind = tokenIndex < tokens.length && tokens[tokenIndex].from <= from ? tokens[tokenIndex].kind : null;
        const mark = markIndex < marks.length && marks[markIndex].from <= from ? marks[markIndex] : null;
        const piece = escapeHtml(text.slice(from, to));

        if (kind === null && mark === null) {
            html += piece;
            continue;
        }

        html += `<span class="${classesFor(kind, mark)}">${piece}</span>`;
    }

    return html;
}

function classesFor(kind: TokenKind | null, mark: Mark | null): string {
    let classes = kind === null ? "" : `ui-tk-${kind}`;

    if (mark !== null)
        classes += (classes.length > 0 ? " " : "") + (mark.current ? "ui-code-match ui-code-match--current" : "ui-code-match");

    return classes;
}

/** Text as HTML that is safe inside an element and inside a quoted attribute alike. */
export function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, character => EscapedCharacters[character]);
}

const EscapedCharacters: Readonly<Record<string, string>> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
