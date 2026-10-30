using System.Linq;

namespace DemoApp.CodeInput;

/// <summary>
/// A snippet editor: the language and the field's settings above, the editor filling the page, what the server holds below.
/// </summary>
internal sealed class EditorView : CodeInputDemoView, IUIViewDefinition
{
    public static string ViewKey => "codeinput.editor";

    protected override string Route => EditorRoute;

    protected override string Header => "code-demo.editor.title";

    protected override string Description => "code-demo.editor.description";

    protected override DemoPage CreatePage()
        => Page(new ContainerComponent()
            .SetHeight(UILayoutLength.Fill())
            .SetRow(1, UIGridUnit.Auto())
            .AddRow(UIGridUnit.Star())
            .AddRow(UIGridUnit.Auto())
            // A toolbar over the field it configures: even columns that wrap, so every setting stays in reach on a narrow window.
            .AddChild(new WrapPanelComponent()
                .SetSpacing(16)
                .SetLineSpacing(8)
                .SetItemMinWidth(160)
                .SetMargin(UIThickness.All(0, 0, 0, 12))
                .SetHorizontalAlignment(UIAlignment.Stretch)
                .SetDefaults<SelectComponent>(static c => c.SetAppearance(UIInputAppearance.Filled).SetVerticalAlignment(UIAlignment.Center))
                .SetDefaults<SwitchComponent>(static c => c.SetVerticalAlignment(UIAlignment.Center))
                .AddChild(new SelectComponent()
                    // The languages the status bar lists, a registered one included: a name as written, plain text's word looked up.
                    .SetOptions([.. UICodeLanguages.All.Select(language => new OptionItem { Id = language.Key, Title = language.Value, IsContent = !UICodeInputStrings.IsWord(language.Value) })])
                    .BindValue<CodeInputController>(static c => c.Language)
                    .OnChange(nameof(CodeInputController.ChangeLanguage))
                )
                .AddChild(new SwitchComponent()
                    .SetTitle("code-demo.editor.line-numbers")
                    .BindValue<CodeInputController>(static c => c.LineNumbers)
                )
                .AddChild(new SwitchComponent()
                    .SetTitle("code-demo.editor.wrap-lines")
                    .BindValue<CodeInputController>(static c => c.WrapLines)
                )
                .AddChild(new SwitchComponent()
                    .SetTitle("code-demo.editor.read-only")
                    .BindValue<CodeInputController>(static c => c.ReadOnly)
                )
                .AddChild(new SwitchComponent()
                    .SetTitle("code-demo.editor.search")
                    .BindValue<CodeInputController>(static c => c.Search)
                )
                .AddChild(new SwitchComponent()
                    .SetTitle("code-demo.editor.multi-caret")
                    .BindValue<CodeInputController>(static c => c.MultiCaret)
                )
                .AddChild(new SwitchComponent()
                    .SetTitle("code-demo.editor.status-bar")
                    .BindValue<CodeInputController>(static c => c.StatusBar)
                )
                .AddChild(new SwitchComponent()
                    .SetTitle("code-demo.editor.completions")
                    .BindValue<CodeInputController>(static c => c.Completions)
                )
                // The field's five looks, named inside the box by a short word so the longest still fits a phone's half-width column.
                .AddChild(new SelectComponent()
                    .SetOptions([
                        new OptionItem { Id = nameof(UIInputAppearance.Ghost), Title = "code-demo.appearance.ghost" },
                        new OptionItem { Id = nameof(UIInputAppearance.Filled), Title = "code-demo.appearance.filled" },
                        new OptionItem { Id = nameof(UIInputAppearance.Outline), Title = "code-demo.appearance.outline" },
                        new OptionItem { Id = nameof(UIInputAppearance.Underline), Title = "code-demo.appearance.underline" }
                    ])
                    .SetTitle("code-demo.editor.appearance")
                    .SetTitlePlacement(UIInputTitlePlacement.Inside)
                    .BindValue<CodeInputController>(static c => c.Appearance)
                )
                .AddChild(new ButtonComponent()
                    .SetTitle("code-demo.editor.reset-sample")
                    .SetVariant(UIButtonVariant.Ghost)
                    .OnClick(nameof(CodeInputController.ResetSample))
                    .SetHorizontalAlignment(UIAlignment.Start)
                    .SetVerticalAlignment(UIAlignment.Center)
                )
                .SetPlacement(1, 1, 24, 1)
            )
            .AddChild(new CodeInputComponent()
                .SetTitle("code-demo.editor.snippet")
                // Held in the browser until Ctrl+S sends it (docs/VALUES.md §4): nothing travels while the reader types.
                .SetFormId(CodeInputController.EditorForm)
                .BindValue<CodeInputController>(static c => c.Code, mode: UIBindingMode.OnSubmit)
                .BindLanguage<CodeInputController>(static c => c.Language)
                .BindLineNumbers<CodeInputController>(static c => c.LineNumbers)
                .BindWrapLines<CodeInputController>(static c => c.WrapLines)
                .BindIsReadOnly<CodeInputController>(static c => c.ReadOnly)
                .BindSearch<CodeInputController>(static c => c.Search)
                .BindMultiCaret<CodeInputController>(static c => c.MultiCaret)
                .BindTabSize<CodeInputController>(static c => c.TabSize)
                .BindStatusBar<CodeInputController>(static c => c.StatusBar)
                .BindCompletions<CodeInputController>(static c => c.Completions)
                // A small sample file under wwwroot, offered whatever the language; see "Completions" in the package's README for the JSON shape.
                .SetCompletionsSource("/completions/csharp.json")
                .BindEncoding<CodeInputController>(static c => c.Encoding)
                .BindLineEnding<CodeInputController>(static c => c.LineEnding)
                .BindAppearance<CodeInputController>(static c => c.Appearance)
                .OnSave(nameof(CodeInputController.Save))
                .SetPlaceholder("code-demo.editor.placeholder")
                .SetHeight(UILayoutLength.Fill())
                .SetHorizontalAlignment(UIAlignment.Stretch)
                .SetPlacement(1, 2, 24, 1)
            )
            .AddChild(new TextComponent()
                .BindTitle<CodeInputController>(static c => c.Status)
                .SetTitleType(UITextAppearance.Caption)
                .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                .SetMargin(UIThickness.All(0, 8, 0, 0))
                .SetPlacement(1, 3, 24, 1)
            )
        );
}
