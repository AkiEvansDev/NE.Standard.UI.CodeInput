// Find and replace: the panel's fields and toggles, stepping among matches and rewriting the text, over `search.ts`'s pure text
// operations. Marking and scrolling to a match reaches into the editor surface, which owns the highlighted lines.

import { diffText } from "./history.ts";
import type { SearchMatch, SearchOptions, SearchQuery } from "./search.ts";
import { compileQuery, expandReplacement, findMatches, nextMatchFrom, previousMatchFrom, replaceAll } from "./search.ts";
import type { Strings } from "./code-editor-dom.ts";
import type { CodeEditorSurface } from "./code-editor-surface.ts";

const InvalidPatternClass = "ui-code-input--invalid-pattern";

export type FindReplaceParts = {
    readonly root: HTMLElement;
    readonly textarea: HTMLTextAreaElement;
    readonly scroller: HTMLElement;
    readonly panel: HTMLElement;
    readonly findField: HTMLInputElement;
    readonly replaceField: HTMLInputElement;
    readonly replaceRow: HTMLElement;
    readonly expand: HTMLElement | null;
    readonly count: HTMLElement;
};

export class CodeEditorFindReplace {
    private readonly root: HTMLElement;
    private readonly textarea: HTMLTextAreaElement;
    private readonly scroller: HTMLElement;
    private readonly panel: HTMLElement;
    private readonly findField: HTMLInputElement;
    private readonly replaceField: HTMLInputElement;
    private readonly replaceRow: HTMLElement;
    private readonly expand: HTMLElement | null;
    private readonly count: HTMLElement;
    private readonly strings: Strings;
    private readonly surface: CodeEditorSurface;
    private matches: SearchMatch[] = [];
    private current = -1;
    private query: SearchQuery = null;

    public constructor(parts: FindReplaceParts, strings: Strings, surface: CodeEditorSurface) {
        this.root = parts.root;
        this.textarea = parts.textarea;
        this.scroller = parts.scroller;
        this.panel = parts.panel;
        this.findField = parts.findField;
        this.replaceField = parts.replaceField;
        this.replaceRow = parts.replaceRow;
        this.expand = parts.expand;
        this.count = parts.count;
        this.strings = strings;
        this.surface = surface;
    }

    /** Whether the panel is open right now. */
    public get isOpen(): boolean {
        return !this.panel.hidden;
    }

    private get options(): SearchOptions {
        return {
            matchCase: this.pressed("data-ui-code-match-case"),
            wholeWord: this.pressed("data-ui-code-whole-word"),
            regex: this.pressed("data-ui-code-regex")
        };
    }

    // A switch is the framework's toggle button inside the part the renderer names; its state is its own aria-pressed.
    private pressed(attribute: string): boolean {
        return this.panel.querySelector(`[${attribute}] > .ui-button`)?.getAttribute("aria-pressed") === "true";
    }

    /** Whether the replace row is folded out; a read-only field never shows it, since there is nothing to rewrite. */
    public get isReplacing(): boolean {
        return !this.replaceRow.hidden && !this.textarea.readOnly;
    }

    /** Folds the replace row out or away, as Visual Studio's chevron does; the row stays as the reader left it between openings. */
    public showReplace(show: boolean): void {
        const showing = show && !this.textarea.readOnly;

        this.replaceRow.hidden = !showing;
        this.expand?.setAttribute("aria-expanded", showing ? "true" : "false");
    }

    public toggleReplace(): void {
        this.showReplace(!this.isReplacing);

        (this.isReplacing ? this.replaceField : this.findField).focus({ preventScroll: true });
    }

    public open(replace: boolean): void {
        const selected = this.textarea.value.slice(this.textarea.selectionStart, this.textarea.selectionEnd);

        this.panel.hidden = false;

        // Ctrl+H folds the replace row out; Ctrl+F leaves it as it was, so a reader who replaces keeps their row.
        if (replace)
            this.showReplace(true);

        if (selected.length > 0 && !selected.includes("\n"))
            this.findField.value = selected;

        this.search(false, true);

        const field = replace && this.isReplacing ? this.replaceField : this.findField;

        field.focus({ preventScroll: true });
        field.select();
    }

    public close(): void {
        this.panel.hidden = true;
        this.matches = [];
        this.current = -1;
        this.surface.applyMatches([], -1);
        this.root.classList.remove(InvalidPatternClass);
        this.findField.closest(".ui-text-input")?.classList.remove("ui-invalid");
        this.textarea.focus({ preventScroll: true });
    }

    /** Re-reads the matches; `keepCurrent` holds on to the match the reader is on when it survived, `follow` selects it and scrolls to it. */
    public search(keepCurrent: boolean, follow: boolean): void {
        const options = this.options;
        const previous = this.current >= 0 ? this.matches[this.current] : undefined;

        this.query = compileQuery(this.findField.value, options);
        this.matches = findMatches(this.textarea.value, this.query);

        const invalid = this.query !== null && "invalid" in this.query;

        this.root.classList.toggle(InvalidPatternClass, invalid);
        // The find field says so as any invalid field does: the framework's own mark on its root.
        this.findField.closest(".ui-text-input")?.classList.toggle("ui-invalid", invalid);

        const kept = keepCurrent && previous !== undefined ? this.matches.findIndex(match => match.from === previous.from) : -1;
        const current = kept >= 0 ? kept : nextMatchFrom(this.matches, this.textarea.selectionStart);

        this.goTo(current, follow);
    }

    /**
     * Re-searches only while the panel is open, since a hidden match need not refresh. A reader's own edit leaves the caret where
     * they're typing; only a server-pushed text jumps to the match.
     */
    public refreshIfOpen(fromServer: boolean): void {
        if (this.isOpen)
            this.search(true, fromServer);
    }

    public findFieldKey(domEvent: KeyboardEvent): void {
        if (domEvent.key === "Enter" && !domEvent.isComposing) {
            domEvent.preventDefault();
            this.step(domEvent.shiftKey ? -1 : 1);
        }
    }

    public step(direction: 1 | -1): void {
        if (this.panel.hidden) {
            this.open(false);
            return;
        }

        if (this.matches.length === 0) {
            this.search(false, true);
            return;
        }

        const position = this.current >= 0 ? this.matches[this.current].from : this.textarea.selectionStart;
        const next = direction > 0 ? nextMatchFrom(this.matches, position + 1) : previousMatchFrom(this.matches, position);

        this.goTo(next, true);
    }

    private goTo(index: number, follow: boolean): void {
        this.current = index;
        this.surface.applyMatches(this.matches, index);
        this.writeCount();

        if (index < 0 || !follow)
            return;

        const match = this.matches[index];

        this.surface.select(match.from, match.to);
        this.reveal(match);
    }

    private writeCount(): void {
        let text: string;

        if (this.query !== null && "invalid" in this.query)
            text = this.strings.text("ui.code.invalid-pattern");
        else if (this.query === null)
            text = "";
        else if (this.matches.length === 0)
            text = this.strings.text("ui.code.no-matches");
        else
            text = this.strings.format("ui.code.matches", { current: this.current + 1, total: this.matches.length });

        if (this.count.textContent !== text)
            this.count.textContent = text;
    }

    /** Scrolls the field so the match is in view — the line vertically, the mark itself horizontally. */
    private reveal(match: SearchMatch): void {
        const line = this.surface.lineElement(this.surface.lineAt(match.from));

        if (line === undefined)
            return;

        const scroller = this.scroller;
        const top = line.offsetTop;
        const bottom = top + line.offsetHeight;

        if (top < scroller.scrollTop || bottom > scroller.scrollTop + scroller.clientHeight)
            scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 2);

        const mark = line.querySelector<HTMLElement>(".ui-code-match--current");

        if (mark === null)
            return;

        const left = mark.offsetLeft;
        const right = left + mark.offsetWidth;

        if (left < scroller.scrollLeft || right > scroller.scrollLeft + scroller.clientWidth)
            scroller.scrollLeft = Math.max(0, left - scroller.clientWidth / 2);
    }

    public replaceFieldKey(domEvent: KeyboardEvent): void {
        if (domEvent.key === "Enter" && !domEvent.isComposing) {
            domEvent.preventDefault();

            if (domEvent.ctrlKey || domEvent.metaKey)
                this.replaceEvery();
            else
                this.replaceOne();
        }
    }

    public replaceOne(): void {
        if (this.textarea.readOnly)
            return;

        if (this.current < 0) {
            this.search(false, true);
            return;
        }

        const match = this.matches[this.current];
        const replacement = expandReplacement(this.textarea.value, match, this.query, this.replaceField.value, this.options.regex);

        this.surface.replaceRange(match.from, match.to, replacement);
        // The edit re-read the matches; the one at this index is now the next one on.
        this.replaceField.focus({ preventScroll: true });
        this.goTo(this.matches.length === 0 ? -1 : Math.min(this.current < 0 ? 0 : this.current, this.matches.length - 1), true);
    }

    public replaceEvery(): void {
        if (this.textarea.readOnly || this.matches.length === 0)
            return;

        const value = this.textarea.value;
        const replaced = replaceAll(value, this.query, this.replaceField.value, this.options.regex);

        if (replaced === value)
            return;

        // One edit over the span the replacements reach, so the history holds what changed rather than the whole text twice.
        const edit = diffText(value, replaced, 0);

        this.surface.replaceRange(edit.from, edit.to, edit.text);
        this.replaceField.focus({ preventScroll: true });
    }
}
