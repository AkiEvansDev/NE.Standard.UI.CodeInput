import type { Mode, TokenKind } from "../tokenizer.ts";
import { Stream, modeTokenizer, words } from "../tokenizer.ts";
import { isTypeName } from "./javascript.ts";

type PythonString = {
    /** `'`, `"`, `'''` or `"""`. */
    quote: string;
    raw: boolean;
    /** An f-string, whose `{…}` holes are code. */
    formatted: boolean;
};

type PythonState = {
    mode: "code" | "string";
    /** The open strings, innermost last: more than one only while inside an f-string's hole. */
    strings: PythonString[];
    /** One brace depth per open f-string hole, innermost last. */
    frames: number[];
    /** The word before was `def` or `class`, so the name that follows is what it declares. */
    declaring: "def" | "class" | null;
};

const Keywords = words(`
    False None True and as assert async await break class continue def del elif else except finally for from global if import in
    is lambda nonlocal not or pass raise return try while with yield match case
`);

const Builtins = words(`
    print len range int str float list dict set tuple bool type isinstance issubclass enumerate zip map filter sorted reversed min
    max sum abs any all open super object iter next getattr setattr hasattr callable format repr round divmod pow input id hash
    vars dir globals locals Exception ValueError TypeError KeyError IndexError RuntimeError StopIteration AttributeError
`);

const Identifier = /[A-Za-z_]\w*/y;
const NumberLiteral = /0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[jJ]?/y;
const StringStart = /(?:[rRbBuUfF]{1,2})?(?:'''|"""|'|")/y;
const Operator = /[+\-*/%=<>!&|^~@:]+|->/y;
const CallAhead = /\s*\(/y;

export const pythonMode: Mode<PythonState> = {
    initialState: () => ({ mode: "code", strings: [], frames: [], declaring: null }),
    token(stream, state) {
        return state.mode === "string" ? stringToken(stream, state) : codeToken(stream, state);
    }
};

function stringToken(stream: Stream, state: PythonState): TokenKind {
    const current = state.strings[state.strings.length - 1];

    if (current.formatted) {
        if (stream.match("{{") || stream.match("}}"))
            return "escape";

        if (stream.match("{")) {
            state.frames.push(0);
            state.mode = "code";

            return "punctuation";
        }
    }

    while (!stream.eol()) {
        const character = stream.peek();

        if (current.formatted && character === "{")
            return "string";

        if (!current.raw && character === "\\") {
            stream.next();
            stream.next();
            continue;
        }

        if (stream.match(current.quote)) {
            closeString(state);

            return "string";
        }

        stream.next();
    }

    // Only a triple-quoted string continues on the next line.
    if (current.quote.length === 1)
        closeString(state);

    return "string";
}

function closeString(state: PythonState): void {
    state.strings.pop();
    state.mode = "code";
}

function codeToken(stream: Stream, state: PythonState): TokenKind | null {
    if (stream.eatWhile(/\s/))
        return null;

    const character = stream.peek();

    if (character === "#") {
        stream.skipToEnd();

        return "comment";
    }

    if (stream.match(StringStart)) {
        const opened = stream.current();
        const quoteAt = opened.search(/['"]/);
        const prefix = opened.slice(0, quoteAt).toLowerCase();

        state.strings.push({ quote: opened.slice(quoteAt), raw: prefix.includes("r"), formatted: prefix.includes("f") });
        state.mode = "string";
        state.declaring = null;

        // The opening quote and the text after it are one token.
        return stringToken(stream, state);
    }

    if (stream.match(NumberLiteral)) {
        state.declaring = null;

        return "number";
    }

    if (character === "@" && stream.match(/@[A-Za-z_][\w.]*/y))
        return "meta";

    if (stream.match(Identifier)) {
        const word = stream.current();
        const declaring = state.declaring;
        state.declaring = null;

        if (Keywords.has(word)) {
            state.declaring = word === "def" || word === "class" ? word : null;

            return "keyword";
        }

        if (declaring === "def")
            return "function";

        if (declaring === "class")
            return "type";

        if (word === "self" || word === "cls")
            return "variable";

        CallAhead.lastIndex = stream.pos;

        if (CallAhead.test(stream.text))
            return "function";

        if (Builtins.has(word))
            return "type";

        return isTypeName(word) ? "type" : null;
    }

    if (character === "{") {
        stream.next();

        if (state.frames.length > 0)
            state.frames[state.frames.length - 1]++;

        return "punctuation";
    }

    if (character === "}") {
        stream.next();

        if (state.frames.length > 0) {
            const top = state.frames.length - 1;

            if (state.frames[top] === 0) {
                state.frames.pop();
                state.mode = "string";

                return "punctuation";
            }

            state.frames[top]--;
        }

        return "punctuation";
    }

    if (stream.match(/[()[\],;.]/y))
        return "punctuation";

    if (stream.match(Operator))
        return "operator";

    stream.next();

    return null;
}

export const pythonTokenizer = modeTokenizer(pythonMode);
