// What another package reaches of this one: `window.NEStandardUICodeInput`, there from module load. A language or completions
// package registers under an id named later in `Language`; one that loads first queues in a `__pending...` array on a stub of the
// same global.

import type { CompletionsRegistry } from "./completions-registry.ts";
import type { CompletionSource } from "./completions.ts";
import type { LanguageRegistry } from "./languages/index.ts";
import type { Mode, Tokenizer } from "./tokenizer.ts";
import { modeTokenizer } from "./tokenizer.ts";

export type PendingLanguage = {
    readonly id: string;
    readonly tokenizer: Tokenizer;
    readonly completions?: CompletionSource;
};

export type PendingCompletions = {
    readonly languageId: string;
    readonly source: CompletionSource;
};

export type CodeInputGlobalApi = {
    /**
     * Adds a language by id, or replaces a built-in one; every field naming the id picks it up at once. `completions`, when given,
     * is registered for the id as `registerCompletions` would, so a language package ships both in one call.
     */
    registerLanguage(id: string, tokenizer: Tokenizer, completions?: CompletionSource): void;
    /** Builds a tokenizer from a mode in the stream shape — one token per call — so a package needs no reader of its own. */
    createTokenizer<TState extends object>(mode: Mode<TState>): Tokenizer;
    /** Adds a completion source for a language, or `"*"` for every one — a fixed list, or a provider asked afresh each time. */
    registerCompletions(languageId: string, source: CompletionSource): void;
    __pendingLanguages?: PendingLanguage[];
    __pendingCompletions?: PendingCompletions[];
};

declare global {
    // oxlint-disable-next-line typescript/consistent-type-definitions -- only an interface merges into lib.dom's Window
    interface Window {
        NEStandardUICodeInput?: Partial<CodeInputGlobalApi>;
    }
}

export function installPackageApi(registry: LanguageRegistry, completionsRegistry: CompletionsRegistry): CodeInputGlobalApi {
    const pendingLanguages = window.NEStandardUICodeInput?.__pendingLanguages ?? [];
    const pendingCompletions = window.NEStandardUICodeInput?.__pendingCompletions ?? [];

    const api: CodeInputGlobalApi = {
        registerLanguage: (id, tokenizer, completions) => addLanguage(registry, completionsRegistry, { id, tokenizer, completions }),
        createTokenizer: modeTokenizer,
        registerCompletions: (languageId, source) => completionsRegistry.register(languageId, source),
        __pendingLanguages: [],
        __pendingCompletions: []
    };

    window.NEStandardUICodeInput = api;

    for (const language of pendingLanguages)
        addLanguage(registry, completionsRegistry, language);

    for (const pending of pendingCompletions)
        completionsRegistry.register(pending.languageId, pending.source);

    return api;
}

/** The tokenizer first: one the registry refuses throws before its completions are kept for a language that is not there. */
function addLanguage(registry: LanguageRegistry, completionsRegistry: CompletionsRegistry, language: PendingLanguage): void {
    registry.register(language.id, language.tokenizer);

    if (language.completions !== undefined)
        completionsRegistry.register(language.id, language.completions);
}
