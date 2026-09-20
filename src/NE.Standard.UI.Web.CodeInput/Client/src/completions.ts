// Completions: the shape of a suggestion and a source, and the pure prefix, ranking and document-word rules the popup filters by.
// The popup, the `CompletionsSource` fetch and the list's keys live in `code-editor-completions.ts`.

import { wordAt } from "./motion.ts";

export type CompletionKind = "keyword" | "type" | "function" | "variable" | "property" | "text";

/** One suggestion: `insert` defaults to `label`, `detail` is shown muted after it, `kind` colours the row. */
export type CompletionItem = {
    readonly label: string;
    readonly insert?: string;
    readonly detail?: string;
    readonly kind?: CompletionKind;
};

/** What a provider is given: the field's whole text, the caret it opened at, and the identifier prefix up to it. */
export type CompletionContext = {
    readonly text: string;
    readonly offset: number;
    readonly line: number;
    readonly column: number;
    readonly prefix: string;
    readonly languageId: string;
};

/** A fixed list, or a function asked afresh each time the list opens or re-filters — synchronously or over a promise. */
export type CompletionProvider = (context: CompletionContext) => readonly CompletionItem[] | Promise<readonly CompletionItem[]>;
export type CompletionSource = readonly CompletionItem[] | CompletionProvider;

/** What a `CompletionsSource` JSON file carries, read. */
export type CompletionsFile = {
    readonly items: readonly CompletionItem[];
    readonly triggers: readonly string[];
};

const IdentifierCharacter = /[\p{L}\p{N}_]/u;

/** Where the identifier immediately before an offset starts — the span a completion replaces. */
export function prefixStart(text: string, offset: number): number {
    let start = offset;

    while (start > 0 && IdentifierCharacter.test(text.charAt(start - 1)))
        start--;

    return start;
}

/** The identifier immediately before an offset — what the list filters against. */
export function prefixAt(text: string, offset: number): string {
    return text.slice(prefixStart(text, offset), offset);
}

/**
 * Every source's items in one list, in source order: a fixed list as is, a provider awaited. A provider that throws contributes
 * nothing rather than failing the rest.
 */
export async function collectCompletions(sources: readonly CompletionSource[], context: CompletionContext): Promise<CompletionItem[]> {
    const collected: CompletionItem[] = [];

    for (const source of sources) {
        try {
            const items = typeof source === "function" ? await source(context) : source;

            collected.push(...items);
        }
        catch {
            // Left out, not thrown: the sources after this one still run.
        }
    }

    return collected;
}

/**
 * The items a prefix matches, best first — exact case, then case-insensitive, then substring; ties keep collection order.
 * Deduplicated by label and capped, so a document of thousands of words still leaves a usable list.
 */
export function rankCompletions(items: readonly CompletionItem[], prefix: string, limit = 50): CompletionItem[] {
    const lower = prefix.toLowerCase();
    const scored: { readonly item: CompletionItem; readonly tier: number; readonly index: number }[] = [];

    for (let index = 0; index < items.length; index++) {
        const tier = prefix.length === 0 ? 0 : tierOf(items[index].label, prefix, lower);

        if (tier >= 0)
            scored.push({ item: items[index], tier, index });
    }

    scored.sort((a, b) => a.tier - b.tier || a.index - b.index);

    const seen = new Set<string>();
    const ranked: CompletionItem[] = [];

    for (const { item } of scored) {
        if (seen.has(item.label))
            continue;

        seen.add(item.label);
        ranked.push(item);

        if (ranked.length >= limit)
            break;
    }

    return ranked;
}

function tierOf(label: string, prefix: string, lowerPrefix: string): number {
    if (label.startsWith(prefix))
        return 0;

    const lowerLabel = label.toLowerCase();

    if (lowerLabel.startsWith(lowerPrefix))
        return 1;

    return lowerLabel.includes(lowerPrefix) ? 2 : -1;
}

const DocumentWord = /[\p{L}\p{N}_]+/gu;

/** Every identifier of two or more characters the text holds, but not the one the caret stands in the middle of typing. */
export function documentWordsSource(context: CompletionContext): CompletionItem[] {
    const current = wordAt(context.text, context.offset);
    const seen = new Set<string>();
    const items: CompletionItem[] = [];

    DocumentWord.lastIndex = 0;

    for (let match = DocumentWord.exec(context.text); match !== null; match = DocumentWord.exec(context.text)) {
        const word = match[0];
        const from = match.index;

        if (current !== null && from === current.from && from + word.length === current.to)
            continue;

        if (word.length >= 2 && !seen.has(word)) {
            seen.add(word);
            items.push({ label: word, kind: "text" });
        }
    }

    return items;
}

const ValidKinds: ReadonlySet<CompletionKind> = new Set(["keyword", "type", "function", "variable", "property", "text"]);

/** Reads a `CompletionsSource` file's JSON: an item with no label is dropped, `insert` defaults to `label`, an unknown `kind` is dropped. */
export function parseCompletionsFile(data: unknown): CompletionsFile {
    const root = isRecord(data) ? data : {};
    const rawItems = Array.isArray(root.items) ? root.items : [];
    const items: CompletionItem[] = [];

    for (const raw of rawItems) {
        if (!isRecord(raw) || typeof raw.label !== "string" || raw.label.length === 0)
            continue;

        const kind = typeof raw.kind === "string" && ValidKinds.has(raw.kind as CompletionKind) ? raw.kind as CompletionKind : undefined;
        const insert = typeof raw.insert === "string" && raw.insert.length > 0 ? raw.insert : raw.label;
        const detail = typeof raw.detail === "string" ? raw.detail : undefined;

        items.push({ label: raw.label, insert, detail, kind });
    }

    const rawTriggers = Array.isArray(root.triggers) ? root.triggers : [];
    const triggers = rawTriggers.filter((trigger): trigger is string => typeof trigger === "string" && trigger.length > 0);

    return { items, triggers };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
