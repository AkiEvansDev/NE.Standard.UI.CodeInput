import type { Mode, TokenKind } from "../tokenizer.ts";
import { Stream, modeTokenizer, readQuoted, words } from "../tokenizer.ts";

// Where the reader stands: among selectors, inside a block, in a declaration's value, or in an at-rule's prelude
// (`@media screen and (max-width: 600px)`) up to its `{` or `;`.
type CssContext = "selector" | "block" | "value" | "prelude";

export type CssState = {
    context: CssContext;
    depth: number;
    comment: boolean;
    /** The word just read was a property name (or a less variable being assigned), so the colon that follows opens its value. */
    afterProperty: boolean;
    /** Inside an attribute selector's brackets: 1 before its operator, 2 after it. */
    bracket: number;
};

const Word = /-?[A-Za-z_][\w-]*/y;
const CustomProperty = /--[\w-]+/y;
const PropertyName = /--[\w-]+|-?[A-Za-z_][\w-]*/y;
const ColonAhead = /\s*:/y;
const NumberLiteral = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?:%|[a-zA-Z]+)?/y;
const HexColor = /#[\da-fA-F]{3,8}\b/y;
const FunctionAhead = /-?[A-Za-z_][\w-]*\(/y;
const LessInterpolation = /@\{[\w-]+\}/y;

/** The words an at-rule's prelude joins its conditions with. */
const PreludeKeywords = words("and not only or");

/** At-rules less shares with CSS; any other `@word` in less is a variable. */
const AtRules = words(`
    charset import namespace media supports document page font-face keyframes viewport counter-style font-feature-values layer
    property container scope starting-style plugin
`);

/**
 * Inside a block, a name before a colon is a property — unless a `{` opens before the statement ends (a nested selector like
 * `a:hover {`), or the colon is followed at once by a word (a pseudo-class).
 */
function isProperty(stream: Stream): boolean {
    PropertyName.lastIndex = stream.pos;

    const name = PropertyName.exec(stream.text);

    if (name === null)
        return false;

    ColonAhead.lastIndex = stream.pos + name[0].length;

    if (!ColonAhead.test(stream.text))
        return false;

    for (let i = ColonAhead.lastIndex; i < stream.end; i++) {
        const character = stream.text.charAt(i);

        if (character === ";" || character === "}")
            return true;

        if (character === "{")
            return false;
    }

    // A custom property's value may be anything; a plain one with no end on this line is a property when a space follows its colon.
    return name[0].startsWith("--") || /\s/.test(stream.text.charAt(ColonAhead.lastIndex)) || ColonAhead.lastIndex >= stream.end;
}

export function cssMode(less: boolean): Mode<CssState> {
    return {
        initialState: () => ({ context: "selector", depth: 0, comment: false, afterProperty: false, bracket: 0 }),
        token(stream, state) {
            if (state.comment) {
                const end = stream.indexOf("*/");

                stream.skipTo(end < 0 ? -1 : end + 2);
                state.comment = end < 0;

                return "comment";
            }

            if (stream.eatWhile(/\s/))
                return null;

            if (stream.match("/*")) {
                const end = stream.indexOf("*/");

                stream.skipTo(end < 0 ? -1 : end + 2);
                state.comment = end < 0;

                return "comment";
            }

            if (less && stream.match("//")) {
                stream.skipToEnd();

                return "comment";
            }

            const character = stream.peek();

            if (character === "\"" || character === "'") {
                stream.next();
                readQuoted(stream, character);

                return "string";
            }

            if (character === "{") {
                stream.next();
                state.depth++;
                state.context = "block";
                state.afterProperty = false;
                state.bracket = 0;

                return "punctuation";
            }

            if (character === "}") {
                stream.next();
                state.depth = Math.max(0, state.depth - 1);
                state.context = state.depth > 0 ? "block" : "selector";
                state.afterProperty = false;

                return "punctuation";
            }

            if (character === ";") {
                stream.next();
                state.context = state.depth > 0 ? "block" : "selector";
                state.afterProperty = false;

                return "punctuation";
            }

            if (character === ":" && state.afterProperty) {
                stream.next();
                state.context = "value";
                state.afterProperty = false;

                return "punctuation";
            }

            switch (state.context) {
                case "value":
                    return valueToken(stream, less);
                case "prelude":
                    return preludeToken(stream, less);
                case "block":
                    return statementToken(stream, state, less);
                default:
                    return state.depth === 0 && character === "@" ? statementToken(stream, state, less) : selectorToken(stream, state, less);
            }
        }
    };
}

/** The start of a statement: an at-rule, a less variable being assigned, a declaration, or else a nested rule's selector. */
function statementToken(stream: Stream, state: CssState, less: boolean): TokenKind | null {
    if (stream.peek() === "@" && !stream.match(LessInterpolation, false)) {
        stream.next();
        stream.eatWhile(/[\w-]/);

        const name = stream.current().slice(1).toLowerCase();

        if (less && !AtRules.has(name)) {
            // `@gap: 4px;` is assigned; `@detached();` is called, and reads on as a selector would.
            state.afterProperty = stream.match(ColonAhead, false);

            return "variable";
        }

        state.context = "prelude";

        return "meta";
    }

    if (isProperty(stream)) {
        const custom = stream.match(CustomProperty);

        if (!custom)
            stream.match(Word);

        state.afterProperty = true;

        // A declaration's name is coloured as Visual Studio colours it, which is the colour of markup's attribute names.
        return custom ? "variable" : "attribute";
    }

    state.context = "selector";

    return selectorToken(stream, state, less);
}

function selectorToken(stream: Stream, state: CssState, less: boolean): TokenKind | null {
    const character = stream.peek();

    if (state.bracket > 0)
        return attributeSelectorToken(stream, state);

    if (character === "@") {
        stream.next();

        if (stream.eat("{")) {
            stream.eatWhile(/[\w-]/);
            stream.eat("}");
        }
        else
            stream.eatWhile(/[\w-]/);

        return less ? "variable" : "meta";
    }

    if (character === "." || character === "#") {
        stream.next();
        readSelectorName(stream);

        return "selector";
    }

    if (character === ":") {
        stream.next();
        stream.eat(":");

        // A colon with no name after it is a less mixin parameter's default (`.rounded(@radius: 6px)`), not a pseudo-class.
        return readSelectorName(stream) ? "selector" : "punctuation";
    }

    if (character === "&") {
        stream.next();
        readSelectorName(stream);

        return "selector";
    }

    if (character === "*") {
        stream.next();

        return "selector";
    }

    if (character === "[") {
        stream.next();
        state.bracket = 1;

        return "punctuation";
    }

    if (character === "!") {
        stream.next();
        stream.eatWhile(/[\w-]/);

        return "keyword";
    }

    if (less && character === "~" && (stream.peek(1) === "\"" || stream.peek(1) === "'")) {
        stream.next();
        readQuoted(stream, stream.next());

        return "string";
    }

    if (stream.match(NumberLiteral))
        return "number";

    if (stream.match(/[>+~,()]/y))
        return "punctuation";

    if (stream.match(/[=<>]+/y))
        return "operator";

    if (stream.match(Word))
        return less && stream.current() === "when" ? "keyword" : "selector";

    stream.next();

    return null;
}

/** A name after `.`, `#`, `:` or `&`, less interpolations included; true when there was one. */
function readSelectorName(stream: Stream): boolean {
    const start = stream.pos;

    // Both halves of `.a-@{name}-b` are one name.
    while (stream.eatWhile(/[\w-]/) || stream.match(LessInterpolation))
        continue;

    return stream.pos > start;
}

/** `[name op value]`: the name is an attribute's, the value a value. */
function attributeSelectorToken(stream: Stream, state: CssState): TokenKind | null {
    if (stream.eat("]")) {
        state.bracket = 0;

        return "punctuation";
    }

    if (stream.match(/[~|^$*]?=/y)) {
        state.bracket = 2;

        return "operator";
    }

    if (stream.match(/[\w-]+/y))
        return state.bracket === 1 ? "attribute" : "value";

    stream.next();

    return null;
}

function preludeToken(stream: Stream, less: boolean): TokenKind | null {
    const character = stream.peek();

    if (character === "@") {
        stream.next();
        stream.eatWhile(/[\w-]/);

        return less ? "variable" : "meta";
    }

    const address = urlToken(stream);

    if (address !== null)
        return address;

    if (stream.match(FunctionAhead, false)) {
        stream.match(Word);

        return "function";
    }

    if (stream.match(NumberLiteral))
        return "number";

    if (stream.match(Word)) {
        const word = stream.current();

        if (PreludeKeywords.has(word.toLowerCase()))
            return "keyword";

        // A media feature is named as a property is: `(max-width: 600px)`.
        return stream.match(ColonAhead, false) ? "attribute" : "value";
    }

    if (stream.match(/[,():]/y))
        return "punctuation";

    if (stream.match(/[<>=]+/y))
        return "operator";

    stream.next();

    return null;
}

function valueToken(stream: Stream, less: boolean): TokenKind | null {
    const character = stream.peek();

    if (character === "!") {
        stream.next();
        stream.eatWhile(/[\w-]/);

        return "keyword";
    }

    if (character === "@" && less) {
        stream.next();
        stream.eat("@");
        stream.eatWhile(/[\w-]/);

        return "variable";
    }

    if (character === "~" && less && (stream.peek(1) === "\"" || stream.peek(1) === "'")) {
        stream.next();
        readQuoted(stream, stream.next());

        return "string";
    }

    if (stream.match(CustomProperty))
        return "variable";

    if (stream.match(HexColor))
        return "value";

    const address = urlToken(stream);

    if (address !== null)
        return address;

    if (stream.match(FunctionAhead, false)) {
        stream.match(Word);

        return "function";
    }

    if (stream.match(NumberLiteral))
        return "number";

    if (stream.match(Word))
        return "value";

    if (stream.match(/[,()]/y))
        return "punctuation";

    if (stream.match(/[+\-*/=<>]/y))
        return "operator";

    stream.next();

    return null;
}

/** `url(address)`, one token per call: the name as a function, the parenthesis, then an unquoted address as a string; null elsewhere. */
function urlToken(stream: Stream): TokenKind | null {
    if (stream.match(/url(?=\()/y))
        return "function";

    const before = stream.text.slice(Math.max(0, stream.pos - 4), stream.pos);

    if (stream.peek() === "(" && before.endsWith("url")) {
        stream.next();

        return "punctuation";
    }

    if (before === "url(" && stream.peek() !== "\"" && stream.peek() !== "'") {
        const end = stream.indexOf(")");

        stream.skipTo(end);

        return "string";
    }

    return null;
}

export const cssTokenizer = modeTokenizer(cssMode(false));
export const lessTokenizer = modeTokenizer(cssMode(true));
