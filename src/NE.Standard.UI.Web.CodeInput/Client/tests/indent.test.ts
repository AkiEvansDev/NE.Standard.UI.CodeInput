import assert from "node:assert/strict";
import test from "node:test";

import { applyTab, lineBreakText } from "../src/indent.ts";
import { applyEdits, singleSelection } from "../src/selections.ts";
import { marked, parse } from "./marked.ts";

/** Applies the edit and returns the text with the selection marked as `[` … `]`. */
function press(value: string, start: number, end: number, outdent: boolean, tabSize = 4): string | null {
    const edit = applyTab(value, singleSelection(start, end), tabSize, outdent);

    return edit === null ? null : marked(applyEdits(value, edit.edits), edit.after);
}

/** The same over every range a marked text holds. */
function pressAll(notation: string, outdent: boolean, tabSize = 4): string | null {
    const { text, set } = parse(notation);
    const edit = applyTab(text, set, tabSize, outdent);

    return edit === null ? null : marked(applyEdits(text, edit.edits), edit.after);
}

test("a caret indents at the caret to the next stop", () => {
    assert.equal(press("ab", 0, 0, false), "    []ab");
    assert.equal(press("ab", 2, 2, false), "ab  []");
    assert.equal(press("x\nab", 3, 3, false), "x\na   []b");
});

test("a caret outdents its own line and stays a caret", () => {
    assert.equal(press("    ab", 6, 6, true), "ab[]");
    assert.equal(press("    ab", 2, 2, true), "[]ab");
    assert.equal(press("  ab", 4, 4, true), "ab[]");
    assert.equal(press("ab", 1, 1, true), null);
    assert.equal(press("x\n    ab", 6, 6, true), "x\n[]ab");
});

test("a selection on one line moves the whole line and keeps its edges", () => {
    assert.equal(press("ab cd", 3, 5, false), "    ab [cd]");
    assert.equal(press("    ab cd", 7, 9, true), "ab [cd]");
});

test("a selection over several lines moves every line and keeps the selection", () => {
    assert.equal(press("ab\ncd\nef", 1, 7, false), "    a[b\n    cd\n    e]f");
    assert.equal(press("    ab\n  cd\nef", 5, 13, true), "a[b\ncd\ne]f");
});

test("a selection starting at a line start keeps the indent it moved", () => {
    assert.equal(press("ab\ncd", 0, 5, false), "[    ab\n    cd]");
    assert.equal(press("    ab\n    cd", 0, 13, true), "[ab\ncd]");
});

test("a selection ending right after a line break does not take the next line", () => {
    assert.equal(press("ab\ncd", 0, 3, false), "[    ab\n]cd");
});

test("an empty line is not indented, and a line short of a stop loses what it has", () => {
    assert.equal(press("ab\n\ncd", 0, 6, false), "[    ab\n\n    cd]");
    assert.equal(press("  ab\n      cd", 0, 13, true), "[ab\n  cd]");
});

test("the tab size is what a stop is", () => {
    assert.equal(press("a", 1, 1, false, 2), "a []");
    assert.equal(press("ab\ncd", 0, 5, false, 2), "[  ab\n  cd]");
});

test("a tab-indented line outdents by its tab, whatever the tab size", () => {
    assert.equal(press("\tab", 3, 3, true), "ab[]");
    assert.equal(press("\tab\n\t\tcd", 1, 8, true), "[ab\n\tcd]");
    assert.equal(press("\tab", 3, 3, true, 2), "ab[]");
});

test("a line indented with spaces before a tab loses the spaces first", () => {
    assert.equal(press("    \tab", 7, 7, true), "\tab[]");
});

test("several carets indent each at its own caret", () => {
    assert.equal(pressAll("a[]b\nabc[]", false), "a   []b\nabc []");
    assert.equal(pressAll("[]a[]b", false, 2), "  []a []b");
});

test("several selections move each line once, however many ranges stand on it", () => {
    assert.equal(pressAll("[a]b[c]\nd", false), "[    a]b[c]\nd");
    assert.equal(pressAll("    a[]b\n    c[]d", true), "a[]b\nc[]d");
    assert.equal(pressAll("[a\nb]\n[c]", false), "[    a\n    b]\n[    c]");
});

test("Enter keeps the indent, and opens a stop after a bracket or Python's colon", () => {
    assert.equal(lineBreakText("  ab", 4, 4, false), "\n  ");
    assert.equal(lineBreakText("  if {", 6, 4, false), "\n      ");
    assert.equal(lineBreakText("def f():", 8, 4, true), "\n    ");
    assert.equal(lineBreakText("def f():", 8, 4, false), "\n");
});
