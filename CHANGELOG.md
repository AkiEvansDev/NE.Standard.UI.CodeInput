# Changelog — CodeInput

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.CodeInput`) and is removed from this file after the release is cut.

## 2.7.0

- **Breaking:** targets `.NET 11` (`net11.0`; building requires the `.NET 11` SDK).
- **Breaking:** Markdown strikethrough requires double tilde (`~~text~~`); single `~text~` is rendered as literal text, and `UIMarkdownSpanStyle.Close` defaults to `""` (no longer `required`).
- Added inline completion popups and multi-character triggers on `CodeInputComponent` (`UICodeCompletion`, `UICodeCompletionItem`, `AddCompletion`, `SetCompletionItems` / `BindCompletionItems`, `SetCompletionTriggers`, `OnCompletionSearch`, `OnCompletionSelect`, and automatic paired closing-delimiter consumption, #300).
- Added live custom mark, span and token highlighting on `CodeInputComponent` (`SetMarkStyle`, `AddSpanStyle`, `AddTokenStyle`) and `MarkdownDisplayComponent` (`AddTokenStyle`), with scoped Markdown spans and bare-URL masking (#299).
- Added incremental tail block reparsing during streaming updates and a bounded 256-entry code highlight cache in `MarkdownDisplayComponent`.
- Built on the framework's 2.7.0 release.
