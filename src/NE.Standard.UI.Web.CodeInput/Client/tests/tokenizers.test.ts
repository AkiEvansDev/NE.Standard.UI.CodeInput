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
import { languages } from "../src/languages/index.ts";
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
    const tokens = tokensOf(cssTokenizer, ".card > a:hover, [type=text] {\n    color: #fff !important;\n    display: flex;\n    width: calc(100% - var(--gap));\n    --gap: 2rem;\n}");

    assert.equal(kindOf(tokens, ".card"), "selector");
    assert.equal(kindOf(tokens, "a"), "selector");
    assert.equal(kindOf(tokens, ":hover"), "selector");
    assert.equal(kindOf(tokens, "type"), "attribute");
    assert.equal(kindOf(tokens, "text"), "value");
    assert.equal(kindOf(tokens, "color"), "attribute");
    assert.equal(kindOf(tokens, "#fff"), "value");
    assert.equal(kindOf(tokens, "!important"), "keyword");
    assert.equal(kindOf(tokens, "flex"), "value");
    assert.equal(kindOf(tokens, "calc"), "function");
    assert.equal(kindOf(tokens, "100%"), "number");
    assert.equal(tokens.filter(token => token.text === "--gap").map(token => token.kind).join(), "variable,variable");
});

test("css at-rules read their prelude, not a selector", () => {
    const tokens = tokensOf(cssTokenizer, "@media screen and (max-width: 600px) {\n    a { background: url(img/a.png) no-repeat; }\n}");

    assert.equal(kindOf(tokens, "@media"), "meta");
    assert.equal(kindOf(tokens, "screen"), "value");
    assert.equal(kindOf(tokens, "and"), "keyword");
    assert.equal(kindOf(tokens, "max-width"), "attribute");
    assert.equal(kindOf(tokens, "600px"), "number");
    assert.equal(kindOf(tokens, "url"), "function");
    assert.equal(kindOf(tokens, "img/a.png"), "string");
    assert.equal(kindOf(tokens, "no-repeat"), "value");
});

test("css block comment carries across lines", () => {
    const tokens = tokensOf(cssTokenizer, "/* one\ntwo */ a { }");

    assert.equal(tokens[0].kind, "comment");
    assert.equal(kindOf(tokens, "two */"), "comment");
    assert.equal(kindOf(tokens, "a"), "selector");
});

test("less variables, mixins, nesting and line comments", () => {
    const source = "@import (reference) \"base.less\";\n@mono: ui-monospace, Consolas; // air\n.rounded(@radius: 6px) { border-radius: @radius; }\n" +
        ".a {\n    .rounded();\n    &-active:hover { margin: @gap; }\n    .b { color: red; }\n}";
    const tokens = tokensOf(lessTokenizer, source);

    assert.equal(kindOf(tokens, "@import"), "meta");
    assert.equal(kindOf(tokens, "@mono"), "variable");
    assert.equal(kindOf(tokens, "ui-monospace"), "value");
    assert.equal(kindOf(tokens, "// air"), "comment");
    assert.equal(kindOf(tokens, "@radius"), "variable");
    assert.equal(kindOf(tokens, "6px"), "number");
    assert.equal(kindOf(tokens, "&-active"), "selector");
    assert.equal(kindOf(tokens, "margin"), "attribute");
    assert.equal(kindOf(tokens, ".b"), "selector");
    assert.equal(kindOf(tokens, "red"), "value");
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
    assert.equal(kindOf(tokens, "color"), "attribute");
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
        [bashTokenizer, "a \"$(b)\" | c"],
        [languages.get("markdown")!, "> - **a** `b` [c](d) <e> ~~f~~ | g"]
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

test("markdown blocks: headings, quotes, lists, rules and references", () => {
    const tokens = tokensOf(languages.get("markdown")!, "# Title\n> quoted *word*\n- [x] done\n1. first\n---\n[docs]: https://example.com \"Docs\"\nSetext\n===");

    assert.equal(kindOf(tokens, "# Title"), "heading");
    assert.equal(kindOf(tokens, ">"), "quote");
    assert.equal(kindOf(tokens, "quoted "), "quote");
    assert.equal(kindOf(tokens, "*word*"), "emphasis");
    assert.equal(kindOf(tokens, "-"), "keyword");
    assert.equal(kindOf(tokens, "[x]"), "keyword");
    assert.equal(kindOf(tokens, "1."), "keyword");
    assert.equal(kindOf(tokens, "---"), "punctuation");
    assert.equal(kindOf(tokens, "[docs]"), "link");
    assert.equal(kindOf(tokens, "https://example.com"), "string");
    assert.equal(kindOf(tokens, "==="), "heading");
});

test("markdown inline spans", () => {
    const tokens = tokensOf(languages.get("markdown")!, "a **bold** _it_ snake_case ~~gone~~ `co*de*` [link](http://x.y) <b>tag</b> \\* https://ne.dev.");

    assert.equal(kindOf(tokens, "**bold**"), "strong");
    assert.equal(kindOf(tokens, "_it_"), "emphasis");
    assert.equal(tokens.some(token => token.text.includes("case")), false);
    assert.equal(kindOf(tokens, "~~gone~~"), "strikethrough");
    assert.equal(kindOf(tokens, "`co*de*`"), "code");
    assert.equal(kindOf(tokens, "[link]"), "link");
    assert.equal(kindOf(tokens, "(http://x.y)"), "string");
    assert.equal(kindOf(tokens, "<b>"), "tag");
    assert.equal(kindOf(tokens, "\\*"), "escape");
    assert.equal(kindOf(tokens, "https://ne.dev"), "link");
});

test("markdown fenced blocks are read by the language they name", () => {
    const tokens = tokensOf(languages.get("markdown")!, "```cs\nvar x = \"s\";\n```\n~~~unknown\n**not bold**\n~~~\n**bold**");

    assert.equal(kindOf(tokens, "```"), "code");
    assert.equal(kindOf(tokens, "cs"), "keyword");
    assert.equal(kindOf(tokens, "var"), "keyword");
    assert.equal(kindOf(tokens, "\"s\""), "string");
    assert.equal(kindOf(tokens, "**not bold**"), "code");
    assert.equal(kindOf(tokens, "**bold**"), "strong");
});
