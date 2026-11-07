# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 2.5.0

- Updated `MarkdownDisplayComponent` (`markdown-display-engine.ts`) to reconcile rendered Markdown blocks in place during streaming updates so token appends update only the trailing block without resetting text selection, scroll position, or `<details>` fold state, and stabilized inline code and emphasis tokenization while a marker or fence is still unclosed (#298).
