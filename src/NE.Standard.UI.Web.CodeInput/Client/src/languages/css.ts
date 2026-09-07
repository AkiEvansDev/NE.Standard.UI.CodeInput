import type { Mode, TokenKind } from "../tokenizer.ts";
import { Stream, modeTokenizer, readQuoted } from "../tokenizer.ts";

// Where the reader stands: among selectors (or at-rules), inside a block before a declaration, or in a declaration's value.
type CssContext = "selector" | "block" | "value";

export type CssState = {
    context: CssContext;
    depth: number;
    comment: boolean;
    /** The word just read was a property name, so the colon that follows opens its value. */
    afterProperty: boolean;
};

const Word = /-?[A-Za-z_][\w-]*/y;
const PropertyAhead = /\s*:/y;
const NumberLiteral = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?:%|[a-zA-Z]+)?/y;
const HexColor = /#[\da-fA-F]{3,8}\b/y;
const FunctionCall = /-?[A-Za-z_][\w-]*\(/y;

/** Inside a block a word before a colon is a property — unless a `{` opens before the statement ends, which makes it a nested selector. */
function isProperty(stream: Stream): boolean {
    Word.lastIndex = stream.pos;

    const word = Word.exec(stream.text);

    if (word === null)
        return false;

    PropertyAhead.lastIndex = stream.pos + word[0].length;

    if (!PropertyAhead.test(stream.text))
        return false;

    for (let i = PropertyAhead.lastIndex; i < stream.end; i++) {
        const character = stream.text.charAt(i);

        if (character === ";" || character === "}")
            return true;

        if (character === "{")
            return false;
    }

    return true;
}

export function cssMode(less: boolean): Mode<CssState> {
    return {
        initialState: () => ({ context: "selector", depth: 0, comment: false, afterProperty: false }),
        token(stream, state) {
            if (state.comment) {
                const end = stream.indexOf("*/");

                stream.skipTo(end < 0 ? -1 : end + 2);
                state.comment = end >= 0 ? false : true;

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
                case "block":
                    if (isProperty(stream)) {
                        stream.match(Word);
                        state.afterProperty = true;

                        return "property";
                    }

                    // A less mixin call or a nested rule: read as a selector from here to its `{` or `;`.
                    state.context = "selector";

                    return selectorToken(stream, less);
                default:
                    return selectorToken(stream, less);
            }
        }
    };
}

function selectorToken(stream: Stream, less: boolean): TokenKind | null {
    const character = stream.peek();

    if (character === "@") {
        stream.next();
        stream.eatWhile(/[\w-]/);

        // `@media` and its kind are keywords; a less variable being assigned or mixed in is a variable.
        return less && stream.match(/\s*[:(]/y, false) ? "variable" : "keyword";
    }

    if (character === "." || character === "#") {
        stream.next();
        stream.eatWhile(/[\w-]/);

        return "attribute";
    }

    if (character === ":") {
        stream.next();
        stream.eat(":");
        stream.eatWhile(/[\w-]/);

        return "keyword";
    }

    if (character === "&" || character === "*") {
        stream.next();

        return "keyword";
    }

    if (character === "[") {
        stream.next();
        stream.eatWhile(/[\w-]/);

        return "attribute";
    }

    if (stream.match(/[=~|^$*]?=/y))
        return "operator";

    if (character === "\"" || character === "'") {
        stream.next();
        readQuoted(stream, character);

        return "string";
    }

    if (stream.match(/[>+~,()\]]/y))
        return "punctuation";

    if (stream.match(Word))
        return "tag";

    if (stream.match(NumberLiteral))
        return "number";

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
        stream.eatWhile(/[\w-]/);

        return "variable";
    }

    if (character === "~" && less && (stream.peek(1) === "\"" || stream.peek(1) === "'")) {
        stream.next();
        const quote = stream.next();
        readQuoted(stream, quote);

        return "string";
    }

    if (stream.match(HexColor))
        return "number";

    if (stream.match(/url\(/y)) {
        const end = stream.indexOf(")");

        stream.skipTo(end < 0 ? -1 : end + 1);

        return "string";
    }

    if (stream.match(FunctionCall, false)) {
        stream.match(Word);

        return "function";
    }

    if (stream.match(NumberLiteral))
        return "number";

    if (stream.match(Word))
        return null;

    if (stream.match(/[,()]/y))
        return "punctuation";

    if (stream.match(/[+\-*/=<>]/y))
        return "operator";

    stream.next();

    return null;
}

export const cssTokenizer = modeTokenizer(cssMode(false));
export const lessTokenizer = modeTokenizer(cssMode(true));
