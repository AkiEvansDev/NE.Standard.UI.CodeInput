import assert from "node:assert/strict";
import test from "node:test";

import type { ValidationWords } from "ne-standard-ui";

import type { CodeEditorCarets } from "../src/code-editor-carets.ts";
import { CoreWords, PictureUploadEvent, PicturesAttribute } from "../src/code-editor-dom.ts";
import { CodeEditorPictures, insertPicture, pictureUploadCompleted } from "../src/code-editor-pictures.ts";
import type { PictureUploadDetail } from "../src/code-editor-pictures.ts";
import type { CodeEditorSurface } from "../src/code-editor-surface.ts";
import type { Change } from "../src/history.ts";
import { isDataAddress, pictureFiles, pictureText, placeholderText } from "../src/markdown-pictures.ts";
import type { Edit, SelectionSet } from "../src/selections.ts";
import { applyEdits, mapPosition, singleSelection } from "../src/selections.ts";

const png = (name: string, bytes = 4): File => new File([new Uint8Array(bytes)], name, { type: "image/png" });

/** The framework's rule as the plugin surface hands it out: a family, a type or an extension; empty takes any. */
const accepts = (accept: string, file: File): boolean => {
    const rules = accept.split(",").map(rule => rule.trim()).filter(rule => rule.length > 0);

    return rules.length === 0 || rules.some(rule => rule.startsWith(".") ? file.name.endsWith(rule) : rule.endsWith("/*") ? file.type.startsWith(rule.slice(0, -1)) : file.type === rule);
};

type Upload = { readonly file: File; resolve(selectionId: string): void; reject(): void };

/** One field: its text and carets, the uploads it started, the marks it made and the events it raised — no page around it. */
function setUp(options: { language?: string; maxSize?: number; accept?: string } = {}) {
    const uploads: Upload[] = [];
    const marks: (ValidationWords | null)[] = [];
    const events: PictureUploadDetail[] = [];
    const committed: string[] = [];
    let selections: SelectionSet = singleSelection(0);

    const textarea = {
        value: "",
        readOnly: false,
        selectionEnd: 0,
        focus: () => {},
        dispatchEvent: (event: Event) => {
            if (event.type === PictureUploadEvent)
                events.push((event as CustomEvent<PictureUploadDetail>).detail);
            else if (event.type === "change")
                committed.push(textarea.value);

            return true;
        }
    };
    const root = {
        isConnected: true,
        hasAttribute: (name: string) => name === PicturesAttribute,
        getAttribute: (name: string) => name === "data-ui-code-picture-accept" ? options.accept ?? null : null,
        classList: { add: () => {}, remove: () => {} }
    };
    // The surface's two edits, on the text alone; the history is EditHistory's own test.
    const surface = {
        apply: (edits: readonly Edit[], after: SelectionSet): Change => {
            const change: Change = { edits, removed: [], before: selections, after };

            textarea.value = applyEdits(textarea.value, edits);
            selections = after;
            return change;
        },
        applyFor: (_anchor: Change, edit: Edit): void => {
            textarea.value = applyEdits(textarea.value, [edit]);
            selections = { ranges: selections.ranges.map(range => ({ anchor: mapPosition(range.anchor, [edit]), head: mapPosition(range.head, [edit]) })), primary: selections.primary };
        }
    };
    const carets = { read: () => selections };
    const context = {
        uploads: {
            accepts,
            uploadAsync: (files: Iterable<File>) => new Promise<{ readonly selectionId: string }>((resolve, reject) => {
                uploads.push({ file: [...files][0], resolve: selectionId => resolve({ selectionId }), reject: () => reject(new Error("refused")) });
            }),
            takeWithinSizeLimit: (_root: HTMLElement, files: readonly File[]) => files.filter(file => options.maxSize === undefined || file.size <= options.maxSize)
        },
        validation: { mark: (_field: Element, _severity: unknown, words?: ValidationWords | null) => { marks.push(words ?? null); } },
        strings: { format: (_key: string, values: Readonly<Record<string, unknown>>) => `Uploading ${String(values.name)}…` },
        states: { isInert: () => false }
    };

    Object.defineProperty(globalThis, "document", { value: { activeElement: textarea }, configurable: true });

    const pictures = new CodeEditorPictures(
        { root: root as unknown as HTMLElement, textarea: textarea as unknown as HTMLTextAreaElement },
        context as unknown as ConstructorParameters<typeof CodeEditorPictures>[1],
        surface as unknown as CodeEditorSurface,
        carets as unknown as CodeEditorCarets,
        () => options.language ?? "markdown"
    );

    const paste = (files: File[], text = ""): boolean => {
        let prevented = false;
        const domEvent = { clipboardData: { files, getData: () => text }, preventDefault: () => { prevented = true; } };
        const taken = pictures.paste(domEvent as unknown as ClipboardEvent);

        assert.equal(taken, prevented);
        return taken;
    };

    const type = (at: number, text: string): void => {
        textarea.value = textarea.value.slice(0, at) + text + textarea.value.slice(at);
        selections = singleSelection(at + text.length);
    };

    return { textarea, uploads, marks, events, committed, paste, type, select: (set: SelectionSet) => { selections = set; } };
}

/** Lets the upload's promise run on to its event. */
const settled = (): Promise<void> => new Promise(resolve => setImmediate(resolve));

test("a pasted picture stands under its placeholder while it uploads, raises the event with its selection and name, and the answer's address takes its place", async () => {
    const field = setUp();

    field.textarea.value = "See ";
    field.select(singleSelection(4));

    assert.equal(field.paste([png("shot.png")]), true);
    assert.equal(field.textarea.value, "See ![Uploading shot.png…]()");

    field.uploads[0].resolve("s1");
    await settled();

    assert.deepEqual(field.events, [{ keys: ["s1", "shot.png"] }]);

    insertPicture("s1", "/pictures/1");
    pictureUploadCompleted("s1", { dispatched: true, success: true, error: null });

    assert.equal(field.textarea.value, "See ![shot](/pictures/1)");
});

test("two pictures pasted at once stand a line each, and each lands at its own placeholder whichever answers first", async () => {
    const field = setUp();

    field.paste([png("image.png"), png("image.png")]);
    assert.equal(field.textarea.value, "![Uploading image.png…]()\n![Uploading image.png (2)…]()");

    field.uploads[1].resolve("second");
    field.uploads[0].resolve("first");
    await settled();

    insertPicture("second", "/b");
    insertPicture("first", "/a");

    assert.equal(field.textarea.value, "![image](/a)\n![image](/b)");
});

test("the text edited while a picture uploads keeps the placeholder's place", async () => {
    const field = setUp();

    field.paste([png("a.png")]);
    field.type(0, "Title\n\n");
    field.type(field.textarea.value.length, " after");

    field.uploads[0].resolve("s");
    await settled();
    insertPicture("s", "/a.png");

    assert.equal(field.textarea.value, "Title\n\n![a](/a.png) after");
});

test("a second paste of a picture of the same name while the first uploads is numbered, so each finds its own", () => {
    const field = setUp();

    field.paste([png("image.png")]);
    field.type(field.textarea.value.length, "\n");
    field.paste([png("image.png")]);

    assert.equal(field.textarea.value, "![Uploading image.png…]()\n![Uploading image.png (2)…]()");
});

test("a failed answer takes the placeholder out and says the controller's words; a failed upload says the framework's", async () => {
    const field = setUp();

    field.paste([png("a.png")]);
    field.uploads[0].resolve("s");
    await settled();
    pictureUploadCompleted("s", { dispatched: true, success: false, error: "Pictures are full" });

    assert.equal(field.textarea.value, "");
    assert.deepEqual(field.marks.at(-1), { text: "Pictures are full" });

    field.paste([png("b.png")]);
    field.uploads[1].reject();
    await settled();

    assert.equal(field.textarea.value, "");
    assert.deepEqual(field.marks.at(-1), { key: CoreWords.fileFailed });
});

test("an answer with no picture takes the placeholder out and its line break with it", async () => {
    const field = setUp();

    field.paste([png("a.png"), png("b.png")]);
    field.uploads[0].resolve("a");
    field.uploads[1].resolve("b");
    await settled();

    insertPicture("b", "/b.png");
    pictureUploadCompleted("b", { dispatched: true, success: true, error: null });
    pictureUploadCompleted("a", { dispatched: true, success: true, error: null });

    assert.equal(field.textarea.value, "![b](/b.png)");
});

test("a data address is never written into the text", async () => {
    const field = setUp();

    field.paste([png("a.png")]);
    field.uploads[0].resolve("s");
    await settled();
    insertPicture("s", " data:image/png;base64,AAAA");

    assert.equal(field.textarea.value, "");
    assert.equal(isDataAddress("DATA:image/png,x"), true);
    assert.equal(isDataAddress("/pictures/data:1"), false);
});

test("a placeholder the reader took out is not put back", async () => {
    const field = setUp();

    field.paste([png("a.png")]);
    field.textarea.value = "gone";
    field.uploads[0].resolve("s");
    await settled();
    insertPicture("s", "/a.png");

    assert.equal(field.textarea.value, "gone");
});

test("a field the reader left commits the picture's text itself", async () => {
    const field = setUp();

    field.paste([png("a.png")]);
    field.uploads[0].resolve("s");
    await settled();

    Object.defineProperty(globalThis, "document", { value: { activeElement: null }, configurable: true });
    insertPicture("s", "/a.png");

    assert.deepEqual(field.committed, ["![a](/a.png)"]);
});

test("words, a file that is no picture, one Accept refuses and any language but Markdown are left to the text", () => {
    assert.equal(setUp().paste([png("a.png")], "the words beside it"), false);
    assert.equal(setUp().paste([new File(["x"], "a.txt", { type: "text/plain" })]), false);
    assert.equal(setUp({ accept: "image/jpeg" }).paste([png("a.png")]), false);
    assert.equal(setUp({ language: "json" }).paste([png("a.png")]), false);
});

test("a picture over the size limit is refused before it is sent, and the others still go", () => {
    const field = setUp({ maxSize: 10 });

    field.paste([png("big.png", 20), png("small.png", 5)]);

    assert.equal(field.uploads.length, 1);
    assert.equal(field.textarea.value, "![Uploading small.png…]()");
});

test("a picture's words keep its brackets and its address keeps the text's syntax", () => {
    assert.equal(pictureText("a [draft].png", "/files/my picture (1).png"), "![a \\[draft\\]](/files/my%20picture%20%281%29.png)");
    assert.equal(pictureText(".hidden", "/x"), "![.hidden](/x)");
    assert.equal(placeholderText("x]y", name => `Up ${name}`, () => false), "![Up x\\]y]()");
});

test("only pictures that Accept takes are pictures to the field", () => {
    const files = [png("a.png"), new File(["x"], "b.jpg", { type: "image/jpeg" }), new File(["x"], "c.pdf", { type: "application/pdf" })];

    assert.deepEqual(pictureFiles(files, "", accepts).map(file => file.name), ["a.png", "b.jpg"]);
    assert.deepEqual(pictureFiles(files, ".jpg", accepts).map(file => file.name), ["b.jpg"]);
    assert.deepEqual(pictureFiles(files, "application/pdf", accepts).map(file => file.name), []);
});
