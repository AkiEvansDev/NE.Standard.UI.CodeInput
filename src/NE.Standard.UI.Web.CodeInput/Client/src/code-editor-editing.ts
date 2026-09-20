// The keys and events that change the text: Tab and Shift+Tab, Enter's indent, undo and redo, and — with several carets — typing,
// deleting and the clipboard at every one. With one caret the browser types, deletes and pastes itself, and the surface records it.

import { caseChangeEdits } from "./case-change.ts";
import type { CodeEditorCarets } from "./code-editor-carets.ts";
import type { CodeEditorSurface } from "./code-editor-surface.ts";
import { prefixStart } from "./completions.ts";
import type { EditKind } from "./history.ts";
import { applyTab, lineBreakText } from "./indent.ts";
import { nextCharacter, previousCharacter, wordLeft, wordRight } from "./motion.ts";
import type { Selection } from "./selections.ts";
import { distributePaste, editRanges, isCaret, rangeEnd, rangeStart } from "./selections.ts";

export class CodeEditorEditing {
    private readonly textarea: HTMLTextAreaElement;
    private readonly surface: CodeEditorSurface;
    private readonly carets: CodeEditorCarets;
    private readonly getLanguage: () => string;

    /** What the last copy from several ranges held, piece by piece, so a paste into as many carets deals it back out. */
    private copied: readonly string[] | null = null;

    public constructor(textarea: HTMLTextAreaElement, surface: CodeEditorSurface, carets: CodeEditorCarets, getLanguage: () => string) {
        this.textarea = textarea;
        this.surface = surface;
        this.carets = carets;
        this.getLanguage = getLanguage;
    }

    public key(domEvent: KeyboardEvent): void {
        if (domEvent.defaultPrevented || domEvent.isComposing)
            return;

        const command = domEvent.ctrlKey || domEvent.metaKey;

        // By the key's position, as the editor's other shortcuts.
        if (command && !domEvent.altKey && domEvent.code === "KeyZ") {
            domEvent.preventDefault();

            if (domEvent.shiftKey)
                this.surface.redo();
            else
                this.surface.undo();
        }
        else if (command && !domEvent.altKey && !domEvent.shiftKey && domEvent.code === "KeyY") {
            domEvent.preventDefault();
            this.surface.redo();
        }
        else if (command && !domEvent.altKey && domEvent.code === "KeyU") {
            // Chrome opens view-source on Ctrl+U; prevented whatever the field holds, a read-only field just changes nothing.
            domEvent.preventDefault();

            if (!this.textarea.readOnly)
                this.changeCase(domEvent.shiftKey);
        }
        else if (command || domEvent.altKey || this.textarea.readOnly)
            return;
        else if (domEvent.key === "Tab") {
            domEvent.preventDefault();
            this.tab(domEvent.shiftKey);
        }
        else if (domEvent.key === "Enter" && !domEvent.shiftKey) {
            domEvent.preventDefault();
            this.newLine();
        }
    }

    /** Ctrl+U (lower) and Ctrl+Shift+U (upper), Visual Studio's own keys: every selected range cased over, or the identifier a caret touches. */
    private changeCase(upper: boolean): void {
        const result = caseChangeEdits(this.textarea.value, this.carets.read(), upper);

        if (result !== null)
            this.surface.apply(result.edits, result.after, "other");
    }

    private tab(outdent: boolean): void {
        const edit = applyTab(this.textarea.value, this.carets.read(), this.surface.tabSize, outdent);

        if (edit !== null)
            this.surface.apply(edit.edits, edit.after, "other");
    }

    private newLine(): void {
        const text = this.textarea.value;
        const tabSize = this.surface.tabSize;
        const python = this.getLanguage() === "python";

        this.replaceEach(range => lineBreakText(text, rangeStart(range), tabSize, python), "other");
    }

    /** Replaces every range with the text `textFor` gives it and leaves each caret after its own. */
    private replaceEach(textFor: (range: Selection, index: number) => string, kind: EditKind): void {
        const { set, pads } = this.carets.readPadded();
        const { edits, after } = editRanges(set, (range, index) => {
            // A caret a column selection left standing past a short line's end writes out the spaces that carry it to its column first.
            const pad = pads === null ? 0 : Math.min(pads[index].anchor, pads[index].head);
            const text = " ".repeat(pad) + textFor(range, index);

            return { from: rangeStart(range), to: rangeEnd(range), text, caret: text.length };
        });

        this.surface.apply(edits, after, kind);
    }

    /**
     * The textarea's `beforeinput`: the editor owns undo/redo, so it intercepts both however they were triggered. With several
     * carets every edit is made here; an edit type this doesn't recognize is left to the browser.
     */
    public beforeInput(domEvent: InputEvent): void {
        if (domEvent.inputType === "historyUndo" || domEvent.inputType === "historyRedo") {
            domEvent.preventDefault();

            if (domEvent.inputType === "historyUndo")
                this.surface.undo();
            else
                this.surface.redo();

            return;
        }

        if (!this.carets.isMulti) {
            this.surface.beforeNativeEdit();
            return;
        }

        const text = this.textarea.value;

        switch (domEvent.inputType) {
            case "insertText":
            case "insertReplacementText": {
                const data = domEvent.data ?? domEvent.dataTransfer?.getData("text/plain") ?? null;

                if (data === null)
                    break;

                domEvent.preventDefault();
                this.replaceEach(() => data, "typing");
                return;
            }
            case "insertLineBreak":
            case "insertParagraph":
                domEvent.preventDefault();
                this.replaceEach(() => "\n", "other");
                return;
            case "deleteContentBackward":
                domEvent.preventDefault();
                this.deleteEach(position => previousCharacter(text, position), "deleting");
                return;
            case "deleteContentForward":
                domEvent.preventDefault();
                this.deleteEach(position => nextCharacter(text, position), "deleting");
                return;
            case "deleteWordBackward":
                domEvent.preventDefault();
                this.deleteEach(position => wordLeft(text, position), "other");
                return;
            case "deleteWordForward":
                domEvent.preventDefault();
                this.deleteEach(position => wordRight(text, position), "other");
                return;
            case "deleteSoftLineBackward":
            case "deleteHardLineBackward":
                domEvent.preventDefault();
                this.deleteEach(position => text.lastIndexOf("\n", position - 1) + 1, "other");
                return;
            case "deleteSoftLineForward":
            case "deleteHardLineForward":
                domEvent.preventDefault();
                this.deleteEach(position => text.indexOf("\n", position) < 0 ? text.length : text.indexOf("\n", position), "other");
                return;
        }

        this.carets.collapse();
        this.surface.beforeNativeEdit();
    }

    /** Deletes every selection, and at every caret the span from it to where `target` says. */
    private deleteEach(target: (position: number) => number, kind: EditKind): void {
        const { edits, after } = editRanges(this.carets.read(), range => {
            if (!isCaret(range))
                return { from: rangeStart(range), to: rangeEnd(range), text: "", caret: 0 };

            const to = target(range.head);

            return { from: Math.min(range.head, to), to: Math.max(range.head, to), text: "", caret: 0 };
        });

        this.surface.apply(edits, after, kind);
    }

    /** An input method composes at one place: the other carets are let go before it starts. */
    public compositionStart(): void {
        this.carets.collapse();
    }

    /** Copies what several ranges select, a line each; carets alone copy nothing, as the browser's own copy does. */
    public copy(domEvent: ClipboardEvent): void {
        const pieces = this.selectedPieces();

        if (pieces === null || domEvent.clipboardData === null)
            return;

        domEvent.preventDefault();
        domEvent.clipboardData.setData("text/plain", pieces.join("\n"));
        this.copied = pieces;
    }

    private selectedPieces(): string[] | null {
        const set = this.carets.read();

        if (set.ranges.length < 2 || set.ranges.every(isCaret))
            return null;

        return set.ranges.map(range => this.textarea.value.slice(rangeStart(range), rangeEnd(range)));
    }

    public cut(domEvent: ClipboardEvent): void {
        if (this.textarea.readOnly)
            return;

        const pieces = this.selectedPieces();

        if (pieces === null || domEvent.clipboardData === null)
            return;

        domEvent.preventDefault();
        domEvent.clipboardData.setData("text/plain", pieces.join("\n"));
        this.copied = pieces;
        this.deleteEach(position => position, "other");
    }

    /** Pastes at every caret: what a copy from as many ranges held piece by piece, a line each, or the whole text at each. */
    public paste(domEvent: ClipboardEvent): void {
        const set = this.carets.read();

        if (set.ranges.length < 2 || this.textarea.readOnly || domEvent.clipboardData === null)
            return;

        // The textarea holds every line break as LF, and a paste the browser makes is normalized the same way.
        const text = domEvent.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n");
        const pieces = distributePaste(text, set.ranges.length, this.copied);

        domEvent.preventDefault();
        this.replaceEach((_, index) => pieces?.[index] ?? text, "other");
    }

    /** Completions' accept: replaces the identifier immediately before every caret with `insert`, as one step. */
    public acceptCompletion(insert: string): void {
        const text = this.textarea.value;
        const { edits, after } = editRanges(this.carets.read(), range => isCaret(range) ? { from: prefixStart(text, range.head), to: range.head, text: insert, caret: insert.length } : null);

        this.surface.apply(edits, after, "other");
    }
}
