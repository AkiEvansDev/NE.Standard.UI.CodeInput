// What another package reaches of this one: `window.NEStandardUICodeInput`, there from the moment this module runs. A language
// package registers its tokenizer under an id an application then names in `Language`; one that loads before this module leaves
// its registration in `__pendingLanguages` on a stub of the same global, the way the framework's own global takes early callers.

import type { LanguageRegistry } from "./languages/index.ts";
import type { Mode, Tokenizer } from "./tokenizer.ts";
import { modeTokenizer } from "./tokenizer.ts";

export type PendingLanguage = {
    readonly id: string;
    readonly tokenizer: Tokenizer;
};

export type CodeInputGlobalApi = {
    /** Adds a language by id, or replaces a built-in one; every field naming the id picks it up at once. */
    registerLanguage(id: string, tokenizer: Tokenizer): void;
    /** Builds a tokenizer from a mode in the stream shape — one token per call — so a package needs no reader of its own. */
    createTokenizer<TState extends object>(mode: Mode<TState>): Tokenizer;
    __pendingLanguages?: PendingLanguage[];
};

declare global {
    interface Window {
        NEStandardUICodeInput?: Partial<CodeInputGlobalApi>;
    }
}

export function installPackageApi(registry: LanguageRegistry): CodeInputGlobalApi {
    const pending = window.NEStandardUICodeInput?.__pendingLanguages ?? [];

    const api: CodeInputGlobalApi = {
        registerLanguage: (id, tokenizer) => registry.register(id, tokenizer),
        createTokenizer: modeTokenizer,
        __pendingLanguages: []
    };

    window.NEStandardUICodeInput = api;

    for (const language of pending)
        registry.register(language.id, language.tokenizer);

    return api;
}
