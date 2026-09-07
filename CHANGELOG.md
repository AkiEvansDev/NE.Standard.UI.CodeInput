# Changelog

One section per release of this slice, headed `## X.Y.Z` and named by the tag — `codeinput/vX.Y.Z`. The release
workflow cuts the matching section out to become the body of the GitHub release, and a tag with no section
fails the release before anything is published.

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
