# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 1.14.0

- **Breaking:** `Placeholder`, `DebounceMilliseconds`, `Accept` and `MaxFileSize` come from the framework's shared contracts
  (`IPlaceholderInputComponent`, `IDebounceInputComponent`, `IFileAcceptComponent`); names and setters are unchanged, a static key is
  read off its contract. Built on the framework's 1.14.0.
