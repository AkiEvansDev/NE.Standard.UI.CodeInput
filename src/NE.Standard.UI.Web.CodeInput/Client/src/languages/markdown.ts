import { closesFence, MaxNesting, openFence, QuoteMarker, TableDelimiter, ThematicBreak } from "../markdown-syntax.ts";
import type { EmitToken, LineState, TokenKind, Tokenizer } from "../tokenizer.ts";

// Markdown a line at a time: the block a line opens (heading, fence, quote, list item, rule) and the inline spans inside it. A span
// spanning a line break is left plain, since an editor re-reads a line without its neighbors. A fenced block reads by the language
// its info string names, when registered.

type MarkdownState = {
    /** The opening fence (its character repeated), while inside a fenced block; empty outside one. */
    fence: string;
    /** How many quotes the fence was opened inside; each of its lines carries that many markers, and one short of them ends it. */
    quotes: number;
    /** The registry id the fence's info string names; empty when it names none. */
    language: string;
    /** That language's own state, carried from line to line inside the block. */
    inner: LineState | null;
    /** Inside an HTML comment that has not closed yet. */
    comment: boolean;
};

/** What a fence's info string commonly calls a language, by the id the registry keys it under. */
const Aliases: Readonly<Record<string, string>> = {
    "c#": "csharp",
    cs: "csharp",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    ts: "typescript",
    tsx: "typescript",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    py: "python",
    md: "markdown",
    htm: "html",
    xml: "html",
    svg: "html",
    jsonc: "json"
};

/** The registry id a fence's info string names: its first word, lower-cased, through the common aliases. */
export function fenceLanguageId(info: string): string {
    const word = info.trim().split(/\s+/, 1)[0].replace(/^\{?\.?|\}$/g, "").toLowerCase();

    return Aliases[word] ?? word;
}

const InitialState: MarkdownState = { fence: "", quotes: 0, language: "", inner: null, comment: false };

const AtxHeading = /^#{1,6}(?=\s|$)/;
const SetextUnderline = /^ {0,3}=+[ \t]*$/;
const ReferenceDefinition = /^( {0,3})(\[[^\]]+\]:)([ \t]*)(\S+)(.*)$/;
const ListMarker = /(?:[-*+]|\d{1,9}[.)])(?=[ \t]|$)/y;
const TaskBox = /\[[ xX]\](?=[ \t]|$)/y;
const Escapable = /[!-/:-@[-`{-~]/;
const Entity = /&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[A-Za-z][A-Za-z\d]{1,31});/y;
const Autolink = /<(?:[A-Za-z][A-Za-z\d+.-]{1,31}:[^<>\s]*|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)>/y;
const HtmlTag = /<\/?[A-Za-z][\w-]*(?:\s+[^<>]*)?\/?>/y;
const BareUrl = /(?:https?:\/\/|www\.)[^\s<]*[^\s<?!.,:*_~)]/y;

/** A tokenizer for Markdown whose fenced blocks are read by whatever `resolve` finds for their language. */
export function markdownTokenizer(resolve: (id: string) => Tokenizer | null): Tokenizer {
    return {
        initialState: InitialState,
        tokenizeLine(line, state, emit) {
            const current = state as MarkdownState;

            if (current.fence.length > 0)
                return fencedLine(line, current, emit, resolve);

            return blockLine(line, current, emit, resolve);
        }
    };
}

function fencedLine(line: string, state: MarkdownState, emit: EmitToken, resolve: (id: string) => Tokenizer | null): MarkdownState {
    const quotes = readQuotes(line, state.quotes);

    // A fence inside a quote ends with the quote, as the display's parser reads it: a line short of the markers is read afresh,
    // and no line carries on a fenced block lazily.
    if (quotes.marks.length < state.quotes)
        return blockLine(line, InitialState, emit, resolve);

    emitQuotes(quotes, emit);

    const offset = quotes.end;
    const body = offset === 0 ? line : line.slice(offset);

    if (closesFence(body, state.fence)) {
        emit(offset + body.search(/\S/), offset + body.trimEnd().length, "code");

        return InitialState;
    }

    const tokenizer = state.language.length > 0 ? resolve(state.language) : null;

    if (tokenizer === null) {
        if (body.length > 0)
            emit(offset, line.length, "code");

        return state;
    }

    const shifted: EmitToken = offset === 0 ? emit : (from, to, kind) => emit(offset + from, offset + to, kind);
    const inner = tokenizer.tokenizeLine(body, state.inner ?? tokenizer.initialState, shifted);

    return { ...state, inner };
}

type QuotePrefix = {
    /** Where each marker's `>` stands. */
    readonly marks: readonly number[];
    /** Where the text after the last marker starts. */
    readonly end: number;
};

/** A line's leading quote markers, up to `limit` of them, each read as the display's parser strips one quote level at a time. */
function readQuotes(line: string, limit: number): QuotePrefix {
    const marks: number[] = [];
    let end = 0;

    while (marks.length < limit) {
        const marker = QuoteMarker.exec(end === 0 ? line : line.slice(end));

        if (marker === null)
            break;

        marks.push(end + marker[0].indexOf(">"));
        end += marker[0].length;
    }

    return { marks, end };
}

function emitQuotes(quotes: QuotePrefix, emit: EmitToken): void {
    for (const mark of quotes.marks)
        emit(mark, mark + 1, "quote");
}

function blockLine(line: string, state: MarkdownState, emit: EmitToken, resolve: (id: string) => Tokenizer | null): MarkdownState {
    let from = 0;

    if (state.comment) {
        const end = line.indexOf("-->");

        if (end < 0) {
            if (line.length > 0)
                emit(0, line.length, "comment");

            return state;
        }

        emit(0, end + 3, "comment");
        from = end + 3;
    }

    if (from === 0) {
        // A fence may open inside quotes, as deep as the display's parser nests them.
        const quotes = readQuotes(line, MaxNesting);
        const fence = openFence(quotes.end === 0 ? line : line.slice(quotes.end));

        if (fence !== null) {
            const start = quotes.end + fence.indent;
            const language = fenceLanguageId(fence.info);

            emitQuotes(quotes, emit);
            emit(start, start + fence.marker.length, "code");

            if (fence.info.trim().length > 0)
                emit(start + fence.marker.length + fence.info.search(/\S/), line.trimEnd().length, "keyword");

            return { fence: fence.marker, quotes: quotes.marks.length, language, inner: resolve(language)?.initialState ?? null, comment: false };
        }

        if (SetextUnderline.test(line)) {
            emit(line.search(/\S/), line.trimEnd().length, "heading");

            return InitialState;
        }

        // A line at a time, the header above is out of sight, so a delimiter row is known by its pipe: a lone `-` is a list's marker.
        if (ThematicBreak.test(line) || (TableDelimiter.test(line) && line.includes("|"))) {
            emit(line.search(/\S/), line.trimEnd().length, "punctuation");

            return InitialState;
        }

        const reference = ReferenceDefinition.exec(line);

        if (reference !== null) {
            const label = reference[1].length;
            const url = label + reference[2].length + reference[3].length;

            emit(label, label + reference[2].length - 1, "link");
            emit(url, url + reference[4].length, "string");

            if (reference[5].trim().length > 0)
                emit(url + reference[4].length + reference[5].search(/\S/), line.trimEnd().length, "string");

            return InitialState;
        }
    }

    return { ...InitialState, comment: containerLine(line, from, emit) };
}

/** The quote and list markers a line opens with, then a heading or the line's inline spans; true when a comment is left open. */
function containerLine(line: string, from: number, emit: EmitToken): boolean {
    let position = from;
    let quoted = false;

    for (;;) {
        const at = skipSpaces(line, position);

        if (line.charAt(at) === ">") {
            emit(at, at + 1, "quote");
            quoted = true;
            position = at + 1;
            continue;
        }

        ListMarker.lastIndex = at;

        if (ListMarker.test(line)) {
            emit(at, ListMarker.lastIndex, "keyword");
            position = ListMarker.lastIndex;

            const boxAt = skipSpaces(line, position);

            TaskBox.lastIndex = boxAt;

            if (TaskBox.test(line)) {
                emit(boxAt, TaskBox.lastIndex, "keyword");
                position = TaskBox.lastIndex;
            }

            continue;
        }

        position = at;
        break;
    }

    if (AtxHeading.test(line.slice(position))) {
        emit(position, line.trimEnd().length, "heading");

        return false;
    }

    return inlineSpans(line, position, quoted ? "quote" : null, emit);
}

function skipSpaces(line: string, from: number): number {
    let at = from;

    while (line.charAt(at) === " " || line.charAt(at) === "\t")
        at++;

    return at;
}

/** Emits one line's inline spans from `from`, text between them as `base` or nothing; true when an HTML comment opened and stayed open. */
function inlineSpans(line: string, from: number, base: TokenKind | null, emit: EmitToken): boolean {
    let plain = from;
    let i = from;

    const span = (start: number, end: number, kind: TokenKind): void => {
        if (base !== null && start > plain)
            emit(plain, start, base);

        emit(start, end, kind);
        plain = end;
        i = end;
    };

    while (i < line.length) {
        const character = line.charAt(i);

        if (character === "\\" && Escapable.test(line.charAt(i + 1))) {
            span(i, i + 2, "escape");
            continue;
        }

        if (character === "`") {
            const run = runLength(line, i, "`");
            const close = findRun(line, i + run, "`", run);

            if (close < 0) {
                i += run;
                continue;
            }

            span(i, close + run, "code");
            continue;
        }

        if (character === "*" || character === "_" || character === "~") {
            const end = emphasisEnd(line, i, character);

            if (end < 0) {
                i += runLength(line, i, character);
                continue;
            }

            const run = Math.min(runLength(line, i, character), 3);

            span(i, end, character === "~" ? "strikethrough" : run >= 2 ? "strong" : "emphasis");
            continue;
        }

        if (character === "[" || (character === "!" && line.charAt(i + 1) === "[")) {
            if (linkSpan(line, i, span))
                continue;

            i += character === "!" ? 2 : 1;
            continue;
        }

        if (character === "<") {
            if (line.startsWith("<!--", i)) {
                const end = line.indexOf("-->", i + 4);

                if (end < 0) {
                    span(i, line.length, "comment");

                    return true;
                }

                span(i, end + 3, "comment");
                continue;
            }

            Autolink.lastIndex = i;

            if (Autolink.test(line)) {
                span(i, Autolink.lastIndex, "link");
                continue;
            }

            HtmlTag.lastIndex = i;

            if (HtmlTag.test(line)) {
                span(i, HtmlTag.lastIndex, "tag");
                continue;
            }
        }

        if (character === "&") {
            Entity.lastIndex = i;

            if (Entity.test(line)) {
                span(i, Entity.lastIndex, "escape");
                continue;
            }
        }

        if ((character === "h" || character === "w") && (i === 0 || /[\s(]/.test(line.charAt(i - 1)))) {
            BareUrl.lastIndex = i;

            if (BareUrl.test(line)) {
                span(i, BareUrl.lastIndex, "link");
                continue;
            }
        }

        // A table's cell borders.
        if (character === "|") {
            span(i, i + 1, "punctuation");
            continue;
        }

        i++;
    }

    if (base !== null && line.length > plain)
        emit(plain, line.length, base);

    return false;
}

function runLength(line: string, at: number, character: string): number {
    let end = at;

    while (line.charAt(end) === character)
        end++;

    return end - at;
}

/** Where a run of exactly `length` of `character` starts at or after `from`; -1 when there is none on the line. */
function findRun(line: string, from: number, character: string, length: number): number {
    let at = line.indexOf(character, from);

    while (at >= 0) {
        const run = runLength(line, at, character);

        if (run === length)
            return at;

        at = line.indexOf(character, at + run);
    }

    return -1;
}

/**
 * Where a span opened by the run at `at` ends, past its closing run, or -1: the opening run must be followed by text, the closing
 * one preceded by it, and an underscore can't open or close inside a word.
 */
function emphasisEnd(line: string, at: number, character: string): number {
    const run = runLength(line, at, character);
    const length = character === "~" ? run : Math.min(run, 3);

    if (character === "~" && run > 2)
        return -1;

    const after = line.charAt(at + run);

    if (after === "" || /\s/.test(after))
        return -1;

    if (character === "_" && at > 0 && /[\p{L}\p{N}]/u.test(line.charAt(at - 1)))
        return -1;

    let search = at + run;

    for (;;) {
        const close = line.indexOf(character.repeat(length), search);

        if (close < 0)
            return -1;

        const closeRun = runLength(line, close, character);
        const flanked = !/\s/.test(line.charAt(close - 1));
        const inWord = character === "_" && /[\p{L}\p{N}]/u.test(line.charAt(close + closeRun));

        // A run of another length is some other span's (`*a **b** c*`), so the search goes past it.
        if (flanked && !inWord && closeRun === length)
            return close + closeRun;

        search = close + closeRun;
    }
}

type Span = (start: number, end: number, kind: TokenKind) => void;

/** `[text](address "title")`, `![alt](address)` or `[text][label]`: the bracketed part as a link, what follows as its address. */
function linkSpan(line: string, at: number, span: Span): boolean {
    const open = line.charAt(at) === "!" ? at + 1 : at;
    const close = matching(line, open, "[", "]");

    if (close < 0)
        return false;

    const next = line.charAt(close + 1);

    if (next !== "(" && next !== "[")
        return false;

    const end = matching(line, close + 1, next, next === "(" ? ")" : "]");

    if (end < 0)
        return false;

    span(at, close + 1, "link");
    span(close + 1, end + 1, next === "(" ? "string" : "link");

    return true;
}

/** The index of the bracket closing the one at `at`, nesting and backslash escapes counted; -1 when the line ends first. */
function matching(line: string, at: number, open: string, close: string): number {
    let depth = 0;

    for (let i = at; i < line.length; i++) {
        const character = line.charAt(i);

        if (character === "\\") {
            i++;
            continue;
        }

        if (character === open)
            depth++;
        else if (character === close && --depth === 0)
            return i;
    }

    return -1;
}
