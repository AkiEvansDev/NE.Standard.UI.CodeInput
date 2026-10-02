import assert from "node:assert/strict";
import test from "node:test";

import type { Change, EditKind } from "../src/history.ts";
import { EditHistory, diffText } from "../src/history.ts";
import type { Edit, SelectionSet } from "../src/selections.ts";
import { applyEdits, singleSelection } from "../src/selections.ts";

/** A text and its history, edited the way the editor does it. */
class Session {
    public text: string;
    public selections: SelectionSet;
    public readonly history = new EditHistory();

    public constructor(text: string, caret: number) {
        this.text = text;
        this.selections = singleSelection(caret);
    }

    public edit(edits: Edit[], after: SelectionSet, kind: EditKind): void {
        this.history.record({ edits, removed: edits.map(edit => this.text.slice(edit.from, edit.to)), before: this.selections, after }, kind);
        this.text = applyEdits(this.text, edits);
        this.selections = after;
    }

    public type(text: string): void {
        const at = this.selections.ranges[0].head;

        this.edit([{ from: at, to: at, text }], singleSelection(at + text.length), "typing");
    }

    public undo(): void {
        const restore = this.history.undo(this.text);

        if (restore !== null) {
            this.text = restore.text;
            this.selections = restore.selections;
        }
    }

    public redo(): void {
        const restore = this.history.redo(this.text);

        if (restore !== null) {
            this.text = restore.text;
            this.selections = restore.selections;
        }
    }
}

test("typing runs on into one step, and a word after a space starts the next", () => {
    const session = new Session("", 0);

    for (const character of "ab cd")
        session.type(character);

    session.undo();
    assert.equal(session.text, "ab ");

    session.undo();
    assert.equal(session.text, "");
    assert.deepEqual(session.selections, singleSelection(0));
});

test("an edit at several places is taken back at every one, and the carets come back with it", () => {
    const session = new Session("a\nb\nc", 0);
    const before = { ranges: [{ anchor: 0, head: 0 }, { anchor: 2, head: 2 }, { anchor: 4, head: 4 }], primary: 2 };

    session.selections = before;
    session.edit([{ from: 0, to: 0, text: "//" }, { from: 2, to: 3, text: "B" }, { from: 4, to: 5, text: "" }], { ranges: [{ anchor: 2, head: 2 }], primary: 0 }, "other");
    assert.equal(session.text, "//a\nB\n");

    session.undo();
    assert.equal(session.text, "a\nb\nc");
    assert.deepEqual(session.selections, before);

    session.redo();
    assert.equal(session.text, "//a\nB\n");
});

test("typing after an undo is a step of its own, and it drops what could be redone", () => {
    const session = new Session("", 0);

    session.type("a");
    session.type("b");
    session.undo();
    session.type("c");
    session.redo();
    assert.equal(session.text, "c");

    session.undo();
    assert.equal(session.text, "");
});

test("a caret moved between two keystrokes breaks the step", () => {
    const session = new Session("xy", 2);

    session.type("a");
    session.selections = singleSelection(0);
    session.type("b");
    session.undo();
    assert.equal(session.text, "xya");
});

test("a diff ends where the caret stands when the text around it repeats", () => {
    assert.deepEqual(diffText("aa", "aaa", 2), { from: 1, to: 1, text: "a" });
    assert.deepEqual(diffText("aaa", "aa", 1), { from: 1, to: 2, text: "" });
    assert.deepEqual(diffText("abc", "aXYc", 3), { from: 1, to: 2, text: "XY" });
});

/** A placeholder pasted as one step, and the change that later stands for it — an address, or nothing — made the way the surface makes it. */
function pastePlaceholder(session: Session, placeholder: string): Change {
    const at = session.selections.ranges[0].head;
    const change: Change = { edits: [{ from: at, to: at, text: placeholder }], removed: [""], before: session.selections, after: singleSelection(at + placeholder.length) };

    session.history.record(change, "other");
    session.text = applyEdits(session.text, change.edits);
    session.selections = change.after;
    return change;
}

function replaceFor(session: Session, anchor: Change, needle: string, text: string): void {
    const from = session.text.indexOf(needle);
    const change: Change = { edits: [{ from, to: from + needle.length, text }], removed: [needle], before: session.selections, after: session.selections };

    if (!session.history.retract(change, anchor))
        session.history.recordFor(change, anchor);

    session.text = applyEdits(session.text, change.edits);
}

test("a picture's address joins its placeholder's step, so one undo takes the picture back whole", () => {
    const session = new Session("Intro ", 6);
    const anchor = pastePlaceholder(session, "![Uploading a.png…]()");

    replaceFor(session, anchor, "![Uploading a.png…]()", "![a](/a.png)");
    assert.equal(session.text, "Intro ![a](/a.png)");

    session.undo();
    assert.equal(session.text, "Intro ");

    session.redo();
    assert.equal(session.text, "Intro ![a](/a.png)");
});

test("an address that arrives after the reader typed on is a step of its own, and the typing stays", () => {
    const session = new Session("", 0);
    const anchor = pastePlaceholder(session, "![Uploading a.png…]()");

    session.type(" more");
    replaceFor(session, anchor, "![Uploading a.png…]()", "![a](/a.png)");
    assert.equal(session.text, "![a](/a.png) more");

    session.undo();
    assert.equal(session.text, "![Uploading a.png…]() more");

    session.undo();
    session.undo();
    assert.equal(session.text, "");
});

test("a placeholder taken out again leaves no step behind that undoes nothing", () => {
    const session = new Session("Text", 4);

    session.type("!");

    const anchor = pastePlaceholder(session, "![Uploading a.png…]()");

    replaceFor(session, anchor, "![Uploading a.png…]()", "");
    assert.equal(session.text, "Text!");

    session.undo();
    assert.equal(session.text, "Text");
});
