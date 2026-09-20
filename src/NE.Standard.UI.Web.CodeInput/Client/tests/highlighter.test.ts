// The incremental read: which lines an edit re-renders, and that a state change reaches the lines after it.

import assert from "node:assert/strict";
import test from "node:test";

import { Highlighter, renderSegments } from "../src/highlighter.ts";
import { javascriptTokenizer } from "../src/languages/javascript.ts";

test("first read renders every line", () => {
    const highlighter = new Highlighter(javascriptTokenizer);

    assert.deepEqual(highlighter.update("a\nb\nc"), [{ from: 0, removed: 0, added: 3 }]);
    assert.equal(highlighter.lineCount, 3);
});

test("an edit inside one line re-renders that line alone", () => {
    const highlighter = new Highlighter(javascriptTokenizer);

    highlighter.update("let a = 1;\nlet b = 2;\nlet c = 3;");

    assert.deepEqual(highlighter.update("let a = 1;\nlet b = 22;\nlet c = 3;"), [{ from: 1, removed: 1, added: 1 }]);
});

test("an inserted line adds one element and removes none", () => {
    const highlighter = new Highlighter(javascriptTokenizer);

    highlighter.update("a\nb\nc");

    assert.deepEqual(highlighter.update("a\nx\nb\nc"), [{ from: 1, removed: 0, added: 1 }]);
    assert.deepEqual(highlighter.update("a\nb\nc"), [{ from: 1, removed: 1, added: 0 }]);
});

test("edits at several places re-render those lines, not the lines between them", () => {
    const highlighter = new Highlighter(javascriptTokenizer);

    highlighter.update("a\nb\nc\nd\ne\nf");

    assert.deepEqual(highlighter.update("ax\nb\nc\ndx\ne\nf"), [{ from: 0, removed: 1, added: 1 }, { from: 3, removed: 1, added: 1 }]);
    assert.deepEqual(highlighter.update("a\nx\nb\nc\nd\ne\nf\ny"), [{ from: 0, removed: 1, added: 2 }, { from: 4, removed: 1, added: 1 }, { from: 7, removed: 0, added: 1 }]);
    assert.equal(highlighter.lineCount, 8);
    assert.equal(highlighter.lineText(7), "y");
});

test("lines that repeat still come out as the new text", () => {
    const highlighter = new Highlighter(javascriptTokenizer);
    const next = "}\n\n}\nx\n}\n\n";

    highlighter.update("}\n}\n\n}\n\n}");
    highlighter.update(next);

    assert.deepEqual(Array.from({ length: highlighter.lineCount }, (_, index) => highlighter.lineText(index)).join("\n"), next);
});

test("a read over many edits renders what a fresh read of the same text does", () => {
    const pieces = ["/*", "*/", "}", "{", "", "let a = 1;", "`", "x"];
    let seed = 7;
    const next = (limit: number): number => (seed = (seed * 48271) % 2147483647) % limit;
    const incremental = new Highlighter(javascriptTokenizer);
    let lines = ["let a = 1;"];

    for (let round = 0; round < 300; round++) {
        const at = next(lines.length + 1);

        if (next(3) === 0 && lines.length > 1)
            lines.splice(at % lines.length, 1 + next(2));
        else
            lines.splice(at, next(2), ...Array.from({ length: 1 + next(3) }, () => pieces[next(pieces.length)]));

        if (lines.length === 0)
            lines = [""];

        const text = lines.join("\n");
        const fresh = new Highlighter(javascriptTokenizer);

        incremental.update(text);
        fresh.update(text);

        assert.equal(incremental.lineCount, fresh.lineCount);

        for (let i = 0; i < fresh.lineCount; i++)
            assert.equal(incremental.renderLine(i), fresh.renderLine(i), `round ${round}, line ${i}`);
    }
});

test("opening a comment re-reads the lines after it until it closes", () => {
    const highlighter = new Highlighter(javascriptTokenizer);

    highlighter.update("a\nb\nc\n*/\nd");

    // The comment opened on line 0 runs through lines 1-3; line 4 starts in the same state as before and is kept.
    assert.deepEqual(highlighter.update("/* a\nb\nc\n*/\nd"), [{ from: 0, removed: 4, added: 4 }]);
    assert.ok(highlighter.renderLine(2).includes("ui-tk-comment"));
    assert.ok(!highlighter.renderLine(4).includes("ui-tk-comment"));
});

test("lines map offsets back to themselves", () => {
    const highlighter = new Highlighter(null);

    highlighter.update("ab\ncd\n\nef");

    assert.equal(highlighter.lineAt(0), 0);
    assert.equal(highlighter.lineAt(2), 0);
    assert.equal(highlighter.lineAt(3), 1);
    assert.equal(highlighter.lineAt(6), 2);
    assert.equal(highlighter.lineAt(7), 3);
    assert.equal(highlighter.lineStart(3), 7);
});

test("marks re-render only the lines they touch, and a match across lines marks each", () => {
    const highlighter = new Highlighter(null);

    highlighter.update("one\ntwo\nthree");

    assert.deepEqual(highlighter.setMatches([{ from: 4, to: 7 }], 0), [1]);
    assert.ok(highlighter.renderLine(1).includes("ui-code-match--current"));
    assert.deepEqual(highlighter.setMatches([{ from: 2, to: 6 }], -1), [0, 1]);
    assert.ok(highlighter.renderLine(0).includes("ui-code-match"));
    assert.ok(!highlighter.renderLine(0).includes("--current"));
    assert.deepEqual(highlighter.setMatches([], -1), [0, 1]);
});

test("segments cut tokens and marks against each other and escape the text", () => {
    const html = renderSegments("a<b> c", [{ from: 0, to: 4, kind: "tag" }], [{ from: 2, to: 6, current: true }]);

    assert.equal(html, "<span class=\"ui-tk-tag\">a&lt;</span><span class=\"ui-tk-tag ui-code-match ui-code-match--current\">b&gt;</span><span class=\"ui-code-match ui-code-match--current\"> c</span>");
});

test("an empty line renders a break so it keeps its height", () => {
    const highlighter = new Highlighter(null);

    highlighter.update("a\n\nb");

    assert.equal(highlighter.renderLine(1), "<span class=\"ui-code-input__code\"><br></span>");
});
