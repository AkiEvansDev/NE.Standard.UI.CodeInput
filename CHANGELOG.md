# Changelog — CodeInput

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.CodeInput`) and is removed from this file after the release is cut.

## 2.8.1

- **Expandable `CodeInputComponent` (`SetExpandable`) and input header actions**: `CodeInputComponent.SetExpandable(Action<UICodeExpandBuilder>?)` (`IExpandableInputComponent`) promotes the live CodeMirror editor into a full-height modal dialog — preserving caret, selection, `Undo`/`Redo` history, row context, and bindings while swapping between inline and expanded `LineNumbers`, `WrapLines`, `StatusBar`, `FormatBar`, `Search`, `MultiCaret`, `Completions`, `Appearance` (`Outline` by default when inline is `Ghost`), `Width` (`FieldExpandExtensions.SetWidth(UIColumnWidth)`), and `ShowButton`. Supports `SetHeaderAction` / `SetHeaderActions`, `ExpandFieldEffect`, and stretched full-height layout inside `UIDialogs.Fill`.
