// The highlighted layer under the textarea and the gutter it feeds, the text's changes and history, the caret's status-bar
// position, and the save shortcut's commit — one field's editing surface.

import type { LineChange } from "./highlighter.ts";
import { Highlighter } from "./highlighter.ts";
import type { Change, EditKind, Restore } from "./history.ts";
import { EditHistory, diffText } from "./history.ts";
import type { Lines } from "./motion.ts";
import type { Edit, SelectionSet } from "./selections.ts";
import { applyEdits, singleSelection } from "./selections.ts";
import type { TokenKind } from "./tokenizer.ts";
import type { Strings } from "./code-editor-dom.ts";
import { GutterDigitsVariable, LineClass, PositionWord, TabSizeVariable } from "./code-editor-dom.ts";
import { languages } from "./languages/index.ts";

export type SurfaceParts = {
    readonly root: HTMLElement;
    readonly textarea: HTMLTextAreaElement;
    readonly highlight: HTMLElement;
    readonly position: HTMLElement | null;
};

/** How the surface reaches the carets, which the editor's carets concern owns. */
export type SelectionAccess = {
    read(): SelectionSet;
    write(set: SelectionSet, reveal: boolean): void;
    /** The columns the primary caret stands past its line's end; zero unless a column selection holds virtual space there. */
    virtualColumns(): number;
};

export class CodeEditorSurface {
    private readonly root: HTMLElement;
    private readonly textarea: HTMLTextAreaElement;
    private readonly highlight: HTMLElement;
    private readonly position: HTMLElement | null;
    private readonly strings: Strings;
    private readonly getLanguage: () => string;
    private readonly selections: SelectionAccess;
    private readonly notifyTextChanged: (fromServer: boolean) => void;
    private readonly history = new EditHistory();
    private highlighter: Highlighter;

    /** The text the history last saw; a value that differs arrived some other way than an edit. */
    private lastValue: string;

    /** The carets as they stood when the browser was about to make an edit of its own. */
    private pendingBefore: SelectionSet | null = null;

    public constructor(parts: SurfaceParts, strings: Strings, getLanguage: () => string, selections: SelectionAccess, notifyTextChanged: (fromServer: boolean) => void) {
        this.root = parts.root;
        this.textarea = parts.textarea;
        this.highlight = parts.highlight;
        this.position = parts.position;
        this.strings = strings;
        this.getLanguage = getLanguage;
        this.selections = selections;
        this.notifyTextChanged = notifyTextChanged;
        this.highlighter = new Highlighter(languages.get(getLanguage()));
        this.lastValue = parts.textarea.value;
    }

    public renderAll(): void {
        this.highlight.replaceChildren();
        this.redraw();
    }

    private redraw(): void {
        this.applyChanges(this.highlighter.update(this.textarea.value));
        this.updateGutter();
    }

    /**
     * Replaces the runs of line elements an update changed, in one walk down the elements — indexing live children after every
     * removal would rescan from the top each time.
     */
    private applyChanges(changes: readonly LineChange[]): void {
        let html = "";

        for (const change of changes) {
            for (let i = change.from; i < change.from + change.added; i++)
                html += `<div class="${LineClass}">${this.highlighter.renderLine(i)}</div>`;
        }

        // Nothing to keep: one parse of the whole, which is far cheaper than a fragment spliced in.
        if (this.highlight.childElementCount === 0) {
            this.highlight.innerHTML = html;
            return;
        }

        const template = document.createElement("template");
        template.innerHTML = html;

        const added = template.content;
        let line = this.highlight.firstElementChild;
        let index = 0;

        for (const change of changes) {
            for (; index < change.from && line !== null; index++)
                line = line.nextElementSibling;

            for (let i = 0; i < change.removed && line !== null; i++) {
                const next = line.nextElementSibling;

                line.remove();
                line = next;
            }

            for (let i = 0; i < change.added; i++)
                this.highlight.insertBefore(added.firstElementChild!, line);

            index += change.added;
        }
    }

    private updateGutter(): void {
        const digits = String(Math.max(2, String(this.highlighter.lineCount).length));

        if (this.root.style.getPropertyValue(GutterDigitsVariable) !== digits)
            this.root.style.setProperty(GutterDigitsVariable, digits);
    }

    public get tabSize(): number {
        const size = Number.parseInt(getComputedStyle(this.root).getPropertyValue(TabSizeVariable), 10);

        return Number.isFinite(size) && size > 0 ? size : 4;
    }

    /** The caret's line and column, one-based; a selection reads at its end. */
    public writePosition(): void {
        if (this.position === null)
            return;

        const value = this.textarea.value;
        const caret = this.textarea.selectionEnd;
        const lineStart = value.lastIndexOf("\n", caret - 1) + 1;
        const line = this.highlighter.lineAt(lineStart) + 1;

        // Marked with its figures, as the server first wrote it, so a language switch writes it again in place.
        this.strings.write(this.position, null, PositionWord, { line, column: caret - lineStart + 1 + this.selections.virtualColumns() });
    }

    /** Rebuilds the highlighter for the language `getLanguage` now names, and redraws everything under it. */
    public setLanguage(): void {
        this.highlighter = new Highlighter(languages.get(this.getLanguage()));
        this.renderAll();
    }

    /** Ctrl+S: the value goes to the server now, ahead of any debounce or blur, and then the field's `save` event is raised. */
    public save(): void {
        if (this.textarea.readOnly)
            return;

        this.textarea.dispatchEvent(new Event("change", { bubbles: true }));
        this.textarea.dispatchEvent(new Event("save", { bubbles: true }));
    }

    /** The browser is about to edit the text itself — a keystroke, an input method, a drop: the carets it starts from, for the history. */
    public beforeNativeEdit(): void {
        this.pendingBefore = this.selections.read();
    }

    /** The textarea's `input`: an edit the browser made is recorded; one this surface made itself has already been. */
    public nativeInput(domEvent: Event): void {
        const value = this.textarea.value;

        if (value === this.lastValue)
            return;

        const edit = diffText(this.lastValue, value, this.textarea.selectionEnd);
        const change: Change = {
            edits: [edit],
            removed: [this.lastValue.slice(edit.from, edit.to)],
            before: this.pendingBefore ?? singleSelection(edit.from, edit.to),
            after: this.selections.read()
        };

        this.history.record(change, nativeKind(domEvent));
        this.lastValue = value;
        this.pendingBefore = null;
        this.redraw();
        this.writePosition();
        this.notifyTextChanged(false);
    }

    /**
     * A value the server pushed; false when it's the text this tab already holds, since the server never echoes a commit back to
     * its own tab (docs/VALUES.md §3). A different text clears history, so an undo can't restore what it replaced.
     */
    public textPushed(): boolean {
        if (this.textarea.value === this.lastValue)
            return false;

        this.history.clear();
        this.lastValue = this.textarea.value;
        this.redraw();
        this.writePosition();
        this.notifyTextChanged(true);
        return true;
    }

    /** Makes sorted, non-overlapping edits as one step of the history and puts the carets where `after` says. */
    public apply(edits: readonly Edit[], after: SelectionSet, kind: EditKind): void {
        if (this.textarea.readOnly)
            return;

        this.adoptOutsideValue();

        if (edits.length === 0) {
            this.selections.write(after, true);
            this.writePosition();
            return;
        }

        const value = this.textarea.value;

        this.history.record({ edits, removed: edits.map(edit => value.slice(edit.from, edit.to)), before: this.selections.read(), after }, kind);
        this.commit(applyEdits(value, edits), edits.length === 1 ? edits[0] : null, after, kind === "typing");
    }

    /** A value that changed with no edit and no push — a form reset — leaves the history nothing it can still undo. */
    private adoptOutsideValue(): void {
        if (this.textarea.value === this.lastValue)
            return;

        this.history.clear();
        this.lastValue = this.textarea.value;
        this.redraw();
    }

    /** Writes the text and raises `input` as a keystroke would — as typed text when it was, so typing at several carets opens completions as at one. */
    private commit(text: string, single: Edit | null, selections: SelectionSet, typed: boolean): void {
        if (single !== null)
            this.textarea.setRangeText(single.text, single.from, single.to);
        else
            this.textarea.value = text;

        this.lastValue = text;
        this.pendingBefore = null;
        this.redraw();
        this.selections.write(selections, true);
        this.writePosition();
        this.notifyTextChanged(false);
        this.textarea.dispatchEvent(typed ? new InputEvent("input", { bubbles: true, inputType: "insertText" }) : new Event("input", { bubbles: true }));
    }

    /** Replaces one span and leaves the caret after it — find and replace's edit. */
    public replaceRange(from: number, to: number, text: string): void {
        this.apply([{ from, to, text }], singleSelection(from + text.length), "other");
    }

    /** Selects one span, whatever carets there were — find's step to a match. */
    public select(from: number, to: number): void {
        this.selections.write(singleSelection(from, to), false);
    }

    public undo(): void {
        this.restore(text => this.history.undo(text));
    }

    public redo(): void {
        this.restore(text => this.history.redo(text));
    }

    private restore(take: (text: string) => Restore | null): void {
        if (this.textarea.readOnly)
            return;

        this.adoptOutsideValue();

        const restored = take(this.textarea.value);

        if (restored !== null)
            this.commit(restored.text, null, restored.selections, false);
    }

    /** The text's lines as the highlighter holds them. */
    public get lines(): Lines {
        const highlighter = this.highlighter;
        const text = this.textarea.value;

        return {
            count: highlighter.lineCount,
            start: index => highlighter.lineStart(index),
            end: index => index + 1 < highlighter.lineCount ? highlighter.lineStart(index + 1) - 1 : text.length,
            lineAt: offset => highlighter.lineAt(offset)
        };
    }

    /** The line a text offset falls on, for the find panel's scroll-into-view. */
    public lineAt(offset: number): number {
        return this.highlighter.lineAt(offset);
    }

    /** The token just before a text offset — a comment or a string, for completions to stay out of. */
    public tokenKindAt(offset: number): TokenKind | null {
        return this.highlighter.tokenKindAt(offset);
    }

    /** The rendered line at an index, for the find panel and the carets to measure. */
    public lineElement(index: number): HTMLElement | undefined {
        return this.highlight.children[index] as HTMLElement | undefined;
    }

    /** Lays the find panel's matches over the highlighted lines and redraws whichever ones changed. */
    public applyMatches(matches: readonly { readonly from: number; readonly to: number }[], current: number): void {
        this.renderLines(this.highlighter.setMatches(matches, current));
    }

    private renderLines(indexes: readonly number[]): void {
        for (const index of indexes) {
            const line = this.highlight.children[index];

            if (line !== undefined)
                line.innerHTML = this.highlighter.renderLine(index);
        }
    }
}

/** Typing and deleting a character run on into the step before; a paste, a drop or a cut stands alone. */
function nativeKind(domEvent: Event): EditKind {
    const inputType = domEvent instanceof InputEvent ? domEvent.inputType : "";

    if (inputType === "insertText" || inputType === "insertCompositionText")
        return "typing";

    return inputType === "deleteContentBackward" || inputType === "deleteContentForward" ? "deleting" : "other";
}
