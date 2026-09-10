// Runs every code field on the page: the highlighted layer under the textarea, the keys an editor answers, the find panel, and the
// status bar under the text — the caret's place and the four pickers whose values travel the ordinary two-way path.

import type { PluginEngineContext } from "ne-standard-ui";
import type { LineChange } from "./highlighter.ts";
import { Highlighter } from "./highlighter.ts";
import { applyTab } from "./indent.ts";
import { LanguageRegistry, languages } from "./languages/index.ts";
import type { SearchMatch, SearchOptions, SearchQuery } from "./search.ts";
import { compileQuery, expandReplacement, findMatches, nextMatchFrom, previousMatchFrom, replaceAll } from "./search.ts";

const RootSelector = ".ui-code-input";
const LanguageAttribute = "data-ui-code-language";
const SearchAttribute = "data-ui-code-search";
const DetectedLineEndingAttribute = "data-ui-code-eol";
const CrLf = "crlf";
const TabSizeVariable = "--ui-code-tab-size";
const GutterDigitsVariable = "--ui-code-gutter-digits";
const InvalidPatternClass = "ui-code-input--invalid-pattern";
const LineClass = "ui-code-input__line";

type Strings = PluginEngineContext["strings"];

/** The textarea's text with the line ending the status bar shows put back: the browser holds every break as LF. */
export function readCodeValue(element: Element): unknown {
    if (!(element instanceof HTMLTextAreaElement))
        return null;

    const value = element.value;
    const root = element.closest<HTMLElement>(RootSelector);

    return root !== null && effectiveLineEnding(root) === CrLf ? value.replace(/\r?\n/g, "\r\n") : value;
}

/** The chosen line ending when there is one, else the one the value came with (the root's attribute), else LF. */
function effectiveLineEnding(root: HTMLElement): string {
    const picker = root.querySelector<HTMLSelectElement>("select[data-ui-code-line-ending]");
    const chosen = picker?.value ?? "";

    return chosen.length > 0 ? chosen : root.getAttribute(DetectedLineEndingAttribute) ?? "lf";
}

export function startCodeInputEngine(context: PluginEngineContext): void {
    const editors = new WeakMap<HTMLElement, CodeEditor>();

    // Every live editor, for a language registered after its field was drawn; those whose root left the page are let go as they turn up.
    const live = new Set<CodeEditor>();

    const attach = (roots: Iterable<HTMLElement>): void => {
        for (const root of roots) {
            const editor = editors.get(root);

            if (editor === undefined) {
                const created = CodeEditor.create(root, context.strings);

                if (created !== null) {
                    editors.set(root, created);
                    live.add(created);
                }
            }
            else
                editor.settingsChanged();
        }
    };

    attach(context.root.querySelectorAll<HTMLElement>(RootSelector));
    context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: [LanguageAttribute] }, attach);

    languages.onRegistered(id => {
        for (const editor of live) {
            if (!editor.connected) {
                live.delete(editor);
                continue;
            }

            editor.listLanguages();

            if (editor.languageId === id)
                editor.reload();
        }
    });

    // A value the server pushed lands on the textarea with no event; the reader's own typing already came through `input`. The
    // pushed text also says which line break it came with, which the textarea forgets.
    context.propertyPatchEngine.addValueChangeHandler(change => {
        if (change.local)
            return;

        for (const component of change.components) {
            const editor = editors.get(component as HTMLElement);

            if (change.propertyName === "Value")
                editor?.refresh(change.value);
            else if (PickerPropertyNames.has(change.propertyName))
                editor?.syncPickers();
        }
    });

    // The caret's place: the selection is the document's, so one listener serves every editor.
    document.addEventListener("selectionchange", () => {
        const active = document.activeElement;
        const root = active instanceof HTMLTextAreaElement ? active.closest<HTMLElement>(RootSelector) : null;

        if (root !== null)
            editors.get(root)?.writePosition();
    });
}

type EditorParts = {
    readonly textarea: HTMLTextAreaElement;
    readonly scroller: HTMLElement;
    readonly highlight: HTMLElement;
    readonly panel: HTMLElement;
    readonly findField: HTMLInputElement;
    readonly replaceField: HTMLInputElement;
    readonly count: HTMLElement;
    readonly position: HTMLElement | null;
    readonly tabSizePicker: HTMLSelectElement | null;
    readonly lineEndingPicker: HTMLSelectElement | null;
    readonly languagePicker: HTMLSelectElement | null;
};

/** A status bar picker: the hidden select that carries the value and the button that shows it and opens the list. */
type Picker = {
    readonly select: HTMLSelectElement;
    readonly button: HTMLButtonElement;
};

const PickerClass = "ui-code-input__status-picker";
const PickerButtonClass = "ui-code-input__status-button";
const MenuClass = "ui-code-input__status-menu";
const OptionClass = "ui-code-input__status-option";
// The settings a push from the server redraws a picker's word for.
const PickerPropertyNames = new Set(["TabSize", "Encoding", "LineEnding", "Language"]);

class CodeEditor {
    private readonly root: HTMLElement;
    private readonly strings: Strings;
    private readonly textarea: HTMLTextAreaElement;
    private readonly scroller: HTMLElement;
    private readonly highlight: HTMLElement;
    private readonly panel: HTMLElement;
    private readonly findField: HTMLInputElement;
    private readonly replaceField: HTMLInputElement;
    private readonly count: HTMLElement;
    private readonly position: HTMLElement | null;
    private readonly tabSizePicker: HTMLSelectElement | null;
    private readonly lineEndingPicker: HTMLSelectElement | null;
    private readonly languagePicker: HTMLSelectElement | null;
    private readonly pickers: Picker[] = [];
    private openMenu: { readonly picker: Picker; readonly menu: HTMLElement; readonly close: () => void } | null = null;
    private highlighter: Highlighter;
    private language: string;
    private matches: SearchMatch[] = [];
    private current = -1;
    private query: SearchQuery = null;

    private constructor(root: HTMLElement, strings: Strings, parts: EditorParts) {
        this.root = root;
        this.strings = strings;
        this.textarea = parts.textarea;
        this.scroller = parts.scroller;
        this.highlight = parts.highlight;
        this.panel = parts.panel;
        this.findField = parts.findField;
        this.replaceField = parts.replaceField;
        this.count = parts.count;
        this.position = parts.position;
        this.tabSizePicker = parts.tabSizePicker;
        this.lineEndingPicker = parts.lineEndingPicker;
        this.languagePicker = parts.languagePicker;

        const { textarea, panel, findField, replaceField } = parts;

        this.language = LanguageRegistry.normalize(root.getAttribute(LanguageAttribute));
        this.highlighter = new Highlighter(languages.get(this.language));

        this.renderAll();
        this.wireStatusBar();

        textarea.addEventListener("input", () => this.textChanged(false));
        textarea.addEventListener("keydown", domEvent => this.textareaKey(domEvent));
        textarea.addEventListener("keyup", () => this.writePosition());
        textarea.addEventListener("click", () => this.writePosition());
        root.addEventListener("keydown", domEvent => this.rootKey(domEvent));

        findField.addEventListener("input", () => this.search(false, true));
        findField.addEventListener("keydown", domEvent => this.findFieldKey(domEvent));
        replaceField.addEventListener("keydown", domEvent => this.replaceFieldKey(domEvent));

        for (const toggle of panel.querySelectorAll<HTMLButtonElement>("[aria-pressed]"))
            toggle.addEventListener("click", () => this.toggleOption(toggle));

        this.button("data-ui-code-previous")?.addEventListener("click", () => this.step(-1));
        this.button("data-ui-code-next")?.addEventListener("click", () => this.step(1));
        this.button("data-ui-code-close")?.addEventListener("click", () => this.close());
        this.button("data-ui-code-replace-one")?.addEventListener("click", () => this.replaceOne());
        this.button("data-ui-code-replace-all")?.addEventListener("click", () => this.replaceEvery());
    }

    /** Wires a root the renderer wrote; null when the markup is not the renderer's. */
    public static create(root: HTMLElement, strings: Strings): CodeEditor | null {
        const textarea = root.querySelector<HTMLTextAreaElement>("textarea.ui-code-input__text");
        const scroller = root.querySelector<HTMLElement>(".ui-code-input__scroller");
        const highlight = root.querySelector<HTMLElement>(".ui-code-input__highlight");
        const panel = root.querySelector<HTMLElement>(".ui-code-input__search");
        const findField = root.querySelector<HTMLInputElement>("input[data-ui-code-find]");
        const replaceField = root.querySelector<HTMLInputElement>("input[data-ui-code-replace]");
        const count = root.querySelector<HTMLElement>("[data-ui-code-count]");

        if (textarea === null || scroller === null || highlight === null || panel === null || findField === null || replaceField === null || count === null)
            return null;

        return new CodeEditor(root, strings, {
            textarea,
            scroller,
            highlight,
            panel,
            findField,
            replaceField,
            count,
            position: root.querySelector<HTMLElement>("[data-ui-code-position]"),
            tabSizePicker: root.querySelector<HTMLSelectElement>("select[data-ui-code-tab-size]"),
            lineEndingPicker: root.querySelector<HTMLSelectElement>("select[data-ui-code-line-ending]"),
            languagePicker: root.querySelector<HTMLSelectElement>("select[data-ui-code-language]")
        });
    }

    // --- status bar ---------------------------------------------------------------------------------------------------------

    /**
     * The pickers' values travel the framework's two-way path on `change`; what the editor does here is answer at once, before the
     * server echoes — the tab stop, the highlighting, the line ending — and fill in what the server could not know.
     */
    private wireStatusBar(): void {
        this.writePosition();

        this.tabSizePicker?.addEventListener("change", () => {
            this.root.style.setProperty(TabSizeVariable, this.tabSizePicker?.value ?? "4");
        });

        // A new ending goes with the text now, not with the next keystroke: the reader puts it in, so the value is sent again.
        this.lineEndingPicker?.addEventListener("change", () => {
            this.textarea.dispatchEvent(new Event("change", { bubbles: true }));
        });

        this.languagePicker?.addEventListener("change", () => {
            this.root.setAttribute(LanguageAttribute, this.languagePicker?.value ?? "");
            this.settingsChanged();
        });

        // Only the list as it stands now: a language registered later reaches every live editor through the engine's own listener,
        // which is the one that prunes the editors a page swap took away.
        this.listLanguages();

        for (const element of this.root.querySelectorAll<HTMLElement>(`.${PickerClass}`)) {
            const select = element.querySelector<HTMLSelectElement>("select");
            const button = element.querySelector<HTMLButtonElement>(`button.${PickerButtonClass}`);

            if (select === null || button === null)
                continue;

            const picker: Picker = { select, button };

            this.pickers.push(picker);

            // A picker's word follows its select whenever the select changes, whoever changed it — the encoding's too, which no field holds.
            select.addEventListener("change", () => this.syncPickers());
            button.addEventListener("click", () => this.togglePickerMenu(picker));
            button.addEventListener("keydown", domEvent => this.pickerButtonKey(picker, domEvent));
        }

        // The words as the selects stand right now: a field that arrived in a row the client built was patched with its values
        // before this engine ever saw it, and the captions the server drew are the template's, not this row's.
        this.syncPickers();
    }

    /** Every picker's word is its select's current choice — after a push from the server, a choice in the list, or a new detection. */
    public syncPickers(): void {
        for (const picker of this.pickers) {
            const option = picker.select.options[picker.select.selectedIndex];

            // A value pushed that the list has no option for — another tab size, an id in another casing — selects nothing at all.
            // The button then keeps the word it had: a stale name says more about the field than an empty box does.
            if (option === undefined)
                continue;

            if (picker.button.textContent !== option.textContent)
                picker.button.textContent = option.textContent;
        }
    }

    private pickerButtonKey(picker: Picker, domEvent: KeyboardEvent): void {
        if (domEvent.key === "ArrowDown" || domEvent.key === "ArrowUp" || domEvent.key === "Enter" || domEvent.key === " ") {
            domEvent.preventDefault();

            if (this.openMenu?.picker !== picker)
                this.openPickerMenu(picker);
        }
    }

    private togglePickerMenu(picker: Picker): void {
        if (this.openMenu?.picker === picker)
            this.openMenu.close();
        else
            this.openPickerMenu(picker);
    }

    /**
     * The list, the package's own: the select's real options as buttons in a popup over the picker, the current one marked, closed by
     * a choice, Escape, a press outside, or the window moving under it. The select stays the value's carrier: a choice is written to
     * it and raised as its `change`, so the framework's value path and the editor's own listeners see one thing.
     */
    private openPickerMenu(picker: Picker): void {
        this.openMenu?.close();

        if (this.textarea.readOnly)
            return;

        const menu = document.createElement("div");

        menu.className = MenuClass;
        menu.setAttribute("role", "listbox");

        const options = [...picker.select.options].filter(option => !option.hidden);
        let focused = 0;

        options.forEach((option, index) => {
            const entry = document.createElement("button");

            entry.type = "button";
            entry.className = OptionClass;
            entry.setAttribute("role", "option");
            entry.setAttribute("aria-selected", option.selected ? "true" : "false");
            entry.textContent = option.textContent;
            entry.addEventListener("click", () => {
                picker.select.value = option.value;
                picker.select.dispatchEvent(new Event("change", { bubbles: true }));
                this.syncPickers();
                close();
                picker.button.focus({ preventScroll: true });
            });
            menu.append(entry);

            if (option.selected)
                focused = index;
        });

        const entries = [...menu.querySelectorAll<HTMLButtonElement>(`.${OptionClass}`)];

        const onKey = (domEvent: KeyboardEvent): void => {
            if (domEvent.key === "Escape") {
                domEvent.preventDefault();
                close();
                picker.button.focus({ preventScroll: true });
            }
            else if (domEvent.key === "ArrowDown" || domEvent.key === "ArrowUp") {
                domEvent.preventDefault();
                focused = (focused + (domEvent.key === "ArrowDown" ? 1 : entries.length - 1)) % entries.length;
                entries[focused]?.focus({ preventScroll: true });
            }
            else if (domEvent.key === "Tab") {
                close();
            }
        };

        const onPointerDown = (domEvent: Event): void => {
            if (!(domEvent.composedPath().includes(menu) || domEvent.composedPath().includes(picker.button)))
                close();
        };

        // The page moving under the menu closes it, but the menu is a scroller of its own once the list is long, and a capture
        // listener on the window sees that scroll on the way down.
        const onScroll = (domEvent: Event): void => {
            if (!domEvent.composedPath().includes(menu))
                close();
        };

        const close = (): void => {
            menu.remove();
            picker.button.setAttribute("aria-expanded", "false");
            document.removeEventListener("pointerdown", onPointerDown, true);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", onScroll, true);
            this.openMenu = null;
        };

        menu.addEventListener("keydown", onKey);
        document.addEventListener("pointerdown", onPointerDown, true);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", onScroll, true);

        this.root.append(menu);
        picker.button.setAttribute("aria-expanded", "true");
        this.openMenu = { picker, menu, close };

        // Over the bar, its right edge on the button's: the bar is the field's last line, so up is usually where the room is. A field
        // near the top of the window has none, and there the list goes under the button instead of off the screen.
        const anchor = picker.button.getBoundingClientRect();
        const box = menu.getBoundingClientRect();

        menu.style.left = `${Math.max(4, anchor.right - box.width)}px`;

        if (anchor.top >= box.height + 8)
            menu.style.bottom = `${window.innerHeight - anchor.top + 4}px`;
        else
            menu.style.top = `${anchor.bottom + 4}px`;

        entries[focused]?.focus({ preventScroll: true });
    }

    /** A language a package registered joins the picker under its id; the server listed only the ones it ships. */
    public listLanguages(): void {
        const picker = this.languagePicker;

        if (picker === null)
            return;

        const listed = new Set([...picker.options].map(option => LanguageRegistry.normalize(option.value)));

        for (const id of languages.ids()) {
            if (listed.has(id))
                continue;

            const option = document.createElement("option");

            option.value = id;
            option.textContent = id;
            picker.append(option);
        }
    }

    /** The caret's line and column, one-based; a selection reads at its end. */
    public writePosition(): void {
        if (this.position === null)
            return;

        const value = this.textarea.value;
        const caret = this.textarea.selectionEnd;
        const lineStart = value.lastIndexOf("\n", caret - 1) + 1;
        const line = this.highlighter.lineAt(lineStart) + 1;
        const text = this.strings.format("ui.code.position", { line, column: caret - lineStart + 1 });

        if (this.position.textContent !== text)
            this.position.textContent = text;
    }

    private button(attribute: string): HTMLButtonElement | null {
        return this.panel.querySelector<HTMLButtonElement>(`button[${attribute}]`);
    }

    public get languageId(): string {
        return this.language;
    }

    public get connected(): boolean {
        return this.root.isConnected;
    }

    /** The language attribute may have been patched; anything else the observer reports is this editor's own writing. */
    public settingsChanged(): void {
        const language = LanguageRegistry.normalize(this.root.getAttribute(LanguageAttribute));

        // The bar reads its selects again whatever the language did: the same attach carries a new tab size, encoding or ending.
        this.syncPickers();

        if (language === this.language)
            return;

        this.language = language;
        this.reload();
    }

    /** Reads the whole text again under the language the id now names. */
    public reload(): void {
        this.highlighter = new Highlighter(languages.get(this.language));
        this.renderAll();
        this.search(true, false);
    }

    /**
     * The server pushed a value; the text it sent says which line break it carries, which the textarea has already forgotten. A value
     * of one line says nothing, so the field keeps the ending it had rather than guessing one for text that has none.
     */
    public refresh(pushed: unknown): void {
        if (typeof pushed === "string" && /\n/.test(pushed)) {
            const ending = pushed.includes("\r\n") ? CrLf : "lf";

            this.root.setAttribute(DetectedLineEndingAttribute, ending);

            // Nothing chosen shows the text's own ending through the picker's hidden option; a choice stands, and the reader converts
            // on the next commit.
            const detected = this.lineEndingPicker?.querySelector("option[data-ui-code-eol-detected]");

            if (detected !== null && detected !== undefined)
                detected.textContent = ending === CrLf ? "CRLF" : "LF";

            this.syncPickers();
        }

        this.textChanged(true);
        this.writePosition();
    }

    private renderAll(): void {
        this.highlight.replaceChildren();
        this.applyChange(this.highlighter.update(this.textarea.value));
        this.updateGutter();
    }

    private textChanged(fromServer: boolean): void {
        this.applyChange(this.highlighter.update(this.textarea.value));
        this.updateGutter();
        this.writePosition();

        if (!this.panel.hidden)
            this.search(true, fromServer);
    }

    private applyChange(change: LineChange): void {
        if (change.removed === 0 && change.added === 0)
            return;

        let html = "";

        for (let i = change.from; i < change.from + change.added; i++)
            html += `<div class="${LineClass}">${this.highlighter.renderLine(i)}</div>`;

        // Nothing to keep: one parse of the whole, which is far cheaper than a fragment spliced in.
        if (this.highlight.childElementCount === 0) {
            this.highlight.innerHTML = html;
            return;
        }

        const template = document.createElement("template");
        template.innerHTML = html;

        const anchor = this.highlight.children[change.from] ?? null;

        for (let i = 0; i < change.removed; i++)
            this.highlight.children[change.from]?.remove();

        this.highlight.insertBefore(template.content, anchor !== null && anchor.isConnected ? anchor : this.highlight.children[change.from] ?? null);
    }

    private renderLines(indexes: readonly number[]): void {
        for (const index of indexes) {
            const line = this.highlight.children[index];

            if (line !== undefined)
                line.innerHTML = this.highlighter.renderLine(index);
        }
    }

    private updateGutter(): void {
        const digits = String(Math.max(2, String(this.highlighter.lineCount).length));

        if (this.root.style.getPropertyValue(GutterDigitsVariable) !== digits)
            this.root.style.setProperty(GutterDigitsVariable, digits);
    }

    private get tabSize(): number {
        const size = Number.parseInt(getComputedStyle(this.root).getPropertyValue(TabSizeVariable), 10);

        return Number.isFinite(size) && size > 0 ? size : 4;
    }

    private get searchEnabled(): boolean {
        return this.root.hasAttribute(SearchAttribute);
    }

    // --- keys -------------------------------------------------------------------------------------------------------------------

    private textareaKey(domEvent: KeyboardEvent): void {
        if (domEvent.defaultPrevented || domEvent.isComposing || domEvent.ctrlKey || domEvent.metaKey || domEvent.altKey || this.textarea.readOnly)
            return;

        if (domEvent.key === "Tab") {
            domEvent.preventDefault();
            this.tab(domEvent.shiftKey);
        }
        else if (domEvent.key === "Enter" && !domEvent.shiftKey) {
            domEvent.preventDefault();
            this.newLine();
        }
    }

    private rootKey(domEvent: KeyboardEvent): void {
        if (domEvent.defaultPrevented || domEvent.isComposing)
            return;

        const command = domEvent.ctrlKey || domEvent.metaKey;

        // By the key's position, not its letter: under another layout Ctrl+F arrives as the letter that layout puts there.
        if (command && !domEvent.altKey && domEvent.code === "KeyF" && this.searchEnabled) {
            domEvent.preventDefault();
            this.open(false);
        }
        else if (command && !domEvent.altKey && domEvent.code === "KeyH" && this.searchEnabled) {
            domEvent.preventDefault();
            this.open(true);
        }
        else if (command && !domEvent.altKey && domEvent.code === "KeyS") {
            domEvent.preventDefault();
            this.save();
        }
        else if (domEvent.key === "Escape" && !this.panel.hidden) {
            domEvent.preventDefault();
            this.close();
        }
        else if (domEvent.code === "F3" && !this.panel.hidden) {
            domEvent.preventDefault();
            this.step(domEvent.shiftKey ? -1 : 1);
        }
    }

    private findFieldKey(domEvent: KeyboardEvent): void {
        if (domEvent.key === "Enter" && !domEvent.isComposing) {
            domEvent.preventDefault();
            this.step(domEvent.shiftKey ? -1 : 1);
        }
    }

    private replaceFieldKey(domEvent: KeyboardEvent): void {
        if (domEvent.key === "Enter" && !domEvent.isComposing) {
            domEvent.preventDefault();

            if (domEvent.ctrlKey || domEvent.metaKey)
                this.replaceEvery();
            else
                this.replaceOne();
        }
    }

    /** Ctrl+S: the value goes to the server now, ahead of any debounce or blur, and then the field's `save` event is raised. */
    private save(): void {
        if (this.textarea.readOnly)
            return;

        this.textarea.dispatchEvent(new Event("change", { bubbles: true }));
        this.textarea.dispatchEvent(new Event("save", { bubbles: true }));
    }

    // --- editing ----------------------------------------------------------------------------------------------------------------

    /** Types text over the selection the way the keyboard would, so it lands on the undo stack and raises `input`. */
    private insertText(text: string): void {
        this.textarea.focus({ preventScroll: true });

        if (!document.execCommand("insertText", false, text)) {
            const start = this.textarea.selectionStart;
            const end = this.textarea.selectionEnd;

            this.textarea.setRangeText(text, start, end, "end");
            this.textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }

    private tab(outdent: boolean): void {
        const edit = applyTab(this.textarea.value, this.textarea.selectionStart, this.textarea.selectionEnd, this.tabSize, outdent);

        if (edit === null)
            return;

        this.textarea.setSelectionRange(edit.from, edit.to);
        this.insertText(edit.text);
        this.textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    }

    private newLine(): void {
        const value = this.textarea.value;
        const start = this.textarea.selectionStart;
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const line = value.slice(lineStart, start);
        let indent = /^[ \t]*/.exec(line)?.[0] ?? "";
        const before = line.trimEnd();
        const last = before.charAt(before.length - 1);

        if (last === "{" || last === "[" || last === "(" || (last === ":" && this.language === "python"))
            indent += " ".repeat(this.tabSize);

        this.insertText("\n" + indent);
    }

    // --- find and replace -------------------------------------------------------------------------------------------------------

    private get options(): SearchOptions {
        return {
            matchCase: this.pressed("data-ui-code-match-case"),
            wholeWord: this.pressed("data-ui-code-whole-word"),
            regex: this.pressed("data-ui-code-regex")
        };
    }

    private pressed(attribute: string): boolean {
        return this.button(attribute)?.getAttribute("aria-pressed") === "true";
    }

    private toggleOption(toggle: HTMLButtonElement): void {
        toggle.setAttribute("aria-pressed", toggle.getAttribute("aria-pressed") === "true" ? "false" : "true");
        this.search(false, true);
    }

    private open(replace: boolean): void {
        const selected = this.textarea.value.slice(this.textarea.selectionStart, this.textarea.selectionEnd);

        this.panel.hidden = false;

        if (selected.length > 0 && !selected.includes("\n"))
            this.findField.value = selected;

        this.search(false, true);

        const field = replace && !this.textarea.readOnly ? this.replaceField : this.findField;

        field.focus({ preventScroll: true });
        field.select();
    }

    private close(): void {
        this.panel.hidden = true;
        this.matches = [];
        this.current = -1;
        this.renderLines(this.highlighter.setMatches([], -1));
        this.root.classList.remove(InvalidPatternClass);
        this.textarea.focus({ preventScroll: true });
    }

    /** Re-reads the matches; `keepCurrent` holds on to the match the reader is on when it survived, `reveal` scrolls to it. */
    private search(keepCurrent: boolean, reveal: boolean): void {
        const options = this.options;
        const previous = this.current >= 0 ? this.matches[this.current] : undefined;

        this.query = compileQuery(this.findField.value, options);
        this.matches = findMatches(this.textarea.value, this.query);
        this.root.classList.toggle(InvalidPatternClass, this.query !== null && "invalid" in this.query);

        const kept = keepCurrent && previous !== undefined ? this.matches.findIndex(match => match.from === previous.from) : -1;
        const current = kept >= 0 ? kept : nextMatchFrom(this.matches, this.textarea.selectionStart);

        this.goTo(current, reveal);
    }

    private step(direction: 1 | -1): void {
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

    private goTo(index: number, reveal: boolean): void {
        this.current = index;
        this.renderLines(this.highlighter.setMatches(this.matches, index));
        this.writeCount();

        if (index < 0)
            return;

        const match = this.matches[index];

        this.textarea.setSelectionRange(match.from, match.to);

        if (reveal)
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
        const line = this.highlight.children[this.highlighter.lineAt(match.from)] as HTMLElement | undefined;

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

    private replaceOne(): void {
        if (this.textarea.readOnly)
            return;

        if (this.current < 0) {
            this.search(false, true);
            return;
        }

        const match = this.matches[this.current];
        const replacement = expandReplacement(this.textarea.value, match, this.query, this.replaceField.value, this.options.regex);

        this.textarea.setSelectionRange(match.from, match.to);
        this.insertText(replacement);
        // The `input` this raised re-read the matches; the one at this index is now the next one on.
        this.replaceField.focus({ preventScroll: true });
        this.goTo(this.matches.length === 0 ? -1 : Math.min(this.current < 0 ? 0 : this.current, this.matches.length - 1), true);
    }

    private replaceEvery(): void {
        if (this.textarea.readOnly || this.matches.length === 0)
            return;

        const value = this.textarea.value;
        const replaced = replaceAll(value, this.query, this.replaceField.value, this.options.regex);

        if (replaced === value)
            return;

        this.textarea.setSelectionRange(0, value.length);
        this.insertText(replaced);
        this.replaceField.focus({ preventScroll: true });
    }
}
