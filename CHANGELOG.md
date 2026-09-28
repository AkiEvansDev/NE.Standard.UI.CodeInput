# Changelog

One section per release of this slice, headed `## X.Y.Z` and named by the tag — `codeinput/vX.Y.Z`. The release
workflow cuts the matching section out to become the body of the GitHub release, and a tag with no section
fails the release before anything is published.

## 1.2.0

- **Built on the framework's 1.2.0.** Nothing of this package's own changed; it moves with the framework.

## 1.1.0

- **A Markdown table whose head row is empty starts with its rows.** GitHub's key/value table — `| | |` over its delimiter row —
  drew its empty head as a bare tinted strip over the rows; a head with no words is now left out, the first row takes the
  frame's top edge, and the delimiter row still aligns the columns. A head with one word in it is drawn as before.

## 1.0.1

- **The first stable release.** No `--prerelease` is needed any more. Until 2.0.0 the public surface may still move
  between versions; every such change is marked **Breaking:** in this file.
- **A screen reader names what the field shows.** The find panel's three switches, drawn as marks (`Aa`, `.*`), are named by the
  words their tooltips say, and the field's caption names the textarea the reader edits rather than the box around it.
- **Whole word finds a word in any script.** It wrapped the query in `\b`, which knows only ASCII, so a Cyrillic or accented
  word had no edge and the search found nothing; a match now counts where no letter, digit or underscore stands on either side
  — the editor's own word.
- **Replace fills a regular expression's `$` patterns as Replace all does.** The single Replace ran the pattern over the
  match's text alone, so a lookaround, `` $` `` and `$'` saw nothing around it; both now read the match in the whole text, and
  Replace all replaces exactly the matches the panel counts, a whole-word query's included.
- **A Markdown document that cannot be rendered shows its source**, and the displays beside it render as ever; a package's
  tokenizer that throws leaves its fenced block plain in a display, and its line plain in the field, rather than the whole
  document unrendered or a line the reader types blind.
- **Quotes and lists nest at most 64 deep**; a deeper marker reads as text. Each level was a recursion, and a line of thousands
  of `>` ran the stack out.
- **`\\host` and `/\host` are links off the page**, as `//host` was: a browser reads a backslash as a slash and drops tabs and
  breaks inside an address, so both opened another host in place of the application rather than in a new tab.
- **A text that opens with a line break keeps it.** The HTML parser drops one line break straight after `<textarea>`, so the
  field's first render lost it and the first edit sent the text back without it; a leading break is written twice.
- **A completion answer that arrives late is dropped** — after Escape, a blur, an accepted word or a caret moved elsewhere it
  opened the list again. The field says it offers a list with `aria-autocomplete="list"`; a textarea takes no
  `aria-expanded`.
- **A Markdown field redraws when a language registers after it was drawn**, since its fenced blocks read in whatever language
  their info string names.
- **Typing on a long text stays quick.** The document's words for completion are read once per word rather than once per
  keystroke, and an edit that shifts every line after it re-reads only the lines it touched: the lines both texts end with
  are matched against each other before the walk.
- **The package's stylesheet and script are served under `/_ne/css/` and `/_ne/js/`** with the framework's own paths (see the
  core's changelog).
- **C#: a capitalised name after a dot is a member, not a type.** `UIButtonType.Ghost` coloured both halves as a type;
  the member is a property now, while a name followed by another dot (`System.Text.Encoding`) still qualifies as a type.
- **A part switched off for good is left out of the page.** `SetStatusBar(false)` and `SetSearch(false)`, written as a
  value rather than bound, no longer render the status bar's four pickers and the find panel's eleven controls hidden:
  they were about 60 KB of a field's 70, which a page listing several read-only fields paid for every one. A bound
  flag still renders both, so it can turn them on.
- **The package checks the plugin contract it was built for.** The framework's client says which contract it implements
  (`GlobalApi.contractVersion`), and the package refuses to register against another one, with an error naming both
  numbers, instead of working in part.
- **Both packages bring their namespaces as global usings.** Installing the package is enough to write against it; a
  project that would rather write its own `using` lines sets `NEStandardUIImplicitUsings` to `false`.
- **The demo edits Orvane Cloud's configs, scripts and incident report**, with the page's source a press away.
- **The mirror's demo builds against the framework's packages.** It reached this slice's own namespaces only through
  the monorepo's usings, and this slice's sources wrote `using` lines the framework's packages now bring, which is
  IDE0005; `Directory.Build.targets` travels to the mirror and a package's sources keep their own lines.
- The README's licence link names the mirror, so it resolves on nuget.org too.
- **The packages carry their symbols and sources inside their assemblies**, so a debugger steps into them.
- **Replace steps on past what it wrote.** A replacement the query still matches (`Foo` for `foo` with Match case off, `logger`
  for `log`) was found again where it was put, so every press rewrote the same place; the next match is now the one after the
  new text.
- **An `http:` address written without its slashes is a link off the page.** A browser reads `http:host` as another host, so
  any http or https address now opens in a new tab rather than in place of the application.
- **A tab size chosen or pushed redraws the extra carets** at the columns the text moved to, rather than at the old ones until
  the next scroll.
- **Switching `Search` or `MultiCaret` off takes effect at once**: an open find panel closes, and the extra carets are let go.
- **Typing at several carets opens the completion list** as typing at one does; only Ctrl+Space did.
- **The field marks a one-column table's delimiter row** (`|---|`), which the display already drew as a table: the editor and
  the display read the same block markers. A fence line whose info string holds a backtick no longer interrupts a paragraph in
  the display.
- **A fenced block inside a quote is highlighted as one** (`` > ```js `` … `` > ``` ``): its info string, its body by the language it
  names, and its close. As in the display, it also ends where the quote does — at a line without the quote's markers, nested
  quotes counted.
- **The display carries a line without a quote's marker on only an open paragraph**, as CommonMark does: after a fence, a
  heading, a rule or a table it starts a block of its own after the quote, and the same holds for a list item's lazy line.
- **Bash:** an assignment's value is a word, not a command (in `MODE=production run` the command is `run`), `$((…))` holds variables
  rather than a command, a command inside `$(…)` is coloured as one, and `2>&1` is one operator.
- **C#:** a raw string opened with four or more quotes after its dollars closes on as many, and a character literal takes
  `\u`, `\U` and `\x` escapes.
- **`UICodeLanguages.Register`** compares the trimmed id, so registering `" sql"` twice renames the entry rather than adding a
  second one.
- **A completion source registered under an empty language id** reaches plain-text fields, as the id is read everywhere else.

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
