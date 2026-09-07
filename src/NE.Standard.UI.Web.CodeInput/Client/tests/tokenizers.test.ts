// Each language on a short piece of itself: the kinds the words come out as, across lines where the state has to carry.

import assert from "node:assert/strict";
import test from "node:test";

import type { Tokenizer, TokenKind } from "../src/tokenizer.ts";
import { bashTokenizer } from "../src/languages/bash.ts";
import { csharpTokenizer } from "../src/languages/csharp.ts";
import { cssTokenizer, lessTokenizer } from "../src/languages/css.ts";
import { htmlTokenizer } from "../src/languages/html.ts";
import { javascriptTokenizer } from "../src/languages/javascript.ts";
import { jsonTokenizer } from "../src/languages/json.ts";
import { pythonTokenizer } from "../src/languages/python.ts";

type Tagged = { readonly text: string; readonly kind: TokenKind };

function tokensOf(tokenizer: Tokenizer, source: string): Tagged[] {
    const result: Tagged[] = [];
    let state = tokenizer.initialState;

    for (const line of source.split("\n"))
        state = tokenizer.tokenizeLine(line, state, (from, to, kind) => result.push({ text: line.slice(from, to), kind }));

    return result;
}

function kindOf(tokens: readonly Tagged[], text: string): TokenKind | undefined {
    return tokens.find(token => token.text === text)?.kind;
}

test("json keys, values and literals", () => {
    const tokens = tokensOf(jsonTokenizer, "{ \"name\": \"ne\", \"count\": 12.5e3, \"on\": true, \"none\": null }");

    assert.equal(kindOf(tokens, "\"name\""), "property");
    assert.equal(kindOf(tokens, "\"ne\""), "string");
    assert.equal(kindOf(tokens, "12.5e3"), "number");
    assert.equal(kindOf(tokens, "true"), "keyword");
    assert.equal(kindOf(tokens, "null"), "keyword");
    assert.equal(kindOf(tokens, "{"), "punctuation");
});

test("json rejects what is not json", () => {
    assert.equal(kindOf(tokensOf(jsonTokenizer, "{ x: 1 }"), "x"), "invalid");
});

test("css selectors, properties and values", () => {
    const tokens = tokensOf(cssTokenizer, ".card > a:hover {\n    color: #fff;\n    width: calc(100% - 2rem);\n}");

    assert.equal(kindOf(tokens, ".card"), "attribute");
    assert.equal(kindOf(tokens, "a"), "tag");
    assert.equal(kindOf(tokens, ":hover"), "keyword");
    assert.equal(kindOf(tokens, "color"), "property");
    assert.equal(kindOf(tokens, "#fff"), "number");
    assert.equal(kindOf(tokens, "calc"), "function");
    assert.equal(kindOf(tokens, "100%"), "number");
});

test("css block comment carries across lines", () => {
    const tokens = tokensOf(cssTokenizer, "/* one\ntwo */ a { }");

    assert.equal(tokens[0].kind, "comment");
    assert.equal(kindOf(tokens, "two */"), "comment");
    assert.equal(kindOf(tokens, "a"), "tag");
});

test("less variables, nesting and line comments", () => {
    const tokens = tokensOf(lessTokenizer, "@gap: 4px; // air\n.a {\n    &:hover { margin: @gap; }\n    .b { color: red; }\n}");

    assert.equal(kindOf(tokens, "@gap"), "variable");
    assert.equal(kindOf(tokens, "// air"), "comment");
    assert.equal(kindOf(tokens, "&"), "keyword");
    assert.equal(kindOf(tokens, "margin"), "property");
    assert.equal(kindOf(tokens, ".b"), "attribute");
    assert.equal(kindOf(tokens, "color"), "property");
});

test("javascript keywords, strings, regex and template holes", () => {
    const tokens = tokensOf(javascriptTokenizer, "const re = /a\\/b/gi; // trailing\nlet s = `x ${count + 1} y`;\nclass Foo extends Bar { run(a) { return a / 2; } }");

    assert.equal(kindOf(tokens, "const"), "keyword");
    assert.equal(kindOf(tokens, "/a\\/b/gi"), "regex");
    assert.equal(kindOf(tokens, "// trailing"), "comment");
    assert.equal(kindOf(tokens, "`x "), "string");
    assert.equal(kindOf(tokens, "${"), "punctuation");
    assert.equal(kindOf(tokens, "count"), undefined);
    assert.equal(kindOf(tokens, " y`"), "string");
    assert.equal(kindOf(tokens, "Foo"), "type");
    assert.equal(kindOf(tokens, "run"), "function");
    assert.equal(kindOf(tokens, "/"), "operator");
});

test("javascript block comment and template carry across lines", () => {
    const tokens = tokensOf(javascriptTokenizer, "/* a\nb */ const t = `one\ntwo`; x = 1;");

    assert.equal(kindOf(tokens, "b */"), "comment");
    assert.equal(kindOf(tokens, "`one"), "string");
    assert.equal(kindOf(tokens, "two`"), "string");
    assert.equal(kindOf(tokens, "1"), "number");
});

test("typescript words are keywords too", () => {
    const tokens = tokensOf(javascriptTokenizer, "interface A { readonly x: number }\ntype B = keyof A;");

    assert.equal(kindOf(tokens, "interface"), "keyword");
    assert.equal(kindOf(tokens, "readonly"), "keyword");
    assert.equal(kindOf(tokens, "keyof"), "keyword");
});

test("html tags, attributes, entities and embedded script and style", () => {
    const tokens = tokensOf(htmlTokenizer, "<!doctype html>\n<div class=\"a\" hidden>&amp;<!-- c --></div>\n<style>a { color: red; }</style>\n<script>\nlet x = \"s\";\n</script>");

    assert.equal(kindOf(tokens, "<!doctype html>"), "meta");
    assert.equal(kindOf(tokens, "<div"), "tag");
    assert.equal(kindOf(tokens, "class"), "attribute");
    assert.equal(kindOf(tokens, "\"a\""), "string");
    assert.equal(kindOf(tokens, "hidden"), "attribute");
    assert.equal(kindOf(tokens, "&amp;"), "escape");
    assert.equal(kindOf(tokens, "<!-- c -->"), "comment");
    assert.equal(kindOf(tokens, "</div"), "tag");
    assert.equal(kindOf(tokens, "color"), "property");
    assert.equal(kindOf(tokens, "</style"), "tag");
    assert.equal(kindOf(tokens, "let"), "keyword");
    assert.equal(kindOf(tokens, "\"s\""), "string");
    assert.equal(kindOf(tokens, "</script"), "tag");
});

test("csharp keywords, strings, types, calls and holes", () => {
    const tokens = tokensOf(csharpTokenizer, "#if DEBUG\nvar s = $\"a {Count} b\"; // c\nvar v = @\"x\"\"y\n z\";\npublic sealed class Foo(int id) : Bar { void Run() => Console.WriteLine(new Baz()); }");

    assert.equal(kindOf(tokens, "#if DEBUG"), "meta");
    assert.equal(kindOf(tokens, "var"), "keyword");
    assert.equal(kindOf(tokens, "a "), "string");
    assert.equal(kindOf(tokens, "Count"), "type");
    assert.equal(kindOf(tokens, " b\""), "string");
    assert.equal(kindOf(tokens, "// c"), "comment");
    assert.equal(kindOf(tokens, "@\"x\"\"y"), "string");
    assert.equal(kindOf(tokens, " z\""), "string");
    assert.equal(kindOf(tokens, "Foo"), "type");
    assert.equal(kindOf(tokens, "Run"), "function");
    assert.equal(kindOf(tokens, "WriteLine"), "function");
    assert.equal(kindOf(tokens, "Baz"), "type");
});

test("csharp raw string carries across lines", () => {
    const tokens = tokensOf(csharpTokenizer, "var r = \"\"\"\n  {\"a\": 1}\n  \"\"\";\nint n = 0x1F;");

    assert.equal(kindOf(tokens, "  {\"a\": 1}"), "string");
    assert.equal(kindOf(tokens, "0x1F"), "number");
});

test("python definitions, strings, decorators and f-string holes", () => {
    const tokens = tokensOf(pythonTokenizer, "@dataclass\nclass Point:\n    def move(self, dx: int) -> None:  # step\n        print(f\"at {self.x + dx}!\")\n        s = '''multi\nline'''\n        return None");

    assert.equal(kindOf(tokens, "@dataclass"), "meta");
    assert.equal(kindOf(tokens, "class"), "keyword");
    assert.equal(kindOf(tokens, "Point"), "type");
    assert.equal(kindOf(tokens, "move"), "function");
    assert.equal(kindOf(tokens, "self"), "variable");
    assert.equal(kindOf(tokens, "int"), "type");
    assert.equal(kindOf(tokens, "# step"), "comment");
    assert.equal(kindOf(tokens, "print"), "function");
    assert.equal(kindOf(tokens, "f\"at "), "string");
    assert.equal(kindOf(tokens, "dx"), undefined);
    assert.equal(kindOf(tokens, "!\""), "string");
    assert.equal(kindOf(tokens, "'''multi"), "string");
    assert.equal(kindOf(tokens, "line'''"), "string");
    assert.equal(kindOf(tokens, "None"), "keyword");
});

test("bash commands, options, variables, strings and here-documents", () => {
    const tokens = tokensOf(bashTokenizer, "#!/bin/bash\nNAME=\"$1\"\nif [ -f \"$NAME\" ]; then\n    echo \"hi ${NAME}\" | grep -i hi > out.txt # done\nfi\ncat <<EOF\n  $NAME\nEOF\nls -la");

    assert.equal(kindOf(tokens, "#!/bin/bash"), "comment");
    assert.equal(kindOf(tokens, "NAME"), "variable");
    assert.equal(kindOf(tokens, "$1"), "variable");
    assert.equal(kindOf(tokens, "if"), "keyword");
    assert.equal(kindOf(tokens, "-f"), "attribute");
    assert.equal(kindOf(tokens, "then"), "keyword");
    assert.equal(kindOf(tokens, "echo"), "function");
    assert.equal(kindOf(tokens, "hi "), "string");
    assert.equal(kindOf(tokens, "${NAME}"), "variable");
    assert.equal(kindOf(tokens, "|"), "operator");
    assert.equal(kindOf(tokens, "grep"), "function");
    assert.equal(kindOf(tokens, "-i"), "attribute");
    assert.equal(kindOf(tokens, "# done"), "comment");
    assert.equal(kindOf(tokens, "<<EOF"), "keyword");
    assert.equal(kindOf(tokens, "  $NAME"), "string");
    assert.equal(kindOf(tokens, "EOF"), "keyword");
    assert.equal(kindOf(tokens, "ls"), "function");
    assert.equal(kindOf(tokens, "-la"), "attribute");
});

test("every tokenizer covers a line without gaps in position order", () => {
    const sources: [Tokenizer, string][] = [
        [jsonTokenizer, "[1, {\"a\": \"b\"}]"],
        [cssTokenizer, "a{b:c}"],
        [javascriptTokenizer, "a(1)+`${b}`"],
        [htmlTokenizer, "<a b=c>&x;</a>"],
        [csharpTokenizer, "x($\"{y}\");"],
        [pythonTokenizer, "f'{a}'+b"],
        [bashTokenizer, "a \"$(b)\" | c"]
    ];

    for (const [tokenizer, source] of sources) {
        let last = 0;

        tokenizer.tokenizeLine(source, tokenizer.initialState, (from, to) => {
            assert.ok(from >= last, `${source}: token at ${from} starts before ${last}`);
            assert.ok(to > from, `${source}: empty token at ${from}`);
            last = to;
        });

        assert.ok(last <= source.length);
    }
});
