// The attributes, classes and CSS variables more than one of the code input's own files read or write, kept in one place so the
// names cannot drift between them.

import type { PluginEngineContext } from "ne-standard-ui";

export const LanguageAttribute = "data-ui-code-language";
export const SearchAttribute = "data-ui-code-search";
export const MultiCaretAttribute = "data-ui-code-multi-caret";
export const LineEndingAttribute = "data-ui-code-line-ending";
export const DetectedLineEndingAttribute = "data-ui-code-eol";
export const MatchCaseAttribute = "data-ui-code-match-case";
export const WholeWordAttribute = "data-ui-code-whole-word";
export const RegexAttribute = "data-ui-code-regex";
export const CrLf = "crlf";
export const TabSizeVariable = "--ui-code-tab-size";

export type Strings = PluginEngineContext["strings"];
