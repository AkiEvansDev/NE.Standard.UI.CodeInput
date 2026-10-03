# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 1.5.0

- **New: a Markdown field's format bar.** A selection the mouse makes gets the framework's strip of icons over it — bold, italic,
  strikethrough, code, a link, a bulleted list, and a heading from a menu of its six levels — each a toggle that takes its marks
  off again, in one undo step; Ctrl+B, Ctrl+I and Ctrl+K do the same, and Alt+F10 takes the keyboard to the bar. **New:**
  `FormatBar` (on), `SetFormatBar(false)`.
- **The format bar's buttons show no tooltips** (a popup on a popup) and are named for a screen reader, their keys too; the
  keyboard's place wears the framework's frame, and the heading menu stands the framework's popup gap under the bar.
- **The find panel's fields are Tonal**, the fill alone, as the panel frames them. An Outline or Underline field's edge is the
  framework's mark, kept under the pointer.
- **The demos:** the appearance picker offers Tonal.
