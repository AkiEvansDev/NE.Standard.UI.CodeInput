// The completion sources an application or a package registered, by language id — what `Completions` turns on. A field's own list
// adds the language's keywords and the document's words beside them.

import type { CompletionSource } from "./completions.ts";

const Wildcard = "*";

/** Sources by language id; `"*"` reaches every language, ahead of a language's own in the order a field's list collects them. */
export class CompletionsRegistry {
    private readonly sources = new Map<string, CompletionSource[]>();

    public register(languageId: string, source: CompletionSource): void {
        const key = normalize(languageId);
        const list = this.sources.get(key);

        if (list === undefined)
            this.sources.set(key, [source]);
        else
            list.push(source);
    }

    public sourcesFor(languageId: string): readonly CompletionSource[] {
        const wildcard = this.sources.get(Wildcard) ?? [];
        const own = this.sources.get(normalize(languageId)) ?? [];

        return [...wildcard, ...own];
    }

    /** Whether a language has a source registered — beyond the document's own words, which every field already offers. */
    public hasOwnSource(languageId: string): boolean {
        return this.sourcesFor(languageId).length > 0;
    }
}

function normalize(languageId: string): string {
    return languageId.trim().toLowerCase();
}

export const completionsRegistry = new CompletionsRegistry();
