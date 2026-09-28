import type { Mode, TokenKind, Tokenizer } from "../tokenizer.ts";
import { Stream, modeTokenizer, words } from "../tokenizer.ts";

// What the reader is inside of, innermost last: double quotes, a `$(…)` substitution, a `${…}` expansion, backticks, or `((…))`
// arithmetic standing as a command or `$((…))` standing as a word.
type BashFrame = "\"" | "$(" | "${" | "`" | "((" | "$((";

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
    /** The frame depth an assignment's value is read at, so the space that ends it makes the next word a command; -1 outside one. */
    valueDepth: number;
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
// `>&` ahead of `>`, or `2>&1` would read as `2>` and a lone `&` that starts a command.
const Operator = /\d?>&\d?|\d?>>?|<|\|\||&&|\||;;|;|&/y;

const bashMode: Mode<BashState> = {
    initialState: () => ({ mode: "code", frames: [], command: true, heredoc: "", heredocPending: "", heredocIndented: false, valueDepth: -1 }),
    token(stream, state) {
        if (stream.sol()) {
            // A new line is a new command, unless a here-document opened on the one before.
            state.command = true;
            state.valueDepth = -1;

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

/**
 * `$((`, `$(`, `${`, a backtick or a plain `$name`, wherever it stands. An opened substitution starts with a command; anything else
 * is a word, after which a command is no longer due.
 */
function substitutionToken(stream: Stream, state: BashState): TokenKind | null {
    // Arithmetic before a substitution: `$((i * 5))` holds no command, where `$(` and a subshell's `(` would make `i` one.
    if (stream.match("$((")) {
        state.frames.push("$((");
        state.command = false;

        return "punctuation";
    }

    if (stream.match("$(")) {
        state.frames.push("$(");
        state.command = true;

        return "punctuation";
    }

    if (stream.match("${")) {
        state.frames.push("${");
        state.command = false;

        // The whole `${…}` as one name, unless a substitution nested in it cuts it.
        return expansion(stream, state);
    }

    if (stream.match("`")) {
        if (state.frames[state.frames.length - 1] === "`") {
            state.frames.pop();
            state.command = false;
        }
        else {
            state.frames.push("`");
            state.command = true;
        }

        return "punctuation";
    }

    if (stream.match(Variable)) {
        state.command = false;

        return "variable";
    }

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
    if (stream.eatWhile(/\s/)) {
        // The space that ends an assignment's value leaves the next word a command, as it was before the assignment.
        if (state.valueDepth === state.frames.length) {
            state.command = true;
            state.valueDepth = -1;
        }

        return null;
    }

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
        state.frames.push("((");
        state.command = false;

        return "punctuation";
    }

    const frame = state.frames[state.frames.length - 1];
    const arithmetic = frame === "((" || frame === "$((";

    if (arithmetic && stream.match("))")) {
        state.frames.pop();
        // `((…))` was a command, and what follows it may be another; `$((…))` was a word within one.
        state.command = frame === "((";

        return "punctuation";
    }

    if (arithmetic) {
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

    if (character === ")" && frame === "$(") {
        stream.next();
        state.frames.pop();
        state.command = false;

        return "punctuation";
    }

    const substitution = substitutionToken(stream, state);

    if (substitution !== null)
        return substitution;

    if (stream.match("\\")) {
        stream.next();

        return "escape";
    }

    if (stream.match("=")) {
        // Right after an assignment's name the command is yet to come: the value is a word, not the command.
        if (state.command) {
            state.command = false;
            state.valueDepth = state.frames.length;
        }

        return "operator";
    }

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

// Completions offer the language's own words beside a file's and a script's.
export const bashTokenizer: Tokenizer = { ...modeTokenizer(bashMode), keywords: [...Keywords] };
