import type { Tokenizer } from "../tokenizer.ts";
import { bashTokenizer } from "./bash.ts";
import { csharpTokenizer } from "./csharp.ts";
import { cssTokenizer, lessTokenizer } from "./css.ts";
import { htmlTokenizer } from "./html.ts";
import { javascriptTokenizer } from "./javascript.ts";
import { jsonTokenizer } from "./json.ts";
import { pythonTokenizer } from "./python.ts";

/** The languages the package ships, by the ids the server's `UICodeLanguages` names. */
const BuiltIn: readonly [string, Tokenizer][] = [
    ["json", jsonTokenizer],
    ["css", cssTokenizer],
    ["less", lessTokenizer],
    ["javascript", javascriptTokenizer],
    ["typescript", javascriptTokenizer],
    ["html", htmlTokenizer],
    ["bash", bashTokenizer],
    ["csharp", csharpTokenizer],
    ["python", pythonTokenizer]
];

export const PlainText = "plain-text";

/**
 * The languages the editor knows, by id — the built-in ones and any a package registered. A registration reaches every field that
 * already names the id, so a language package may load before or after the fields it serves.
 */
export class LanguageRegistry {
    private readonly tokenizers = new Map<string, Tokenizer>(BuiltIn);
    private readonly listeners = new Set<(id: string) => void>();

    /** The id as the registry keys it: trimmed and lower-cased, so an attribute written either way finds its language. */
    public static normalize(id: string | null | undefined): string {
        const normalized = (id ?? "").trim().toLowerCase();

        return normalized.length === 0 ? PlainText : normalized;
    }

    /** The tokenizer for an id; null for plain text and for an id nothing has registered. */
    public get(id: string | null | undefined): Tokenizer | null {
        return this.tokenizers.get(LanguageRegistry.normalize(id)) ?? null;
    }

    public has(id: string): boolean {
        return this.tokenizers.has(LanguageRegistry.normalize(id));
    }

    /** Adds a language, or replaces one, and tells every listener. */
    public register(id: string, tokenizer: Tokenizer): void {
        const key = LanguageRegistry.normalize(id);

        if (key === PlainText)
            throw new Error("The plain-text language cannot be redefined.");

        if (typeof tokenizer?.tokenizeLine !== "function" || tokenizer.initialState === undefined)
            throw new Error(`The language '${id}' needs a tokenizer with an initialState and a tokenizeLine.`);

        this.tokenizers.set(key, tokenizer);

        for (const listener of this.listeners)
            listener(key);
    }

    public onRegistered(listener: (id: string) => void): () => void {
        this.listeners.add(listener);

        return () => this.listeners.delete(listener);
    }
}

export const languages = new LanguageRegistry();
