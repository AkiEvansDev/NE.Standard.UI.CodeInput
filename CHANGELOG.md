# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 1.8.0

- A Markdown display takes styles of its own: `SetMarkStyle` draws Markdown's runs (strong, emphasis, strikethrough, inline code,
  a link's words) and `AddSpanStyle` the author's delimited ones (`"…"`, `«…»`, the marks shown) in a colour, a font list, a weight
  and a slant (`UIMarkdownTextStyle`); a mark never closed styles nothing.
- A Markdown document pushed again replaces only the blocks that came out differently, so a reply streaming in keeps the reader's
  selection in the blocks already written (#162).
