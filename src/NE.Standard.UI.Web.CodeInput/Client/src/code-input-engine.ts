// Runs every code field on the page: builds one CodeEditor per field and keeps it in step with a late language registration, a
// server-pushed value, and the caret's place.

import type { PluginEngineContext } from "ne-standard-ui";
import { CodeEditor } from "./code-editor.ts";
import { CompletionsAttribute, CrLf, DetectedLineEndingAttribute, FormatBarAttribute, LanguageAttribute, LineEndingAttribute, MultiCaretAttribute, RootClass, SearchAttribute, StatusBarAttribute } from "./code-editor-dom.ts";
import { languages } from "./languages/index.ts";

const RootSelector = `.${RootClass}`;
const MarkdownLanguage = "markdown";

// The settings a push from the server redraws a picker's word for.
const PickerPropertyNames = new Set(["TabSize", "Encoding", "LineEnding", "Language"]);

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
    const carrier = root.querySelector<HTMLInputElement>(`input[${LineEndingAttribute}]`);
    const chosen = carrier?.value ?? "";

    return chosen.length > 0 ? chosen : root.getAttribute(DetectedLineEndingAttribute) ?? "lf";
}

export class CodeInputEngine {
    private readonly context: PluginEngineContext;
    private readonly editors = new WeakMap<HTMLElement, CodeEditor>();
    // Every live editor, for a language registered after its field was drawn; one whose root left the page is disposed.
    private readonly live = new Set<CodeEditor>();
    private readonly cleanups: (() => void)[] = [];

    public constructor(context: PluginEngineContext) {
        this.context = context;

        this.attach(context.root.querySelectorAll<HTMLElement>(RootSelector));
        // The language, and the switches that take away what an open panel, the extra carets, an open list or a bar stand on.
        const attributeFilter = [LanguageAttribute, SearchAttribute, MultiCaretAttribute, CompletionsAttribute, StatusBarAttribute, FormatBarAttribute];

        const attachObserver = context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter, removed: () => this.prune() }, roots => this.attach(roots));

        // Read-only follows the root's own mark, however it moved — the value handler below skips an interaction on this page.
        const readOnlyObserver = context.observeComponents(context.root, RootSelector, { attributeFilter: ["class"], relevant: mutation => mutation.target instanceof Element && mutation.target.matches(RootSelector) }, roots => {
            for (const root of roots)
                this.editors.get(root)?.readOnlyChanged();
        });

        // Disabled or loading, a field takes no edits and closes any open popup bar or list of its own.
        const inertObserver = context.observeComponents(context.root, RootSelector, { attributeFilter: ["aria-disabled", "aria-busy"] }, roots => {
            for (const root of roots)
                this.editors.get(root)?.inertChanged();
        });

        // The status bar lists what the server declared; a tokenizer registered after a field was drawn still redraws its text, and
        // a Markdown field's too, whose fenced blocks read in whatever language their info string names.
        const stopLanguages = languages.onRegistered(id => {
            for (const editor of this.live) {
                if (editor.connected && (editor.languageId === id || editor.languageId === MarkdownLanguage))
                    editor.reload();
            }
        });

        // The find panel's count is the one word an editor writes unmarked.
        const stopStrings = context.strings.onChange(() => {
            for (const editor of this.live) {
                if (editor.connected)
                    editor.wordsChanged();
            }
        });

        // A server-pushed value lands on the textarea with no event, unlike typing which already came through `input`; the pushed
        // text also carries the line break the textarea forgets.
        const stopPatch = context.propertyPatchEngine.addValueChangeHandler(change => {
            if (change.local)
                return;

            for (const component of change.components) {
                const editor = this.editors.get(component as HTMLElement);

                if (change.propertyName === "Value")
                    editor?.refresh(change.value);
                else if (PickerPropertyNames.has(change.propertyName))
                    editor?.syncPickers();
            }
        });

        // The caret's place and the carets beside it: the selection is the document's, so one listener serves every editor.
        const onSelectionChange = (): void => {
            const active = document.activeElement;
            const root = active instanceof HTMLTextAreaElement ? active.closest<HTMLElement>(RootSelector) : null;

            if (root !== null)
                this.editors.get(root)?.selectionChanged();
        };

        document.addEventListener("selectionchange", onSelectionChange);
        this.cleanups.push(
            () => attachObserver?.disconnect(),
            () => readOnlyObserver?.disconnect(),
            () => inertObserver?.disconnect(),
            stopLanguages,
            () => {
                if (typeof stopStrings === "function")
                    stopStrings();
            },
            () => {
                if (typeof stopPatch === "function")
                    stopPatch();
            },
            () => document.removeEventListener("selectionchange", onSelectionChange)
        );
    }

    /** Disposes every observer, listener and live editor when the engine is disposed. */
    public dispose(): void {
        for (const cleanup of this.cleanups)
            cleanup();

        this.cleanups.length = 0;

        for (const editor of [...this.live]) {
            this.live.delete(editor);
            editor.dispose();
        }
    }

    /** An editor whose root left the page is disposed: its size watch would otherwise keep the whole editor alive. */
    private prune(): void {
        for (const editor of this.live) {
            if (!editor.connected) {
                this.live.delete(editor);
                editor.dispose();
            }
        }
    }

    private attach(roots: Iterable<HTMLElement>): void {
        this.prune();

        for (const root of roots) {
            const editor = this.editors.get(root);

            if (editor === undefined) {
                const created = CodeEditor.create(root, this.context);

                if (created !== null) {
                    this.editors.set(root, created);
                    this.live.add(created);
                }
            }
            else {
                // A root back on the page after it was pruned keeps its editor, whose listeners stand on its elements: a second one
                // would answer every key twice.
                if (!this.live.has(editor)) {
                    editor.revive();
                    this.live.add(editor);
                }

                editor.settingsChanged();
            }
        }
    }
}
