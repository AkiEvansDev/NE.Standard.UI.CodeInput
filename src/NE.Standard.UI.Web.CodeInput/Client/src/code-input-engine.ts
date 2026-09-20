// Runs every code field on the page: builds one CodeEditor per field and keeps it in step with a late language registration, a
// server-pushed value, and the caret's place.

import type { PluginEngineContext } from "ne-standard-ui";
import { CodeEditor } from "./code-editor.ts";
import { CrLf, DetectedLineEndingAttribute, LanguageAttribute } from "./code-editor-dom.ts";
import { languages } from "./languages/index.ts";

const RootSelector = ".ui-code-input";

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
    const carrier = root.querySelector<HTMLInputElement>("input[data-ui-code-line-ending]");
    const chosen = carrier?.value ?? "";

    return chosen.length > 0 ? chosen : root.getAttribute(DetectedLineEndingAttribute) ?? "lf";
}

export class CodeInputEngine {
    private readonly context: PluginEngineContext;
    private readonly editors = new WeakMap<HTMLElement, CodeEditor>();
    // Every live editor, for a language registered after its field was drawn; one whose root left the page is disposed.
    private readonly live = new Set<CodeEditor>();

    public constructor(context: PluginEngineContext) {
        this.context = context;

        this.attach(context.root.querySelectorAll<HTMLElement>(RootSelector));
        context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: [LanguageAttribute] }, roots => this.attach(roots));

        // A root that left the page takes its editor with it; a removal is a childList change above every selector.
        context.observeComponents(context.root, "*", { childList: true }, () => this.prune());

        // The status bar lists what the server declared; a tokenizer registered after a field was drawn still redraws its text.
        languages.onRegistered(id => {
            for (const editor of this.live) {
                if (editor.connected && editor.languageId === id)
                    editor.reload();
            }
        });

        // A server-pushed value lands on the textarea with no event, unlike typing which already came through `input`; the pushed
        // text also carries the line break the textarea forgets.
        context.propertyPatchEngine.addValueChangeHandler(change => {
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
        document.addEventListener("selectionchange", () => {
            const active = document.activeElement;
            const root = active instanceof HTMLTextAreaElement ? active.closest<HTMLElement>(RootSelector) : null;

            if (root !== null)
                this.editors.get(root)?.selectionChanged();
        });
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
            else
                editor.settingsChanged();
        }
    }
}
