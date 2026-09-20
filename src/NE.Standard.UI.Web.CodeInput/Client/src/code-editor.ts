// The coordinator for one code field: resolves the DOM once, wires every listener to the concern that owns it, and holds those
// concerns — the editing surface, the carets, the editing keys, the find/replace panel, and the status bar's pickers.

import type { PluginEngineContext } from "ne-standard-ui";
import { CodeEditorCarets } from "./code-editor-carets.ts";
import { CodeEditorCompletions } from "./code-editor-completions.ts";
import type { Strings } from "./code-editor-dom.ts";
import { CrLf, DetectedLineEndingAttribute, LanguageAttribute } from "./code-editor-dom.ts";
import { CodeEditorEditing } from "./code-editor-editing.ts";
import { CodeEditorFindReplace } from "./code-editor-find-replace.ts";
import { CodeEditorStatusBar } from "./code-editor-status-bar.ts";
import type { StatusPicker } from "./code-editor-status-bar.ts";
import { CodeEditorSurface } from "./code-editor-surface.ts";
import { LanguageRegistry } from "./languages/index.ts";

const SearchAttribute = "data-ui-code-search";
// The framework's own button inside one of the find panel's parts, which the renderer carries under an attribute each.
const PartButton = "> .ui-button";
const SwitchAttributes = ["data-ui-code-match-case", "data-ui-code-whole-word", "data-ui-code-regex"];

type EditorParts = {
    readonly textarea: HTMLTextAreaElement;
    readonly scroller: HTMLElement;
    readonly content: HTMLElement;
    readonly highlight: HTMLElement;
    readonly panel: HTMLElement;
    readonly findField: HTMLInputElement;
    readonly replaceField: HTMLInputElement;
    readonly replaceRow: HTMLElement;
    readonly expand: HTMLElement | null;
    readonly count: HTMLElement;
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
    private readonly findReplace: CodeEditorFindReplace;
    private readonly statusBar: CodeEditorStatusBar;
    private language: string;

    private constructor(root: HTMLElement, context: PluginEngineContext, parts: EditorParts) {
        this.root = root;
        this.language = LanguageRegistry.normalize(root.getAttribute(LanguageAttribute));

        const strings: Strings = context.strings;

        this.surface = new CodeEditorSurface(
            { root, textarea: parts.textarea, highlight: parts.highlight, position: parts.position },
            strings,
            () => this.language,
            { read: () => this.carets.read(), write: (set, reveal) => this.carets.write(set, reveal), virtualColumns: () => this.carets.primaryPadding },
            fromServer => this.findReplace.refreshIfOpen(fromServer)
        );
        this.surface.renderAll();

        this.carets = new CodeEditorCarets({ root, textarea: parts.textarea, scroller: parts.scroller, content: parts.content }, this.surface);
        this.editing = new CodeEditorEditing(parts.textarea, this.surface, this.carets, () => this.language);
        this.completions = new CodeEditorCompletions(
            { root, textarea: parts.textarea, content: parts.content },
            context,
            this.surface,
            this.editing,
            this.carets,
            () => this.language
        );

        this.findReplace = new CodeEditorFindReplace(
            {
                root,
                textarea: parts.textarea,
                scroller: parts.scroller,
                panel: parts.panel,
                findField: parts.findField,
                replaceField: parts.replaceField,
                replaceRow: parts.replaceRow,
                expand: parts.expand,
                count: parts.count
            },
            strings,
            this.surface
        );

        this.statusBar = new CodeEditorStatusBar(
            {
                root,
                textarea: parts.textarea,
                tabSize: parts.tabSize,
                encoding: parts.encoding,
                lineEnding: parts.lineEnding,
                language: parts.language
            },
            context.values,
            context.properties,
            () => {
                this.settingsChanged();
                // A tab size moves every column the carets are drawn at; not folded into settingsChanged, which fires on any field
                // change and would redraw the carets forever.
                this.carets.queueRender();
            }
        );

        this.surface.writePosition();

        const { textarea, scroller, panel, findField, replaceField } = parts;

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
        scroller.addEventListener("scroll", () => this.completions.close(), { passive: true });
        root.addEventListener("keydown", domEvent => this.rootKey(domEvent));

        findField.addEventListener("input", () => this.findReplace.search(false, true));
        findField.addEventListener("keydown", domEvent => this.findReplace.findFieldKey(domEvent));
        replaceField.addEventListener("keydown", domEvent => this.findReplace.replaceFieldKey(domEvent));

        // The switches are the framework's toggle buttons: a press flips them and says so with a change, and the matches follow.
        for (const attribute of SwitchAttributes)
            this.panelButton(panel, attribute)?.addEventListener("change", () => this.findReplace.search(false, true));

        this.panelButton(panel, "data-ui-code-toggle-replace")?.addEventListener("click", () => this.findReplace.toggleReplace());
        this.panelButton(panel, "data-ui-code-previous")?.addEventListener("click", () => this.findReplace.step(-1));
        this.panelButton(panel, "data-ui-code-next")?.addEventListener("click", () => this.findReplace.step(1));
        this.panelButton(panel, "data-ui-code-close")?.addEventListener("click", () => this.findReplace.close());
        this.panelButton(panel, "data-ui-code-replace-one")?.addEventListener("click", () => this.findReplace.replaceOne());
        this.panelButton(panel, "data-ui-code-replace-all")?.addEventListener("click", () => this.findReplace.replaceEvery());
    }

    /** Wires a root the renderer wrote; null when the markup is not the renderer's. */
    public static create(root: HTMLElement, context: PluginEngineContext): CodeEditor | null {
        const textarea = root.querySelector<HTMLTextAreaElement>("textarea.ui-code-input__text");
        const scroller = root.querySelector<HTMLElement>(".ui-code-input__scroller");
        const content = root.querySelector<HTMLElement>(".ui-code-input__content");
        const highlight = root.querySelector<HTMLElement>(".ui-code-input__highlight");
        const panel = root.querySelector<HTMLElement>(".ui-code-input__search");
        const findField = root.querySelector<HTMLInputElement>("[data-ui-code-find] input");
        const replaceField = root.querySelector<HTMLInputElement>("[data-ui-code-replace] input");
        const replaceRow = root.querySelector<HTMLElement>(".ui-code-input__search-row--replace");
        const count = root.querySelector<HTMLElement>("[data-ui-code-count]");

        if (textarea === null || scroller === null || content === null || highlight === null || panel === null || findField === null || replaceField === null || replaceRow === null || count === null)
            return null;

        return new CodeEditor(root, context, {
            textarea,
            scroller,
            content,
            highlight,
            panel,
            findField,
            replaceField,
            replaceRow,
            expand: root.querySelector<HTMLElement>(`[data-ui-code-toggle-replace] ${PartButton}`),
            count,
            position: root.querySelector<HTMLElement>("[data-ui-code-position]"),
            tabSize: statusPicker(root, "data-ui-code-tab-size"),
            encoding: statusPicker(root, "data-ui-code-encoding"),
            lineEnding: statusPicker(root, "data-ui-code-line-ending"),
            language: statusPicker(root, "data-ui-code-language")
        });
    }

    private panelButton(panel: HTMLElement, attribute: string): HTMLElement | null {
        return panel.querySelector<HTMLElement>(`[${attribute}] ${PartButton}`);
    }

    public get languageId(): string {
        return this.language;
    }

    public get connected(): boolean {
        return this.root.isConnected;
    }

    /** Lets go of what would outlive the root: the watches on it. Called once the root has left the page. */
    public dispose(): void {
        this.carets.dispose();
    }

    public syncPickers(): void {
        this.statusBar.syncPickers();
    }

    /** The document's selection moved: the position follows it, carets the textarea moved away from are let go, and a completion
     *  list the caret moved out from under closes. */
    public selectionChanged(): void {
        this.carets.selectionChanged();
        this.surface.writePosition();
        this.completions.selectionChanged();
    }

    /** The language attribute may have been patched; anything else the observer reports is this editor's own writing. */
    public settingsChanged(): void {
        const language = LanguageRegistry.normalize(this.root.getAttribute(LanguageAttribute));

        // The bar reads its selects again whatever the language did: the same attach carries a new tab size, encoding or ending.
        this.statusBar.syncPickers();

        if (language === this.language)
            return;

        this.language = language;
        this.reload();
    }

    /** Reads the whole text again under the language the id now names; the words completions offered were the old language's. */
    public reload(): void {
        this.completions.close();
        this.surface.setLanguage();
        this.findReplace.search(true, false);
    }

    /**
     * The server pushed a value; refreshes the line-ending display from the text it carries. A single-line value says nothing about
     * its ending, so the field keeps what it had rather than guess.
     */
    public refresh(pushed: unknown): void {
        if (typeof pushed === "string" && /\n/.test(pushed)) {
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

        // By the key's position, not its letter: under another layout Ctrl+F arrives as the letter that layout puts there.
        if (command && !domEvent.altKey && domEvent.code === "KeyF" && this.searchEnabled) {
            domEvent.preventDefault();
            this.findReplace.open(false);
        }
        else if (command && !domEvent.altKey && domEvent.code === "KeyH" && this.searchEnabled) {
            domEvent.preventDefault();
            this.findReplace.open(true);
        }
        else if (command && !domEvent.altKey && domEvent.code === "KeyS") {
            domEvent.preventDefault();
            this.surface.save();
        }
        else if (domEvent.key === "Escape" && this.findReplace.isOpen) {
            domEvent.preventDefault();
            this.findReplace.close();
        }
        else if (domEvent.code === "F3" && this.findReplace.isOpen) {
            domEvent.preventDefault();
            this.findReplace.step(domEvent.shiftKey ? -1 : 1);
        }
    }
}

/** A status bar picker the renderer drew: the hidden carrier under its attribute, and the framework's select beside it. */
function statusPicker(root: HTMLElement, attribute: string): StatusPicker | null {
    const carrier = root.querySelector<HTMLInputElement>(`input[${attribute}]`);
    const select = carrier?.parentElement?.querySelector<HTMLElement>(".ui-select") ?? null;

    return carrier === null || select === null ? null : { carrier, select };
}
