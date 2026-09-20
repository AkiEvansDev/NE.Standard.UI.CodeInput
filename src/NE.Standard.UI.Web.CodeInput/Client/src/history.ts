// The editor's own undo and redo, since the textarea's stack can't hold a multi-caret edit, and writing the value to make one
// clears it. Every change is recorded here with the carets before and after it.

import type { Edit, SelectionSet } from "./selections.ts";
import { applyEdits, selectionsEqual } from "./selections.ts";

/** Typing and deleting run on into the step before; anything else is a step of its own. */
export type EditKind = "typing" | "deleting" | "other";

export type Change = {
    readonly edits: readonly Edit[];
    /** The text each edit replaced, so the change can be taken back. */
    readonly removed: readonly string[];
    readonly before: SelectionSet;
    readonly after: SelectionSet;
};

/** A text to put in place, and the carets to put back with it. */
export type Restore = {
    readonly text: string;
    readonly selections: SelectionSet;
};

type Step = {
    readonly kind: EditKind;
    readonly changes: Change[];
};

// Enough for a long session; each step holds only the text its edits touched, so the cap guards against a runaway, not a budget.
const StepLimit = 5000;

export class EditHistory {
    private readonly done: Step[] = [];
    private readonly undone: Step[] = [];

    /** Whether the last step may take the next change into it; an undo, a redo or a clear closes it. */
    private open = false;

    public record(change: Change, kind: EditKind): void {
        this.undone.length = 0;

        const last = this.done.at(-1);

        if (this.open && last !== undefined && continues(last, change, kind))
            last.changes.push(change);
        else {
            this.done.push({ kind, changes: [change] });

            if (this.done.length > StepLimit)
                this.done.shift();
        }

        this.open = true;
    }

    /** Takes the last step back out of `text`, or null when there is none. */
    public undo(text: string): Restore | null {
        const step = this.done.pop();

        if (step === undefined)
            return null;

        let value = text;

        for (let i = step.changes.length - 1; i >= 0; i--)
            value = applyEdits(value, inverse(step.changes[i]));

        this.undone.push(step);
        this.open = false;

        return { text: value, selections: step.changes[0].before };
    }

    /** Makes the last undone step again over `text`, or null when there is none. */
    public redo(text: string): Restore | null {
        const step = this.undone.pop();

        if (step === undefined)
            return null;

        let value = text;

        for (const change of step.changes)
            value = applyEdits(value, change.edits);

        this.done.push(step);
        this.open = false;

        return { text: value, selections: step.changes[step.changes.length - 1].after };
    }

    public clear(): void {
        this.done.length = 0;
        this.undone.length = 0;
        this.open = false;
    }
}

/**
 * Whether a change continues the previous step: same kind (typing/deleting), from the carets that step left. A word after a space
 * starts its own step, so undo takes back a word at a time.
 */
function continues(step: Step, change: Change, kind: EditKind): boolean {
    const previous = step.changes[step.changes.length - 1];

    if (kind === "other" || kind !== step.kind || !selectionsEqual(previous.after, change.before))
        return false;

    if (kind !== "typing")
        return true;

    const typed = previous.edits.at(-1)?.text ?? "";
    const next = change.edits[0]?.text ?? "";

    return !(/\s$/.test(typed) && /^\S/.test(next));
}

/** The edits that take a change back, in the coordinates of the text the change produced. */
function inverse(change: Change): Edit[] {
    const edits: Edit[] = [];
    let shift = 0;

    for (let i = 0; i < change.edits.length; i++) {
        const edit = change.edits[i];
        const from = edit.from + shift;

        edits.push({ from, to: from + edit.text.length, text: change.removed[i] });
        shift += edit.text.length - (edit.to - edit.from);
    }

    return edits;
}

/** The one edit that turns `previous` into `next`. Where the changed text repeats around it, `caretAfter` decides where the edit ends. */
export function diffText(previous: string, next: string, caretAfter: number): Edit {
    const shortest = Math.min(previous.length, next.length);
    let suffix = 0;

    while (suffix < shortest && previous.charCodeAt(previous.length - 1 - suffix) === next.charCodeAt(next.length - 1 - suffix))
        suffix++;

    suffix = Math.min(suffix, Math.max(0, next.length - caretAfter));

    let prefix = 0;
    const prefixLimit = shortest - suffix;

    while (prefix < prefixLimit && previous.charCodeAt(prefix) === next.charCodeAt(prefix))
        prefix++;

    return { from: prefix, to: previous.length - suffix, text: next.slice(prefix, next.length - suffix) };
}
