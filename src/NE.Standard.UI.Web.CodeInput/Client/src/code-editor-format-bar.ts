// A Markdown field's format bar: the framework's strip of icons, standing over a selection a mouse or a pen just made, that wraps it
// in bold, italic, strikethrough or code marks, makes it a link, or makes its lines a list or — from a menu of the six levels — a
// heading, and takes each off again.
// The same edits answer Ctrl/⌘+B, I and K while the field has the keyboard, and Alt+F10 takes the keyboard to the bar. Every edit
// goes through the surface, so it is one undo step and commits as typing does.

import type { PluginEngineContext, PopupHandle, ShortcutWords } from "ne-standard-ui";
import type { CodeEditorCarets } from "./code-editor-carets.ts";
import type { CodeEditorSurface } from "./code-editor-surface.ts";
import { BoldWord, CoreGlyphs, CoreNames, FormatAnchorClass, FormatBarAttribute, FormatBarClass, FormatBarWord, FormatButtonClass, HeadingLevelWord, HeadingMenuClass, HeadingWord, InlineCodeWord, ItalicWord, LinkWord, ListWord, StrikethroughWord } from "./code-editor-dom.ts";
import type { EditAction, FormatAction, FormatResult } from "./markdown-format.ts";
import { FormatActions, formatEdits, headingChoices, headingEdits, headingLevel, isFormatted } from "./markdown-format.ts";
import { isCaret, rangeEnd, rangeStart } from "./selections.ts";

const MarkdownLanguage = "markdown";

// Between the bar and the line it stands over, as the action bar keeps from its row.
const BarGap = 6;

const Words: Readonly<Record<FormatAction, string>> = {
    bold: BoldWord,
    italic: ItalicWord,
    strikethrough: StrikethroughWord,
    code: InlineCodeWord,
    link: LinkWord,
    heading: HeadingWord,
    list: ListWord
};

// The chords that press a button while the field has the keyboard, matched as the framework's: by the key's place, Ctrl answering ⌘ on macOS.
const Chords: Readonly<Partial<Record<EditAction, string>>> = {
    bold: "Ctrl+B",
    italic: "Ctrl+I",
    link: "Ctrl+K"
};

/** What the bar answers to in a field, read as it is asked. */
export type FormatBarState = {
    /** The field's `FormatBar` switch, on its root. */
    readonly enabled: boolean;
    readonly markdown: boolean;
    /** Neither read-only nor turned off: the text takes an edit. */
    readonly editable: boolean;
    /** Whether the primary range selects any text. */
    readonly selected: boolean;
};

/** Whether the field formats at all: its switch on, in Markdown, taking edits. */
export function formats(state: FormatBarState): boolean {
    return state.enabled && state.markdown && state.editable;
}

/**
 * Whether a press that just ended shows the bar: a mouse's or a pen's, over words it selected. Never a finger's — the phone shows its
 * own menu over a selection, and the two would stand over each other.
 */
export function showsAfterPress(state: FormatBarState, pointerType: string | null): boolean {
    return (pointerType === "mouse" || pointerType === "pen") && state.selected && formats(state);
}

/** Whether the bar stays as the selection moves: words still selected, in a field that still formats. */
export function staysWith(state: FormatBarState): boolean {
    return state.selected && formats(state);
}

/** The action a key presses, or null: Ctrl (⌘ on macOS) with B, I or K, and nothing else held. */
export function formatKey(domEvent: KeyboardEvent, shortcuts: Pick<ShortcutWords, "matches">): EditAction | null {
    for (const action of FormatActions) {
        if (action !== "heading" && shortcuts.matches(domEvent, Chords[action] ?? ""))
            return action;
    }

    return null;
}

/** Alt+F10, the key many editors take to their toolbar. */
export function isBarKey(domEvent: KeyboardEvent, shortcuts: Pick<ShortcutWords, "matches">): boolean {
    return shortcuts.matches(domEvent, "Alt+F10");
}

export type FormatBarParts = {
    readonly root: HTMLElement;
    readonly textarea: HTMLTextAreaElement;
    readonly scroller: HTMLElement;
    readonly content: HTMLElement;
};

export class CodeEditorFormatBar {
    private readonly root: HTMLElement;
    private readonly textarea: HTMLTextAreaElement;
    private readonly scroller: HTMLElement;
    private readonly context: PluginEngineContext;
    private readonly surface: CodeEditorSurface;
    private readonly carets: CodeEditorCarets;
    private readonly getLanguage: () => string;

    /** What the bar is placed against: a box over the selection, from its first line's top to its last line's bottom. */
    private readonly anchor: HTMLElement;

    /** Drawn on each showing, with the words of the moment, and gone at once as the action bar is. */
    private bar: HTMLElement | null = null;
    private handle: PopupHandle | null = null;

    /** The heading button's menu of levels while it is open: inside the bar, so a press in it is no press outside the bar. */
    private levels: HTMLElement | null = null;
    private levelsHandle: PopupHandle | null = null;

    /** The pointer pressing in the text until it lifts; the press may become a selection. */
    private pressing: string | null = null;

    /** The bar's own edit is under way: the `input` it raises is no typing. */
    private applying = false;

    public constructor(parts: FormatBarParts, context: PluginEngineContext, surface: CodeEditorSurface, carets: CodeEditorCarets, getLanguage: () => string) {
        this.root = parts.root;
        this.textarea = parts.textarea;
        this.scroller = parts.scroller;
        this.context = context;
        this.surface = surface;
        this.carets = carets;
        this.getLanguage = getLanguage;

        this.anchor = document.createElement("span");
        this.anchor.className = FormatAnchorClass;
        this.anchor.setAttribute("aria-hidden", "true");
        parts.content.appendChild(this.anchor);
    }

    private get state(): FormatBarState {
        const set = this.carets.read();
        const primary = set.ranges[set.primary];

        return {
            enabled: this.root.hasAttribute(FormatBarAttribute),
            markdown: this.getLanguage() === MarkdownLanguage,
            editable: !this.textarea.readOnly && !this.context.states.isInert(this.textarea),
            selected: primary !== undefined && !isCaret(primary)
        };
    }

    /** The textarea's `pointerdown`: a press with the main button may end in a selection, wherever the pointer lifts. */
    public pointerDown(domEvent: PointerEvent): void {
        if (domEvent.button !== 0)
            return;

        this.pressing = domEvent.pointerType;
        window.addEventListener("pointerup", () => this.pressEnded(), { capture: true, once: true });
    }

    /** A press ended; the selection is read a turn later, once the browser has settled a double click's word. */
    private pressEnded(): void {
        const pointerType = this.pressing;

        this.pressing = null;
        setTimeout(() => {
            if (this.textarea.isConnected && document.activeElement === this.textarea && showsAfterPress(this.state, pointerType))
                this.open(false);
        }, 0);
    }

    /** The textarea's `keydown`: Ctrl/⌘+B, I and K at every caret, and Alt+F10 to the bar; nothing while the field does not format. */
    public key(domEvent: KeyboardEvent): void {
        if (domEvent.defaultPrevented || this.context.shortcuts.isComposing(domEvent))
            return;

        // The bar is the field's own: its Escape takes the bar away, ahead of the field's leave.
        if (domEvent.key === "Escape" && this.bar !== null && this.context.shortcuts.isPlainKey(domEvent)) {
            domEvent.preventDefault();
            this.close();
            return;
        }

        // The key first: the field's state is read only for one of the bar's own, not on every keystroke.
        const toBar = isBarKey(domEvent, this.context.shortcuts);
        const action = toBar ? null : formatKey(domEvent, this.context.shortcuts);

        if ((!toBar && action === null) || !formats(this.state))
            return;

        domEvent.preventDefault();

        if (action === null)
            this.open(true);
        else
            this.apply(action);
    }

    /** The textarea's `input`: typing, a paste, an undo — anything but the bar's own edit — takes the bar away. */
    public textChanged(): void {
        if (!this.applying)
            this.close();
    }

    /** The selection moved: the bar follows words still selected, and goes with the last of them. */
    public selectionChanged(): void {
        if (this.bar !== null)
            this.follow();
    }

    /** The field's switches or language may have changed, or it turned read-only. */
    public settingsChanged(): void {
        if (this.bar !== null && !formats(this.state))
            this.close();
    }

    /** The field scrolled: the framework moves the bar with the selection, which takes it away once its first line leaves the view. */
    public scrolled(): void {
        if (this.bar === null)
            return;

        const top = this.anchor.getBoundingClientRect().top;
        const view = this.scroller.getBoundingClientRect();

        if (top < view.top - 1 || top >= view.top + this.scroller.clientHeight)
            this.close();
    }

    /** The page's words changed: an open bar says them again. */
    public wordsChanged(): void {
        if (this.bar !== null)
            this.writeWords(this.bar);
    }

    private follow(): void {
        if (!staysWith(this.state)) {
            this.close();
            return;
        }

        this.place();
        this.handle?.reposition();
        this.markPressed();
    }

    /** Shows the bar over the selection, or the caret, and with `focus` puts the keyboard on its stop. */
    private open(focus: boolean): void {
        this.place();

        if (this.bar === null) {
            const bar = this.draw();

            // The framework places and dismisses a popup but never puts it on the page: it is fixed, so the field's root will do.
            this.root.append(bar);
            this.bar = bar;
            // The text owns it, whose read-only or disabled state the framework closes it on; the field's root owns the completion list.
            // Its side is chosen inside the text's own box, so over the first line it stands under the selection, not over the title.
            this.handle = this.context.popups.open(this.anchor, bar, {
                placement: "top-start",
                gap: BarGap,
                boundary: this.scroller,
                owner: this.textarea,
                onDismiss: () => this.dismissed()
            });
        }
        else
            this.handle?.reposition();

        this.markPressed();

        // Said keyboard's outright: after a key with a modifier, as Alt+F10 is, the browser marks no focus a script gives.
        if (focus)
            this.buttons().find(button => button.tabIndex === 0)?.focus({ focusVisible: true });
    }

    /** The anchor over the primary range: the bar stands above its first line, or under its last where there is no room above. */
    private place(): void {
        const set = this.carets.read();
        const range = set.ranges[set.primary];

        if (range === undefined)
            return;

        const start = this.carets.contentCaretRect(rangeStart(range));
        const end = this.carets.contentCaretRect(rangeEnd(range)) ?? start;

        if (start === null || end === null)
            return;

        this.anchor.style.left = `${start.left}px`;
        this.anchor.style.top = `${start.top}px`;
        this.anchor.style.height = `${Math.max(0, end.bottom - start.top)}px`;
    }

    private draw(): HTMLElement {
        const names = this.context.names;
        const bar = document.createElement("div");

        bar.className = FormatBarClass;
        bar.setAttribute("role", "toolbar");
        // A press on the bar is never the field's.
        bar.setAttribute(names.eventBoundary, "");
        // The press keeps the focus, and with it the selection, in the text.
        bar.addEventListener("mousedown", domEvent => domEvent.preventDefault());
        bar.addEventListener("keydown", domEvent => this.barKey(domEvent));

        const buttons = FormatActions.map(action => {
            const button = document.createElement("button");
            const glyph = document.createElement("span");

            button.type = "button";
            button.className = `${FormatButtonClass} ${names.buttonClass} ${CoreNames.ghostButtonClass} ${CoreNames.smallButtonClass}`;
            button.dataset.format = action;
            glyph.setAttribute("aria-hidden", "true");
            this.context.icons.apply(glyph, CoreGlyphs[action]);
            button.append(glyph);

            const key = action === "heading" ? undefined : Chords[action]?.slice("Ctrl+".length);

            if (action === "heading") {
                button.setAttribute("aria-haspopup", "menu");
                button.setAttribute("aria-expanded", "false");
            }

            // Control presses it on every platform, ⌘ too on macOS.
            if (key !== undefined)
                button.setAttribute("aria-keyshortcuts", `Control+${key}`);

            button.addEventListener("click", () => this.pressed(action, button));

            return button;
        });

        bar.append(...buttons);
        this.context.roving.applyTabIndex(buttons, buttons[0] ?? null);
        this.writeWords(bar);

        return bar;
    }

    /** The bar's name and each button's; no tooltip, which would be a popup over the bar's popup. */
    private writeWords(bar: HTMLElement): void {
        const { strings } = this.context;

        bar.setAttribute("aria-label", strings.text(FormatBarWord));

        for (const button of bar.querySelectorAll<HTMLElement>(`:scope > .${FormatButtonClass}`))
            button.setAttribute("aria-label", strings.text(Words[button.dataset.format as FormatAction]));
    }

    /** Each button says whether the selection already wears its format, which a press would take off. */
    private markPressed(): void {
        const text = this.textarea.value;
        const set = this.carets.read();

        for (const button of this.buttons())
            button.setAttribute("aria-pressed", isFormatted(text, set, button.dataset.format as FormatAction) ? "true" : "false");
    }

    /**
     * Along the bar with the arrows, Home and End, and down into the heading's levels; Escape is the framework's, which gives the
     * keyboard back to the text. The menu's own keys are its own.
     */
    private barKey(domEvent: KeyboardEvent): void {
        if (!this.context.shortcuts.isPlainKey(domEvent) || !(domEvent.target instanceof HTMLElement) || this.levels?.contains(domEvent.target) === true)
            return;

        if (domEvent.key === "ArrowDown" && domEvent.target.dataset.format === "heading") {
            domEvent.preventDefault();
            this.openLevels(domEvent.target, true);
            return;
        }

        const buttons = this.buttons();
        const next = this.context.roving.target({ key: domEvent.key, items: buttons, current: domEvent.target, axis: "horizontal" });

        if (next === null)
            return;

        domEvent.preventDefault();
        this.context.roving.applyTabIndex(buttons, next);
        next.focus();
    }

    /**
     * A button's press: the edit, the bar following the words it leaves selected; the keyboard stays on the button, as a toolbar's
     * does, and Escape gives it back to the text. An edit that leaves a caret alone (a link waiting for its address) takes the bar away.
     * The heading's press opens its levels, or closes them.
     */
    private pressed(action: FormatAction, button: HTMLElement): void {
        if (action === "heading") {
            if (this.levels === null)
                this.openLevels(button, document.activeElement === button);
            else
                this.closeLevels();

            return;
        }

        this.apply(action);

        if (this.bar !== null)
            this.follow();
    }

    /**
     * The six levels under the heading button, as the framework's menu entries with a check on the level every selected line is, opened
     * as the framework's lists of choices: the keyboard, where it pressed, goes to that entry; Escape or Tab closes it to the button.
     */
    private openLevels(button: HTMLElement, focus: boolean): void {
        if (this.bar === null || this.levels !== null)
            return;

        const { names, strings, dom } = this.context;
        const current = headingLevel(this.textarea.value, this.carets.read());
        const menu = document.createElement("div");
        const entries: HTMLElement[] = [];

        menu.className = HeadingMenuClass;
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-label", strings.text(HeadingWord));
        menu.addEventListener("keydown", domEvent => this.context.popups.listKey(domEvent, entries));
        // The pointer leads the keyboard only where the keyboard is in the list: one opened by a press leaves it in the text.
        menu.addEventListener("pointermove", domEvent => {
            const entry = domEvent.target instanceof Element ? domEvent.target.closest<HTMLElement>(`.${names.menuItemClass}`) : null;

            if (entry !== null && menu.contains(document.activeElement))
                this.context.popups.followPointer(entry, entries);
        });

        for (const { level, checked } of headingChoices(current)) {
            const entry = document.createElement("button");
            const title = document.createElement("span");

            entry.type = "button";
            entry.className = `${names.menuItemClass} ${names.buttonClass} ${CoreNames.ghostButtonClass}`;
            entry.setAttribute("role", "menuitemradio");
            entry.setAttribute(names.menuItemKind, "check");
            entry.setAttribute("aria-checked", checked ? "true" : "false");
            entry.classList.toggle(names.menuItemCheckedClass, checked);
            title.textContent = strings.format(HeadingLevelWord, { level });
            entry.append(title);
            entry.addEventListener("click", () => this.chooseLevel(level));
            entries.push(entry);
        }

        menu.append(...entries);
        this.bar.append(menu);
        this.levels = menu;
        button.setAttribute("aria-expanded", "true");
        button.setAttribute("aria-controls", dom.ensureId(menu, "code-heading-levels"));

        // The button owns it, so the bar's own popup stays; the framework closes it on a press outside, Escape, Tab or the keyboard
        // leaving.
        this.levelsHandle = this.context.popups.openList(button, menu, {
            placement: "bottom-start",
            // The framework's gap, kept off the bar rather than the button inside it, as a row's action bar keeps its menu.
            surface: this.bar,
            owner: button,
            entries,
            checked: entries[current - 1] ?? null,
            focus,
            onDismiss: () => this.levelsClosed()
        });
    }

    /** A level chosen: the selected lines become headings of it — or none, where it was the checked one — and the menu closes. */
    private chooseLevel(level: number): void {
        const result = headingEdits(this.textarea.value, this.carets.read(), level);

        // Closed first, so the keyboard in it goes back to the heading button before the bar follows the edit.
        this.closeLevels();
        this.applyResult(result);

        if (this.bar !== null)
            this.follow();
    }

    private closeLevels(): void {
        this.levelsHandle?.close();
        this.levelsClosed();
    }

    /** The menu's close, the framework's or the bar's own: it leaves the page, and the button says it is shut. */
    private levelsClosed(): void {
        this.levels?.remove();
        this.levels = null;
        this.levelsHandle = null;
        this.buttons().find(button => button.dataset.format === "heading")?.setAttribute("aria-expanded", "false");
    }

    /** Makes the action's edit at every range as one step of the history. */
    private apply(action: EditAction): void {
        this.applyResult(formatEdits(this.textarea.value, this.carets.read(), action));
    }

    private applyResult(result: FormatResult | null): void {
        if (result === null)
            return;

        this.applying = true;

        try {
            this.surface.apply(result.edits, result.after, "other");
        }
        finally {
            this.applying = false;
        }
    }

    private buttons(): HTMLElement[] {
        return this.bar === null ? [] : [...this.bar.querySelectorAll<HTMLElement>(`:scope > .${FormatButtonClass}`)];
    }

    /** Takes the bar away; the keyboard on it goes back to the text first. */
    public close(): void {
        if (this.bar === null)
            return;

        if (this.bar.contains(document.activeElement))
            this.textarea.focus();

        this.handle?.close();
        this.dismissed();
    }

    /** The framework's dismissal or this bar's own close: the bar leaves the page, its menu of levels with it. */
    private dismissed(): void {
        this.closeLevels();
        this.bar?.remove();
        this.bar = null;
        this.handle = null;
    }
}
