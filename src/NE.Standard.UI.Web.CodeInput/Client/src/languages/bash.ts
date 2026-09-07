import type { Mode, TokenKind } from "../tokenizer.ts";
import { Stream, modeTokenizer, words } from "../tokenizer.ts";

// What the reader is inside of, innermost last: double quotes, a `$(…)` substitution, a `${…}` expansion or backticks.
type BashFrame = "\"" | "$(" | "${" | "`";

type BashState = {
    mode: "code" | "single" | "heredoc";
    frames: BashFrame[];
    /** The next word is a command name. */
    command: boolean;
    /** The tag that ends the here-document, once its first line has begun. */
    heredoc: string;
    /** A here-document was opened on this line; its body starts on the next. */
    heredocPending: string;
    /** `<<-` strips leading tabs from the tag line too. */
    heredocIndented: boolean;
    /** Inside `((…))`, where a word is a variable and nothing is a command. */
    arithmetic: boolean;
};

const Keywords = words(`
    if then else elif fi for while until do done case esac in function select time return exit local export declare readonly
    unset shift source break continue eval exec set trap
`);

/** After these the next word is again a command. */
const CommandAfter = words("if then else elif while until do time exec ! [ [[");

const Word = /[A-Za-z_][\w]*/y;
const Option = /--?[A-Za-z][\w-]*/y;
const Variable = /\$(?:[A-Za-z_]\w*|\d|[@*#?$!-])/y;
const Assignment = /[A-Za-z_]\w*(?=\+?=)/y;
const HeredocStart = /<<-?\s*(?:'([^']+)'|"([^"]+)"|\\?([A-Za-z_]\w*))/y;
const Operator = /\d?>>?|\d?>&\d?|<|\|\||&&|\||;;|;|&/y;

export const bashMode: Mode<BashState> = {
    initialState: () => ({ mode: "code", frames: [], command: true, heredoc: "", heredocPending: "", heredocIndented: false, arithmetic: false }),
    token(stream, state) {
        if (stream.sol()) {
            // A new line is a new command, unless a here-document opened on the one before.
            state.command = true;

            if (state.heredocPending !== "") {
                state.heredoc = state.heredocPending;
                state.heredocPending = "";
                state.mode = "heredoc";
            }
        }

        switch (state.mode) {
            case "single":
                return singleQuoted(stream, state);
            case "heredoc":
                return heredocLine(stream, state);
            default:
                return frameToken(stream, state);
        }
    }
};

function singleQuoted(stream: Stream, state: BashState): TokenKind {
    const end = stream.indexOf("'");

    stream.skipTo(end < 0 ? -1 : end + 1);

    if (end >= 0)
        state.mode = "code";

    return "string";
}

function heredocLine(stream: Stream, state: BashState): TokenKind {
    const line = state.heredocIndented ? stream.text.replace(/^\t+/, "") : stream.text;

    stream.skipToEnd();

    if (line === state.heredoc) {
        state.mode = "code";
        state.heredoc = "";
        state.command = true;

        return "keyword";
    }

    return "string";
}

function frameToken(stream: Stream, state: BashState): TokenKind | null {
    const frame = state.frames[state.frames.length - 1];

    if (frame === "\"")
        return doubleQuoted(stream, state);

    if (frame === "${")
        return expansion(stream, state);

    return codeToken(stream, state);
}

/** Inside double quotes: text, with `$…` and escapes picked out. */
function doubleQuoted(stream: Stream, state: BashState): TokenKind {
    if (stream.match("\"")) {
        state.frames.pop();

        return "string";
    }

    if (stream.match("\\")) {
        stream.next();

        return "escape";
    }

    const substitution = substitutionToken(stream, state);

    if (substitution !== null)
        return substitution;

    stream.next();

    while (!stream.eol()) {
        const character = stream.peek();

        if (character === "\"" || character === "\\" || character === "$" || character === "`")
            break;

        stream.next();
    }

    return "string";
}

/** `$(`, `${`, a backtick or a plain `$name`, wherever it stands. */
function substitutionToken(stream: Stream, state: BashState): TokenKind | null {
    if (stream.match("$(")) {
        state.frames.push("$(");
        state.command = true;

        return "punctuation";
    }

    if (stream.match("${")) {
        state.frames.push("${");

        // The whole `${…}` as one name, unless a substitution nested in it cuts it.
        return expansion(stream, state);
    }

    if (stream.match("`")) {
        if (state.frames[state.frames.length - 1] === "`")
            state.frames.pop();
        else {
            state.frames.push("`");
            state.command = true;
        }

        return "punctuation";
    }

    if (stream.match(Variable))
        return "variable";

    return null;
}

/** The inside of `${…}` as one name, nested substitutions included. */
function expansion(stream: Stream, state: BashState): TokenKind {
    while (!stream.eol()) {
        const character = stream.peek();

        if (character === "}") {
            stream.next();
            state.frames.pop();
            break;
        }

        if (character === "$" && (stream.peek(1) === "(" || stream.peek(1) === "{")) {
            if (stream.pos > stream.start)
                break;

            return substitutionToken(stream, state) ?? "variable";
        }

        stream.next();
    }

    return "variable";
}

function codeToken(stream: Stream, state: BashState): TokenKind | null {
    if (stream.eatWhile(/\s/))
        return null;

    const character = stream.peek();
    const afterSpace = stream.pos === 0 || /\s/.test(stream.text.charAt(stream.pos - 1));

    if (character === "#" && afterSpace) {
        stream.skipToEnd();

        return "comment";
    }

    if (character === "'") {
        stream.next();
        state.mode = "single";
        state.command = false;

        return singleQuoted(stream, state);
    }

    if (character === "\"") {
        stream.next();
        state.frames.push("\"");
        state.command = false;

        return "string";
    }

    if (stream.match("((")) {
        state.arithmetic = true;
        state.command = false;

        return "punctuation";
    }

    if (state.arithmetic && stream.match("))")) {
        state.arithmetic = false;
        state.command = true;

        return "punctuation";
    }

    if (state.arithmetic) {
        if (stream.match(/\d+/y))
            return "number";

        if (stream.match(Word))
            return "variable";

        if (stream.match(/[-+*/%=<>!&|^~?:,]+/y))
            return "operator";

        stream.next();

        return null;
    }

    if (stream.match(HeredocStart)) {
        const opened = stream.current();
        const tag = opened.replace(/^<<-?\s*/, "").replace(/^\\/, "").replace(/^['"]|['"]$/g, "");

        state.heredocPending = tag;
        state.heredocIndented = opened.startsWith("<<-");

        return "keyword";
    }

    const frame = state.frames[state.frames.length - 1];

    if (character === ")" && frame === "$(") {
        stream.next();
        state.frames.pop();
        state.command = false;

        return "punctuation";
    }

    const substitution = substitutionToken(stream, state);

    if (substitution !== null) {
        state.command = false;

        return substitution;
    }

    if (stream.match("\\")) {
        stream.next();

        return "escape";
    }

    if (stream.match("="))
        return "operator";

    if (stream.match(Operator)) {
        const operator = stream.current();

        state.command = operator === "|" || operator === "||" || operator === "&&" || operator === ";" || operator === "&" || operator === ";;";

        return "operator";
    }

    if (stream.match(/[(){}]/y)) {
        state.command = true;

        return "punctuation";
    }

    if (stream.match(Option)) {
        state.command = false;

        return "attribute";
    }

    if (state.command && stream.match(Assignment))
        return "variable";

    if (stream.match(Word)) {
        const word = stream.current();

        if (state.command && Keywords.has(word)) {
            state.command = CommandAfter.has(word);

            return "keyword";
        }

        if (state.command) {
            state.command = false;

            return "function";
        }

        return null;
    }

    if (stream.match(/\d+(?=\s|$)/y))
        return "number";

    if (stream.match(/\[\[?|\]\]?|!/y)) {
        state.command = true;

        return "keyword";
    }

    stream.next();

    return null;
}

export const bashTokenizer = modeTokenizer(bashMode);
