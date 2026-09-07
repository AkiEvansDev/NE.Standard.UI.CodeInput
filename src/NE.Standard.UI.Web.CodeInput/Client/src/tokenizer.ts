// The contract every language is written against: a line at a time, carrying a small state from one line to the next, so the
// highlighter can re-read only the lines an edit touched and stop where the state settles back to what it was.

export type TokenKind =
    | "keyword"
    | "string"
    | "number"
    | "comment"
    | "property"
    | "tag"
    | "attribute"
    | "punctuation"
    | "operator"
    | "type"
    | "function"
    | "variable"
    | "regex"
    | "meta"
    | "escape"
    | "invalid";

export type Token = {
    readonly from: number;
    readonly to: number;
    readonly kind: TokenKind;
};

/** A language's state between lines: a plain object of primitives, arrays and nested states, compared structurally. */
export type LineState = Readonly<Record<string, unknown>>;

export type EmitToken = (from: number, to: number, kind: TokenKind) => void;

export type Tokenizer = {
    readonly initialState: LineState;
    /** Emits one line's tokens in order and returns the state the next line starts in; never mutates the state it was given. */
    tokenizeLine(line: string, state: LineState, emit: EmitToken): LineState;
};

/** A language mode in the stream shape: one token per call, advancing the stream and mutating its own copy of the state. */
export type Mode<TState extends object> = {
    initialState(): TState;
    token(stream: Stream, state: TState): TokenKind | null;
};

/** A reader over one line, bounded to `end` so an embedded language can be run over a slice of it. */
export class Stream {
    public readonly text: string;
    public readonly end: number;
    public pos: number;
    public start: number;

    public constructor(text: string, start = 0, end = text.length) {
        this.text = text;
        this.end = end;
        this.pos = start;
        this.start = start;
    }

    public eol(): boolean {
        return this.pos >= this.end;
    }

    public peek(offset = 0): string {
        const index = this.pos + offset;

        return index < this.end ? this.text.charAt(index) : "";
    }

    public next(): string {
        return this.pos < this.end ? this.text.charAt(this.pos++) : "";
    }

    public eat(expected: string | RegExp): string | null {
        const character = this.peek();

        if (character === "")
            return null;

        const matches = typeof expected === "string" ? character === expected : expected.test(character);

        if (!matches)
            return null;

        this.pos++;

        return character;
    }

    public eatWhile(expected: RegExp): boolean {
        const start = this.pos;

        while (this.pos < this.end && expected.test(this.text.charAt(this.pos)))
            this.pos++;

        return this.pos > start;
    }

    /** Matches at the current position — a sticky regex or a literal — consuming it unless told not to. */
    public match(expected: string | RegExp, consume = true): boolean {
        if (typeof expected === "string") {
            if (!this.text.startsWith(expected, this.pos) || this.pos + expected.length > this.end)
                return false;

            if (consume)
                this.pos += expected.length;

            return true;
        }

        expected.lastIndex = this.pos;
        const found = expected.exec(this.text);

        if (found === null || found.index !== this.pos || this.pos + found[0].length > this.end)
            return false;

        if (consume)
            this.pos += found[0].length;

        return true;
    }

    /** Where `needle` next occurs on this line, or -1. */
    public indexOf(needle: string): number {
        const index = this.text.indexOf(needle, this.pos);

        return index >= 0 && index + needle.length <= this.end ? index : -1;
    }

    public skipToEnd(): void {
        this.pos = this.end;
    }

    /** Skips ahead to `index`, or to the end of the line when it is negative. */
    public skipTo(index: number): void {
        this.pos = index < 0 ? this.end : Math.min(index, this.end);
    }

    public current(): string {
        return this.text.slice(this.start, this.pos);
    }

    /** True at the very start of the line, ignoring nothing. */
    public sol(): boolean {
        return this.pos === 0;
    }
}

/** Wraps a mode into a tokenizer: copies the state, runs the mode to the end of the line, and returns the copy. */
export function modeTokenizer<TState extends object>(mode: Mode<TState>): Tokenizer {
    return {
        initialState: mode.initialState() as LineState,
        tokenizeLine(line, state, emit) {
            const working = cloneState(state) as TState;

            runMode(new Stream(line), working, mode, emit);

            return working as LineState;
        }
    };
}

/** Runs a mode over a stream's remaining range, emitting tokens; a mode that consumed nothing is moved one character on. */
export function runMode<TState extends object>(stream: Stream, state: TState, mode: Mode<TState>, emit: EmitToken): void {
    while (!stream.eol()) {
        stream.start = stream.pos;

        const kind = mode.token(stream, state);

        if (stream.pos === stream.start)
            stream.pos++;

        if (kind !== null)
            emit(stream.start, stream.pos, kind);
    }
}

export function cloneState(state: unknown): unknown {
    if (Array.isArray(state))
        return state.map(cloneState);

    if (state !== null && typeof state === "object") {
        const copy: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(state))
            copy[key] = cloneState(value);

        return copy;
    }

    return state;
}

/** Structural equality over the plain shapes a state is made of. */
export function statesEqual(a: unknown, b: unknown): boolean {
    if (a === b)
        return true;

    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
            return false;

        for (let i = 0; i < a.length; i++) {
            if (!statesEqual(a[i], b[i]))
                return false;
        }

        return true;
    }

    if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
        const left = a as Record<string, unknown>;
        const right = b as Record<string, unknown>;
        const keys = Object.keys(left);

        if (keys.length !== Object.keys(right).length)
            return false;

        for (const key of keys) {
            if (!statesEqual(left[key], right[key]))
                return false;
        }

        return true;
    }

    return false;
}

/** A word set for keyword lookups. */
export function words(list: string): ReadonlySet<string> {
    return new Set(list.split(/\s+/).filter(word => word.length > 0));
}

/** Reads a string literal body to its closing quote on this line; true when it closed, false when the line ended inside it. */
export function readQuoted(stream: Stream, quote: string, escapes = true): boolean {
    while (!stream.eol()) {
        const character = stream.next();

        if (escapes && character === "\\") {
            stream.next();
            continue;
        }

        if (character === quote)
            return true;
    }

    return false;
}
