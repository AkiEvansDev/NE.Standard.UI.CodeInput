import assert from "node:assert/strict";
import test from "node:test";

import { applyTab } from "../src/indent.ts";

/** Applies the edit and returns the text with the selection marked as `[` … `]`. */
function press(value: string, start: number, end: number, outdent: boolean, tabSize = 4): string | null {
    const edit = applyTab(value, start, end, tabSize, outdent);

    if (edit === null)
        return null;

    const text = value.slice(0, edit.from) + edit.text + value.slice(edit.to);

    return text.slice(0, edit.selectionStart) + "[" + text.slice(edit.selectionStart, edit.selectionEnd) + "]" + text.slice(edit.selectionEnd);
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
