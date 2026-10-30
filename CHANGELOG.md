# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 2.0.0

- **Breaking:** the field stands on `InputComponentBase` and the field blocks (was `FieldInputComponentBase`).
- **Breaking:** `OnPictureUpload` is `OnImageUpload`, `InsertPictureEffect` is `InsertImageEffect` and
  `CodeInputEvents.PictureUpload` is `ImageUpload`, on the wire `code-image-upload` and `codeinput.insert-image`;
  `CodeInputComponentRenderer.PicturesAttribute` and `PictureAcceptAttribute` are `ImagesAttribute` (`data-ui-code-images`) and
  `ImageAcceptAttribute` (`data-ui-code-image-accept`), and `CodeInputStrings.PictureUploading` is `ImageUploading`
  (`ui.code.image-uploading`).
- **Breaking:** Ctrl+S raises `code-save` (`CodeInputEvents.Save`), the package's own name, and the field's own: a component around
  the field never runs it. A picture's upload raises `code-image-upload`, no longer the plain `image-upload` Graph registers too.
- `MaxLength` (`ITextLengthComponent`), honoured by the textarea and the server.
- A forged write to `TabSize` (outside one to eight), `Encoding` or `Language` (not listed) or `LineEnding` (not LF, CRLF or none)
  is refused and answered with the server's value; a tab size past one to eight reads as four on the page.
- A field asked for an inside caption keeps its caption row (`CaptionRowBox`), as it is drawn, so a button beside it stands
  level with its box.
- The status bar's pickers are named by their tooltips; a failing tokenizer, completions provider or completions file is said
  once in the console.
- A Markdown table's cells break between words, never inside one, where the document's `anywhere` gave the key column a letter's
  width on a narrow display.
- The completion popup matches the core's inline trigger suggestions (`@ui-popup-radius`, `@ui-list-entry-radius`, and unified hover/selected states).
