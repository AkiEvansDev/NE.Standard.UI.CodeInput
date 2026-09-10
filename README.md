# NE.Standard.UI.CodeInput

A code editor component for the [NE.Standard](https://github.com/AkiEvansDev/NE.Standard) UI framework: a
monospaced field with syntax highlighting, line numbers, and find and replace that runs in the browser. Two
packages, on the framework's own pattern — the **component**, which is platform-independent, and its **web
rendering**, which carries the highlighting engine and the stylesheet embedded in its assembly.

## Install

```
dotnet add package NE.Standard.UI.CodeInput --prerelease
dotnet add package NE.Standard.UI.Web.CodeInput --prerelease
```

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
| `Language` | What the text is highlighted as: JSON, CSS, LESS, JavaScript, TypeScript, HTML, C#, Python, Bash, or plain text; two-way, the status bar's picker writes it back. |
| `LineNumbers` | A number beside every line (on by default). |
| `WrapLines` | Long lines wrap at the field's edge instead of scrolling sideways. |
| `TabSize` | How many spaces a tab stop is, and what the Tab key inserts; two-way, the status bar's picker writes it back. |
| `StatusBar` | The line under the text: the caret's line and column, and pickers for the tab size, the encoding, the line ending and the language (on by default). |
| `Encoding` | What the application writes the text out as (`UICodeEncodings`); the field holds text, the picker offers the choice, the controller receives it. |
| `LineEnding` | The line break the value is sent with (`UICodeLineEndings`): unset keeps whatever the value came with, which is what the bar shows; a choice converts on the next commit. |
| `Rows` | The number of visible text rows the field starts at; `Height` or `Fill` overrides it. |
| `Search` | Whether Ctrl+F and Ctrl+H open find and replace (on by default). |
| `DebounceMilliseconds` | Commit the value as the viewer types, this long after they pause; unset, on blur. |

`Value`, `IsReadOnly`, `Placeholder`, `Appearance`, the header's title, icon and badge, validation and
borders come from the framework's field, exactly as a text area's do — except that the editor starts as
`Ghost` — nothing drawn around it, on focus as at rest — and never lifts under the pointer: it is read, not
filled in.

Editing is the browser's own `<textarea>` — undo, selection, input methods and the clipboard all behave as
they do everywhere else — with the highlighted text drawn underneath it. Tab inserts spaces at the caret, or indents every selected
line, and Shift+Tab takes the indent back; Enter keeps the line's indentation, Escape closes the panel. **Ctrl+S** commits the value at once, ahead of any debounce, and
raises the field's `save` event — `.OnSave(nameof(Controller.Save))` is where an application writes it out.

Under the text runs a status bar, as an editor's: the caret's line and column, and pickers for the tab size, the
encoding, the line ending and the language. A picker's choice is the property's value — bind `TabSize`, `Encoding`,
`LineEnding` and `Language` two-way to read them. The line ending is the one thing the browser cannot keep for itself
(a text field holds every break as LF), so the field notes the ending the value came with, shows it, and sends the
value back with it; a choice converts the text on the next commit. `SetStatusBar(false)` hides the bar.

The encoding is a word, not bytes: the field holds text, and what `Encoding` means is decided where the file is
written. `Encoding.GetEncoding` knows `utf-8` and the two UTF-16 ids; `windows-1251`, `windows-1252` and
`iso-8859-1` need `CodePagesEncodingProvider.Instance` registered first, and `utf-8-bom` is UTF-8 written with a
preamble.

## Find and replace

Ctrl+F opens the panel over the field, Ctrl+H opens it on the replace row. Enter and Shift+Enter step through
the matches; the three toggles are match case, whole word and regular expression. A read-only field hides the
replace row. The panel's words translate through the application's localization source under the `ui.code.*`
keys, exactly as the framework's own do.

## Licence

The framework's: **the Prosperity Public License 3.0.0** — free for noncommercial use, with a thirty-day trial
for commercial use. See [LICENSE.md](LICENSE.md).
