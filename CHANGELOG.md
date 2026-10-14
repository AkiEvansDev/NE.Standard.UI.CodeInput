# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 1.8.5

- The format bar's buttons name ⌘ as well on macOS in their `aria-keyshortcuts` (`Control+B Meta+B`).
- A completions file that failed to load is fetched again by the next field naming it.
- A code input put back on the page after it left follows its size again and answers each key once.
