# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 1.11.0

- A bound `DebounceMilliseconds` pushed below zero writes no delay, as the first paint does, rather than a negative one.
