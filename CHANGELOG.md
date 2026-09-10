# Changelog

One section per release of this slice, headed `## X.Y.Z` and named by the tag — `codeinput/vX.Y.Z`. The release
workflow cuts the matching section out to become the body of the GitHub release, and a tag with no section
fails the release before anything is published.

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
