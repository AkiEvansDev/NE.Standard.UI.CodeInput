// Find and replace: the panel's fields and toggles, stepping among matches and rewriting the text, over `search.ts`'s pure text
// operations. Marking and scrolling to a match reaches into the editor surface, which owns the highlighted lines.

import type { DomNames, FieldValidation } from "ne-standard-ui";
import { diffText } from "./history.ts";
import type { SearchMatch, SearchOptions, SearchQuery } from "./search.ts";
import { compileQuery, expandReplacement, findMatches, nextMatchFrom, previousMatchFrom, replaceAll } from "./search.ts";
import type { Strings } from "./code-editor-dom.ts";
import { CurrentMatchClass, InvalidPatternWord, MatchesWord, NoMatchesWord } from "./code-editor-dom.ts";
import type { CodeEditorSurface } from "./code-editor-surface.ts";

export type FindReplaceParts = {
    readonly textarea: HTMLTextAreaElement;
    readonly scroller: HTMLElement;
    readonly panel: HTMLElement;
    readonly findField: HTMLInputElement;
    readonly replaceField: HTMLInputElement;
    readonly replaceRow: HTMLElement;
    readonly expand: HTMLElement | null;
    readonly count: HTMLElement;
    readonly matchCase: HTMLElement | null;
    readonly wholeWord: HTMLElement | null;
    readonly regex: HTMLElement | null;
};

export class CodeEditorFindReplace {
    private readonly textarea: HTMLTextAreaElement;
    private readonly scroller: HTMLElement;
    private readonly panel: HTMLElement;
    private readonly findField: HTMLInputElement;
    private readonly replaceField: HTMLInputElement;
    private readonly replaceRow: HTMLElement;
    private readonly expand: HTMLElement | null;
    private readonly count: HTMLElement;
    private readonly matchCase: HTMLElement | null;
    private readonly wholeWord: HTMLElement | null;
    private readonly regex: HTMLElement | null;
    private readonly strings: Strings;
    private readonly names: DomNames;
    private readonly validation: FieldValidation;
    private readonly surface: CodeEditorSurface;
    private matches: SearchMatch[] = [];
    private current = -1;
    private query: SearchQuery = null;
    private invalid = false;

    public constructor(parts: FindReplaceParts, strings: Strings, names: DomNames, validation: FieldValidation, surface: CodeEditorSurface) {
        this.textarea = parts.textarea;
        this.scroller = parts.scroller;
        this.panel = parts.panel;
        this.findField = parts.findField;
        this.replaceField = parts.replaceField;
        this.replaceRow = parts.replaceRow;
        this.expand = parts.expand;
        this.count = parts.count;
        this.matchCase = parts.matchCase;
        this.wholeWord = parts.wholeWord;
        this.regex = parts.regex;
        this.strings = strings;
        this.names = names;
        this.validation = validation;
        this.surface = surface;
    }

    /** Whether the panel is open right now. */
    public get isOpen(): boolean {
        return !this.panel.hidden;
    }

    /** Whether the keyboard is in the panel. */
    public get holdsFocus(): boolean {
        return this.panel.contains(document.activeElement);
    }

    private get options(): SearchOptions {
        return { matchCase: pressed(this.matchCase), wholeWord: pressed(this.wholeWord), regex: pressed(this.regex) };
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

    /** The field turned read-only, which hides the replace row and its chevron: the keyboard in either goes to the find field. */
    public replaceHidden(): void {
        const active = document.activeElement;

        if (this.replaceRow.contains(active) || this.expand?.contains(active) === true)
            this.findField.focus({ preventScroll: true });
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

    /** Hides the panel and its marks; `returnFocus` puts the reader back in the text, as Escape and the close button do. */
    public close(returnFocus: boolean): void {
        this.panel.hidden = true;
        this.matches = [];
        this.current = -1;
        this.surface.applyMatches([], -1);
        this.markInvalid(false);

        if (returnFocus)
            this.textarea.focus({ preventScroll: true });
    }

    /** The find field says so as any invalid field does, through the framework's validation; its words are the count line's. */
    private markInvalid(invalid: boolean): void {
        // Only on a change: the search runs on every keystroke, and a mark reads the message line's computed style.
        if (invalid === this.invalid)
            return;

        const root = this.findField.closest(`.${this.names.textInputClass}`);

        this.invalid = invalid;

        if (root !== null)
            this.validation.mark(root, invalid ? "error" : null);
    }

    /** Re-reads the matches; `keepCurrent` holds on to the match the reader is on when it survived, `follow` selects it and scrolls to it. */
    public search(keepCurrent: boolean, follow: boolean): void {
        const options = this.options;
        const previous = this.current >= 0 ? this.matches[this.current] : undefined;

        this.query = compileQuery(this.findField.value, options);
        this.matches = findMatches(this.textarea.value, this.query);

        const invalid = this.query !== null && "invalid" in this.query;

        this.markInvalid(invalid);

        const kept = keepCurrent && previous !== undefined ? this.matches.findIndex(match => match.from === previous.from) : -1;
        const current = kept >= 0 ? kept : nextMatchFrom(this.matches, this.textarea.selectionStart);

        this.goTo(current, follow);
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
            text = this.strings.text(InvalidPatternWord);
        else if (this.query === null)
            text = "";
        else if (this.matches.length === 0)
            text = this.strings.text(NoMatchesWord);
        else
            text = this.strings.format(MatchesWord, { current: this.current + 1, total: this.matches.length });

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

        const mark = line.querySelector<HTMLElement>(`.${CurrentMatchClass}`);

        if (mark === null)
            return;

        const left = mark.offsetLeft;
        const right = left + mark.offsetWidth;

        if (left < scroller.scrollLeft || right > scroller.scrollLeft + scroller.clientWidth)
            scroller.scrollLeft = Math.max(0, left - scroller.clientWidth / 2);
    }

    /**
     * Re-searches only while the panel is open, since a hidden match need not refresh. A reader's own edit leaves the caret where
     * they're typing; only a server-pushed text jumps to the match.
     */
    public refreshIfOpen(fromServer: boolean): void {
        if (this.isOpen)
            this.search(true, fromServer);
    }

    /** The page's words changed: the count is written again in them — it may be empty, so it is written rather than marked. */
    public wordsChanged(): void {
        this.writeCount();
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
        this.replaceField.focus({ preventScroll: true });
        // The edit re-read the matches; the next one starts past the new text, since a replacement the query still matches would
        // otherwise be found again where it was put.
        this.goTo(nextMatchFrom(this.matches, match.from + replacement.length), true);
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

/** A switch is the framework's toggle button; its state is its own `aria-pressed`. */
function pressed(button: HTMLElement | null): boolean {
    return button?.getAttribute("aria-pressed") === "true";
}
