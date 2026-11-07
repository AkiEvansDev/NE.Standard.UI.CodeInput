# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 2.6.0

- Fixed Markdown inline emphasis and code unformatting across separate spans (`**a** and **b**`, `` `a` and `b` ``) in `markdown-format.ts` and swept disconnected component entries from pending picture uploads in `code-editor-pictures.ts`.
- Built on the framework's 2.6.0 release.
