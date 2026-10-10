import assert from "node:assert/strict";
import test from "node:test";

import type { PropertyWriting, ValueReading } from "ne-standard-ui";

import { CodeEditorStatusBar } from "../src/code-editor-status-bar.ts";

// Just enough of the page for the bar: a textarea that notes its focus, a bar that holds one element, and the document's focus.
function setUp(focusInBar: boolean): { readonly bar: CodeEditorStatusBar; readonly focused: () => boolean } {
    const picker = {};
    let focused = false;
    const textarea = { focus: () => { focused = true; } };
    const root = { getAttribute: () => null };
    const values: ValueReading = { read: () => null, hold: () => {}, release: () => {}, write: () => false, whenSettled: () => Promise.resolve() };
    const properties: PropertyWriting = { set: () => true };

    Object.defineProperty(globalThis, "document", { value: { activeElement: focusInBar ? picker : null }, configurable: true });

    const bar = new CodeEditorStatusBar(
        {
            root: root as unknown as HTMLElement,
            textarea: textarea as unknown as HTMLTextAreaElement,
            bar: { contains: (node: unknown) => node === picker } as unknown as HTMLElement,
            tabSize: null,
            encoding: null,
            lineEnding: null,
            language: null
        },
        values,
        properties,
        () => {}
    );

    return { bar, focused: () => focused };
}

test("the bar switched off with a picker focused hands the keyboard to the text", () => {
    const { bar, focused } = setUp(true);

    bar.barHidden();

    assert.equal(focused(), true);
});

test("the bar switched off with the focus elsewhere leaves it there", () => {
    const { bar, focused } = setUp(false);

    bar.barHidden();

    assert.equal(focused(), false);
});
