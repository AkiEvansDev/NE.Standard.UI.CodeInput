import type { Mode, TokenKind } from "../tokenizer.ts";
import { Stream, modeTokenizer, readQuoted } from "../tokenizer.ts";
import type { CssState } from "./css.ts";
import { cssMode } from "./css.ts";
import type { JsState } from "./javascript.ts";
import { jsMode } from "./javascript.ts";

type HtmlState = {
    mode: "text" | "tag" | "comment" | "attribute-value" | "script" | "style";
    /** The open tag's name, lower-cased, while inside it. */
    tag: string;
    closing: boolean;
    quote: string;
    /** The embedded language's own state while inside `<script>` or `<style>`. */
    inner: JsState | CssState | null;
    /** Where the closing tag starts on the line being read, found once per line; -1 when it is not on it. */
    closingAt: number | null;
};

const TagOpen = /<\/?[A-Za-z][\w:-]*/y;
const AttributeName = /[^\s"'<>/=]+/y;
const UnquotedValue = /[^\s"'<>`=]+/y;
const Entity = /&(?:#\d+|#x[\da-fA-F]+|[A-Za-z]\w*);/y;

const css = cssMode(false);

export const htmlMode: Mode<HtmlState> = {
    initialState: () => ({ mode: "text", tag: "", closing: false, quote: "", inner: null, closingAt: null }),
    token(stream, state) {
        switch (state.mode) {
            case "comment":
                return comment(stream, state);
            case "tag":
                return tagToken(stream, state);
            case "attribute-value":
                return attributeValue(stream, state);
            case "script":
                return embedded(stream, state, "script");
            case "style":
                return embedded(stream, state, "style");
            default:
                return textToken(stream, state);
        }
    }
};

function comment(stream: Stream, state: HtmlState): TokenKind {
    const end = stream.indexOf("-->");

    stream.skipTo(end < 0 ? -1 : end + 3);
    state.mode = end < 0 ? "comment" : "text";

    return "comment";
}

function textToken(stream: Stream, state: HtmlState): TokenKind | null {
    if (stream.match("<!--")) {
        state.mode = "comment";

        return comment(stream, state);
    }

    if (stream.match("<!")) {
        const end = stream.indexOf(">");

        stream.skipTo(end < 0 ? -1 : end + 1);

        return "meta";
    }

    if (stream.match(TagOpen)) {
        const opened = stream.current();

        state.closing = opened.startsWith("</");
        state.tag = opened.slice(state.closing ? 2 : 1).toLowerCase();
        state.mode = "tag";

        return "tag";
    }

    if (stream.match(Entity))
        return "escape";

    // Plain text up to the next thing that could start markup.
    stream.next();

    while (!stream.eol() && stream.peek() !== "<" && stream.peek() !== "&")
        stream.next();

    return null;
}

function tagToken(stream: Stream, state: HtmlState): TokenKind | null {
    if (stream.eatWhile(/\s/))
        return null;

    if (stream.match("/>")) {
        state.mode = "text";

        return "punctuation";
    }

    if (stream.match(">")) {
        if (!state.closing && state.tag === "script") {
            state.mode = "script";
            state.inner = jsMode.initialState();
        }
        else if (!state.closing && state.tag === "style") {
            state.mode = "style";
            state.inner = css.initialState();
        }
        else
            state.mode = "text";

        return "punctuation";
    }

    if (stream.match("="))
        return "operator";

    const character = stream.peek();

    if (character === "\"" || character === "'") {
        stream.next();

        if (!readQuoted(stream, character, false)) {
            state.mode = "attribute-value";
            state.quote = character;
        }

        return "string";
    }

    if (stream.match(AttributeName)) {
        // After `=` what looks like a name is the value; the equals sign was the token before.
        return stream.text.slice(0, stream.start).trimEnd().endsWith("=") ? "string" : "attribute";
    }

    if (stream.match(UnquotedValue))
        return "string";

    stream.next();

    return null;
}

function attributeValue(stream: Stream, state: HtmlState): TokenKind {
    if (readQuoted(stream, state.quote, false))
        state.mode = "tag";

    return "string";
}

/** One token of the embedded language, bounded to where its closing tag starts on this line. */
function embedded(stream: Stream, state: HtmlState, kind: "script" | "style"): TokenKind | null {
    const closing = `</${kind}`;

    // Found once per line: the first call on a line is at its start, and the answer holds until the tag is consumed.
    if (stream.pos === 0 || state.closingAt === null)
        state.closingAt = indexOfIgnoringCase(stream, kind === "script" ? ClosingScript : ClosingStyle);

    const closingIndex = state.closingAt;

    if (closingIndex === stream.pos) {
        stream.skipTo(closingIndex + closing.length);
        state.mode = "tag";
        state.tag = kind;
        state.closing = true;
        state.inner = null;
        state.closingAt = null;

        return "tag";
    }

    const end = closingIndex < 0 ? stream.end : closingIndex;
    const inner = new Stream(stream.text, stream.pos, end);
    inner.start = stream.pos;

    const token = kind === "script"
        ? jsMode.token(inner, state.inner as JsState)
        : css.token(inner, state.inner as CssState);

    stream.pos = inner.pos > inner.start ? inner.pos : inner.start + 1;

    return token;
}

const ClosingScript = /<\/script/gi;
const ClosingStyle = /<\/style/gi;

function indexOfIgnoringCase(stream: Stream, needle: RegExp): number {
    needle.lastIndex = stream.pos;

    const found = needle.exec(stream.text);

    return found === null || found.index + found[0].length > stream.end ? -1 : found.index;
}

export const htmlTokenizer = modeTokenizer(htmlMode);
