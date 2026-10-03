// Every name the package's client spells, read from here and never written again beside its use. renderer-names.test.ts holds
// each group but the client's own to its C# spelling.

import type { DomNames, PluginEngineContext } from "ne-standard-ui";

// Drawn by the renderer: the root and the parts the client finds in it.
export const RootClass = "ui-code-input";
export const TextClass = "ui-code-input__text";
export const ScrollerClass = "ui-code-input__scroller";
export const ContentClass = "ui-code-input__content";
export const HighlightClass = "ui-code-input__highlight";
export const SearchPanelClass = "ui-code-input__search";
export const SearchPartClass = "ui-code-input__search-part";
export const ReplaceRowClass = "ui-code-input__search-row--replace";
export const StatusBarClass = "ui-code-input__status";
export const StatusPickerClass = "ui-code-input__status-picker";

// Drawn by the renderer: the root's settings.
export const LanguageAttribute = "data-ui-code-language";
export const SearchAttribute = "data-ui-code-search";
export const MultiCaretAttribute = "data-ui-code-multi-caret";
export const CompletionsAttribute = "data-ui-code-completions";
export const CompletionsSourceAttribute = "data-ui-code-completions-source";
export const StatusBarAttribute = "data-ui-code-status";
export const FormatBarAttribute = "data-ui-code-format-bar";
export const DetectedLineEndingAttribute = "data-ui-code-eol";
export const PicturesAttribute = "data-ui-code-pictures";
export const PictureAcceptAttribute = "data-ui-code-picture-accept";
export const TabSizeVariable = "--ui-code-tab-size";

// Drawn by the renderer: the status bar's position and the hidden carriers of its four pickers.
export const PositionAttribute = "data-ui-code-position";
export const TabSizeAttribute = "data-ui-code-tab-size";
export const EncodingAttribute = "data-ui-code-encoding";
export const LineEndingAttribute = "data-ui-code-line-ending";

// Drawn by the renderer: the find panel's parts, each holding one of the framework's components.
export const FindAttribute = "data-ui-code-find";
export const ReplaceAttribute = "data-ui-code-replace";
export const ToggleReplaceAttribute = "data-ui-code-toggle-replace";
export const PreviousAttribute = "data-ui-code-previous";
export const NextAttribute = "data-ui-code-next";
export const CloseAttribute = "data-ui-code-close";
export const ReplaceOneAttribute = "data-ui-code-replace-one";
export const ReplaceAllAttribute = "data-ui-code-replace-all";
export const MatchCaseAttribute = "data-ui-code-match-case";
export const WholeWordAttribute = "data-ui-code-whole-word";
export const RegexAttribute = "data-ui-code-regex";
export const CountAttribute = "data-ui-code-count";

// Drawn by MarkdownDisplayComponentRenderer; the client's own Markdown classes are the root's parts.
export const MarkdownRootClass = "ui-markdown";
export const MarkdownBodyClass = "ui-markdown__body";
export const MarkdownSourceAttribute = "data-ui-markdown-source";

// The words the client writes itself, by their CodeInputStrings keys.
export const PositionWord = "ui.code.position";
export const MatchesWord = "ui.code.matches";
export const NoMatchesWord = "ui.code.no-matches";
export const InvalidPatternWord = "ui.code.invalid-pattern";
export const SuggestionsWord = "ui.code.suggestions";
export const PictureUploadingWord = "ui.code.picture-uploading";
export const FormatBarWord = "ui.code.format-bar";
export const BoldWord = "ui.code.format-bold";
export const ItalicWord = "ui.code.format-italic";
export const StrikethroughWord = "ui.code.format-strikethrough";
export const InlineCodeWord = "ui.code.format-code";
export const LinkWord = "ui.code.format-link";
export const HeadingWord = "ui.code.format-heading";
export const HeadingLevelWord = "ui.code.format-heading-level";
export const ListWord = "ui.code.format-list";

// The picture's round trip, by the names CodeInputEvents and InsertPictureEffect give it on the server.
export const PictureUploadEvent = "picture-upload";
export const InsertPictureEffectKind = "codeinput.insert-picture";

/** The framework's names the plugin surface's `names` does not carry, held by the test to their C# sources. */
export const CoreNames = {
    checkboxClass: "ui-checkbox",
    checkboxInputClass: "ui-checkbox__input",
    checkboxBoxClass: "ui-checkbox__box",
    smallInputClass: "ui-input--small",
    ghostButtonClass: "ui-button--ghost",
    smallButtonClass: "ui-button--small"
} as const;

/** The framework's glyphs the format bar's buttons wear, by their UIGlyphs names, held by the test to their C# source. */
export const CoreGlyphs = {
    bold: "ne-bold",
    italic: "ne-italic",
    strikethrough: "ne-strikethrough",
    code: "ne-code",
    link: "ne-link",
    heading: "ne-heading",
    list: "ne-list-bulleted"
} as const;

/** The framework's words the client says itself, by their UIStrings keys, held by the test to their C# source. */
export const CoreWords = {
    fileFailed: "ui.file.failed"
} as const;

// Drawn by this client, for its stylesheet.
export const LineClass = "ui-code-input__line";
export const CodeClass = "ui-code-input__code";
export const GutterDigitsVariable = "--ui-code-gutter-digits";
export const CaretLayerClass = "ui-code-input__carets";
export const CaretClass = "ui-code-input__caret";
export const SelectionClass = "ui-code-input__selection";
export const VirtualClass = "ui-code-input--virtual";
export const PictureOverClass = "ui-code-input--picture-over";
export const MatchClass = "ui-code-match";
export const CurrentMatchClass = "ui-code-match--current";
export const CompletionListClass = "ui-code-input__completions";
export const CompletionRowClass = "ui-code-input__completion";
export const ActiveCompletionClass = "ui-code-input__completion--active";
export const CompletionAnchorClass = "ui-code-input__completions-anchor";
export const FormatBarClass = "ui-code-input__format-bar";
export const FormatButtonClass = "ui-code-input__format-button";
export const FormatAnchorClass = "ui-code-input__format-anchor";
export const HeadingMenuClass = "ui-code-input__heading-menu";

export const CrLf = "crlf";

export type Strings = PluginEngineContext["strings"];

/** The framework's own names a Markdown document is drawn with: a block's source line, and the task box's read-only mark. */
export type MarkdownNames = Pick<DomNames, "sourceLine" | "readOnlyClass">;
