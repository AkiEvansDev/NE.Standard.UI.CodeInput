// The coordinator for one code field: resolves the DOM once, wires every listener to the concern that owns it, and holds those
// concerns — the editing surface, the carets, the editing keys, the find/replace panel, and the status bar's pickers.

import type { DomNames, PluginEngineContext } from "ne-standard-ui";
import { CodeEditorCarets } from "./code-editor-carets.ts";
import { CodeEditorCompletions } from "./code-editor-completions.ts";
import type { Strings } from "./code-editor-dom.ts";
import { CloseAttribute, ContentClass, CountAttribute, CrLf, DetectedLineEndingAttribute, EncodingAttribute, FindAttribute, HighlightClass, LanguageAttribute, LineEndingAttribute, MatchCaseAttribute, NextAttribute, PositionAttribute, PreviousAttribute, RegexAttribute, ReplaceAllAttribute, ReplaceAttribute, ReplaceOneAttribute, ReplaceRowClass, ScrollerClass, SearchAttribute, SearchPanelClass, SearchPartClass, StatusBarAttribute, StatusBarClass, StatusPickerClass, TabSizeAttribute, TextClass, ToggleReplaceAttribute, WholeWordAttribute } from "./code-editor-dom.ts";
import { CodeEditorEditing } from "./code-editor-editing.ts";
import { CodeEditorFindReplace } from "./code-editor-find-replace.ts";
import { CodeEditorStatusBar } from "./code-editor-status-bar.ts";
import type { StatusPicker } from "./code-editor-status-bar.ts";
import { CodeEditorSurface } from "./code-editor-surface.ts";
import { LanguageRegistry } from "./languages/index.ts";

type SearchPanelParts = {
    readonly panel: HTMLElement;
    readonly findField: HTMLInputElement;
    readonly replaceField: HTMLInputElement;
    readonly replaceRow: HTMLElement;
    readonly expand: HTMLElement | null;
    readonly count: HTMLElement;
    /** The three switches, the framework's toggle buttons. */
    readonly matchCase: HTMLElement | null;
    readonly wholeWord: HTMLElement | null;
    readonly regex: HTMLElement | null;
};

type EditorParts = {
    readonly textarea: HTMLTextAreaElement;
    readonly scroller: HTMLElement;
    readonly content: HTMLElement;
    readonly highlight: HTMLElement;
    /** Null when the field was drawn with its search switched off for good: the renderer leaves the panel out. */
    readonly search: SearchPanelParts | null;
    readonly statusBar: HTMLElement | null;
    readonly position: HTMLElement | null;
    readonly tabSize: StatusPicker | null;
    readonly encoding: StatusPicker | null;
    readonly lineEnding: StatusPicker | null;
    readonly language: StatusPicker | null;
};

export class CodeEditor {
    private readonly root: HTMLElement;
    private readonly surface: CodeEditorSurface;
    private readonly carets: CodeEditorCarets;
    private readonly editing: CodeEditorEditing;
    private readonly completions: CodeEditorCompletions;
    private readonly findReplace: CodeEditorFindReplace | null;
    private readonly statusBar: CodeEditorStatusBar;
    private readonly readOnlyClass: string;
    private language: string;

    /** Whether the root wore the framework's read-only mark when last looked at; the mark is what the editor follows. */
    private readOnly: boolean;

    private constructor(root: HTMLElement, context: PluginEngineContext, parts: EditorParts) {
        this.root = root;
        this.language = LanguageRegistry.normalize(root.getAttribute(LanguageAttribute));
        this.readOnlyClass = context.names.readOnlyClass;
        this.readOnly = root.classList.contains(this.readOnlyClass);

        const strings: Strings = context.strings;

        this.surface = new CodeEditorSurface(
            { root, textarea: parts.textarea, highlight: parts.highlight, position: parts.position },
            strings,
            () => this.language,
            { read: () => this.carets.read(), write: (set, reveal) => this.carets.write(set, reveal), virtualColumns: () => this.carets.primaryPadding },
            fromServer => this.findReplace?.refreshIfOpen(fromServer)
        );
        this.surface.renderAll();

        this.carets = new CodeEditorCarets({ root, textarea: parts.textarea, scroller: parts.scroller, content: parts.content }, this.surface);
        this.editing = new CodeEditorEditing(parts.textarea, this.surface, this.carets, () => this.language);
        this.completions = new CodeEditorCompletions(
            { root, textarea: parts.textarea, scroller: parts.scroller, content: parts.content },
            context,
            this.surface,
            this.editing,
            this.carets,
            () => this.language
        );

        this.findReplace = parts.search === null
            ? null
            : new CodeEditorFindReplace({ textarea: parts.textarea, scroller: parts.scroller, ...parts.search }, strings, context.names, context.validation, this.surface);

        this.statusBar = new CodeEditorStatusBar(
            {
                root,
                textarea: parts.textarea,
                bar: parts.statusBar,
                tabSize: parts.tabSize,
                encoding: parts.encoding,
                lineEnding: parts.lineEnding,
                language: parts.language
            },
            context.values,
            context.properties,
            () => {
                this.settingsChanged();
                // A tab size or a language moves every column the carets are drawn at; not folded into settingsChanged, which fires
                // on any field change and would redraw the carets forever.
                this.carets.queueRender();
            }
        );

        // The selects are drawn editable; a field drawn read-only takes them with it.
        if (this.readOnly)
            this.statusBar.syncReadOnly(true);

        this.surface.writePosition();

        const { textarea, scroller } = parts;

        textarea.addEventListener("beforeinput", domEvent => this.editing.beforeInput(domEvent));
        textarea.addEventListener("input", domEvent => this.surface.nativeInput(domEvent));
        // Completions first, so Ctrl+Space and the open list's own keys never reach the carets or the editing keys below them.
        textarea.addEventListener("keydown", domEvent => {
            this.completions.key(domEvent);
            this.carets.key(domEvent);
            this.editing.key(domEvent);
        });
        textarea.addEventListener("keyup", () => this.surface.writePosition());
        textarea.addEventListener("click", () => this.surface.writePosition());
        textarea.addEventListener("mousedown", domEvent => this.carets.pointerDown(domEvent));
        textarea.addEventListener("compositionstart", () => this.editing.compositionStart());
        textarea.addEventListener("copy", domEvent => this.editing.copy(domEvent));
        textarea.addEventListener("cut", domEvent => this.editing.cut(domEvent));
        textarea.addEventListener("paste", domEvent => this.editing.paste(domEvent));
        textarea.addEventListener("input", domEvent => this.completions.textChanged(domEvent));
        textarea.addEventListener("blur", () => this.completions.close());
        scroller.addEventListener("scroll", () => this.carets.queueRender(), { passive: true });
        scroller.addEventListener("scroll", () => this.completions.scrolled(), { passive: true });
        root.addEventListener("keydown", domEvent => this.rootKey(domEvent));

        // A press on the panel's or the bar's own ground (the count, the position, the air between parts) would drop the focus to
        // the page, and Ctrl+F with it.
        for (const ground of [parts.search?.panel, parts.statusBar])
            ground?.addEventListener("mousedown", domEvent => this.groundPressed(domEvent));

        if (this.findReplace !== null && parts.search !== null)
            this.wireSearch(this.findReplace, parts.search, context.names);
    }

    private wireSearch(findReplace: CodeEditorFindReplace, search: SearchPanelParts, names: DomNames): void {
        const { panel, findField, replaceField } = search;

        findField.addEventListener("input", () => findReplace.search(false, true));
        findField.addEventListener("keydown", domEvent => findReplace.findFieldKey(domEvent));
        replaceField.addEventListener("keydown", domEvent => findReplace.replaceFieldKey(domEvent));

        // The switches are the framework's toggle buttons: a press flips them and says so with a change, and the matches follow.
        for (const button of [search.matchCase, search.wholeWord, search.regex])
            button?.addEventListener("change", () => findReplace.search(false, true));

        search.expand?.addEventListener("click", () => findReplace.toggleReplace());
        panelButton(panel, PreviousAttribute, names)?.addEventListener("click", () => findReplace.step(-1));
        panelButton(panel, NextAttribute, names)?.addEventListener("click", () => findReplace.step(1));
        panelButton(panel, CloseAttribute, names)?.addEventListener("click", () => findReplace.close(true));
        panelButton(panel, ReplaceOneAttribute, names)?.addEventListener("click", () => findReplace.replaceOne());
        panelButton(panel, ReplaceAllAttribute, names)?.addEventListener("click", () => findReplace.replaceEvery());
    }

    /** Keeps the focus in the field when a press lands outside every part that takes it. */
    private groundPressed(domEvent: MouseEvent): void {
        const onPart = domEvent.target instanceof Element && domEvent.target.closest(`.${SearchPartClass}, .${StatusPickerClass}`) !== null;

        if (!onPart && this.root.contains(document.activeElement))
            domEvent.preventDefault();
    }

    /** Wires a root the renderer wrote; null when the markup is not the renderer's. */
    public static create(root: HTMLElement, context: PluginEngineContext): CodeEditor | null {
        const textarea = root.querySelector<HTMLTextAreaElement>(`textarea.${TextClass}`);
        const scroller = root.querySelector<HTMLElement>(`.${ScrollerClass}`);
        const content = root.querySelector<HTMLElement>(`.${ContentClass}`);
        const highlight = root.querySelector<HTMLElement>(`.${HighlightClass}`);

        if (textarea === null || scroller === null || content === null || highlight === null)
            return null;

        return new CodeEditor(root, context, {
            textarea,
            scroller,
            content,
            highlight,
            search: searchPanel(root, context.names),
            statusBar: root.querySelector<HTMLElement>(`.${StatusBarClass}`),
            position: root.querySelector<HTMLElement>(`[${PositionAttribute}]`),
            tabSize: statusPicker(root, TabSizeAttribute, context.names),
            encoding: statusPicker(root, EncodingAttribute, context.names),
            lineEnding: statusPicker(root, LineEndingAttribute, context.names),
            language: statusPicker(root, LanguageAttribute, context.names)
        });
    }

    public get languageId(): string {
        return this.language;
    }

    public get connected(): boolean {
        return this.root.isConnected;
    }

    /** The page's words changed: what the editor wrote itself, unmarked, is written again. */
    public wordsChanged(): void {
        this.findReplace?.wordsChanged();
    }

    /** Lets go of what would outlive the root: the watches on it. Called once the root has left the page. */
    public dispose(): void {
        this.carets.dispose();
    }

    /** A setting the server pushed: the pickers show it, and the carets are drawn again, since a tab size moves their columns. */
    public syncPickers(): void {
        this.statusBar.syncPickers();
        this.carets.queueRender();
    }

    /** The document's selection moved: the position follows it, carets the textarea moved away from are let go, and a completion
     *  list the caret moved out from under closes. */
    public selectionChanged(): void {
        this.carets.selectionChanged();
        this.surface.writePosition();
        this.completions.selectionChanged();
    }

    /** The root's read-only mark flipped: the pickers, the extra carets and the replace row's keyboard follow; an open list is the framework's to close. */
    public readOnlyChanged(): void {
        const readOnly = this.root.classList.contains(this.readOnlyClass);

        if (readOnly === this.readOnly)
            return;

        this.readOnly = readOnly;
        this.statusBar.syncReadOnly(readOnly);

        if (readOnly)
            this.findReplace?.replaceHidden();

        this.settingsChanged();
    }

    /** The language or a switch may have been patched; anything else the observer reports is this editor's own writing. */
    public settingsChanged(): void {
        const language = LanguageRegistry.normalize(this.root.getAttribute(LanguageAttribute));

        // The bar reads its selects again whatever the language did: the same attach carries a new tab size, encoding or ending.
        this.statusBar.syncPickers();
        this.carets.settingsChanged();
        this.completions.settingsChanged();

        // Search switched off takes the open panel with it, and the keyboard in it back to the text.
        if (!this.searchEnabled && this.findReplace?.isOpen === true)
            this.findReplace.close(this.findReplace.holdsFocus);

        if (!this.root.hasAttribute(StatusBarAttribute))
            this.statusBar.barHidden();

        if (language === this.language)
            return;

        this.language = language;
        this.reload();
    }

    /** Reads the whole text again under the language the id now names; the words completions offered were the old language's. */
    public reload(): void {
        this.completions.close();
        this.surface.setLanguage();
        this.findReplace?.search(true, false);
    }

    /**
     * The server pushed a value; refreshes the line-ending display from the text it carries. A single-line value says nothing about
     * its ending, so the field keeps what it had rather than guess.
     */
    public refresh(pushed: unknown): void {
        if (typeof pushed === "string" && pushed.includes("\n")) {
            const ending = pushed.includes("\r\n") ? CrLf : "lf";

            this.root.setAttribute(DetectedLineEndingAttribute, ending);
            this.statusBar.showDetectedEnding(ending);
        }

        this.completions.close();

        // Carets stand in the text they were placed in; another text lets them go.
        if (this.surface.textPushed())
            this.carets.collapse();
    }

    private get searchEnabled(): boolean {
        return this.root.hasAttribute(SearchAttribute);
    }

    private rootKey(domEvent: KeyboardEvent): void {
        if (domEvent.defaultPrevented || domEvent.isComposing)
            return;

        const command = domEvent.ctrlKey || domEvent.metaKey;
        const findReplace = this.findReplace;

        // By the key's position, not its letter: under another layout Ctrl+F arrives as the letter that layout puts there.
        if (command && !domEvent.altKey && domEvent.code === "KeyF" && this.searchEnabled && findReplace !== null) {
            domEvent.preventDefault();
            findReplace.open(false);
        }
        else if (command && !domEvent.altKey && domEvent.code === "KeyH" && this.searchEnabled && findReplace !== null) {
            domEvent.preventDefault();
            findReplace.open(true);
        }
        else if (command && !domEvent.altKey && domEvent.code === "KeyS") {
            domEvent.preventDefault();
            this.surface.save();
        }
        else if (domEvent.key === "Escape" && findReplace?.isOpen === true) {
            domEvent.preventDefault();
            findReplace.close(true);
        }
        else if (domEvent.code === "F3" && findReplace?.isOpen === true) {
            domEvent.preventDefault();
            findReplace.step(domEvent.shiftKey ? -1 : 1);
        }
    }
}

/** The find panel's parts the renderer drew; null when it left the panel out, or drew it incomplete. */
function searchPanel(root: HTMLElement, names: DomNames): SearchPanelParts | null {
    const panel = root.querySelector<HTMLElement>(`.${SearchPanelClass}`);
    const findField = root.querySelector<HTMLInputElement>(`[${FindAttribute}] input`);
    const replaceField = root.querySelector<HTMLInputElement>(`[${ReplaceAttribute}] input`);
    const replaceRow = root.querySelector<HTMLElement>(`.${ReplaceRowClass}`);
    const count = root.querySelector<HTMLElement>(`[${CountAttribute}]`);

    if (panel === null || findField === null || replaceField === null || replaceRow === null || count === null)
        return null;

    return {
        panel,
        findField,
        replaceField,
        replaceRow,
        expand: panelButton(panel, ToggleReplaceAttribute, names),
        count,
        matchCase: panelButton(panel, MatchCaseAttribute, names),
        wholeWord: panelButton(panel, WholeWordAttribute, names),
        regex: panelButton(panel, RegexAttribute, names)
    };
}

/** The framework's button inside one of the find panel's parts, which the renderer carries under an attribute each. */
function panelButton(panel: HTMLElement, attribute: string, names: DomNames): HTMLElement | null {
    return panel.querySelector<HTMLElement>(`[${attribute}] > .${names.buttonClass}`);
}

/** A status bar picker the renderer drew: the hidden carrier under its attribute, and the framework's select beside it. */
function statusPicker(root: HTMLElement, attribute: string, names: DomNames): StatusPicker | null {
    const carrier = root.querySelector<HTMLInputElement>(`input[${attribute}]`);
    const select = carrier?.parentElement?.querySelector<HTMLElement>(`.${names.selectClass}`) ?? null;

    return carrier === null || select === null ? null : { carrier, select };
}
