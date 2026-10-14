// The carets' watch on the text's box: let go as the field's root leaves the page, taken up again as it comes back, so an editor the
// engine pruned and then found on the page again draws its carets where the text moved.

import assert from "node:assert/strict";
import test from "node:test";

import type { ObserveSize, ShortcutWords } from "ne-standard-ui";

import { CodeEditorCarets } from "../src/code-editor-carets.ts";
import type { CaretParts } from "../src/code-editor-carets.ts";
import type { CodeEditorSurface } from "../src/code-editor-surface.ts";

// The two marks the carets put into the text's box at the start; nothing else of the page is asked for.
Object.assign(globalThis, { document: { createElement: () => ({ className: "", hidden: false, textContent: "", setAttribute: () => {} }) } });

test("the size watch let go as the root leaves the page is taken up again, once, as it comes back", () => {
    let started = 0;
    let watching = 0;
    const observeSize: ObserveSize = () => {
        started++;
        watching++;

        return () => {
            watching--;
        };
    };
    const parts = { root: {}, textarea: {}, scroller: {}, content: { insertBefore: () => {} } } as unknown as CaretParts;
    const carets = new CodeEditorCarets(parts, {} as CodeEditorSurface, observeSize, {} as ShortcutWords);

    carets.dispose();
    carets.dispose();
    assert.equal(watching, 0);

    carets.watchSize();
    carets.watchSize();
    assert.equal(watching, 1);
    assert.equal(started, 2);
});
