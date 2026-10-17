# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 1.10.0

- `MarkdownDisplayComponent.LineBreaks` (`SetLineBreaks`, bindable, off by default) draws a single line break inside a paragraph as
  one rather than as a space, for text written line by line — a chat message, a note (#222). A blank line still starts a paragraph,
  and code is untouched.
- An Outline, Tonal or Filled code field's focus edge is drawn whole again: the line numbers' ground no longer covers it along the
  left side and over the top-left corner.
