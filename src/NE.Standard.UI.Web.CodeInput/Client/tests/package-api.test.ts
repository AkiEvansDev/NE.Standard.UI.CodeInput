import assert from "node:assert/strict";
import test from "node:test";

import type { CompletionItem } from "../src/completions.ts";
import { CompletionsRegistry } from "../src/completions-registry.ts";
import { LanguageRegistry } from "../src/languages/index.ts";
import { installPackageApi } from "../src/package-api.ts";
import type { Tokenizer } from "../src/tokenizer.ts";

const tokenizer: Tokenizer = { initialState: {}, tokenizeLine: (_line, state) => state };
const words: CompletionItem[] = [{ label: "SELECT", kind: "keyword" }];

// The page's global, as a language package that loaded first leaves it — or nothing, as an empty page does.
function install(pending?: Window["NEStandardUICodeInput"]): { readonly languages: LanguageRegistry; readonly completions: CompletionsRegistry } {
    Object.defineProperty(globalThis, "window", { value: { NEStandardUICodeInput: pending }, configurable: true });

    const languages = new LanguageRegistry();
    const completions = new CompletionsRegistry();

    installPackageApi(languages, completions);

    return { languages, completions };
}

test("a language registered with its completions brings both in one call", () => {
    const { languages, completions } = install();

    window.NEStandardUICodeInput?.registerLanguage?.("SQL", tokenizer, words);

    assert.equal(languages.get("sql"), tokenizer);
    assert.deepEqual(completions.sourcesFor("sql"), [words]);
});

test("a language registered without completions adds no source", () => {
    const { completions } = install();

    window.NEStandardUICodeInput?.registerLanguage?.("sql", tokenizer);

    assert.equal(completions.hasOwnSource("sql"), false);
});

test("a language queued before the package loaded brings its completions with it", () => {
    const { languages, completions } = install({ __pendingLanguages: [{ id: "sql", tokenizer, completions: words }] });

    assert.equal(languages.get("sql"), tokenizer);
    assert.deepEqual(completions.sourcesFor("sql"), [words]);
});

test("a refused tokenizer keeps no completions for its language", () => {
    const { completions } = install();

    assert.throws(() => window.NEStandardUICodeInput?.registerLanguage?.("plain-text", tokenizer, words));
    assert.equal(completions.hasOwnSource("plain-text"), false);
});
