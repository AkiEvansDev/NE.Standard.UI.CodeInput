import type { Mode, TokenKind } from "../tokenizer.ts";
import { Stream, modeTokenizer, readQuoted, words } from "../tokenizer.ts";

export type JsState = {
    mode: "code" | "comment" | "template";
    /** One brace depth per open `${` hole, innermost last. */
    frames: number[];
    /** Whether a `/` here starts a regex literal rather than a division. */
    regexAllowed: boolean;
};

// JavaScript and TypeScript in one list: a TypeScript word in JavaScript is either an identifier nobody uses or a mistake worth seeing.
const Keywords = words(`
    break case catch class const continue debugger default delete do else enum export extends finally for function if import in
    instanceof new return super switch this throw try typeof var void while with yield let static async await of get set
    abstract any as asserts boolean constructor declare implements interface is keyof module namespace never number object
    private protected public readonly require string symbol type unique unknown from global override satisfies bigint
    infer out accessor
`);

const Literals = words("true false null undefined NaN Infinity");

/** After these a `/` is a regex, not a division. */
const RegexAfterKeywords = words("return typeof case in of instanceof new delete void throw yield await else do");

const Identifier = /[A-Za-z_$][\w$]*/y;
const NumberLiteral = /0[xX][\da-fA-F_]+n?|0[bB][01_]+n?|0[oO][0-7_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?/y;
const Operator = /[+\-*/%=<>!&|^~?:]+/y;
const CallAhead = /\s*\(/y;

export const jsMode: Mode<JsState> = {
    initialState: () => ({ mode: "code", frames: [], regexAllowed: true }),
    token(stream, state) {
        switch (state.mode) {
            case "comment":
                return blockComment(stream, state);
            case "template":
                return templateToken(stream, state);
            default:
                return codeToken(stream, state);
        }
    }
};

function blockComment(stream: Stream, state: JsState): TokenKind {
    const end = stream.indexOf("*/");

    stream.skipTo(end < 0 ? -1 : end + 2);
    state.mode = end < 0 ? "comment" : "code";

    return "comment";
}

function templateToken(stream: Stream, state: JsState): TokenKind {
    if (stream.match("${")) {
        state.frames.push(0);
        state.mode = "code";
        state.regexAllowed = true;

        return "punctuation";
    }

    while (!stream.eol()) {
        const character = stream.peek();

        if (character === "\\") {
            stream.next();
            stream.next();
            continue;
        }

        if (character === "`") {
            stream.next();
            state.mode = "code";
            state.regexAllowed = false;

            return "string";
        }

        if (character === "$" && stream.peek(1) === "{")
            return "string";

        stream.next();
    }

    return "string";
}

function codeToken(stream: Stream, state: JsState): TokenKind | null {
    if (stream.eatWhile(/\s/))
        return null;

    const character = stream.peek();

    if (stream.match("//")) {
        stream.skipToEnd();

        return "comment";
    }

    if (stream.match("/*")) {
        state.mode = "comment";

        return blockComment(stream, state);
    }

    if (character === "\"" || character === "'") {
        stream.next();
        readQuoted(stream, character);
        state.regexAllowed = false;

        return "string";
    }

    if (character === "`") {
        stream.next();
        state.mode = "template";

        // The opening backtick and the text after it are one token, as a quoted string is.
        return templateToken(stream, state);
    }

    if (stream.match(NumberLiteral)) {
        state.regexAllowed = false;

        return "number";
    }

    if (character === "@") {
        stream.next();
        stream.match(Identifier);

        return "meta";
    }

    if (stream.match(Identifier)) {
        const word = stream.current();

        if (Keywords.has(word)) {
            state.regexAllowed = RegexAfterKeywords.has(word);

            return "keyword";
        }

        state.regexAllowed = false;

        if (Literals.has(word))
            return "keyword";

        CallAhead.lastIndex = stream.pos;

        if (CallAhead.test(stream.text))
            return "function";

        return isTypeName(word) ? "type" : null;
    }

    if (character === "/" && state.regexAllowed && readRegex(stream)) {
        state.regexAllowed = false;

        return "regex";
    }

    if (stream.match(Operator)) {
        state.regexAllowed = true;

        return "operator";
    }

    if (character === "{") {
        stream.next();

        if (state.frames.length > 0)
            state.frames[state.frames.length - 1]++;

        state.regexAllowed = true;

        return "punctuation";
    }

    if (character === "}") {
        stream.next();

        if (state.frames.length > 0) {
            const top = state.frames.length - 1;

            if (state.frames[top] === 0) {
                state.frames.pop();
                state.mode = "template";

                return "punctuation";
            }

            state.frames[top]--;
        }

        state.regexAllowed = true;

        return "punctuation";
    }

    if (stream.match(/[([,;]/y)) {
        state.regexAllowed = true;

        return "punctuation";
    }

    if (stream.match(/[)\].]/y)) {
        state.regexAllowed = false;

        return "punctuation";
    }

    stream.next();

    return null;
}

/** A regex literal from the `/` under the reader to its closing `/` and flags; false, consuming nothing, when the line ends first. */
function readRegex(stream: Stream): boolean {
    const start = stream.pos;
    let inClass = false;

    stream.next();

    while (!stream.eol()) {
        const character = stream.next();

        if (character === "\\") {
            stream.next();
            continue;
        }

        if (inClass) {
            if (character === "]")
                inClass = false;

            continue;
        }

        if (character === "[")
            inClass = true;
        else if (character === "/") {
            stream.eatWhile(/[gimsuyd]/);

            return true;
        }
    }

    stream.pos = start;

    return false;
}

export function isTypeName(word: string): boolean {
    const first = word.charAt(0);

    return first >= "A" && first <= "Z";
}

export const javascriptTokenizer = modeTokenizer(jsMode);
