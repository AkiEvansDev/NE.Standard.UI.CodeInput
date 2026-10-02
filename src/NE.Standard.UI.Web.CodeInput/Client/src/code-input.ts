import "./styles/ui-code-input.less";
import "./styles/ui-markdown.less";
import { CodeInputEngine, readCodeValue } from "./code-input-engine.ts";
import { InsertPictureEffectKind, PictureUploadEvent } from "./code-editor-dom.ts";
import type { PictureUploadDetail } from "./code-editor-pictures.ts";
import { insertPicture, pictureUploadCompleted } from "./code-editor-pictures.ts";
import { completionsRegistry } from "./completions-registry.ts";
import { frameworkApi } from "./framework-api.ts";
import { languages } from "./languages/index.ts";
import { MarkdownDisplayEngine } from "./markdown-display-engine.ts";
import { installPackageApi } from "./package-api.ts";

// The languages and the completion sources first, so a package's registration is in place before the first field is drawn.
installPackageApi(languages, completionsRegistry);

const api = frameworkApi();

// Ctrl+S, raised by the engine on the textarea after a `change`; the command waits for that value, so OnSave sees what was typed.
api.registerEvent("save", { settlesValue: true, submitsForm: true });
// A pasted or dropped picture has gone up: the command's keys are its selection and file name, and what became of the command takes
// its placeholder out where the answer put no picture in.
api.registerEvent<CustomEvent<PictureUploadDetail>>(PictureUploadEvent, {
    dynamicParameters: context => [...(context.domEvent.detail?.keys ?? [])],
    completed: context => pictureUploadCompleted(context.domEvent.detail?.keys[0] ?? "", context)
});
// The answer: the picture's address, in its placeholder's place.
api.registerEffect({
    kind: InsertPictureEffectKind,
    handler: context => insertPicture(String(context.effect.selection ?? ""), String(context.effect.address ?? ""))
});
// The textarea holds every line break as LF; the value goes out with the ending the status bar shows — chosen, or the one it came with.
api.registerValueReader({ kind: "code", read: element => readCodeValue(element) });

// Neither engine's state is needed elsewhere, so there is nothing to hold onto here. The Markdown display reads its document off
// the root's attribute, which the engine observes.
api.registerEngine(context => {
    new CodeInputEngine(context);
    new MarkdownDisplayEngine(context);
});
