# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 1.8.4

- Without line numbers, a code input's text (and its status bar's caret position) stands where every field's does, the framework's
  `--ui-field-inset` in each appearance and size, so it lines up with a text field beside it, its message and the note under it:
  a fixed 8px stood it 4px short of them in Tonal, Filled and Outline, and 8px past them in Underline.
- A completion's `kind` may be any token kind the highlighter knows — `regex`, `meta`, `string`, `tag`, … — and its label wears that
  token's own colour, the very class the text's token wears (`ui-tk-<kind>`), so a language's words look in the list as they do in
  the text (#188). `text`, or no kind, stays plain, and `keyword`, `type`, `function`, `variable` and `property` read as before; a
  `CompletionsSource` file keeps any of them and drops only a kind that is none.
- A page load no longer paints a Markdown display empty and fills it a moment later (#190): a display rendered with a document
  carries the framework's `data-ui-awaits-draw`, so the region it stands in is held out of sight until the engines have drawn it,
  at most 1.5 s — a chat feed of Markdown messages comes up whole instead of as its authors' names and then jumping. With scripting
  off nothing is held.
- A Markdown display's blockquote is drawn in the framework's quote stroke, `@ui-quote-stroke` (3px rather than 0.25rem) in
  `@ui-quote-ink`, as a paragraph's quote line is and as wide as the Extensions quote (`UIText.Quote`, #199), so a quotation in a
  message and the reply line over it are drawn alike.
