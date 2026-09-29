// Ctrl+Space's suggestion list: opens under the word at the primary caret, filters as the reader types, and accepts into every
// caret through the editing concern, so multi-caret takes the same word.

import type { PluginEngineContext, PopupHandle } from "ne-standard-ui";
import type { CodeEditorCarets } from "./code-editor-carets.ts";
import type { CodeEditorEditing } from "./code-editor-editing.ts";
import type { CodeEditorSurface } from "./code-editor-surface.ts";
import { ActiveCompletionClass, CompletionAnchorClass, CompletionListClass, CompletionRowClass, CompletionsAttribute, CompletionsSourceAttribute, SuggestionsWord } from "./code-editor-dom.ts";
import type { CompletionContext, CompletionItem, CompletionSource, CompletionsFile } from "./completions.ts";
import { collectCompletions, documentWordsSource, parseCompletionsFile, prefixAt, rankCompletions } from "./completions.ts";
import { completionsRegistry } from "./completions-registry.ts";
import { languages } from "./languages/index.ts";

// A file is fetched once and kept for every field on the page that names it, since a page may hold several editors for one language.
const fileCache = new Map<string, Promise<CompletionsFile>>();

function loadCompletionsFile(url: string): Promise<CompletionsFile> {
    let cached = fileCache.get(url);

    if (cached === undefined) {
        cached = fetch(url)
            .then(response => response.ok ? response.json() : Promise.reject(new Error(`Failed to load completions: ${url}`)))
            .then(parseCompletionsFile)
            .catch((): CompletionsFile => ({ items: [], triggers: [] }));

        fileCache.set(url, cached);
    }

    return cached;
}

/** Whether an `input` came from a key typed, rather than from an edit the editor or the browser made in one go. */
function isTyped(domEvent: Event): boolean {
    return domEvent instanceof InputEvent && domEvent.inputType === "insertText";
}

export type CompletionsParts = {
    readonly root: HTMLElement;
    readonly textarea: HTMLTextAreaElement;
    readonly scroller: HTMLElement;
    readonly content: HTMLElement;
};

export class CodeEditorCompletions {
    private readonly root: HTMLElement;
    private readonly textarea: HTMLTextAreaElement;
    private readonly scroller: HTMLElement;
    private readonly context: PluginEngineContext;
    private readonly surface: CodeEditorSurface;
    private readonly editing: CodeEditorEditing;
    private readonly carets: CodeEditorCarets;
    private readonly getLanguage: () => string;
    private readonly anchor: HTMLElement;

    private handle: PopupHandle | null = null;

    /** Made on the first opening and kept: a close hides it, so it fades out as it fades in. */
    private list: HTMLUListElement | null = null;
    private items: readonly CompletionItem[] = [];
    private active = -1;

    /** The text offset the anchor stands at, the start of the word being completed; -1 while the list is closed. */
    private anchoredAt = -1;

    /** Guards a source's answer against a keystroke made while it was still being asked. */
    private requestId = 0;

    /** The caret this concern last showed or filtered at; a `selectionchange` that lands anywhere else closes the list. */
    private lastKnownCaret = -1;

    private sourceUrl: string | null = null;
    private loadedFile: CompletionsFile | null = null;

    public constructor(parts: CompletionsParts, context: PluginEngineContext, surface: CodeEditorSurface, editing: CodeEditorEditing, carets: CodeEditorCarets, getLanguage: () => string) {
        this.root = parts.root;
        this.textarea = parts.textarea;
        this.scroller = parts.scroller;
        this.context = context;
        this.surface = surface;
        this.editing = editing;
        this.carets = carets;
        this.getLanguage = getLanguage;

        this.anchor = document.createElement("span");
        this.anchor.className = CompletionAnchorClass;
        this.anchor.setAttribute("aria-hidden", "true");
        parts.content.appendChild(this.anchor);
    }

    public get isOpen(): boolean {
        return this.handle !== null;
    }

    private get enabled(): boolean {
        return this.root.hasAttribute(CompletionsAttribute) && !this.textarea.readOnly;
    }

    /** The field's switches may have changed: a list switched off closes; one on a field turned read-only the framework closes. */
    public settingsChanged(): void {
        if (!this.root.hasAttribute(CompletionsAttribute))
            this.close();
    }

    /** The textarea's `keydown`, ahead of the carets and the editing keys: Ctrl+Space, and every key the open list answers to itself. */
    public key(domEvent: KeyboardEvent): void {
        if (domEvent.defaultPrevented || domEvent.isComposing)
            return;

        const command = domEvent.ctrlKey || domEvent.metaKey;

        if (command && !domEvent.altKey && !domEvent.shiftKey && domEvent.code === "Space") {
            if (this.enabled) {
                domEvent.preventDefault();
                this.openExplicit();
            }

            return;
        }

        if (!this.isOpen)
            return;

        switch (domEvent.key) {
            case "ArrowDown":
                domEvent.preventDefault();
                this.move(1);
                break;
            case "ArrowUp":
                domEvent.preventDefault();
                this.move(-1);
                break;
            case "Enter":
            case "Tab":
                if (this.active >= 0) {
                    domEvent.preventDefault();
                    this.accept(this.active);
                }
                else
                    this.close();
                break;
            case "Escape":
                domEvent.preventDefault();
                this.close();
                break;
        }
    }

    /**
     * The textarea's `input`: re-filters an open list, or opens one on a trigger character or an identifier being typed. Only a
     * typed key opens it, or an editor-made edit (paste, undo, an accepted word) would reopen it over the word just completed.
     */
    public textChanged(domEvent: Event): void {
        if (!this.enabled)
            return;

        // While IME composing shows its own candidate window, the list stays closed and filters nothing, like every other key
        // handler during composition.
        if (domEvent instanceof InputEvent && domEvent.isComposing) {
            this.close();
            return;
        }

        this.ensureFileLoaded();

        const text = this.textarea.value;
        const position = this.textarea.selectionStart;
        const prefix = prefixAt(text, position);
        const ready = prefix.length > 0 || this.triggers().includes(text.charAt(position - 1));

        if (this.isOpen) {
            if (!ready) {
                this.close();
                return;
            }
        }
        else if (!isTyped(domEvent) || !ready || this.tokenBlocks(position) || !this.hasExtraSource(this.getLanguage()))
            return;

        this.lastKnownCaret = position;
        void this.gatherAndShow(prefix, position);
    }

    /** Ctrl+Space: opens at the primary caret whatever the prefix, as long as the field is not mid a comment or a string. */
    private openExplicit(): void {
        this.ensureFileLoaded();

        const position = this.textarea.selectionStart;

        if (this.tokenBlocks(position))
            return;

        this.lastKnownCaret = position;
        void this.gatherAndShow(prefixAt(this.textarea.value, position), position);
    }

    /** A comment or a string keeps the list from opening — the token just before the caret decides. */
    private tokenBlocks(position: number): boolean {
        const kind = this.surface.tokenKindAt(position);

        return kind === "comment" || kind === "string";
    }

    private triggers(): readonly string[] {
        return this.loadedFile?.triggers ?? [];
    }

    /** Whether the field has anything to complete from beyond the document's own words — a file, a script's source, or keywords. */
    private hasExtraSource(languageId: string): boolean {
        if (this.sourceUrl !== null && this.sourceUrl.length > 0)
            return true;

        if (completionsRegistry.hasOwnSource(languageId))
            return true;

        return (languages.get(languageId)?.keywords?.length ?? 0) > 0;
    }

    /** Reads `CompletionsSource` afresh and starts loading it when the URL has changed since the last look. */
    private ensureFileLoaded(): void {
        const url = this.root.getAttribute(CompletionsSourceAttribute);

        if (url === this.sourceUrl)
            return;

        this.sourceUrl = url;
        this.loadedFile = null;

        if (url === null || url.length === 0)
            return;

        void loadCompletionsFile(url).then(file => {
            if (this.root.getAttribute(CompletionsSourceAttribute) === url)
                this.loadedFile = file;
        });
    }

    private async gatherAndShow(prefix: string, position: number): Promise<void> {
        const requestId = ++this.requestId;
        const languageId = this.getLanguage();
        const context = this.buildContext(prefix, position, languageId);
        const collected = await collectCompletions(this.sourcesFor(languageId), context);

        // A provider may answer long after it was asked: after Escape, a blur, an accepted word or a caret moved elsewhere, the answer
        // belongs to a list nobody is waiting for.
        if (requestId !== this.requestId || !this.textarea.isConnected || document.activeElement !== this.textarea || this.textarea.selectionStart !== position)
            return;

        const ranked = rankCompletions(collected, prefix);

        // Nothing to offer, or only the word already typed out in full.
        if (ranked.length === 0 || (ranked.length === 1 && ranked[0].label === prefix)) {
            this.close();
            return;
        }

        this.show(ranked, position - prefix.length);
    }

    private buildContext(prefix: string, position: number, languageId: string): CompletionContext {
        const lines = this.surface.lines;
        const line = lines.lineAt(position);

        return { text: this.textarea.value, offset: position, line, column: position - lines.start(line), prefix, languageId };
    }

    private sourcesFor(languageId: string): CompletionSource[] {
        const sources: CompletionSource[] = [];

        if (this.loadedFile !== null && this.loadedFile.items.length > 0)
            sources.push(this.loadedFile.items);

        sources.push(...completionsRegistry.sourcesFor(languageId));

        const keywords = languages.get(languageId)?.keywords;

        if (keywords !== undefined && keywords.length > 0)
            sources.push(keywords.map(label => ({ label, kind: "keyword" as const })));

        sources.push(documentWordsSource);

        return sources;
    }

    /** Opens the list, or fills the open one, under the word starting at `start`. */
    private show(items: readonly CompletionItem[], start: number): void {
        this.items = items;
        this.active = 0;

        // Held under the word's start, as an editor's list is, rather than stepping right with every letter typed.
        const moved = start !== this.anchoredAt;

        if (moved) {
            this.anchoredAt = start;
            this.positionAnchor(start);
        }

        if (this.handle === null) {
            const list = this.ensureList();

            list.setAttribute("aria-label", this.context.strings.text(SuggestionsWord));
            list.hidden = false;
            // The field owns it: the framework closes it once the field turns read-only, disabled or loading, or leaves the page.
            this.handle = this.context.popups.open(this.anchor, list, {
                placement: "bottom-start",
                gap: 2,
                owner: this.root,
                onDismiss: () => this.dismissed()
            });

            // A textarea takes no combobox role and so no aria-expanded; what it may say is that it offers a list, and which.
            this.textarea.setAttribute("aria-autocomplete", "list");
            this.textarea.setAttribute("aria-controls", list.id);
        }
        else if (moved)
            this.handle.reposition();

        this.renderItems();
    }

    private positionAnchor(position: number): void {
        const rect = this.carets.contentCaretRect(position);

        if (rect === null)
            return;

        this.anchor.style.left = `${rect.left}px`;
        this.anchor.style.top = `${rect.bottom}px`;
    }

    private ensureList(): HTMLUListElement {
        if (this.list !== null)
            return this.list;

        const list = document.createElement("ul");

        list.className = CompletionListClass;
        list.hidden = true;
        list.setAttribute("role", "listbox");
        list.id = this.context.dom.ensureId(list, "code-completions");
        list.addEventListener("mousedown", domEvent => domEvent.preventDefault());
        list.addEventListener("click", domEvent => this.pointerAccept(domEvent));
        list.addEventListener("pointermove", domEvent => this.pointerMoved(domEvent));

        // The framework places and dismisses a popup but never puts it on the page: it is fixed, so the field's root will do.
        this.root.append(list);
        this.list = list;

        return list;
    }

    private renderItems(): void {
        if (this.list === null)
            return;

        this.list.replaceChildren();

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const row = document.createElement("li");

            row.id = `${this.list.id}-${i}`;
            row.className = CompletionRowClass;
            row.setAttribute("role", "option");

            if (item.kind !== undefined)
                row.classList.add(`${CompletionRowClass}--${item.kind}`);

            const label = document.createElement("span");

            label.className = `${CompletionRowClass}-label`;
            label.textContent = item.label;
            row.append(label);

            if (item.detail !== undefined) {
                const detail = document.createElement("span");

                detail.className = `${CompletionRowClass}-detail`;
                detail.textContent = item.detail;
                row.append(detail);
            }

            this.list.append(row);
        }

        this.updateActive(true);
    }

    /** Marks the active row; `reveal` scrolls it into the list's view, which a row under the pointer already is. */
    private updateActive(reveal: boolean): void {
        if (this.list === null)
            return;

        for (let i = 0; i < this.list.children.length; i++) {
            const row = this.list.children[i];
            const isActive = i === this.active;

            row.classList.toggle(ActiveCompletionClass, isActive);
            row.setAttribute("aria-selected", isActive ? "true" : "false");
        }

        const activeRow = this.list.children[this.active];

        if (activeRow instanceof HTMLElement) {
            this.textarea.setAttribute("aria-activedescendant", activeRow.id);

            if (reveal)
                activeRow.scrollIntoView({ block: "nearest" });
        }
    }

    private move(step: number): void {
        if (this.items.length === 0)
            return;

        this.active = (this.active + step + this.items.length) % this.items.length;
        this.updateActive(true);
    }

    private pointerAccept(domEvent: MouseEvent): void {
        const index = this.rowIndex(domEvent.target);

        if (index >= 0)
            this.accept(index);
    }

    /**
     * The pointer moves the active row, as a native list's does, so the row under it is the one Enter takes and never two rows
     * are lit. A move, not an enter: a list opening or scrolling under a still pointer leaves the keyboard's row alone.
     */
    private pointerMoved(domEvent: PointerEvent): void {
        const index = this.rowIndex(domEvent.target);

        if (index >= 0 && index !== this.active) {
            this.active = index;
            this.updateActive(false);
        }
    }

    /** The row an event landed in, by its place in the list; -1 outside every row. */
    private rowIndex(target: EventTarget | null): number {
        if (this.list === null || !(target instanceof Element))
            return -1;

        const row = target.closest<HTMLElement>(`.${CompletionRowClass}`);

        return row === null ? -1 : Array.prototype.indexOf.call(this.list.children, row);
    }

    private accept(index: number): void {
        const item = this.items[index];

        if (item === undefined)
            return;

        // Closed first: the accepted edit raises `input`, which an open list would take for a keystroke to filter on.
        this.close();
        this.editing.acceptCompletion(item.insert ?? item.label);
    }

    /** A `selectionchange` the field itself did not just cause — a click, an arrow key, Home or End — closes the list. */
    public selectionChanged(): void {
        if (this.isOpen && this.textarea.selectionStart !== this.lastKnownCaret)
            this.close();
    }

    /**
     * The field scrolled — the browser bringing the caret into view as the reader types past the edge, or the reader. The
     * framework moves the list with its anchor; it closes only once the word it stands under has left the view.
     */
    public scrolled(): void {
        if (!this.isOpen)
            return;

        const point = this.anchor.getBoundingClientRect();
        const view = this.scroller.getBoundingClientRect();
        const bottom = view.top + this.scroller.clientHeight;
        const right = view.left + this.scroller.clientWidth;

        if (point.top <= view.top || point.top > bottom || point.left < view.left || point.left > right)
            this.close();
    }

    public close(): void {
        this.handle?.close();
        this.dismissed();
    }

    /** The framework's dismissal or this concern's own close: forgotten, its rows left to fade out with the list. */
    private dismissed(): void {
        // An answer still on its way would open the list again.
        this.requestId++;

        if (this.list !== null)
            this.list.hidden = true;

        this.handle = null;
        this.items = [];
        this.active = -1;
        this.anchoredAt = -1;
        this.textarea.removeAttribute("aria-autocomplete");
        this.textarea.removeAttribute("aria-controls");
        this.textarea.removeAttribute("aria-activedescendant");
    }
}
