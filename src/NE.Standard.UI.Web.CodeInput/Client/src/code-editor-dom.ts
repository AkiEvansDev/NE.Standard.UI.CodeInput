// The attributes, classes and CSS variables more than one of the code input's own files read or write, kept in one place so the
// names cannot drift between them.

import type { PluginEngineContext } from "ne-standard-ui";

export const LanguageAttribute = "data-ui-code-language";
export const DetectedLineEndingAttribute = "data-ui-code-eol";
export const CrLf = "crlf";
export const TabSizeVariable = "--ui-code-tab-size";

export type Strings = PluginEngineContext["strings"];
