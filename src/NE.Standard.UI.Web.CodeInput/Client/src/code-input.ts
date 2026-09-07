import "./styles/ui-code-input.less";
import { startCodeInputEngine } from "./code-input-engine.ts";
import { frameworkApi } from "./framework-api.ts";
import { languages } from "./languages/index.ts";
import { installPackageApi } from "./package-api.ts";

// The languages first, so a package's registration is in place before the first field is drawn.
installPackageApi(languages);

const api = frameworkApi();

// Ctrl+S, raised by the engine on the textarea after a `change`; the command waits for that value, so OnSave sees what was typed.
api.registerEvent("save", { settlesValue: true });
api.registerEngine(startCodeInputEngine);
