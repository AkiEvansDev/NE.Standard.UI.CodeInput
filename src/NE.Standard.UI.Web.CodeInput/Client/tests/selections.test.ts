import assert from "node:assert/strict";
import test from "node:test";

import { applyEdits, distributePaste, editRanges, findOccurrences, mapPosition, nextOccurrence, normalizeSelections, selectionsEqual } from "../src/selections.ts";
import { marked, parse } from "./marked.ts";

/** Types `text` over every range of a marked text. */
function type(notation: string, text: string): string {
    const { text: value, set } = parse(notation);
    const { edits, after } = editRanges(set, range => ({ from: Math.min(range.anchor, range.head), to: Math.max(range.anchor, range.head), text, caret: text.length }));

    return marked(applyEdits(value, edits), after);
}

test("ranges are sorted, and those that overlap or a caret that touches another become one", () => {
    const set = normalizeSelections([{ anchor: 6, head: 8 }, { anchor: 0, head: 2 }, { anchor: 1, head: 4 }, { anchor: 8, head: 8 }], 0);

    assert.deepEqual(set.ranges, [{ anchor: 0, head: 4 }, { anchor: 6, head: 8 }]);
    assert.equal(set.primary, 1);
});

test("two selections that only meet stay two", () => {
    assert.equal(normalizeSelections([{ anchor: 0, head: 2 }, { anchor: 2, head: 4 }], 0).ranges.length, 2);
});

test("a merge keeps the direction of the primary range", () => {
    const set = normalizeSelections([{ anchor: 0, head: 3 }, { anchor: 5, head: 2 }], 1);

    assert.deepEqual(set.ranges, [{ anchor: 5, head: 0 }]);
    assert.equal(set.primary, 0);
});

test("typing at several carets lands every caret after its own text", () => {
    assert.equal(type("a[]b[]c", "x"), "ax[]bx[]c");
    assert.equal(type("[ab]c[d]", "xyz"), "xyz[]cxyz[]");
});

test("an edit that reaches back over the one before starts where it ended", () => {
    const { text, set } = parse("abcd[]e[]f");
    const { edits, after } = editRanges(set, range => ({ from: 0, to: range.head, text: "", caret: 0 }));

    assert.equal(marked(applyEdits(text, edits), after), "[]f");
});

test("a range the command leaves alone moves with the text before it", () => {
    const { text, set } = parse("a[]b[c]");
    const { edits, after } = editRanges(set, (range, index) => index === 0 ? { from: range.head, to: range.head, text: "xx", caret: 2 } : null);

    assert.equal(marked(applyEdits(text, edits), after), "axx[]b[c]");
});

test("a position inside a replaced span goes to its start, and one at an insertion stays before it", () => {
    const edits = [{ from: 2, to: 2, text: "xx" }, { from: 4, to: 6, text: "" }];

    assert.equal(mapPosition(2, edits), 2);
    assert.equal(mapPosition(3, edits), 5);
    assert.equal(mapPosition(5, edits), 6);
    assert.equal(mapPosition(8, edits), 8);
});

test("occurrences are found apart, and the next one wraps past the ranges already taken", () => {
    assert.deepEqual(findOccurrences("aaaa", "aa"), [0, 2]);

    const { text, set } = parse("ab [ab] ab [ab]", 0);

    assert.equal(nextOccurrence(text, set), 6);
    assert.equal(nextOccurrence("ab [ab]".replace(/[[\]]/g, ""), parse("ab [ab]").set), 0);
    assert.equal(nextOccurrence("[ab]", parse("[ab]").set), -1);
});

test("a paste deals out what a copy from as many ranges held, or a line each, or the whole to every caret", () => {
    assert.deepEqual(distributePaste("a\nb", 2, ["a\nb"]), ["a", "b"]);
    assert.deepEqual(distributePaste("x\ny", 2, ["x", "y"]), ["x", "y"]);
    assert.deepEqual(distributePaste("x\n\ny", 2, ["x\n", "y"]), ["x\n", "y"]);
    assert.deepEqual(distributePaste("x\ny\n", 2, null), ["x", "y"]);
    assert.equal(distributePaste("x\ny\nz", 2, null), null);
});

test("two sets are equal only with the same ranges and the same primary", () => {
    assert.equal(selectionsEqual(parse("[a]b[]").set, parse("[a]b[]").set), true);
    assert.equal(selectionsEqual(parse("[a]b[]", 0).set, parse("[a]b[]", 1).set), false);
});
