// A display's own styles: Markdown's runs drawn in the author's declarations, the author's own runs from an opening mark to its
// close — never an unclosed one, never inside code — and a document drawn again replacing only the blocks that changed.

import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { changedBlocks } from "../src/markdown-display-engine.ts";
import { parseInlines } from "../src/markdown-inlines.ts";
import type { MarkdownStyles, MarkdownUrls } from "../src/markdown-render.ts";
import { NoMarkdownStyles, NoPictureSources, renderMarkdown, renderMarkdownBlocks } from "../src/markdown-render.ts";
import { markSpans } from "../src/markdown-spans.ts";

const names = { sourceLine: "data-ui-source-line", readOnlyClass: "ui-readonly" } as const;

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const urls = await import(pathToFileURL(resolve(repository, "src/Platforms/Web/NE.Standard.UI.Web/Client/src/rendering/url-safety.ts")).href) as MarkdownUrls;

const quotes: MarkdownStyles = {
    marks: { strong: "color: red", link: "font-weight: 700" },
    spans: [
        { open: "\"", close: "\"", css: "color: var(--ui-color-accent-ink)" },
        { open: "«", close: "»", css: "font-style: italic" },
    ],
};

function html(source: string, styles = quotes): string {
    return renderMarkdown(source, () => null, names, urls, styles).replace(/ data-ui-source-line="\d+"/g, "");
}

const speech = (words: string): string => `<span class="ui-markdown__span" style="color: var(--ui-color-accent-ink)">${words}</span>`;

test("Markdown's own runs take the author's declarations, and stay bare where none is given", () => {
    assert.equal(html("**a** *b* [c](https://x.test)"), "<p><strong style=\"color: red\">a</strong> <em>b</em> <a href=\"https://x.test\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"font-weight: 700\">c</a></p>");
    assert.equal(html("**a**", { marks: {}, spans: [] }), "<p><strong>a</strong></p>");
});

test("a quoted run is styled with its marks, as many times as it closes", () => {
    assert.equal(html("He said \"hi\" and \"bye\"."), `<p>He said ${speech("&quot;hi&quot;")} and ${speech("&quot;bye&quot;")}.</p>`);
});

test("an opening mark never closed styles nothing", () => {
    assert.equal(html("He said \"hi"), "<p>He said &quot;hi</p>");
    assert.equal(html("\"a\" then \"b"), `<p>${speech("&quot;a&quot;")} then &quot;b</p>`);
});

test("a run holds Markdown's own runs, another rule's run, and a line break; it never opens or closes inside code", () => {
    assert.equal(html("\"he *quietly* said\""), `<p>${speech("&quot;he <em>quietly</em> said&quot;")}</p>`);
    assert.equal(html("\"one\ntwo\""), `<p>${speech("&quot;one\ntwo&quot;")}</p>`);
    assert.equal(html("\"a «b» c\""), `<p>${speech("&quot;a <span class=\"ui-markdown__span\" style=\"font-style: italic\">«b»</span> c&quot;")}</p>`);
    assert.equal(html("`\"x\"` and `say \"`"), "<p><code>&quot;x&quot;</code> and <code>say &quot;</code></p>");
    assert.equal(html("**\"in\"** out"), `<p><strong style="color: red">${speech("&quot;in&quot;")}</strong> out</p>`);
});

test("runs reach headings and table cells, each block on its own", () => {
    assert.equal(html("# \"t\""), `<h1>${speech("&quot;t&quot;")}</h1>`);
    assert.match(html("| \"a\" |\n|---|\n| b |"), /<th>.*ui-markdown__span.*<\/th>/);
});

test("a line of unclosed marks is read in linear time", () => {
    const line = "«".repeat(20000);
    const started = performance.now();

    html(line);
    assert.ok(performance.now() - started < 500, "twenty thousand unclosed marks take under half a second");
});

test("a paragraph of many closed runs is read in linear time, beside a mark it never closes", () => {
    // Measured as growth, not against a clock a busy build slows: four times the runs take about four times as long, where a rescan
    // of the rest after each run took sixteen.
    const timed = (runs: number): number => {
        const root = parseInlines(`«${"\"a\" ".repeat(runs)}`, new Map());
        const started = performance.now();

        markSpans(root, quotes.spans);

        return performance.now() - started;
    };

    timed(5000);

    const growth = timed(160000) / Math.max(timed(40000), 1);

    assert.ok(growth < 10, `four times the runs took ${growth.toFixed(1)} times as long`);
});

test("runs that close in a later node go on in the text after the close", () => {
    assert.equal(html("\"a *b* c\" d \"e\""), `<p>${speech("&quot;a <em>b</em> c&quot;")} d ${speech("&quot;e&quot;")}</p>`);
    assert.equal(html("x «y» \"z\" «w"), `<p>x <span class="ui-markdown__span" style="font-style: italic">«y»</span> ${speech("&quot;z&quot;")} «w</p>`);
});

test("a document drawn again replaces only the blocks between the runs both renders share", () => {
    const before = renderMarkdownBlocks("one\n\ntwo\n\nthr", () => null, names, urls);
    const after = renderMarkdownBlocks("one\n\ntwo\n\nthree and more", () => null, names, urls);

    assert.deepEqual(changedBlocks(before, after), { start: 2, removeEnd: 3, insertEnd: 3 });
    assert.deepEqual(changedBlocks(before, before), { start: 3, removeEnd: 3, insertEnd: 3 });
    assert.deepEqual(changedBlocks(["a", "b"], ["a", "x", "y", "b"]), { start: 1, removeEnd: 1, insertEnd: 3 });
    assert.deepEqual(changedBlocks(["a", "b", "c"], ["a", "c"]), { start: 1, removeEnd: 2, insertEnd: 1 });
    assert.deepEqual(changedBlocks(["a"], ["a", "a"]), { start: 1, removeEnd: 1, insertEnd: 2 });
});

test("a display whose line breaks are switched replaces only the blocks that hold one", () => {
    const source = "# A\n\none\ntwo\n\nthree";
    const before = renderMarkdownBlocks(source, () => null, names, urls);
    const after = renderMarkdownBlocks(source, () => null, names, urls, NoMarkdownStyles, NoPictureSources, true);

    assert.deepEqual(changedBlocks(before, after), { start: 1, removeEnd: 2, insertEnd: 2 });
});
