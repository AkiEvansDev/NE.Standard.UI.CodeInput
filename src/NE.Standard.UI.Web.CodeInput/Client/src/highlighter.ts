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
 * The text as tokenized lines, re-read only where an edit landed: from the first changed line until the tokenizer's state settles
 * back onto what the unchanged lines after it already had.
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

    /** Reads a new text and returns the lines whose rendering changed. */
    public update(text: string): LineChange {
        const texts = text.split("\n");
        const old = this.lines;
        const oldCount = old.length;
        const newCount = texts.length;
        const limit = Math.min(oldCount, newCount);

        let prefix = 0;

        while (prefix < limit && old[prefix].text === texts[prefix])
            prefix++;

        let suffix = 0;

        while (suffix < limit - prefix && old[oldCount - 1 - suffix].text === texts[newCount - 1 - suffix])
            suffix++;

        const lines: CachedLine[] = old.slice(0, prefix);
        let state = prefix === 0 ? this.tokenizer?.initialState ?? EmptyState : old[prefix - 1].endState;
        let index = prefix;

        // The suffix is reused only from the line whose start state comes out the same as before; until then it is re-read.
        while (index < newCount) {
            const oldIndex = index - (newCount - oldCount);
            const reusable = index >= newCount - suffix && oldIndex >= 0 && oldIndex < oldCount && statesEqual(old[oldIndex].startState, state);

            if (reusable) {
                for (let i = index; i < newCount; i++)
                    lines.push(old[i - (newCount - oldCount)]);

                break;
            }

            const line = this.tokenize(texts[index], state);

            lines.push(line);
            state = line.endState;
            index++;
        }

        this.lines = lines;
        this.rebuildStarts();

        const added = index - prefix;

        return { from: prefix, removed: added - (newCount - oldCount), added };
    }

    private tokenize(text: string, startState: LineState): CachedLine {
        if (this.tokenizer === null)
            return { text, startState: EmptyState, endState: EmptyState, tokens: NoTokens, marks: NoMarks };

        const tokens: Token[] = [];
        const endState = this.tokenizer.tokenizeLine(text, startState, (from, to, kind) => tokens.push({ from, to, kind }));

        return { text, startState, endState, tokens, marks: NoMarks };
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

    /** The inner HTML of one line's element. */
    public renderLine(index: number): string {
        const line = this.lines[index];

        if (line === undefined)
            return "";

        return line.text.length === 0 ? "<span class=\"ui-code-input__code\"><br></span>" : `<span class="ui-code-input__code">${renderSegments(line.text, line.tokens, line.marks)}</span>`;
    }
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

export function escapeHtml(text: string): string {
    return text.replace(/[&<>]/g, character => character === "&" ? "&amp;" : character === "<" ? "&lt;" : "&gt;");
}
