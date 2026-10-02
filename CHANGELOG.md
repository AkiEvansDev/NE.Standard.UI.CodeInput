# Changelog

One section per release of this slice, headed `## X.Y.Z` and named by the tag — `codeinput/vX.Y.Z`. The release
workflow cuts the matching section out to become the body of the GitHub release, and a tag with no section
fails the release before anything is published.

## 1.4.1

- **Built on the framework's 1.4.1.** Nothing of this package's own changed; it moves with the framework.

## 1.4.0

- **The demos:** the Markdown page sets the editor and its rendering side by side from a wide screen (`xl`) on and stacks them
  below it, where on a tablet each pane had some 270 px — words broken mid-word and the field's status bar cut to "l Spaces…".
- **New: a picture pasted or dropped into a Markdown text.** `OnPictureUpload(command)` opts a field in: a picture pasted
  (Ctrl+V) or dropped — several at once, a line each — stands under a placeholder (`![Uploading name…]()`, in the reader's
  language) at the caret or where it was let go, goes up through the framework's own upload, and the command runs with its
  selection and file name (`CodeInputArguments`). The application keeps the file where it likes and answers with
  `InsertPictureEffect(selection, address)`, which turns the placeholder into `![name](address)` wherever the reader's edits
  have moved it meanwhile; one undo takes the picture back whole. A failed answer takes the placeholder out and says the
  command's words on the field's validation line, a failed upload the framework's. `MaxFileSize` (the framework's shared
  `SetMaxFileSize`) refuses a larger picture before it is sent, in the file inputs' words, and `Accept` narrows the picture
  types. Without the command a paste is text alone, and a field in any language but Markdown never takes a picture. The field
  keeps nothing and never writes a `data:` address into the text; the effect refuses one.
- **Markdown's links and pictures follow the framework's one address rule** (`urls.isSafeLink`, `urls.isExternalLink` and
  `urls.isImageSource` on the plugin surface), not a copy of their own: a picture relative to the page (`img/x.png`) still shows
  and an SVG's `data:image/svg+xml` now does; a link with a space or a control character anywhere is no link; a `mailto:` or
  `tel:` link opens in a new tab, as the framework's own do. Its copy of the plugin contract carries the two new `urls` members.
- **`CodeInputComponent` takes the framework's `IDebounceInputComponent`;** its `SetDebounceMilliseconds` is the shared one, the
  fluent chain unchanged.
- **The carets' size watch is the framework's** (`observeSize` on the plugin surface), let go with the editor as before.
- **Built on the framework's 1.4.0:** its copy of the plugin contract carries `focus.first(container)`, `uploads.accepts` and
  `uploads.takeWithinSizeLimit`, and the new tokens and mixins (`@ui-tinted-fill`, `@ui-part-radius`, the `@ui-z-*` ladder, `.ui-picture-glass()`, `.ui-user-select()`).

## 1.4.0-rc.4

- **The Markdown display's words select as a Text's do.** The framework's pages now select only reading words; the display
  is one (`ui-content-text` on its root), so its document can still be selected and copied, unless its own or a surrounding
  component's `TextSelectable` says otherwise.
- **Ctrl+Space's list is padded as every popup list is.** Its rows take a list entry's corner (`@ui-list-entry-radius`) inside
  the list's 4 px padding, so they run parallel to the popup's rounder corner, where square rows met it edge to edge.
- **Built on the framework's 1.4.0-rc.4.** Its copy of the plugin contract carries the
  framework's action bar — `names.actionBar` and `names.actionBarKey`, and the `actionBar` flag of `ui-context-menu-opening` raised before a bar shows a
  menu's entries — and its stylesheet's `.ui-popup-scroll()` caps a list at the dynamic viewport's height (`100dvh`), `@ui-popup-radius`
  and `@ui-list-entry-radius` round a popup and its entries, and `.ui-dialog-look()` is the framework dialog's panel.
- **The demo:** the options over the editor stand in even columns (`WrapPanelComponent.ItemMinWidth`), the Markdown page stacks the editor over the page on a phone, and the page header is compact there.

## 1.4.0-rc.3

- **The code field's placeholder takes a phrase**, as every text of the framework's now does. **Breaking:**
  `CodeInputComponent.Placeholder` is a `UIPhrase?`; a string still assigns, and code reading it as a string reads `.Key` or
  `.ToString()`.
- **Built on the framework's 1.4.0-rc.3.** Its copy of the plugin
  stylesheet carries the framework's field actions: `.ui-field-actions()` compacts a split button and a flyout's button as
  it does a plain one (`.ui-field-action-button()`), and the eight file-kind glyphs' variables (`@ui-glyph-draft`,
  `@ui-glyph-picture-as-pdf`, …).

## 1.4.0-rc.2

- **Built on the framework's 1.4.0-rc.2.** Nothing of this package's own changed. Its copy of the plugin contract carries the
  framework's new `Moment` type: `strings.format` takes a moment among its values and writes it in the reader's time zone.

## 1.4.0-rc.1

- **A long line no longer freezes the Markdown display or the code field.** A heading's closing run, a table's delimiter row and
  an HTML tag in the field's Markdown were read by patterns that backtracked over a long run of spaces, and the field's emphasis
  and brackets, and the display's link addresses and titles, were read to the end of the line once per opener — each quadratic
  in the line's length, so a document of a few dozen kilobytes another viewer wrote held the page for seconds on every push. Every
  one is linear now. Two CommonMark rules come with it: `### ###` is an empty heading (a closing run may follow the opening's own
  space), and a link title in parentheses holds another parenthesis only escaped; a link's address nests parentheses at most 32
  deep, as CommonMark lets an implementation limit it.
- **A leading control character hides no other host.** Whether a link opens in a new tab was judged on the address with only
  its tabs and breaks dropped, so `[a](<\u0001//host/x>)` — which the browser reads as `//host/x` — opened another host in
  place of the application; the address is judged as the browser's URL parser reads it, the controls and spaces at either end
  stripped as well. The reading is the framework's (`urls.asBrowserReads` on the plugin surface), not a copy of the package's, so
  the package needs the framework's 1.4.0-rc.1 or later.
- **The code field's words ship in Russian and Simplified Chinese.** `CodeInputStrings.Translations` carries `ru` and `zh-Hans` for
  every `ui.code.*` key, the tab stops' "Spaces: N" included, and an application turns them on with the framework's
  `application.AddFrameworkWords("ru", "zh-Hans")`, ranked below its own words. Both are the framework demo's tables, moved into
  the package; the demo keeps only its own `code-demo.*` words.

## 1.3.0

- **Needs the framework's plugin contract 2** (the framework's 1.3.0): the package reads its `ui-readonly` mark, the framework's
  names it spelled itself (`names.buttonClass`, `selectClass`, `textInputClass`, `sourceLine`), the popup look and the
  monospace token from it, marks the find field through its `validation.mark`, and opens its completion list as a popup the
  field owns.
- **Breaking:** plain text and UTF-8 with BOM are words — `UICodeInputStrings.PlainText` (`ui.code.plain-text`) and
  `UICodeInputStrings.Utf8Bom` (`ui.code.utf8-bom`), English in `CodeInputStrings` — so the pickers show them in the page's
  language, under key prefixes too. `UICodeLanguages.All`/`UICodeEncodings.All` and their `DisplayName` give the key for those
  two: show it through the words, as an option's title is. The find switches' marks (`Aa`, `ab`, `.*`) are content, never
  looked up or reported missing.
- **The pickers' names are content** — `UTF-8`, `C#`, `LF`, `CRLF`, a registered language's name, and the line-ending placeholder
  the engine writes: each option is marked content (the framework's `OptionItem.IsContent`) and the placeholder `AsContent`, so
  none is looked up or reported missing, key prefixes or not. **Breaking** for an application that registered a key as a
  language's name (`UICodeLanguages.Register("sql", "app.lang.sql")`): the name is shown as written.
- **The status bar's position switches in place with the page**: written and marked through `WebWords.Write`
  on the server (no hand-spliced `{line}`/`{column}`) and `strings.write` on the client; the find panel's count is written again
  when the page's words change.
- **A read-only code field's box no longer lifts under the pointer**: its root carries the framework's `ui-readonly` mark, which
  every field's hover now answers.
- **A read-only field's status bar pickers are read-only selects.** They opened from the keyboard and took a choice back a moment
  later; now each shows its setting, stays in the Tab order and opens nothing, and nothing lifts under the pointer. Turning the
  field read-only also lets its extra carets go and closes an open completion list.
- **A read-only find panel keeps its switches flush** with the find field, rather than indented under the chevron it no longer shows.
- **A field or a Markdown display with a `Theme` of its own takes that theme's syntax colours.** The palette followed the page's
  theme, so a dark field on a light page drew black punctuation on its dark ground; each colour is now a light and a dark value,
  chosen by the colour scheme on the component.
- **The find panel's fields step off the panel's own ground**, as a popup's do, rather than off the page's under it.
- **Under forced colours** (Windows' contrast themes) the active suggestion, the find matches and the current one, the extra
  carets and the extra selections are drawn in the system's colours, where they vanished; the text is drawn once, where the mode
  painted the textarea's own over the highlighted layer. The active suggestion is dashed `CanvasText`, the framework's mark for
  a list's current entry, not the solid `Highlight` of a chosen one.
- **The completion list is a popup the field owns**: it closes when the field turns read-only, disabled or loading or leaves
  the page, as the framework's own popups do; it fades out as it fades in.
- **The find panel fades in and out** as every popup does, rather than appearing and vanishing at once.
- **No keyboard mark on the find panel's buttons after a mouse press**, under the framework's pointer-focus rule; the field one of
  them hands the focus to (the replace field, the text) shows its edge, as a text field with a caret always does.
- **A press on the find panel's or the status bar's own ground** — the match count, the caret's position, the air between parts —
  keeps the focus where it was; it fell to the page, and Ctrl+F then opened the browser's own find.
- **A part hidden while it holds the focus hands it on**: `Search` turned off with the focus in the panel gives it to the text,
  and so does `StatusBar` turned off with the focus on one of its pickers; the field turning read-only with the focus in the
  replace row or on its chevron gives it to the find field.
- **A completion answer that arrives after the framework closed the list** (a press, the focus leaving, the field turning
  read-only) no longer opens it again.
- `UICodeInputStrings.IsWord(name)`: whether a name `UICodeLanguages.All` or `UICodeEncodings.All` lists is one of the package's
  words, for an application's own list of them.
- **The find panel fades with the framework's `.ui-popup-fade()`, and a Markdown link is `.ui-inline-link()`**, rather than
  copies of them.
- **The demo's own words are `code-demo.` keys**, with a complete zh-Hans table of every word it registers — its own, the
  framework's and the package's — which `DemoWordsCoverageTests` holds; its status lines count lines and characters with a
  plural, and its language select marks the names content as the status bar does.
- **The status bar keeps within a narrow field**: the caret's position gives way first, ellipsised, then the pickers' words,
  where the position ran under the pickers and the bar ran past the field's edge, cutting the language off.
- **A Markdown task box wears the framework's read-only mark**, so a click that reaches it — a screen reader's — is refused; it
  ticked the box.
- **The completion list stays under the word's start** as the word is typed, rather than stepping right with every letter, and
  a scroll the typing causes no longer closes it: the list follows the word, and closes once the word leaves the view.
- **The pointer moves the active suggestion**, as in a native list, and the row Enter takes never reads weaker under the pointer;
  only one row is lit.
- **An invalid or warned Ghost field keeps its edge while focused.**
- **A Markdown link is the framework's inline link**: underlined at rest, brightening under the pointer, as in a description.
- **A status bar word eases its ink with its ground under the pointer, and a press takes the stronger wash.**
- **An invalid pattern marks the find field through the framework's validation** (`validation.mark`): the invalid edge and
  colour and `aria-invalid`, as any refused field, rather than by hand. The mark carries no words — the count line says why — so
  it raises no message line, and the field no longer moves.
- **`registerLanguage(id, tokenizer, completions?)`**: a language package ships its completions with its tokenizer in one call;
  the optional third argument is what `registerCompletions` takes, and an entry queued in `__pendingLanguages` before the package loads
  may carry `completions` too.
- **The Markdown display reads in the ink of the ground it stands on.** In a component given a theme `Background` — a filled
  card — its text, the wash under its code and its muted parts (a sixth-level heading, a quote, struck text) take that colour's
  on-colour and the framework's muted share of it, where they kept the page's ink. The code field keeps its own ground and inks.
  A link there is the ground's on-colour too, underlined (the framework's `.ui-inline-link()`), where the brand ink read 1:1 on a
  Primary card.
- **The completion list's rows stand 2 px apart** (the framework's `.ui-entry-list()`), so the active row and the pointer's
  read as two; the list still shows about ten rows before it scrolls.

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
