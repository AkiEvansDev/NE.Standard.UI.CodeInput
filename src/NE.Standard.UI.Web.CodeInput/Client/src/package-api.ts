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
};

export type PendingCompletions = {
    readonly languageId: string;
    readonly source: CompletionSource;
};

export type CodeInputGlobalApi = {
    /** Adds a language by id, or replaces a built-in one; every field naming the id picks it up at once. */
    registerLanguage(id: string, tokenizer: Tokenizer): void;
    /** Builds a tokenizer from a mode in the stream shape — one token per call — so a package needs no reader of its own. */
    createTokenizer<TState extends object>(mode: Mode<TState>): Tokenizer;
    /** Adds a completion source for a language, or `"*"` for every one — a fixed list, or a provider asked afresh each time. */
    registerCompletions(languageId: string, source: CompletionSource): void;
    __pendingLanguages?: PendingLanguage[];
    __pendingCompletions?: PendingCompletions[];
};

declare global {
    interface Window {
        NEStandardUICodeInput?: Partial<CodeInputGlobalApi>;
    }
}

export function installPackageApi(registry: LanguageRegistry, completions: CompletionsRegistry): CodeInputGlobalApi {
    const pendingLanguages = window.NEStandardUICodeInput?.__pendingLanguages ?? [];
    const pendingCompletions = window.NEStandardUICodeInput?.__pendingCompletions ?? [];

    const api: CodeInputGlobalApi = {
        registerLanguage: (id, tokenizer) => registry.register(id, tokenizer),
        createTokenizer: modeTokenizer,
        registerCompletions: (languageId, source) => completions.register(languageId, source),
        __pendingLanguages: [],
        __pendingCompletions: []
    };

    window.NEStandardUICodeInput = api;

    for (const language of pendingLanguages)
        registry.register(language.id, language.tokenizer);

    for (const pending of pendingCompletions)
        completions.register(pending.languageId, pending.source);

    return api;
}
