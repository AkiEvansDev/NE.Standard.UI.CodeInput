import "./styles/ui-code-input.less";
import "./styles/ui-markdown.less";
import { CodeInputEngine, readCodeValue } from "./code-input-engine.ts";
import { ImageUploadEvent, InsertImageEffectKind } from "./code-editor-dom.ts";
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
// The field's own: a component around it hears none of its saves.
api.registerEvent("code-save", { settlesValue: true, submitsForm: true, ownTarget: true });
// A pasted or dropped picture has gone up: the command's keys are its selection and file name, and what became of the command takes
// its placeholder out where the answer put no picture in.
api.registerEvent<CustomEvent<PictureUploadDetail>>(ImageUploadEvent, {
    dynamicParameters: context => [...(context.domEvent.detail?.keys ?? [])],
    completed: context => pictureUploadCompleted(context.domEvent.detail?.keys[0] ?? "", context)
});
// The answer: the picture's address, in its placeholder's place.
api.registerEffect({
    kind: InsertImageEffectKind,
    handler: context => insertPicture(String(context.effect.selection ?? ""), String(context.effect.address ?? ""))
});
// The textarea holds every line break as LF; the value goes out with the ending the status bar shows — chosen, or the one it came with.
api.registerValueReader({ kind: "code", read: element => readCodeValue(element) });
api.registerConverter("code-tab-size", value => (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 8 ? String(value) : "4"));
api.registerConverter("code-encoding", value => (typeof value === "string" && value.trim().length > 0 ? value : "utf-8"));
api.registerConverter("code-language", value => (typeof value === "string" && value.trim().length > 0 ? value.trim() : "plain-text"));

// Neither engine's state is needed elsewhere, so only their disposal is returned here. The Markdown display reads its document off
// the root's attribute, which the engine observes.
api.registerEngine(context => {
    const editors = new CodeInputEngine(context);
    const markdown = new MarkdownDisplayEngine(context);

    return {
        dispose: () => {
            editors.dispose();
            markdown.dispose();
        }
    };
});
