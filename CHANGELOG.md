# Changelog

One section per release of this slice, headed `## X.Y.Z` and named by the tag — `codeinput/vX.Y.Z`. The release
workflow cuts the matching section out to become the body of the GitHub release, and a tag with no section
fails the release before anything is published.

## 1.0.0-rc.3

Several carets, as in Visual Studio, and an undo of the field's own.

- **Several carets.** Ctrl+Alt+click adds one, Shift+Alt+. and Shift+Alt+; select the next or every occurrence of
  the selection, Shift+Alt+arrows select a column; typing, deleting, Tab, Enter, the arrows and the clipboard act at
  every caret, and Escape leaves one. `MultiCaret` turns it off.
- **Undo and redo are the field's own**: the browser's cannot hold an edit made at several carets. Typing is taken
  back a word at a time, and the carets come back with the text.
- Typing with the find panel open no longer selects the current match under the caret after every keystroke.
- **Saving on Ctrl+S alone.** Bound `OnSubmit` with a `FormId`, the field sends nothing while the reader types, and
  Ctrl+S submits its form and runs `OnSave`; a command that replaces the text returns `DiscardFormEffect`. A text of
  any size is saved, the framework staging one over 8 KB beside the hub.
- **A column selection is a rectangle.** Shift+Alt+arrows now keep every caret at the column, even over a line too
  short to reach it, and typing writes out the spaces that carry it there — Visual Studio's virtual space.
- **The find panel is Visual Studio's three rows**: find with the two arrows and the cross; replace with its own two
  buttons, folded out by the chevron before the find field; the three switches and the match count under both. The
  arrows among the matches point left and right, and the two replacements are marks rather than words, standing under
  the two arrows.
- An edit at many places re-renders those lines alone, not every line between the first and the last.
- **CSS and LESS are highlighted as Visual Studio colours them**: selectors, property names, values, at-rules and
  variables each in their own colour. Custom properties (`--gap`), a LESS variable's value, `@import` and `@media`
  with their conditions, `&-suffix` and a mixin's parameters used to come out as the wrong kind or not at all.
- **Markdown** (`UICodeLanguages.Markdown`): headings, emphasis, code, links, quotes, lists, tables, and a fenced
  block highlighted as the language its info string names (`cs`, `js`, `sh` and the other common names included).
- **`MarkdownDisplayComponent`** shows a Markdown document as formatted text — CommonMark with GitHub's tables, task
  lists, strikethrough and bare links, code blocks in the editor's colours. Raw HTML stays text and a link keeps only
  an address a reader can safely follow. `AddCodeInput()` registers it.
- **An editor and its rendering scroll together** in a framework scroll group (`SetScrollGroup`): the field marks its
  lines and the display its blocks, so the two are kept line against line.
- **The find panel and the status bar are the framework's own components** — its fields, buttons and switches, carried as
  regions and kept in step from the browser — so they take the theme, the input size and the appearance the page uses.
  The panel's marks are the framework's glyphs rather than masked pictures, and the stylesheet stands on the contract's
  tokens and mixins.
- The status bar's menus open through the framework's popups, a completion list has a floor of its own width and no air
  above or below, and a status word answers the pointer with the hover wash.
- Inline code in a Markdown display has its rounded corner: the rule named a radius the framework does not define.

## 1.0.0-rc.2

The status bar the field was missing, and the editing keys it got wrong.

- **A status bar under the text**, as an editor's: the caret's line and column, and pickers for the tab size,
  the encoding, the line ending and the language. A picker's choice is the property's value, so `TabSize`,
  `Encoding`, `LineEnding` and `Language` are read by binding them; the list a picker opens is the package's
  own, drawn in the theme, and it flips below the button where there is no room above it. `SetStatusBar(false)`
  hides the bar. `UICodeEncodings` and `UICodeLineEndings` name what the bar offers.
- **The line ending travels with the value.** A text field holds every break as LF, so the field notes what the
  value came with, shows it, and sends the value back the same way; a choice converts the text on the next
  commit.
- **Shift+Tab takes back an indent written with tabs**, not only one written with spaces, and a bar in a field
  that arrived in a row the client built shows that row's own words rather than the template's.
- **Ghost draws nothing at all** — no ring on focus, no rule over the status bar: the editor is read on the
  page it sits on. The focus ring of the other appearances is no longer broken by the gutter.
- **Ctrl+S** commits the value ahead of any debounce and raises the field's `save` event.
- A language a package registers reaches every field that is open, and a field taken off the page is let go of.

## 1.0.0-rc.1

The component is unchanged since `1.0.0-preview.1`; the number lines up with the framework's, which goes out
as a release candidate with everything that plugs into it.

- The client's tests run from the project file rather than from `npm run build`, as the framework's own do,
  so a clone of this repository builds the client without them.

## 1.0.0-preview.1

The first version: `NE.Standard.UI.CodeInput` (the component) and `NE.Standard.UI.Web.CodeInput` (the web
rendering).

- `CodeInputComponent`: a monospaced field with syntax highlighting for JSON, CSS and LESS, JavaScript and
  TypeScript, HTML, C#, Python and Bash; line numbers; wrapping; a tab size; find and replace in the browser.
- The editing is the browser's own `<textarea>` under a highlighted layer, so undo, selection and input
  methods are native. The highlighting re-reads only the lines that changed.
- The panel's words are translation keys (`ui.code.*`), translated by the application the way the
  framework's own are.
