// Surface inert and MaxLength gates, and engine disposal over a minimal stand-in DOM.

import assert from "node:assert/strict";
import test from "node:test";
import type { PluginEngineContext } from "ne-standard-ui";
import { CodeEditorSurface } from "../src/code-editor-surface.ts";
import { CodeInputEngine } from "../src/code-input-engine.ts";
import { MarkdownDisplayEngine } from "../src/markdown-display-engine.ts";
import { singleSelection } from "../src/selections.ts";

const docListeners = new Map<string, Set<EventListener>>();

Object.assign(globalThis, {
    Event: class {
        public readonly type: string;
        public constructor(type: string) {
            this.type = type;
        }
    },
    InputEvent: class {
        public readonly type: string;
        public readonly inputType: string;
        public constructor(type: string, init?: { inputType?: string }) {
            this.type = type;
            this.inputType = init?.inputType ?? "";
        }
    },
    document: {
        activeElement: null,
        baseURI: "https://example.com/",
        addEventListener: (type: string, listener: EventListener) => {
            const set = docListeners.get(type) ?? new Set<EventListener>();

            set.add(listener);
            docListeners.set(type, set);
        },
        removeEventListener: (type: string, listener: EventListener) => {
            docListeners.get(type)?.delete(listener);
        },
        createElement: () => ({
            className: "",
            innerHTML: "",
            content: { firstElementChild: null },
            setAttribute: () => undefined
        })
    }
});

type StubSurface = {
    readonly surface: CodeEditorSurface;
    readonly events: string[];
    value: string;
    maxLength: string | null;
    inert: boolean;
    readOnly: boolean;
};

function makeSurface(initial: string, maxLength: string | null = null): StubSurface {
    const events: string[] = [];
    const state = {
        value: initial,
        maxLength,
        inert: false,
        readOnly: false
    };
    let selection = singleSelection(initial.length);

    const textarea = {
        get value(): string {
            return state.value;
        },
        set value(next: string) {
            state.value = next;
        },
        get readOnly(): boolean {
            return state.readOnly;
        },
        selectionStart: initial.length,
        selectionEnd: initial.length,
        getAttribute: (name: string) => (name === "maxlength" ? state.maxLength : null),
        setRangeText: (replacement: string, start: number, end: number) => {
            state.value = state.value.slice(0, start) + replacement + state.value.slice(end);
        },
        dispatchEvent: (event: Event) => {
            events.push(event.type);
            return true;
        }
    } as unknown as HTMLTextAreaElement;

    const root = {
        style: {
            getPropertyValue: () => "",
            setProperty: () => undefined
        }
    } as unknown as HTMLElement;

    const highlight = {
        childElementCount: 0,
        innerHTML: "",
        children: [],
        replaceChildren: () => undefined
    } as unknown as HTMLElement;

    const surface = new CodeEditorSurface(
        { root, textarea, highlight, position: null },
        { text: key => key, format: key => key, write: () => undefined, resolveText: () => "", resolve: () => "", onChange: () => () => undefined },
        () => "plain-text",
        {
            read: () => selection,
            write: next => {
                selection = next;
            },
            virtualColumns: () => 0
        },
        () => undefined,
        () => state.inert
    );

    return Object.assign(state, { surface, events });
}

test("an inert field refuses programmatic edits, undo, and Ctrl+S save", () => {
    const stage = makeSurface("abc");

    stage.surface.apply([{ from: 3, to: 3, text: "d" }], singleSelection(4), "typing");
    assert.equal(stage.value, "abcd");

    stage.events.length = 0;
    stage.inert = true;

    assert.equal(stage.surface.isLocked, true);
    assert.equal(stage.surface.apply([{ from: 4, to: 4, text: "e" }], singleSelection(5), "typing"), null);
    stage.surface.undo();
    stage.surface.save();

    assert.equal(stage.value, "abcd");
    assert.deepEqual(stage.events, []);

    stage.inert = false;
    stage.surface.save();
    assert.deepEqual(stage.events, ["change", "code-save"]);
});

test("MaxLength blocks programmatic edits that exceed the cap while permitting shortening of an over-limit text", () => {
    const stage = makeSurface("abcd", "5");

    // Within limit (4 -> 5): accepted.
    assert.notEqual(stage.surface.replaceRange(4, 4, "e"), false);
    assert.equal(stage.value, "abcde");

    // Past limit (5 -> 7): refused without mutating text or raising input.
    stage.events.length = 0;
    assert.equal(stage.surface.replaceRange(5, 5, "fg"), false);
    assert.equal(stage.value, "abcde");
    assert.deepEqual(stage.events, []);

    // Controller pushed an over-limit text (8 > 5): shortening (8 -> 6) is accepted, growing (6 -> 7) is refused.
    stage.value = "abcdefgh";
    stage.surface.textPushed();
    assert.equal(stage.surface.replaceRange(6, 8, ""), true);
    assert.equal(stage.value, "abcdef");
    assert.equal(stage.surface.replaceRange(6, 6, "g"), false);
    assert.equal(stage.value, "abcdef");

    // `applyFor` completes anchored picture edits even while inert, and refuses edits that exceed MaxLength.
    const fresh = makeSurface("", "8");
    const anchor = fresh.surface.apply([{ from: 0, to: 0, text: "[p]" }], singleSelection(3), "typing");

    assert.notEqual(anchor, null);
    fresh.inert = true;
    assert.equal(fresh.surface.applyFor(anchor!, { from: 0, to: 3, text: "![a](/12345)" }), false);
    assert.equal(fresh.value, "[p]");
    assert.equal(fresh.surface.applyFor(anchor!, { from: 0, to: 3, text: "![a](/1)" }), true);
    assert.equal(fresh.value, "![a](/1)");
});

test("CodeInputEngine and MarkdownDisplayEngine dispose observers, subscriptions, and selectionchange listener", () => {
    let disconnected = 0;
    let stringsStopped = 0;
    let patchesStopped = 0;

    docListeners.clear();

    const context = {
        root: {
            querySelectorAll: () => []
        },
        names: {},
        urls: {},
        strings: {
            onChange: () => () => {
                stringsStopped++;
            }
        },
        propertyPatchEngine: {
            addValueChangeHandler: () => () => {
                patchesStopped++;
            }
        },
        observeComponents: () => ({
            disconnect: () => {
                disconnected++;
            }
        })
    } as unknown as PluginEngineContext;

    const editors = new CodeInputEngine(context);
    const markdown = new MarkdownDisplayEngine(context);

    assert.equal(docListeners.get("selectionchange")?.size, 1);

    editors.dispose();
    markdown.dispose();

    assert.equal(disconnected, 4);
    assert.equal(stringsStopped, 1);
    assert.equal(patchesStopped, 1);
    assert.equal(docListeners.get("selectionchange")?.size, 0);
});
