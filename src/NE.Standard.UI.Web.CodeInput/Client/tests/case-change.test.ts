import assert from "node:assert/strict";
import test from "node:test";

import { caseChangeEdits } from "../src/case-change.ts";
import { applyEdits } from "../src/selections.ts";
import { marked, parse } from "./marked.ts";

test("a caret cases the identifier it touches and keeps its place in it", () => {
    const { text, set } = parse("let va[]lue = 1");
    const result = caseChangeEdits(text, set, true)!;

    assert.equal(marked(applyEdits(text, result.edits), result.after), "let VA[]LUE = 1");
});

test("a caret touching no identifier changes nothing", () => {
    const { text, set } = parse("a [] b");

    assert.equal(caseChangeEdits(text, set, true), null);
});

test("nothing changes when the case is already right", () => {
    const { text, set } = parse("[ABC]");

    assert.equal(caseChangeEdits(text, set, true), null);
});

test("a forward selection is cased over and stays selected", () => {
    const { text, set } = parse("[abc]");
    const result = caseChangeEdits(text, set, true)!;

    assert.equal(marked(applyEdits(text, result.edits), result.after), "[ABC]");
    assert.deepEqual(result.after.ranges[0], { anchor: 0, head: 3 });
});

test("a backward selection stays backward after casing", () => {
    const set = { ranges: [{ anchor: 3, head: 0 }], primary: 0 };
    const result = caseChangeEdits("abc", set, true)!;

    assert.equal(applyEdits("abc", result.edits), "ABC");
    assert.deepEqual(result.after.ranges[0], { anchor: 3, head: 0 });
});

test("Ctrl+U lower-cases a selection", () => {
    const { text, set } = parse("[ABC]");
    const result = caseChangeEdits(text, set, false)!;

    assert.equal(marked(applyEdits(text, result.edits), result.after), "[abc]");
});

test("several carets each case the identifier they touch", () => {
    const { text, set } = parse("foo[] bar[]");
    const result = caseChangeEdits(text, set, true)!;

    assert.equal(marked(applyEdits(text, result.edits), result.after), "FOO[] BAR[]");
});

test("a set mixing a selection and a caret cases each by its own rule", () => {
    const { text, set } = parse("[ab] cd[]");
    const result = caseChangeEdits(text, set, true)!;

    assert.equal(marked(applyEdits(text, result.edits), result.after), "[AB] CD[]");
});
