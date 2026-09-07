import type { Mode } from "../tokenizer.ts";
import { Stream, modeTokenizer, readQuoted } from "../tokenizer.ts";

type JsonState = Record<string, never>;

const NumberLiteral = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const Keyword = /(?:true|false|null)\b/y;
const KeyAhead = /\s*:/y;

/** A string that a colon follows is a key. */
function isKey(stream: Stream): boolean {
    KeyAhead.lastIndex = stream.pos;

    return KeyAhead.test(stream.text);
}

export const jsonMode: Mode<JsonState> = {
    initialState: () => ({}),
    token(stream) {
        if (stream.eatWhile(/\s/))
            return null;

        const character = stream.peek();

        if (character === "\"") {
            stream.next();
            readQuoted(stream, "\"");

            return isKey(stream) ? "property" : "string";
        }

        if (stream.match(NumberLiteral))
            return "number";

        if (stream.match(Keyword))
            return "keyword";

        if (stream.match(/[{}[\]:,]/y))
            return "punctuation";

        stream.next();

        return "invalid";
    }
};

export const jsonTokenizer = modeTokenizer(jsonMode);
