// Pictures pasted or dropped into a Markdown text: each stands under a placeholder while it goes up through the framework's own
// upload, the field's `picture-upload` event hands its selection to the application's command, and the command's answer — an
// address, by `InsertPictureEffect` — takes the placeholder's place. The field keeps no picture and never writes one into the text.

import type { EventCompletionContext, PluginEngineContext, ValidationWords } from "ne-standard-ui";
import type { CodeEditorCarets } from "./code-editor-carets.ts";
import { CoreWords, PictureAcceptAttribute, PictureOverClass, PicturesAttribute, PictureUploadEvent, PictureUploadingWord } from "./code-editor-dom.ts";
import type { CodeEditorSurface } from "./code-editor-surface.ts";
import type { Change } from "./history.ts";
import { carriesPicture, isDataAddress, pictureFiles, pictureText, placeholderText } from "./markdown-pictures.ts";
import { rangeEnd, rangeStart, singleSelection } from "./selections.ts";

const MarkdownLanguage = "markdown";

/** The `picture-upload` event's detail: its keys, the selection and the file's name, in the order `CodeInputArguments` reads them. */
export type PictureUploadDetail = {
    readonly keys: readonly string[];
};

type PicturesContext = Pick<PluginEngineContext, "uploads" | "validation" | "strings" | "states">;

type PicturesParts = {
    readonly root: HTMLElement;
    readonly textarea: HTMLTextAreaElement;
};

type PendingPicture = {
    readonly owner: CodeEditorPictures;
    readonly fileName: string;
    /** Unique in the text while it uploads, so it is found wherever the reader's edits have moved it. */
    readonly placeholder: string;
    /** The paste's own change, which the address or the removal joins in the history. */
    readonly anchor: Change;
    /** The line break between two placeholders of one paste, taken out with this one: after it, or before the last. */
    readonly breakAfter: boolean;
    readonly breakBefore: boolean;
};

/** The pictures uploaded and waiting for their command's answer, by selection: page-wide, as the answer's effect is. */
const awaiting = new Map<string, PendingPicture>();

/** The answer's `InsertPictureEffect`: the picture's address in its placeholder's place. */
export function insertPicture(selection: string, address: string): void {
    const pending = awaiting.get(selection);

    if (pending === undefined)
        return;

    awaiting.delete(selection);

    // The server refuses one already; a hand-made effect is refused here too, since the text would carry the picture itself.
    if (isDataAddress(address))
        pending.owner.remove(pending);
    else
        pending.owner.place(pending, address);
}

/** The command has answered, or never ran: a placeholder its answer did not fill is taken out, and a failure says why. */
export function pictureUploadCompleted(selection: string, context: Pick<EventCompletionContext, "dispatched" | "success" | "error">): void {
    const pending = awaiting.get(selection);

    if (pending === undefined)
        return;

    awaiting.delete(selection);

    if (context.success)
        pending.owner.remove(pending);
    else
        pending.owner.fail(pending, context.dispatched && context.error != null && context.error.length > 0 ? { text: context.error } : { key: CoreWords.fileFailed });
}

export class CodeEditorPictures {
    private readonly root: HTMLElement;
    private readonly textarea: HTMLTextAreaElement;
    private readonly context: PicturesContext;
    private readonly surface: CodeEditorSurface;
    private readonly carets: CodeEditorCarets;
    private readonly getLanguage: () => string;

    public constructor(parts: PicturesParts, context: PicturesContext, surface: CodeEditorSurface, carets: CodeEditorCarets, getLanguage: () => string) {
        this.root = parts.root;
        this.textarea = parts.textarea;
        this.context = context;
        this.surface = surface;
        this.carets = carets;
        this.getLanguage = getLanguage;
    }

    /** Only a Markdown text with a command to answer takes a picture, and only while the reader may edit it. */
    private get takes(): boolean {
        return this.root.hasAttribute(PicturesAttribute) && this.getLanguage() === MarkdownLanguage && !this.textarea.readOnly && !this.context.states.isInert(this.textarea);
    }

    /** The textarea's `paste`: true when it carried pictures the field took, in place of the selection; words are left to the text. */
    public paste(domEvent: ClipboardEvent): boolean {
        const transfer = domEvent.clipboardData;

        // A copy out of a document carries a picture of its words beside them: the words are what was meant, as the core's paste reads it.
        if (transfer === null || transfer.files.length === 0 || transfer.getData("text/plain").trim().length > 0 || !this.takes)
            return false;

        const selection = this.carets.read();
        const range = selection.ranges[selection.primary];

        if (!this.take([...transfer.files], rangeStart(range), rangeEnd(range)))
            return false;

        domEvent.preventDefault();
        return true;
    }

    /** A drag over the field: one carrying a picture is taken, and the field says so. */
    public dragOver(domEvent: DragEvent): void {
        if (!carriesPicture(domEvent.dataTransfer) || !this.takes)
            return;

        domEvent.preventDefault();
        domEvent.dataTransfer!.dropEffect = "copy";
        this.root.classList.add(PictureOverClass);
    }

    /** A leave into anything but the field itself ends the mark. */
    public dragLeave(domEvent: DragEvent): void {
        if (!(domEvent.relatedTarget instanceof Node) || !this.root.contains(domEvent.relatedTarget))
            this.root.classList.remove(PictureOverClass);
    }

    /** A drop: the pictures go where it landed in the text, and the keyboard follows them there. */
    public drop(domEvent: DragEvent): void {
        this.root.classList.remove(PictureOverClass);

        if (!carriesPicture(domEvent.dataTransfer) || !this.takes)
            return;

        // Taken from the browser even when `Accept` refuses every file, or the browser would open it over the page.
        domEvent.preventDefault();

        const at = this.offsetAt(domEvent.clientX, domEvent.clientY);

        if (this.take([...domEvent.dataTransfer!.files], at, at))
            this.textarea.focus({ preventScroll: true });
    }

    /** The text offset under a point, as the browser places a caret there; where the point is off the text, the caret's own place. */
    private offsetAt(x: number, y: number): number {
        const position = typeof document.caretPositionFromPoint === "function" ? document.caretPositionFromPoint(x, y) : null;

        return position?.offsetNode === this.textarea ? position.offset : this.textarea.selectionEnd;
    }

    /**
     * Puts a placeholder for every picture `Accept` and `MaxFileSize` let through — a line each — over the span, as one step of the
     * history, and sends each picture up on its own, so every one lands at its own placeholder whichever answers first.
     */
    private take(files: readonly File[], from: number, to: number): boolean {
        const pictures = pictureFiles(files, this.root.getAttribute(PictureAcceptAttribute) ?? "", this.context.uploads.accepts);

        if (pictures.length === 0)
            return false;

        const within = this.context.uploads.takeWithinSizeLimit(this.root, pictures, pictures.length > 1);

        // A paste that refused nothing takes off what an earlier one said, a failure as well as a refusal.
        if (within.length === pictures.length)
            this.context.validation.mark(this.root, null);

        if (within.length === 0)
            return true;

        const text = this.textarea.value;
        const made: string[] = [];

        for (const file of within) {
            made.push(placeholderText(file.name, name => this.context.strings.format(PictureUploadingWord, { name }), candidate => made.includes(candidate) || text.includes(candidate)));
        }

        const inserted = made.join("\n");
        const anchor = this.surface.apply([{ from, to, text: inserted }], singleSelection(from + inserted.length), "other");

        if (anchor === null)
            return true;

        const last = within.length - 1;

        for (let index = 0; index <= last; index++) {
            const pending: PendingPicture = { owner: this, fileName: within[index].name, placeholder: made[index], anchor, breakAfter: index < last, breakBefore: index > 0 && index === last };

            void this.upload(within[index], pending);
        }

        return true;
    }

    private async upload(file: File, pending: PendingPicture): Promise<void> {
        let selection: string;

        try {
            selection = (await this.context.uploads.uploadAsync([file])).selectionId;
        }
        catch {
            this.fail(pending, { key: CoreWords.fileFailed });
            return;
        }

        if (!this.root.isConnected)
            return;

        awaiting.set(selection, pending);

        const detail: PictureUploadDetail = { keys: [selection, file.name] };

        this.textarea.dispatchEvent(new CustomEvent(PictureUploadEvent, { bubbles: true, detail }));
    }

    /** The picture in its placeholder's place; a placeholder the reader took out meanwhile is not put back. */
    public place(pending: PendingPicture, address: string): void {
        const at = this.textarea.value.indexOf(pending.placeholder);

        if (at < 0)
            return;

        this.surface.applyFor(pending.anchor, { from: at, to: at + pending.placeholder.length, text: pictureText(pending.fileName, address) });
        this.settle();
    }

    /** The placeholder taken out, with the line break its paste put beside it. */
    public remove(pending: PendingPicture): void {
        const text = this.textarea.value;
        let from = text.indexOf(pending.placeholder);

        if (from < 0)
            return;

        let to = from + pending.placeholder.length;

        if (pending.breakAfter && text[to] === "\n")
            to++;
        else if (pending.breakBefore && from > 0 && text[from - 1] === "\n")
            from--;

        this.surface.applyFor(pending.anchor, { from, to, text: "" });
        this.settle();
    }

    /** The placeholder taken out, and why on the field's validation line. */
    public fail(pending: PendingPicture, words: ValidationWords): void {
        this.remove(pending);

        if (this.root.isConnected)
            this.context.validation.mark(this.root, "error", words);
    }

    /** A field the reader has left commits on its own: its blur was before the answer, and nothing else would send the change. */
    private settle(): void {
        if (document.activeElement !== this.textarea)
            this.textarea.dispatchEvent(new Event("change", { bubbles: true }));
    }
}
