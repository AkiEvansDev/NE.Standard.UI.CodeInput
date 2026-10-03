import assert from "node:assert/strict";
import test from "node:test";

import type { FormatBarState } from "../src/code-editor-format-bar.ts";
import { formatKey, formats, isBarKey, showsAfterPress, staysWith } from "../src/code-editor-format-bar.ts";

const ready: FormatBarState = { enabled: true, markdown: true, editable: true, selected: true };

function key(code: string, modifiers: { ctrl?: boolean; meta?: boolean; alt?: boolean; shift?: boolean } = {}): { code: string; key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean } {
    return { code, key: code, ctrlKey: modifiers.ctrl ?? false, metaKey: modifiers.meta ?? false, altKey: modifiers.alt ?? false, shiftKey: modifiers.shift ?? false };
}

test("a mouse's or a pen's selection shows the bar; a finger's never does", () => {
    assert.equal(showsAfterPress(ready, "mouse"), true);
    assert.equal(showsAfterPress(ready, "pen"), true);
    assert.equal(showsAfterPress(ready, "touch"), false);
    assert.equal(showsAfterPress(ready, null), false);
});

test("a press that selected nothing shows no bar", () => {
    assert.equal(showsAfterPress({ ...ready, selected: false }, "mouse"), false);
});

test("only an editable Markdown field with its bar switched on formats", () => {
    assert.equal(formats(ready), true);
    assert.equal(formats({ ...ready, enabled: false }), false);
    assert.equal(formats({ ...ready, markdown: false }), false);
    assert.equal(formats({ ...ready, editable: false }), false);
    assert.equal(showsAfterPress({ ...ready, editable: false }, "mouse"), false);
});

test("the bar goes once the selection is a caret alone, or the field stops formatting", () => {
    assert.equal(staysWith(ready), true);
    assert.equal(staysWith({ ...ready, selected: false }), false);
    assert.equal(staysWith({ ...ready, markdown: false }), false);
});

test("Ctrl or ⌘ with B, I or K presses bold, italic or link; another modifier with them is not theirs", () => {
    assert.equal(formatKey(key("KeyB", { ctrl: true })), "bold");
    assert.equal(formatKey(key("KeyI", { meta: true })), "italic");
    assert.equal(formatKey(key("KeyK", { ctrl: true })), "link");
    assert.equal(formatKey(key("KeyB")), null);
    assert.equal(formatKey(key("KeyB", { ctrl: true, shift: true })), null);
    assert.equal(formatKey(key("KeyB", { ctrl: true, alt: true })), null);
    assert.equal(formatKey(key("KeyU", { ctrl: true })), null);
});

test("Alt+F10 takes the keyboard to the bar, and only Alt+F10", () => {
    assert.equal(isBarKey(key("F10", { alt: true })), true);
    assert.equal(isBarKey(key("F10")), false);
    assert.equal(isBarKey(key("F10", { alt: true, shift: true })), false);
});
