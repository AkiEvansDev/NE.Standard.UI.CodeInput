# NE.Standard.UI.CodeInput

A code editor component for the [NE.Standard](https://github.com/AkiEvansDev/NE.Standard) UI framework: a
monospaced field with syntax highlighting, line numbers, and find and replace that runs in the browser. Two
packages, on the framework's own pattern — the **component**, which is platform-independent, and its **web
rendering**, which carries the highlighting engine and the stylesheet embedded in its assembly.

## Install

```
dotnet add package NE.Standard.UI.CodeInput
dotnet add package NE.Standard.UI.Web.CodeInput
```

Both packages bring their namespaces as global usings, so the code below needs no `using` line for them; a project that
sets `NEStandardUIImplicitUsings` to `false` writes its own.

Register the web rendering beside the framework's renderers:

```csharp
services.AddStandardRenderers();
services.AddCodeInput();
```

## Using it

```csharp
new CodeInputComponent()
    .SetTitle("appsettings.json")
    .SetLanguage(UICodeLanguages.Json)
    .SetRows(20)
    .BindValue(nameof(SettingsController.Json))
```

| Property | What it does |
|---|---|
| `Language` | What the text is highlighted as: JSON, CSS, LESS, JavaScript, TypeScript, HTML, C#, Python, Bash, Markdown, plain text, or a language an application declared with `UICodeLanguages.Register`; two-way, the status bar's picker writes it back. |
| `LineNumbers` | A number beside every line (on by default). |
| `WrapLines` | Long lines wrap at the field's edge instead of scrolling sideways. |
| `TabSize` | How many spaces a tab stop is, and what the Tab key inserts; two-way, the status bar's picker writes it back. |
| `StatusBar` | The line under the text: the caret's line and column, and pickers for the tab size, the encoding, the line ending and the language (on by default). |
| `Encoding` | What the application writes the text out as (`UICodeEncodings`); the field holds text, the picker offers the choice, the controller receives it. |
| `LineEnding` | The line break the value is sent with (`UICodeLineEndings`): unset keeps whatever the value came with, which is what the bar shows; a choice converts on the next commit. |
| `Rows` | The number of visible text rows the field starts at; `Height` or `Fill` overrides it. |
| `Search` | Whether Ctrl+F and Ctrl+H open find and replace (on by default). |
| `MultiCaret` | Whether the field takes more than one caret — see *Several carets* (on by default). |
| `Completions` | Whether Ctrl+Space and typing open a completion list — see *Completions* (on by default). |
| `CompletionsSource` | The URL of a JSON file of completion items and trigger characters the client loads once — see *Completions*. |
| `FormatBar` | Whether a Markdown field offers its format bar and keys — see *Formatting Markdown* (on by default). |
| `DebounceMilliseconds` | Commit the value as the viewer types, this long after they pause; unset, on blur. |
| `MaxFileSize`, `Accept` | The largest picture a paste or a drop takes, and its types — see *Pictures in Markdown*. |

`Value`, `IsReadOnly`, `Placeholder`, `Appearance`, the header's title, icon and badge, validation and
borders come from the framework's field, exactly as a text area's do — except that the editor starts as
`Ghost` — nothing drawn around it, on focus as at rest, save the edge of an invalid or warned value, which stays while the
field is focused — and never lifts under the pointer: it is read, not filled in.

Editing is the browser's own `<textarea>` — typing, selection, input methods and the clipboard behave as they
do everywhere else — with the highlighted text drawn underneath it. Undo and redo (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z) are the
field's own, since the browser's cannot hold an edit made at several carets: typing is taken back a word at a time, and the
carets come back with the text. A value the server pushes that differs from the text starts the history afresh. Tab inserts
spaces at the caret, or indents every selected line, and Shift+Tab takes the indent back; Enter keeps the line's indentation,
Escape closes the panel. With nothing of the field's own open — the panel, the list, the format bar, extra carets — Escape leaves the field, and
the next Tab goes on to the control after it: the way out for the keyboard, since Tab indents inside. In a dialog or a drawer the
field's Escape is its own too, so the dialog closes only on the one after it. Every Ctrl chord below is ⌘ on macOS, matched by the
key's place whatever the layout types there. **Ctrl+S** commits the value at once, ahead of any debounce, and
raises the field's `save` event — `.OnSave(nameof(Controller.Save))` is where an application writes it out. **Ctrl+U** turns the
selection, or the identifier the caret touches, to lower case, and **Ctrl+Shift+U** to upper case — Visual Studio's own keys; a
selection stays selected and a caret keeps its place in the word.

Under the text runs a status bar, as an editor's: the caret's line and column, and pickers for the tab size, the
encoding, the line ending and the language. A picker's choice is the property's value — bind `TabSize`, `Encoding`,
`LineEnding` and `Language` two-way to read them. The line ending is the one thing the browser cannot keep for itself
(a text field holds every break as LF), so the field notes the ending the value came with, shows it, and sends the
value back with it; a choice converts the text on the next commit. `SetStatusBar(false)` hides the bar, and
`SetSearch(false)` the find panel; written as a value rather than bound, either leaves its controls out of the page
altogether, which is what keeps a read-only listing light. While the field is read-only its pickers are too: each still
shows its setting and stays in the Tab order, and none opens a list.

The pickers list what the server knows. A language a package adds — a script that registers its tokenizer with the editor
under an id of its own — is declared on the server too, once at startup, so the picker lists it under its name:
`UICodeLanguages.Register("sql", "SQL")`. A name is shown as written — every option is marked content (`OptionItem.IsContent`),
and so is the line-ending placeholder, so none is looked up or reported missing, key prefixes or not; the two that are
words — plain text and UTF-8 with BOM — are the keys `ui.code.plain-text` and `ui.code.utf8-bom`, translated as the bar's other
words are. `UICodeInputStrings.IsWord(name)` tells the two apart for a list an application builds from `UICodeLanguages.All` or
`UICodeEncodings.All` itself: `IsContent = !UICodeInputStrings.IsWord(name)`. In a narrow field the caret's position gives way
first, then the pickers' words, each ending in an ellipsis.

The encoding is a word, not bytes: the field holds text, and what `Encoding` means is decided where the file is
written. `Encoding.GetEncoding` knows `utf-8` and the two UTF-16 ids; `windows-1251`, `windows-1252` and
`iso-8859-1` need `CodePagesEncodingProvider.Instance` registered first, and `utf-8-bom` is UTF-8 written with a
preamble.

## Saving

Bound `TwoWay`, the field commits on blur, or as the reader types with `DebounceMilliseconds`. For an editor that should
send nothing until it is saved, bind it `OnSubmit` with a `FormId`: the text stays in the browser, a value the server
pushes meanwhile does not overwrite it, and Ctrl+S sends it and runs `OnSave`.

```csharp
new CodeInputComponent()
    .SetFormId("editor")
    .BindValue(nameof(EditorController.Text), mode: UIBindingMode.OnSubmit)
    .OnSave(nameof(EditorController.Save))
```

A command that replaces the text on purpose — another file opened, a sample reset — returns
`DiscardFormEffect("editor")`, and the unsaved edit gives way to the server's value. A large text needs nothing of its
own: the framework sends a value over 8 KB beside the connection.

## Formatting Markdown

A Markdown field is a note editor too. Select words with the mouse, and a bar of icons stands over them — the framework's action
bar look — with bold `**`, italic `*`, strikethrough `~~`, inline code `` ` ``, a link, a heading `#` and a bulleted list `-`:

- Each is a toggle. Words already wrapped — the marks selected with them, or just outside the selection — are unwrapped, and a
  pressed button says so. The space a double click takes after a word stays outside the marks; code holding a backtick is
  fenced by a longer run.
- A link takes the words as its text and leaves the caret between the parentheses for the address; an address selected becomes
  the address, the caret left where the words go.
- The list acts on every selected line: put on the lines without one, or taken off when every line has one. The heading button
  opens a menu of the six levels, the lines' own level checked: a level makes every selected line a heading of it, in place of
  another, and the checked one takes the heading off (the arrows round its ends, a level's first letter, Enter; Escape or Tab
  closes it; ArrowDown on the button opens it on the checked level).
- **Ctrl+B**, **Ctrl+I** and **Ctrl+K** (⌘ on a Mac) do the same with the keyboard; with nothing selected they write the pair and
  put the caret between. **Alt+F10** takes the keyboard to the bar (arrows along it, Escape back to the text).

Every press is one edit: one Ctrl+Z takes it back, and the value commits as typing does. The bar goes as the reader types, presses
elsewhere, scrolls the selection out of view or presses Escape. A selection a finger makes shows no bar — the phone's own menu
stands over it — and a read-only or disabled field, or one in another language, has none. `SetFormatBar(false)` turns the bar and
its keys off.

## Pictures in Markdown

A Markdown field takes a picture pasted (Ctrl+V) or dropped onto it once the application says where pictures go. The field keeps
nothing: it sends the file up through the framework's own upload and the application's command keeps it wherever it keeps files,
answering with the address the picture is shown from.

```csharp
new CodeInputComponent()
    .SetLanguage(UICodeLanguages.Markdown)
    .BindValue(nameof(DocsController.Readme))
    .OnPictureUpload(nameof(DocsController.AddPictureAsync))
    .SetMaxFileSize(2 * 1024 * 1024)
```

```csharp
[UICommand]
public async Task<UICommandResult> AddPictureAsync(string selection, CancellationToken cancellationToken)
{
    UIUploadSelection chosen = await Context.Uploads.GetSelectionAsync(Context.Handle, selection, cancellationToken);
    // ...keep chosen.SingleFile where the application keeps files...
    return UICommandResult.Ok([new InsertPictureEffect(selection, address)]);
}
```

While a picture uploads, a placeholder stands at the caret, or where the picture was let go — `![Uploading shot.png…]()`, in the
reader's language — and the reader goes on editing. The answer's `InsertPictureEffect` turns the placeholder into
`![shot](address)` wherever the edits have moved it; several pictures at once stand a line each, and each lands at its own
placeholder whichever answers first. One Ctrl+Z takes a picture that landed straight away back whole, as it would typed text. A
command that fails takes the placeholder out and says its words on the field's validation line (`UICommandResult.Fail`, a key
or text); an answer without the effect takes it out quietly, and a placeholder the reader deleted is not put back. The command's
keys are `CodeInputArguments.Selection` and `CodeInputArguments.FileName` — bound as `selection` and `fileName` by the
one-argument `OnPictureUpload`.

`MaxFileSize` refuses a larger picture before it is sent, in the framework's own words for a file input's limit, and `Accept`
narrows the types as a file input's does (`image/png, .jpg`); only a picture is ever taken. Without `OnPictureUpload` a paste is
text alone, a copy that carries words beside a picture of them pastes the words, and a field in any language but Markdown —
the one whose text can hold a picture — never takes one. The address is the application's: the effect refuses a `data:` address,
so the text never carries the picture itself.

## Several carets

As in Visual Studio, the field can hold more than one caret, and typing, deleting, Tab, Enter and the clipboard act at
every one of them:

| Keys | What they do |
|---|---|
| Ctrl+Alt+click | Adds a caret where the click lands; a click on a caret that is already there takes it away. |
| Shift+Alt+. | Selects the word at the caret, then adds the next place the selection's text occurs. |
| Shift+Alt+; | Selects every place the selection's text — or the word at the caret — occurs. |
| Shift+Alt+arrows | A column selection: a range on every line between two columns, from where the caret stood. A line too short to reach the column keeps its caret at it all the same, and typing writes out the spaces that carry it there. |
| Arrows, Home, End, PageUp, PageDown | Move every caret; with Shift, extend every selection; with Ctrl, by word. |
| Escape | Leaves only the primary caret. |

A plain click, Ctrl+A or a step of the find panel leaves one caret again. A copy from several selections puts a line
each on the clipboard, and a paste of as many lines — or of what such a copy took — deals one to each caret. Up and
Down move by the text's lines, not the rows a wrapped line is drawn in, and an input method composes at the primary
caret alone. `SetMultiCaret(false)` turns all of it off; a read-only field never has more than one caret.

## Find and replace

The panel stands over the field in three rows, as Visual Studio's does: the find field with the two arrows among the
matches and the cross; the replace field with its two buttons, folded out by the chevron before the find field, each
standing under one of the arrows; and, under both, the three switches — match case, whole word and regular expression —
with the match count at the far end of that row, where what it says never sets the panel's width. The switches are drawn as
marks, and a screen reader hears the words of their tooltips as their names.

Ctrl+F opens the panel, Ctrl+H opens it with the replace row out, and the row stays as the reader left it between
openings. Enter and Shift+Enter step through the matches; in the replace field Enter replaces the match the reader is
on and Ctrl+Enter replaces every one. A read-only field shows neither the replace row nor the chevron that folds it
out. The panel's words translate through the application's localization source under the `ui.code.*` keys, exactly as
the framework's own do; the package ships them in Russian and Simplified Chinese too (`CodeInputStrings.Translations`),
turned on with `application.AddFrameworkWords("ru", "zh-Hans")` and outranked by any word of the application's own.

Whole word counts a word as the editor does — letters of any script, digits and the underscore — so a Cyrillic or accented
word has its edges. With a regular expression, the replacement's `$` patterns (`$1`, `$<name>`, `$&`, `` $` ``, `$'`, `$$`)
are filled the same way by Replace and Replace all, each match read in the whole text, so a lookaround sees what stands around
it.

## Completions

Ctrl+Space opens a completion list under the word at the caret, and it stays under the word's start as the word is typed;
typing an identifier opens it too, once it has somewhere to complete from beyond the document's own words. The arrows move among
the suggestions, Enter and Tab accept the one that is active, and Escape closes the list, as they do in Visual Studio; the
pointer moves the active suggestion, as it does in a native list, and a click accepts it. The list never opens inside a comment
or a string, nor in a read-only field, and closes on a blur, on the field turning read-only, disabled or loading, on a scroll
that takes the word out of view, or on the caret moving anywhere but along with what is typed; a provider's answer that arrives
after that is dropped.

The field offers the mechanism; the words are the application's own, or a package's. `Completions` turns the mechanism on and off
(on by default). `CompletionsSource` names the URL of a JSON file the client loads once, the first time the list is needed, and
keeps for the page:

```json
{
    "items": [
        { "label": "Console", "insert": "Console", "detail": "class", "kind": "type" }
    ],
    "triggers": ["."]
}
```

`insert` is optional and defaults to `label`; `detail` is optional and shown muted after it; `kind` is optional, one of `keyword`,
`type`, `function`, `variable`, `property` or `text`, and colours the row with the same ink the text itself is highlighted in.
`triggers` is optional: characters that open the list themselves, right after they are typed. Serve the file as a plain static
asset — a file under the host's own `wwwroot` with `app.UseStaticFiles()`, as the demo does — there is nothing of the framework's
to build for it: `WebAssetDescriptor` is the framework's own way of shipping a package's script and stylesheet, not a host's file.

A script may add words of its own instead, or beside the file:

```js
window.NEStandardUICodeInput.registerCompletions("csharp", [
    { label: "Console", kind: "type" }
]);
// or a provider, asked afresh each time the list opens or re-filters
window.NEStandardUICodeInput.registerCompletions("csharp", context => lookup(context.prefix));
```

`"*"` registers for every language. Besides a file or a script, the list already offers the language's own keywords and every
identifier the document itself holds — so a plain-text field, with neither of the first two, only ever completes from the text,
and does not open itself as the reader types; Ctrl+Space still opens it there.

A language package ships its words with its tokenizer in one call: `registerLanguage` takes them as its third argument, a list
or a provider as `registerCompletions` does.

```js
window.NEStandardUICodeInput.registerLanguage("sql", sqlTokenizer, [
    { label: "SELECT", kind: "keyword" }
]);
```

## Markdown display

`MarkdownDisplayComponent` shows a Markdown document as formatted text. It knows nothing of the code field — put the two
side by side and bind them to one property, and the display follows the editor:

```csharp
new MarkdownDisplayComponent()
    .BindText(nameof(DocsController.Readme))
```

The document is CommonMark — headings, paragraphs, emphasis, code spans and blocks, quotes, lists, links and images
inline and by reference, rules — with GitHub's tables, task lists, strikethrough and bare links. A fenced block is
highlighted in the code field's colours as the language its info string names (the ids of `UICodeLanguages`, a
language a package registered, and the common short names: `cs`, `js`, `ts`, `sh`, `py`, `md`). The rendering happens in
the browser; a value the server pushes renders again.

Raw HTML in a document is shown as text, not markup, and its addresses are judged by the framework's one rule, the one its
own links and pictures follow (`urls` on the plugin surface): a link keeps an address that is relative or `http`, `https`,
`mailto` or `tel`, with no space or control character anywhere; an image keeps a path of the site, absolute or relative to the
page (`img/x.png`, `x.png`), an `http(s)` or a `data:image/…` address, written as the browser reads it; anything else —
`javascript:` among them — leaves its words alone. A link off the page — a web, mail or phone address, or `//host`, `\\host`
and `/\host`, which a browser reads as another host — opens in a new tab. Every line is read in time linear in its length, so a long line in a document another
viewer wrote cannot freeze the page. A task item's box is the framework's read-only checkbox, shown and never toggled. Quotes and lists nest
at most 64 deep; a deeper marker reads as text. A document that cannot be rendered is shown as its source, and a package's
tokenizer that fails leaves its block, or its line in the field, plain.

The body is styled by element under `.ui-markdown__body`, in the page's type and the inks of the ground it stands on — a
display in a component given a theme `Background` reads in that colour's on-colour; an application restyles it there. A link is the framework's inline link, as in any description: underlined, brightening under the pointer.

The syntax colours — the field's and a display's code — are Visual Studio's, a light and a dark value each, chosen by the
colour scheme in force on the component: a field or a display given a `Theme` of its own takes that theme's colours, not the
page's. Under forced colours (Windows' contrast themes) the find matches, the extra carets and selections and the active
suggestion are drawn in the system's colours.

An editor and a display scroll together when both are in one of the framework's scroll groups — the display through the
container it scrolls in. The field marks its lines and the display the line each block starts on, so the two are kept
line against line rather than by the share scrolled:

```csharp
new CodeInputComponent()
    .SetLanguage(UICodeLanguages.Markdown)
    .BindValue(nameof(DocsController.Readme))
    .SetScrollGroup("readme")

new ScrollContainerComponent()
    .SetScrollGroup("readme")
    .AddChild(new MarkdownDisplayComponent().BindText(nameof(DocsController.Readme)))
```

## Inside the package

Every control the field shows is the framework's own component — the find and replace fields are text inputs, the
arrows and the switches are buttons, the status bar's pickers are selects — carried as a region under the names
`UICodeInputRegions` gives them, so the panel and the bar follow the theme as every other field does.

## Licence

The framework's: **the Prosperity Public License 3.0.0** — free for noncommercial use, with a thirty-day trial
for commercial use. See [LICENSE.md](https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/blob/main/LICENSE.md).

## Contributing

This repository is a **read-only mirror**. Development happens in a private repository alongside the
framework — that is how the editor stays in step with the renderer it plugs into — and everything here is
generated from it, so pull requests are switched off.

Issues are open and welcome.
