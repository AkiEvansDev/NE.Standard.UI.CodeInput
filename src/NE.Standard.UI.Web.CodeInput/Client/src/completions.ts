// Completions: the shape of a suggestion and a source, and the pure prefix, ranking and document-word rules the popup filters by.
// The popup, the `CompletionsSource` fetch and the list's keys live in `code-editor-completions.ts`.

import { tokenClass } from "./highlighter.ts";
import { codePointBefore, WordCharacter, wordAt } from "./motion.ts";
import type { TokenKind } from "./tokenizer.ts";
import { TokenKinds } from "./tokenizer.ts";
import { warnOnce } from "./warn-once.ts";

/** Any token kind, whose ink the label wears as the same word wears it in the text; `text` is plain, as no kind is. */
type CompletionKind = TokenKind | "text";

/** One suggestion: `insert` defaults to `label`, `detail` is shown muted after it, `kind` colours the label. */
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
type CompletionProvider = (context: CompletionContext) => readonly CompletionItem[] | Promise<readonly CompletionItem[]>;
export type CompletionSource = readonly CompletionItem[] | CompletionProvider;

/** What a `CompletionsSource` JSON file carries, read. */
export type CompletionsFile = {
    readonly items: readonly CompletionItem[];
    readonly triggers: readonly string[];
};

/** Where the identifier immediately before an offset starts — the span a completion replaces. */
export function prefixStart(text: string, offset: number): number {
    let start = offset;

    while (start > 0) {
        const ch = codePointBefore(text, start);

        if (!WordCharacter.test(ch))
            break;

        start -= ch.length;
    }

    return start;
}

/** The identifier immediately before an offset — what the list filters against. */
export function prefixAt(text: string, offset: number): string {
    return text.slice(prefixStart(text, offset), offset);
}

/**
 * The longest configured trigger standing immediately before the current identifier at `offset` (or at `offset` when no
 * identifier has been started yet); null when none stands there.
 */
export function activeTrigger(text: string, offset: number, triggers: readonly string[]): string | null {
    const start = prefixStart(text, offset);
    let best: string | null = null;

    for (const trigger of triggers) {
        if (trigger.length === 0)
            continue;

        const matchesBeforeWord = start >= trigger.length && text.startsWith(trigger, start - trigger.length);
        const matchesAtCaret = offset >= trigger.length && text.startsWith(trigger, offset - trigger.length);

        if ((matchesBeforeWord || matchesAtCaret) && (best === null || trigger.length > best.length))
            best = trigger;
    }

    return best;
}

/**
 * The range a completion replaces at `caret`: the identifier prefix before `caret`, plus a preceding trigger when `insert`
 * itself starts with that trigger (so completing `{{user}}` after `{{` or `{{u` does not double the opening `{{`), and any
 * matching closing delimiter already standing immediately after `caret`.
 */
export function completionRange(text: string, caret: number, insert: string, triggers: readonly string[] = []): { readonly from: number; readonly to: number } {
    let from = prefixStart(text, caret);
    let to = caret;
    const trigger = activeTrigger(text, caret, triggers);

    if (trigger !== null && insert.startsWith(trigger)) {
        if (from >= trigger.length && text.startsWith(trigger, from - trigger.length))
            from -= trigger.length;
        else if (caret >= trigger.length && text.startsWith(trigger, caret - trigger.length))
            from = caret - trigger.length;

        const close = closingSuffixOf(trigger, insert);

        if (close.length > 0 && text.startsWith(close, caret))
            to += close.length;
    }

    return { from, to };
}

const ClosingBrackets: Readonly<Record<string, string>> = {
    "{": "}",
    "[": "]",
    "(": ")",
    "<": ">",
    "\u00AB": "\u00BB"
};
const SymmetricDelimiterChars = new Set(["%", "$", ":", "/", "|", "!", "?", "=", "*", "_", "~", "\"", "'", "`"]);

function closingSuffixOf(trigger: string, insert: string): string {
    let mirrored = "";
    let validMirrored = trigger.length > 0;

    for (let index = trigger.length - 1; index >= 0; index--) {
        const ch = trigger.charAt(index);
        const paired = Object.hasOwn(ClosingBrackets, ch) ? ClosingBrackets[ch] : SymmetricDelimiterChars.has(ch) ? ch : null;

        if (paired === null) {
            validMirrored = false;
            break;
        }

        mirrored += paired;
    }

    if (validMirrored && insert.length > trigger.length + mirrored.length && insert.endsWith(mirrored))
        return mirrored;

    const lastChar = trigger.charAt(trigger.length - 1);
    const trailingClose = Object.hasOwn(ClosingBrackets, lastChar) ? ClosingBrackets[lastChar] : "";

    if (trailingClose.length > 0 && insert.length > trigger.length + trailingClose.length && insert.endsWith(trailingClose))
        return trailingClose;

    return "";
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
        catch (error) {
            // Left out, not thrown: the sources after this one still run.
            warnOnce(source, "a completions provider threw; its words are left out.", error);
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
    // The text less the word being typed, which non-word characters stand either side of, so taking it out joins no two words.
    const rest = current === null ? context.text : context.text.slice(0, current.from) + context.text.slice(current.to);
    const items: CompletionItem[] = [];

    for (const word of documentWords(rest))
        items.push({ label: word, kind: "text" });

    return items;
}

// The last text read and its words. Typing an identifier changes only the word being typed, which is left out of the key, so the
// words are read once per word rather than once per keystroke — on a long text the read cost more than the keystroke.
let wordsText: string | null = null;
let wordsRead: readonly string[] = [];

/** Every distinct word of two or more characters, in the order it first appears. */
function documentWords(text: string): readonly string[] {
    if (text === wordsText)
        return wordsRead;

    const seen = new Set<string>();

    DocumentWord.lastIndex = 0;

    for (let match = DocumentWord.exec(text); match !== null; match = DocumentWord.exec(text)) {
        if (match[0].length >= 2)
            seen.add(match[0]);
    }

    wordsText = text;
    wordsRead = [...seen];

    return wordsRead;
}

/** The highlighter's own class for a completion's kind, so the label is coloured by the palette the text is; none for plain text. */
export function completionKindClass(kind: CompletionKind | undefined): string | null {
    return kind === undefined || kind === "text" ? null : tokenClass(kind);
}

const ValidKinds: ReadonlySet<CompletionKind> = new Set<CompletionKind>([...TokenKinds, "text"]);

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
