# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 1.13.0

- A code field is an `ICaretFieldComponent`: an `InsertTextEffect` — a snippet at the caret — types into it, from an interaction
  or a command.
- `OnSaveLiteral(command, …)`: Ctrl+S runs its command with literal arguments — which document a field of several saves — after
  the value reached the server, as `OnSave` does. A picture upload has no literal-only form: its command needs the upload's
  selection to answer.
- A Markdown display inside a link (a card or a surface with `SetUrl`) draws the document's links, and the addresses it reads as
  links, as their words: the press is the card's, not a second link's inside it.
