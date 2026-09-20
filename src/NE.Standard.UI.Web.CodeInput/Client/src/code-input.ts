import "./styles/ui-code-input.less";
import "./styles/ui-markdown.less";
import { CodeInputEngine, readCodeValue } from "./code-input-engine.ts";
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
// The textarea holds every line break as LF; the value goes out with the ending the status bar shows — chosen, or the one it came with.
api.registerValueReader({ kind: "code", read: element => readCodeValue(element) });

// Neither engine's state is needed elsewhere, so there is nothing to hold onto here. The Markdown display reads its document off
// the root's attribute, which the engine observes.
api.registerEngine(context => {
    new CodeInputEngine(context);
    new MarkdownDisplayEngine(context);
});
