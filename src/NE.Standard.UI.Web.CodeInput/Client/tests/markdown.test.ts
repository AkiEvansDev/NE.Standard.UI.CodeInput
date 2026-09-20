// The Markdown the display renders: each block and inline rule on a short document, and what a document cannot smuggle onto the page.

import assert from "node:assert/strict";
import test from "node:test";

import { renderMarkdown, safeAddress } from "../src/markdown-render.ts";

/** The markup without the source lines, which one test below reads on its own. */
function html(source: string): string {
    return renderMarkdown(source, () => null).replace(/ data-ui-source-line="\d+"/g, "");
}

test("headings, paragraphs and rules", () => {
    assert.equal(html("# One #\n\nText\non two lines\n\n***\nSetext\n---"), "<h1>One</h1><p>Text\non two lines</p><hr><h2>Setext</h2>");
    assert.equal(html("#5 is not a heading"), "<p>#5 is not a heading</p>");
});

test("emphasis follows the delimiter rules", () => {
    assert.equal(html("*a* **b** ***c*** _d_ __e__"), "<p><em>a</em> <strong>b</strong> <em><strong>c</strong></em> <em>d</em> <strong>e</strong></p>");
    assert.equal(html("snake_case_name and 2*3*4"), "<p>snake_case_name and 2<em>3</em>4</p>");
    assert.equal(html("*a **b** c*"), "<p><em>a <strong>b</strong> c</em></p>");
    assert.equal(html("* not a list*"), "<ul><li>not a list*</li></ul>");
    assert.equal(html("a * b * c"), "<p>a * b * c</p>");
    assert.equal(html("~~gone~~ ~~~kept~~~"), "<p><del>gone</del> ~~~kept~~~</p>");
});

test("code spans, escapes, entities and breaks", () => {
    assert.equal(html("`a*b*` `` c`d `` \\*e\\* &amp; &copy; & x"), "<p><code>a*b*</code> <code>c`d</code> *e* &amp; &copy; &amp; x</p>");
    assert.equal(html("hard  \nbreak\\\nand soft\nbreak"), "<p>hard<br>break<br>and soft\nbreak</p>");
});

test("links and images, inline and by reference", () => {
    assert.equal(html("[a](/x \"T\") ![pic *b*](p.png)"), "<p><a href=\"/x\" title=\"T\">a</a> <img src=\"p.png\" alt=\"pic b\" loading=\"lazy\"></p>");
    assert.equal(html("[full][Ref] [Ref][] [ref]\n\n[ref]: https://ne.dev 'Title'"),
        "<p><a href=\"https://ne.dev\" title=\"Title\" target=\"_blank\" rel=\"noopener noreferrer\">full</a> " +
        "<a href=\"https://ne.dev\" title=\"Title\" target=\"_blank\" rel=\"noopener noreferrer\">Ref</a> " +
        "<a href=\"https://ne.dev\" title=\"Title\" target=\"_blank\" rel=\"noopener noreferrer\">ref</a></p>");
    assert.equal(html("[missing] [a [b](/c)](/d)"), "<p>[missing] [a <a href=\"/c\">b</a>](/d)</p>");
    assert.equal(html("<https://ne.dev> <me@ne.dev> see https://ne.dev/a_(b). www.ne.dev"),
        "<p><a href=\"https://ne.dev\" target=\"_blank\" rel=\"noopener noreferrer\">https://ne.dev</a> <a href=\"mailto:me@ne.dev\">me@ne.dev</a> " +
        "see <a href=\"https://ne.dev/a_(b)\" target=\"_blank\" rel=\"noopener noreferrer\">https://ne.dev/a_(b)</a>. " +
        "<a href=\"http://www.ne.dev\" target=\"_blank\" rel=\"noopener noreferrer\">www.ne.dev</a></p>");
});

test("a document cannot put markup or script on the page", () => {
    assert.equal(html("<script>alert(1)</script> <b onclick=\"x\">"), "<p>&lt;script&gt;alert(1)&lt;/script&gt; &lt;b onclick=&quot;x&quot;&gt;</p>");
    assert.equal(html("[x](javascript:alert(1)) [y](<JAVA\tSCRIPT:alert(1)>) ![z](data:text/html,x)"), "<p>x y z</p>");
    assert.equal(html("[q](/a\"onmouseover=\"x)"), "<p><a href=\"/a&quot;onmouseover=&quot;x\">q</a></p>");
    assert.equal(safeAddress("data:image/png;base64,AAA", true), "data:image/png;base64,AAA");
    assert.equal(safeAddress("data:image/png;base64,AAA", false), null);
    assert.equal(safeAddress(" vbscript:x", false), null);
});

test("quotes carry lazy lines and nest", () => {
    assert.equal(html("> one\ntwo\n> > inner\n\nafter"), "<blockquote><p>one\ntwo</p><blockquote><p>inner</p></blockquote></blockquote><p>after</p>");
});

test("lists: tight, loose, nested, ordered and tasks", () => {
    assert.equal(html("- a\n- b\n  - c\n\nx"), "<ul><li>a</li><li>b<ul><li>c</li></ul></li></ul><p>x</p>");
    assert.equal(html("- a\n\n- b"), "<ul><li><p>a</p></li><li><p>b</p></li></ul>");
    assert.equal(html("3. three\n4. four"), "<ol start=\"3\"><li>three</li><li>four</li></ol>");
    assert.equal(html("- [x] done\n- [ ] open"),
        "<ul class=\"ui-markdown__tasks\">" +
        "<li class=\"ui-markdown__task\"><span class=\"ui-checkbox ui-input--small ui-markdown__check\"><input class=\"ui-checkbox__input\" type=\"checkbox\" tabindex=\"-1\" aria-readonly=\"true\" checked><span class=\"ui-checkbox__box\"></span></span>done</li>" +
        "<li class=\"ui-markdown__task\"><span class=\"ui-checkbox ui-input--small ui-markdown__check\"><input class=\"ui-checkbox__input\" type=\"checkbox\" tabindex=\"-1\" aria-readonly=\"true\"><span class=\"ui-checkbox__box\"></span></span>open</li></ul>");
    assert.equal(html("text\n2. not a list\n- but this is"), "<p>text\n2. not a list</p><ul><li>but this is</li></ul>");
    assert.equal(html("- a\n- b\n+ c"), "<ul><li>a</li><li>b</li></ul><ul><li>c</li></ul>");
});

test("code blocks, fenced and indented, highlighted when a language is known", () => {
    assert.equal(html("```\n<a> & *b*\n```"), "<pre class=\"ui-markdown__code\"><code>&lt;a&gt; &amp; *b*</code></pre>");
    assert.equal(html("    indented\n\n    more\n\ntext"), "<pre class=\"ui-markdown__code\"><code>indented\n\nmore</code></pre><p>text</p>");
    assert.equal(html("- item\n\n  ```js\n  x\n  ```"), "<ul><li><p>item</p><pre class=\"ui-markdown__code\" data-language=\"js\"><code>x</code></pre></li></ul>");
    assert.equal(renderMarkdown("~~~cs extra\nvar\n~~~", (text, info) => `[${info}:${text}]`), "<pre class=\"ui-markdown__code\" data-language=\"cs\" data-ui-source-line=\"1\"><code>[cs:var]</code></pre>");
});

test("tables with alignments, escaped pipes and short rows", () => {
    assert.equal(html("| a | b | c |\n|:--|:-:|--:|\n| 1 | `x\\|y` |\n\nafter"),
        "<div class=\"ui-markdown__table\"><table><thead><tr><th class=\"ui-markdown__cell--left\">a</th><th class=\"ui-markdown__cell--center\">b</th>" +
        "<th class=\"ui-markdown__cell--right\">c</th></tr></thead><tbody><tr><td class=\"ui-markdown__cell--left\">1</td>" +
        "<td class=\"ui-markdown__cell--center\"><code>x|y</code></td><td class=\"ui-markdown__cell--right\"></td></tr></tbody></table></div><p>after</p>");
});

test("every block and item says the source line it starts on", () => {
    const lines = [...renderMarkdown("# A\n\ntext\nmore\n\n> quote\n>\n> inner\n\n- one\n\n  two\n- three\n\n| a |\n|---|\n\n```\nx\n```\n---", () => null)
        .matchAll(/<(\w+)[^>]* data-ui-source-line="(\d+)"/g)].map(match => `${match[1]}:${match[2]}`);

    assert.deepEqual(lines, ["h1:1", "p:3", "blockquote:6", "p:6", "p:8", "li:10", "p:10", "p:12", "li:13", "p:13", "div:15", "pre:18", "hr:21"]);
});
