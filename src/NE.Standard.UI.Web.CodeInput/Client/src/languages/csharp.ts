import type { Mode, TokenKind } from "../tokenizer.ts";
import { Stream, modeTokenizer, readQuoted, words } from "../tokenizer.ts";
import { isTypeName } from "./javascript.ts";

type CSharpState = {
    mode: "code" | "comment" | "verbatim" | "raw" | "interpolated";
    /** How many quotes opened the raw string, so only as many close it. */
    rawQuotes: number;
    /** One brace depth per open interpolation hole, innermost last. */
    frames: number[];
    /** Whether each open interpolated string, innermost last, is verbatim (`$@"`), which is what lets it span lines. */
    verbatims: boolean[];
    /** The word before was `new`, `class` or another that a type name follows, so the name is a type even with a call after it. */
    afterNew: boolean;
};

const Keywords = words(`
    abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum
    event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace
    new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc
    static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while
    add alias and ascending async await by descending dynamic equals from get global group init into join let managed nameof nint
    not notnull nuint on or orderby partial record remove required scoped select set unmanaged value var when where with yield file
`);

const Identifier = /@?[A-Za-z_][\w]*/y;
const NumberLiteral = /0[xX][\da-fA-F_]+[uUlL]*|0[bB][01_]+[uUlL]*|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[fFdDmMuUlL]*/y;
const CharLiteral = /'(?:\\.|[^'\\])'/y;
const Operator = /[+\-*/%=<>!&|^~?:]+/y;
const CallAhead = /\s*[(<]/y;
const Preprocessor = /#[a-z]+/y;

/** After these the next name is a type, whatever follows it — a primary constructor's list included. */
const TypeAfter = words("new class struct interface enum record is as");

export const csharpMode: Mode<CSharpState> = {
    initialState: () => ({ mode: "code", rawQuotes: 0, frames: [], verbatims: [], afterNew: false }),
    token(stream, state) {
        switch (state.mode) {
            case "comment":
                return blockComment(stream, state);
            case "verbatim":
                return verbatimToken(stream, state);
            case "raw":
                return rawToken(stream, state);
            case "interpolated":
                return interpolatedToken(stream, state);
            default:
                return codeToken(stream, state);
        }
    }
};

function blockComment(stream: Stream, state: CSharpState): TokenKind {
    const end = stream.indexOf("*/");

    stream.skipTo(end < 0 ? -1 : end + 2);
    state.mode = end < 0 ? "comment" : "code";

    return "comment";
}

/** `@"…"`: no escapes, `""` is a quote, and the line may end inside it. */
function verbatimToken(stream: Stream, state: CSharpState): TokenKind {
    while (!stream.eol()) {
        if (stream.match("\"\""))
            continue;

        if (stream.next() === "\"") {
            state.mode = "code";
            break;
        }
    }

    return "string";
}

function rawToken(stream: Stream, state: CSharpState): TokenKind {
    const closing = "\"".repeat(state.rawQuotes);
    const end = stream.indexOf(closing);

    stream.skipTo(end < 0 ? -1 : end + closing.length);

    if (end >= 0)
        state.mode = "code";

    return "string";
}

/** The text of a `$"…"` string between its holes; `{{` and `}}` are escapes, a lone `{` opens a hole of code. */
function interpolatedToken(stream: Stream, state: CSharpState): TokenKind {
    const verbatim = state.verbatims[state.verbatims.length - 1] === true;

    if (stream.match("{{") || stream.match("}}"))
        return "escape";

    if (stream.match("{")) {
        state.frames.push(0);
        state.mode = "code";

        return "punctuation";
    }

    while (!stream.eol()) {
        const character = stream.peek();

        // Stop before a brace, escape or hole alike, so it gets its own token.
        if (character === "{")
            return "string";

        if (verbatim && character === "\"" && stream.peek(1) === "\"") {
            stream.next();
            stream.next();
            continue;
        }

        if (!verbatim && character === "\\") {
            stream.next();
            stream.next();
            continue;
        }

        stream.next();

        if (character === "\"") {
            closeInterpolated(state);

            return "string";
        }
    }

    // An ordinary interpolated string cannot continue on the next line; a verbatim one can.
    if (!verbatim)
        closeInterpolated(state);

    return "string";
}

function closeInterpolated(state: CSharpState): void {
    state.verbatims.pop();
    state.mode = "code";
}

function codeToken(stream: Stream, state: CSharpState): TokenKind | null {
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

    if (character === "#" && stream.text.slice(0, stream.pos).trim() === "" && stream.match(Preprocessor)) {
        stream.skipToEnd();

        return "meta";
    }

    if (stream.match(/\$@"|@\$"/y)) {
        state.verbatims.push(true);
        state.mode = "interpolated";

        return "string";
    }

    if (stream.match(/\$+"""/y)) {
        // Raw and interpolated: read as raw, since a hole in it needs as many braces as dollars — beyond what this reader follows.
        state.rawQuotes = 3;
        state.mode = "raw";

        return "string";
    }

    if (stream.match("$\"")) {
        state.verbatims.push(false);
        state.mode = "interpolated";

        return "string";
    }

    if (stream.match("@\"")) {
        state.mode = "verbatim";

        return verbatimToken(stream, state);
    }

    if (stream.match(/"""+/y)) {
        state.rawQuotes = stream.current().length;
        state.mode = "raw";

        return rawToken(stream, state);
    }

    if (character === "\"") {
        stream.next();
        readQuoted(stream, "\"");

        return "string";
    }

    if (stream.match(CharLiteral))
        return "string";

    if (stream.match(NumberLiteral)) {
        state.afterNew = false;

        return "number";
    }

    if (stream.match(Identifier)) {
        const word = stream.current();

        if (word.charAt(0) !== "@" && Keywords.has(word)) {
            state.afterNew = TypeAfter.has(word);

            return "keyword";
        }

        const afterNew = state.afterNew;
        state.afterNew = false;

        const name = word.charAt(0) === "@" ? word.slice(1) : word;

        if (isTypeName(name)) {
            CallAhead.lastIndex = stream.pos;

            return !afterNew && CallAhead.test(stream.text) && stream.text.charAt(CallAhead.lastIndex - 1) === "(" ? "function" : "type";
        }

        CallAhead.lastIndex = stream.pos;

        return CallAhead.test(stream.text) && stream.text.charAt(CallAhead.lastIndex - 1) === "(" ? "function" : null;
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
                state.mode = "interpolated";

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

export const csharpTokenizer = modeTokenizer(csharpMode);
