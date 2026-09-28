import assert from "node:assert/strict";
import test from "node:test";

import { CompletionsRegistry } from "../src/completions-registry.ts";
import type { CompletionContext, CompletionItem } from "../src/completions.ts";
import { collectCompletions, documentWordsSource, parseCompletionsFile, prefixAt, prefixStart, rankCompletions } from "../src/completions.ts";

function context(overrides: Partial<CompletionContext> = {}): CompletionContext {
    return { text: "", offset: 0, line: 0, column: 0, prefix: "", languageId: "plain-text", ...overrides };
}

test("the prefix is the identifier immediately before the offset", () => {
    assert.equal(prefixAt("foo.ba", 6), "ba");
    assert.equal(prefixAt("foo.", 4), "");
    assert.equal(prefixStart("foo.ba", 6), 4);
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
