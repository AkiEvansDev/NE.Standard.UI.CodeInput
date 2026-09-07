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
    .SetLanguage(UICodeLanguage.Json)
    .SetRows(20)
    .BindValue(nameof(SettingsController.Json))
```

| Property | What it does |
|---|---|
| `Language` | What the text is highlighted as: JSON, CSS, LESS, JavaScript, TypeScript, HTML, C#, Python, Bash, or plain text. |
| `LineNumbers` | A number beside every line (on by default). |
| `WrapLines` | Long lines wrap at the field's edge instead of scrolling sideways. |
| `TabSize` | How many spaces a tab stop is, and what the Tab key inserts. |
| `Rows` | The number of visible text rows the field starts at; `Height` or `Fill` overrides it. |
| `Search` | Whether Ctrl+F and Ctrl+H open find and replace (on by default). |
| `DebounceMilliseconds` | Commit the value as the viewer types, this long after they pause; unset, on blur. |

`Value`, `IsReadOnly`, `Placeholder`, `Appearance`, the header's title, icon and badge, validation and
borders come from the framework's field, exactly as a text area's do — except that the editor starts as
`Ghost` (no box until it is focused) and never lifts under the pointer: it is read, not filled in.

Editing is the browser's own `<textarea>` — undo, selection, input methods and the clipboard all behave as
they do everywhere else — with the highlighted text drawn underneath it. Tab inserts spaces, Enter keeps the
line's indentation, Escape closes the panel. **Ctrl+S** commits the value at once, ahead of any debounce, and
raises the field's `save` event — `.OnSave(nameof(Controller.Save))` is where an application writes it out.

## Find and replace

Ctrl+F opens the panel over the field, Ctrl+H opens it on the replace row. Enter and Shift+Enter step through
the matches; the three toggles are match case, whole word and regular expression. A read-only field hides the
replace row. The panel's words translate through the application's localization source under the `ui.code.*`
keys, exactly as the framework's own do.

## Licence

The framework's: **the Prosperity Public License 3.0.0** — free for noncommercial use, with a thirty-day trial
for commercial use. See [LICENSE.md](LICENSE.md).
