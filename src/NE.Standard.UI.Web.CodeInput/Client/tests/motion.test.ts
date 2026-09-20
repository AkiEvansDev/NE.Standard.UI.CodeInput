import assert from "node:assert/strict";
import test from "node:test";

import { homePosition, linesOf, nextCharacter, positionAtColumn, previousCharacter, verticalPosition, visualColumn, wordAt, wordLeft, wordRight } from "../src/motion.ts";

test("lines are read with their starts and their ends before the break", () => {
    const lines = linesOf("ab\n\ncd");

    assert.equal(lines.count, 3);
    assert.deepEqual([lines.start(1), lines.end(1), lines.start(2), lines.end(2)], [3, 3, 4, 6]);
    assert.deepEqual([lines.lineAt(0), lines.lineAt(2), lines.lineAt(3), lines.lineAt(6)], [0, 0, 1, 2]);
});

test("a character step takes a surrogate pair whole", () => {
    const text = "a😀b";

    assert.equal(nextCharacter(text, 1), 3);
    assert.equal(previousCharacter(text, 3), 1);
});

test("a word step passes the run and the spaces after it, and stops at a line break", () => {
    const text = "foo.bar  baz\nqux";

    assert.equal(wordRight(text, 0), 3);
    assert.equal(wordRight(text, 4), 9);
    assert.equal(wordRight(text, 12), 13);
    assert.equal(wordLeft(text, 9), 4);
    assert.equal(wordLeft(text, 13), 12);
    assert.equal(wordLeft(text, 3), 0);
});

test("the word at a caret is the run around it", () => {
    assert.deepEqual(wordAt("let value = 1", 6), { from: 4, to: 9 });
    assert.deepEqual(wordAt("let value = 1", 9), { from: 4, to: 9 });
    assert.equal(wordAt("a = b", 2), null);
});

test("Home goes to the indent, and from there to the line's start", () => {
    const text = "x\n    ab";
    const lines = linesOf(text);

    assert.equal(homePosition(text, lines, 8), 6);
    assert.equal(homePosition(text, lines, 6), 2);
});

test("a column is the drawn one, a tab reaching its stop", () => {
    const text = "\tab\na\tb";
    const lines = linesOf(text);

    assert.equal(visualColumn(text, lines, 1, 4), 4);
    assert.equal(visualColumn(text, lines, 6, 4), 4);
    assert.equal(positionAtColumn(text, lines, 1, 4, 4), 6);
    assert.equal(positionAtColumn(text, lines, 1, 1, 4), 5);
    assert.equal(positionAtColumn(text, lines, 1, 3, 4), 6);
    assert.equal(positionAtColumn(text, lines, 0, 9, 4), 3);
});

test("up and down keep the column, and past the edge go to the text's ends", () => {
    const text = "abcd\nab\nabcd";
    const lines = linesOf(text);

    assert.equal(verticalPosition(text, lines, 3, 1, 3, 4), 7);
    assert.equal(verticalPosition(text, lines, 7, 1, 3, 4), 11);
    assert.equal(verticalPosition(text, lines, 2, -1, 2, 4), 0);
    assert.equal(verticalPosition(text, lines, 10, 1, 2, 4), 12);
    assert.equal(verticalPosition(text, lines, 10, -5, 2, 4), 2);
});
