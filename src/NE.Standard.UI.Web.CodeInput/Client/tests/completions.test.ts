import assert from "node:assert/strict";
import test from "node:test";

import { CodeEditorCompletions, loadCompletionsFile } from "../src/code-editor-completions.ts";
import { CompletionsAttribute, CompletionsSourceAttribute } from "../src/code-editor-dom.ts";
import { CompletionsRegistry } from "../src/completions-registry.ts";
import type { CompletionContext, CompletionItem } from "../src/completions.ts";
import { activeTrigger, collectCompletions, completionKindClass, completionRange, documentWordsSource, parseCompletionsFile, prefixAt, prefixStart, rankCompletions } from "../src/completions.ts";
import { renderSegments } from "../src/highlighter.ts";

// A degrade here warns once on the console; degrade-warnings.test.ts asserts the words, so these runs stay quiet.
console.warn = () => {};

function context(overrides: Partial<CompletionContext> = {}): CompletionContext {
    return { text: "", offset: 0, line: 0, column: 0, prefix: "", languageId: "plain-text", ...overrides };
}

test("the prefix is the identifier immediately before the offset", () => {
    assert.equal(prefixAt("foo.ba", 6), "ba");
    assert.equal(prefixAt("foo.", 4), "");
    assert.equal(prefixStart("foo.ba", 6), 4);
    assert.equal(prefixStart("x.foo𠮷ba", 9), 2);
    assert.equal(prefixAt("x.foo𠮷ba", 9), "foo𠮷ba");
});

test("ranking puts a case-agreeing prefix match first, then one that only agrees ignoring case, then a substring", () => {
    const items: CompletionItem[] = [{ label: "Barrel" }, { label: "bar" }, { label: "foobar" }, { label: "nope" }];
    const ranked = rankCompletions(items, "bar").map(item => item.label);

    assert.deepEqual(ranked, ["bar", "Barrel", "foobar"]);
});

test("ties keep the order the items were collected in", () => {
    const items: CompletionItem[] = [{ label: "bat" }, { label: "bar" }];

    assert.deepEqual(rankCompletions(items, "ba").map(item => item.label), ["bat", "bar"]);
});

test("an empty prefix keeps every item, in the order collected", () => {
    const items: CompletionItem[] = [{ label: "b" }, { label: "a" }];

    assert.deepEqual(rankCompletions(items, "").map(item => item.label), ["b", "a"]);
});

test("ranking deduplicates by label and caps the list", () => {
    const items: CompletionItem[] = [{ label: "a", detail: "first" }, { label: "a", detail: "second" }];

    assert.deepEqual(rankCompletions(items, "a"), [{ label: "a", detail: "first" }]);

    const many = Array.from({ length: 60 }, (_, i) => ({ label: `w${i}` }));

    assert.equal(rankCompletions(many, "w").length, 50);
});

test("document words offers every identifier of two or more characters, deduplicated", () => {
    const items = documentWordsSource(context({ text: "foo bar foo x", offset: 13 }));

    assert.deepEqual(items.map(item => item.label).sort(), ["bar", "foo"]);
});

test("document words leaves out the identifier the caret is in the middle of typing", () => {
    const items = documentWordsSource(context({ text: "value valu", offset: 10 }));

    assert.deepEqual(items.map(item => item.label), ["value"]);
});

test("document words keeps a word being typed that the text holds elsewhere, and follows the text as it is typed", () => {
    assert.deepEqual(documentWordsSource(context({ text: "cat; cat", offset: 8 })).map(item => item.label), ["cat"]);
    assert.deepEqual(documentWordsSource(context({ text: "one two t", offset: 9 })).map(item => item.label), ["one", "two"]);
    assert.deepEqual(documentWordsSource(context({ text: "one two tw", offset: 10 })).map(item => item.label), ["one", "two"]);
    assert.deepEqual(documentWordsSource(context({ text: "one three tw", offset: 12 })).map(item => item.label), ["one", "three"]);
});

test("a fixed list and a provider collect in source order; a rejected provider contributes nothing", async () => {
    const items = await collectCompletions([
        [{ label: "a" }],
        () => [{ label: "b" }],
        () => Promise.reject(new Error("no")),
        async () => [{ label: "c" }]
    ], context());

    assert.deepEqual(items.map(item => item.label), ["a", "b", "c"]);
});

test("a completions file defaults insert to the label, drops an unknown kind, and keeps only string triggers", () => {
    const file = parseCompletionsFile({
        items: [
            { label: "Console", kind: "type" },
            { label: "x", kind: "not-a-kind" },
            { label: "y", insert: "yInsert", detail: "field" },
            { notLabel: "skipped" }
        ],
        triggers: [".", 1, "::"]
    });

    assert.deepEqual(file.items, [
        { label: "Console", insert: "Console", detail: undefined, kind: "type" },
        { label: "x", insert: "x", detail: undefined, kind: undefined },
        { label: "y", insert: "yInsert", detail: "field", kind: undefined }
    ]);
    assert.deepEqual(file.triggers, [".", "::"]);
});

test("a completions file keeps any token kind, a language's own inks included, and plain text", () => {
    const file = parseCompletionsFile({ items: [{ label: "name", kind: "regex" }, { label: "#if", kind: "meta" }, { label: "word", kind: "text" }] });

    assert.deepEqual(file.items.map(item => item.kind), ["regex", "meta", "text"]);
});

test("a completion's label wears the class the highlighter gives a token of its kind, and plain text wears none", () => {
    // The same class the text's own token of that kind carries, so one palette colours both.
    assert.equal(completionKindClass("meta"), "ui-tk-meta");
    assert.match(renderSegments("#if", [{ from: 0, to: 3, kind: "meta" }], []), /class="ui-tk-meta"/);
    assert.equal(completionKindClass("keyword"), "ui-tk-keyword");
    assert.equal(completionKindClass("text"), null);
    assert.equal(completionKindClass(undefined), null);
});

test("a completions file with nothing usable reads as empty", () => {
    assert.deepEqual(parseCompletionsFile(null), { items: [], triggers: [] });
    assert.deepEqual(parseCompletionsFile({}), { items: [], triggers: [] });
});

test("a source is keyed by the language id as a field names it: trimmed, any case, and an empty one is plain text", () => {
    const registry = new CompletionsRegistry();
    const everywhere: CompletionItem[] = [{ label: "all" }];
    const plain: CompletionItem[] = [{ label: "plain" }];
    const csharp: CompletionItem[] = [{ label: "cs" }];

    registry.register("*", everywhere);
    registry.register("", plain);
    registry.register(" CSharp ", csharp);

    assert.deepEqual(registry.sourcesFor("plain-text"), [everywhere, plain]);
    assert.deepEqual(registry.sourcesFor("csharp"), [everywhere, csharp]);
    assert.deepEqual(registry.sourcesFor("json"), [everywhere]);
});

test("a completions file whose fetch failed is not kept: the next field to name it asks again", async () => {
    const answers: Response[] = [new Response(null, { status: 503 }), Response.json({ items: [{ label: "SELECT" }] })];
    const fetched: string[] = [];
    const realFetch = globalThis.fetch;

    globalThis.fetch = (input: RequestInfo | URL): Promise<Response> => {
        fetched.push(String(input));

        return Promise.resolve(answers.shift() as Response);
    };

    try {
        assert.deepEqual(await loadCompletionsFile("/completions/sql.json"), { items: [], triggers: [] });
        assert.deepEqual((await loadCompletionsFile("/completions/sql.json")).items.map(item => item.label), ["SELECT"]);
        assert.deepEqual((await loadCompletionsFile("/completions/sql.json")).items.map(item => item.label), ["SELECT"]);
        assert.equal(fetched.length, 2);
    }
    finally {
        globalThis.fetch = realFetch;
    }
});

test("multi-character triggers match before or at the caret and replace the trigger prefix without doubling it", () => {
    const triggers = [".", "::", "{{"];

    assert.equal(activeTrigger("Hello {", 7, triggers), null);
    assert.equal(activeTrigger("Hello {{", 8, triggers), "{{");
    assert.equal(activeTrigger("Hello {{us", 10, triggers), "{{");
    assert.equal(activeTrigger("Hello {{ us", 11, triggers), null);
    assert.equal(activeTrigger("std::vec", 8, triggers), "::");

    assert.deepEqual(completionRange("Hello {{", 8, "{{user}}", triggers), { from: 6, to: 8 });
    assert.deepEqual(completionRange("Hello {{us", 10, "{{user}}", triggers), { from: 6, to: 10 });
    assert.deepEqual(completionRange("Hello {{us}}", 10, "{{user}}", triggers), { from: 6, to: 12 });
    assert.deepEqual(completionRange("obj.wr", 6, "writeLine", triggers), { from: 4, to: 6 });

    const customTriggers = ["[[", "{", "<%", "${", "%%"];

    assert.deepEqual(completionRange("See [[pa]]", 8, "[[page]]", customTriggers), { from: 4, to: 10 });
    assert.deepEqual(completionRange("Hi {us}", 6, "{user}", customTriggers), { from: 3, to: 7 });
    assert.deepEqual(completionRange("<%it%>", 4, "<%item%>", customTriggers), { from: 0, to: 6 });
    assert.deepEqual(completionRange("${na}", 4, "${name}", customTriggers), { from: 0, to: 5 });
    assert.deepEqual(completionRange("%%va%%", 4, "%%value%%", customTriggers), { from: 0, to: 6 });
});

class FakeDomElement {
    public readonly tagName: string;
    public id = "";
    public className = "";
    public hidden = false;
    public textContent = "";
    public readonly style: Record<string, string> = {};
    public readonly children: FakeDomElement[] = [];
    private readonly attributes = new Map<string, string>();
    public readonly classList = {
        toggle: (token: string, force?: boolean): boolean => {
            const parts = new Set(this.className.split(/\s+/).filter(Boolean));
            const next = force ?? !parts.has(token);

            if (next)
                parts.add(token);
            else
                parts.delete(token);

            this.className = [...parts].join(" ");
            return next;
        }
    };

    public constructor(tagName: string) {
        this.tagName = tagName.toUpperCase();
    }

    public setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }

    public getAttribute(name: string): string | null {
        return this.attributes.get(name) ?? null;
    }

    public hasAttribute(name: string): boolean {
        return this.attributes.has(name);
    }

    public removeAttribute(name: string): void {
        this.attributes.delete(name);
    }

    public append(...nodes: FakeDomElement[]): void {
        this.children.push(...nodes);
    }

    public appendChild(node: FakeDomElement): FakeDomElement {
        this.children.push(node);
        return node;
    }

    public replaceChildren(...nodes: FakeDomElement[]): void {
        this.children.length = 0;
        this.children.push(...nodes);
    }

    public addEventListener(): void {}

    public scrollIntoView(): void {}

    public getBoundingClientRect(): { left: number; top: number; right: number; bottom: number } {
        return { left: 0, top: 0, right: 0, bottom: 0 };
    }
}

function createCompletionsStage(sourceUrl: string) {
    const root = new FakeDomElement("div");

    root.setAttribute(CompletionsAttribute, "");
    root.setAttribute(CompletionsSourceAttribute, sourceUrl);

    const content = new FakeDomElement("div");
    const scroller = new FakeDomElement("div");
    const state = {
        value: "",
        selectionStart: 0,
        selectionEnd: 0,
        readOnly: false,
        disabled: false,
        isConnected: true,
        locked: false,
        tokenKind: null as string | null,
        openedCount: 0,
        closedCount: 0,
        renderedLabels: (): string[] => {
            const list = root.children[0];

            return list === undefined ? [] : list.children.map(row => row.children[0]?.textContent ?? "");
        }
    };

    const textarea = {
        get value(): string {
            return state.value;
        },
        set value(next: string) {
            state.value = next;
        },
        get selectionStart(): number {
            return state.selectionStart;
        },
        set selectionStart(next: number) {
            state.selectionStart = next;
            state.selectionEnd = next;
        },
        get selectionEnd(): number {
            return state.selectionEnd;
        },
        set selectionEnd(next: number) {
            state.selectionEnd = next;
        },
        get readOnly(): boolean {
            return state.readOnly;
        },
        get disabled(): boolean {
            return state.disabled;
        },
        get isConnected(): boolean {
            return state.isConnected;
        },
        setAttribute: () => undefined,
        removeAttribute: () => undefined
    } as unknown as HTMLTextAreaElement;

    const pluginContext = {
        dom: {
            ensureId: (_el: unknown, prefix: string) => `${prefix}-1`
        },
        strings: {
            text: (key: string) => key
        },
        shortcuts: {
            isComposing: () => false,
            matches: (event: { key?: string; ctrlKey?: boolean }, chord: string) => chord === "Ctrl+Space" && event.ctrlKey === true && event.key === " "
        },
        popups: {
            open: () => {
                state.openedCount++;
                return {
                    reposition: () => undefined,
                    close: () => {
                        state.closedCount++;
                    }
                };
            }
        }
    };

    const surface = {
        get isLocked(): boolean {
            return state.locked;
        },
        lines: {
            lineAt: () => 0,
            start: () => 0
        },
        tokenKindAt: () => state.tokenKind
    };

    const editing = {
        acceptCompletion: () => undefined
    };

    const carets = {
        contentCaretRect: () => ({ left: 8, top: 4, right: 8, bottom: 20 })
    };

    const completions = new CodeEditorCompletions(
        {
            root: root as unknown as HTMLElement,
            textarea,
            scroller: scroller as unknown as HTMLElement,
            content: content as unknown as HTMLElement
        },
        pluginContext as never,
        surface as never,
        editing as never,
        carets as never,
        () => "plain-text"
    );

    return { completions, textarea, state };
}

test("typing an external trigger character or pressing Ctrl+Space while the completions file is still loading opens once resolved", async () => {
    const globals = globalThis as {
        Element?: unknown;
        HTMLElement?: unknown;
        InputEvent?: unknown;
        document?: { activeElement: unknown; createElement: (tag: string) => unknown };
    };
    const prevElement = globals.Element;
    const prevHtmlElement = globals.HTMLElement;
    const prevInputEvent = globals.InputEvent;
    const prevDocument = globals.document;
    const realFetch = globalThis.fetch;

    class FakeInputEvent {
        public readonly type: string;
        public readonly inputType: string;
        public readonly isComposing = false;

        public constructor(type: string, init?: { inputType?: string }) {
            this.type = type;
            this.inputType = init?.inputType ?? "";
        }
    }

    const resolvers = new Map<string, (response: Response) => void>();

    globals.Element = FakeDomElement;
    globals.HTMLElement = FakeDomElement;
    globals.InputEvent = FakeInputEvent;
    globals.document = {
        activeElement: null,
        createElement: (tag: string) => new FakeDomElement(tag)
    };
    globalThis.fetch = (input: RequestInfo | URL): Promise<Response> => new Promise<Response>(resolve => {
        resolvers.set(String(input), resolve);
    });

    try {
        // 1. Trigger character typed before external completions JSON finishes loading.
        const triggerStage = createCompletionsStage("/completions/pending-trigger.json");

        globals.document.activeElement = triggerStage.textarea;
        triggerStage.textarea.value = "Hi {{";
        triggerStage.textarea.selectionStart = 5;
        triggerStage.completions.textChanged(new FakeInputEvent("input", { inputType: "insertText" }) as unknown as Event);

        assert.equal(triggerStage.completions.isOpen, false);
        assert.equal(resolvers.has("/completions/pending-trigger.json"), true);

        resolvers.get("/completions/pending-trigger.json")!(Response.json({
            triggers: ["{{"],
            items: [{ label: "{{userName}}" }, { label: "{{userEmail}}" }]
        }));
        await loadCompletionsFile("/completions/pending-trigger.json");
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.equal(triggerStage.completions.isOpen, true);
        assert.deepEqual(triggerStage.state.renderedLabels(), ["{{userName}}", "{{userEmail}}"]);

        // 2. Ctrl+Space pressed before external completions JSON finishes loading.
        const explicitStage = createCompletionsStage("/completions/pending-explicit.json");

        globals.document.activeElement = explicitStage.textarea;
        explicitStage.completions.key({ key: " ", ctrlKey: true, defaultPrevented: false, preventDefault: () => undefined } as unknown as KeyboardEvent);

        assert.equal(explicitStage.completions.isOpen, false);
        resolvers.get("/completions/pending-explicit.json")!(Response.json({
            items: [{ label: "alpha" }, { label: "beta" }]
        }));
        await loadCompletionsFile("/completions/pending-explicit.json");
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.equal(explicitStage.completions.isOpen, true);
        assert.deepEqual(explicitStage.state.renderedLabels(), ["alpha", "beta"]);

        // 3. Stale guard: blurring or locking before the external JSON resolves keeps the popup closed.
        const blurredStage = createCompletionsStage("/completions/pending-blurred.json");

        globals.document.activeElement = blurredStage.textarea;
        blurredStage.textarea.value = ".";
        blurredStage.textarea.selectionStart = 1;
        blurredStage.completions.textChanged(new FakeInputEvent("input", { inputType: "insertText" }) as unknown as Event);
        globals.document.activeElement = null;

        resolvers.get("/completions/pending-blurred.json")!(Response.json({
            triggers: ["."],
            items: [{ label: ".trim" }]
        }));
        await loadCompletionsFile("/completions/pending-blurred.json");
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.equal(blurredStage.completions.isOpen, false);
    }
    finally {
        globalThis.fetch = realFetch;
        globals.Element = prevElement;
        globals.HTMLElement = prevHtmlElement;
        globals.InputEvent = prevInputEvent;
        globals.document = prevDocument;
    }
});
