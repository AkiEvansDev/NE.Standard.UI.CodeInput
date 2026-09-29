// The status bar's four pickers — tab size, encoding, line ending, language. Each is the framework's own select, carried as a
// region, beside a hidden input holding the field's two-way setting, keeping the two in step.

import type { PropertyWriting, ValueReading } from "ne-standard-ui";
import { CrLf, DetectedLineEndingAttribute, LanguageAttribute, TabSizeVariable } from "./code-editor-dom.ts";

/** A status bar picker: the hidden input the setting travels on, and the framework's select that shows and offers it. */
export type StatusPicker = {
    readonly carrier: HTMLInputElement;
    readonly select: HTMLElement;
};

export type StatusBarParts = {
    readonly root: HTMLElement;
    readonly textarea: HTMLTextAreaElement;
    /** Null when the renderer drew no bar. */
    readonly bar: HTMLElement | null;
    readonly tabSize: StatusPicker | null;
    readonly encoding: StatusPicker | null;
    readonly lineEnding: StatusPicker | null;
    readonly language: StatusPicker | null;
};

export class CodeEditorStatusBar {
    private readonly root: HTMLElement;
    private readonly textarea: HTMLTextAreaElement;
    private readonly bar: HTMLElement | null;
    private readonly lineEnding: StatusPicker | null;
    private readonly pickers: StatusPicker[];
    private readonly values: ValueReading;
    private readonly properties: PropertyWriting;

    /**
     * Settings travel the framework's two-way binding on the carrier's `change`; this applies the tab stop, highlighting and line
     * ending immediately, before the server echoes back.
     */
    public constructor(parts: StatusBarParts, values: ValueReading, properties: PropertyWriting, onSettingChanged: () => void) {
        this.root = parts.root;
        this.textarea = parts.textarea;
        this.bar = parts.bar;
        this.lineEnding = parts.lineEnding;
        this.values = values;
        this.properties = properties;
        this.pickers = [parts.tabSize, parts.encoding, parts.lineEnding, parts.language].filter(picker => picker !== null);

        parts.tabSize?.carrier.addEventListener("change", () => {
            this.root.style.setProperty(TabSizeVariable, parts.tabSize?.carrier.value ?? "4");
            onSettingChanged();
        });

        // A new ending goes with the text now, not with the next keystroke: the reader puts it in, so the value is sent again.
        this.lineEnding?.carrier.addEventListener("change", () => {
            this.textarea.dispatchEvent(new Event("change", { bubbles: true }));
        });

        parts.language?.carrier.addEventListener("change", () => {
            this.root.setAttribute(LanguageAttribute, parts.language?.carrier.value ?? "");
            onSettingChanged();
        });

        for (const picker of this.pickers)
            picker.select.addEventListener("change", () => this.chosen(picker));

        this.showDetectedEnding(this.root.getAttribute(DetectedLineEndingAttribute) ?? "lf");
        this.syncPickers();
    }

    /** A choice in a select: the carrier takes it and raises its own `change`, which is what sends it and what the editor answers. */
    private chosen(picker: StatusPicker): void {
        const value = this.values.read(picker.select);
        const text = value === null || value === undefined ? "" : String(value);

        if (picker.carrier.value === text)
            return;

        picker.carrier.value = text;
        picker.carrier.dispatchEvent(new Event("change", { bubbles: true }));
    }

    /** The bar was switched off: the keyboard on one of its pickers goes to the text, as the find panel's does, not to the page. */
    public barHidden(): void {
        if (this.bar?.contains(document.activeElement) === true)
            this.textarea.focus({ preventScroll: true });
    }

    /** Every select shows its carrier's setting — after a push from the server, or a row the client built patched before this saw it. */
    public syncPickers(): void {
        for (const picker of this.pickers) {
            const value = picker.carrier.value;

            if (String(this.values.read(picker.select) ?? "") !== value)
                this.properties.set(picker.select, "Value", value.length === 0 ? null : value);
        }
    }

    /** The selects are read-only while the field is: a read-only field's settings are not the reader's to change. */
    public syncReadOnly(readOnly: boolean): void {
        for (const picker of this.pickers)
            this.properties.set(picker.select, "IsReadOnly", readOnly);
    }

    /** The pushed text's own line ending, shown as the line-ending select's placeholder while nothing is chosen. */
    public showDetectedEnding(ending: string): void {
        if (this.lineEnding !== null)
            this.properties.set(this.lineEnding.select, "Placeholder", ending === CrLf ? "CRLF" : "LF");
    }
}
