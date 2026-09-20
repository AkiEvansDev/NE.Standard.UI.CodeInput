using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Authoring.Views;
using NE.Standard.UI.CodeInput;
using NE.Standard.UI.Components.BuiltIns.Actions;
using NE.Standard.UI.Components.BuiltIns.Contents;
using NE.Standard.UI.Components.BuiltIns.Inputs;
using NE.Standard.UI.Components.BuiltIns.Layouts;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Components.Foundation.Inputs;
using NE.Standard.UI.Primitives.Binding;
using NE.Standard.UI.Primitives.Styling;

namespace DemoApp.CodeInput;

/// <summary>
/// A snippet editor: the language and the field's settings above, the editor filling the page, what the server holds below.
/// </summary>
internal sealed class EditorView : CodeInputDemoView, IUIViewDefinition
{
    public static string ViewKey => "codeinput.editor";

    protected override string Route => EditorRoute;

    public override string Title => "Editor";

    protected override string Description
        => "A field from NE.Standard.UI.CodeInput. Tab indents, Enter keeps the indentation, Ctrl+F finds and Ctrl+H replaces, " +
           "Ctrl+U/Ctrl+Shift+U change case, and Ctrl+Space opens completions (C# offers a few of its own, from a JSON file).";

    protected override IVisualComponent CreatePage()
        => new ContainerComponent()
            .SetHeight(UILayoutLength.Fill())
            .SetRow(1, UIGridUnit.Auto())
            .AddRow(UIGridUnit.Star())
            .AddRow(UIGridUnit.Auto())
            .AddChild(CreateSettings().SetPlacement(1, 1, 24, 1))
            .AddChild(CreateEditor().SetPlacement(1, 2, 24, 1))
            .AddChild(new TextComponent()
                .BindTitle(nameof(CodeInputController.Status))
                .SetTitleType(UITextAppearance.Caption)
                .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                .SetMargin(UIThickness.All(0, 8, 0, 0))
                .SetPlacement(1, 3, 24, 1)
            );

    private static StackPanelComponent CreateSettings()
        => new StackPanelComponent()
            .SetOrientation(UIOrientation.Horizontal)
            .SetSpacing(16)
            .SetVerticalAlignment(UIAlignment.Center)
            .SetMargin(UIThickness.All(0, 0, 0, 12))
            .AddChild(new SelectComponent()
                .SetOptions([
                    new OptionItem { Id = UICodeLanguages.CSharp, Title = "C#" },
                    new OptionItem { Id = UICodeLanguages.Json, Title = "JSON" },
                    new OptionItem { Id = UICodeLanguages.Css, Title = "CSS" },
                    new OptionItem { Id = UICodeLanguages.Less, Title = "LESS" },
                    new OptionItem { Id = UICodeLanguages.JavaScript, Title = "JavaScript" },
                    new OptionItem { Id = UICodeLanguages.TypeScript, Title = "TypeScript" },
                    new OptionItem { Id = UICodeLanguages.Html, Title = "HTML" },
                    new OptionItem { Id = UICodeLanguages.Bash, Title = "Bash" },
                    new OptionItem { Id = UICodeLanguages.Python, Title = "Python" },
                    new OptionItem { Id = UICodeLanguages.Markdown, Title = "Markdown" },
                    new OptionItem { Id = UICodeLanguages.PlainText, Title = "Plain text" }
                ])
                .BindValue(nameof(CodeInputController.Language))
                .OnChange(nameof(CodeInputController.ChangeLanguage))
                .SetWidth(UILayoutLength.Absolute(200))
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Line numbers")
                .BindValue(nameof(CodeInputController.LineNumbers))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Wrap lines")
                .BindValue(nameof(CodeInputController.WrapLines))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Read-only")
                .BindValue(nameof(CodeInputController.ReadOnly))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Search")
                .BindValue(nameof(CodeInputController.Search))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Multi-caret")
                .BindValue(nameof(CodeInputController.MultiCaret))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Status bar")
                .BindValue(nameof(CodeInputController.StatusBar))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Completions")
                .BindValue(nameof(CodeInputController.Completions))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new ButtonComponent()
                .BindTitle(nameof(CodeInputController.AppearanceCaption))
                .SetType(UIButtonType.Outline)
                .OnClick(nameof(CodeInputController.CycleAppearance))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new ButtonComponent()
                .SetTitle("Reset sample")
                .SetType(UIButtonType.Ghost)
                .OnClick(nameof(CodeInputController.ResetSample))
                .SetVerticalAlignment(UIAlignment.Center)
            );

    private static CodeInputComponent CreateEditor()
        => new CodeInputComponent()
            .SetTitle("Snippet")
            // Held in the browser until Ctrl+S sends it (docs/VALUES.md §4): nothing travels while the reader types.
            .SetFormId(CodeInputController.EditorForm)
            .BindValue(nameof(CodeInputController.Code), mode: UIBindingMode.OnSubmit)
            .BindLanguage(nameof(CodeInputController.Language))
            .BindLineNumbers(nameof(CodeInputController.LineNumbers))
            .BindWrapLines(nameof(CodeInputController.WrapLines))
            .BindIsReadOnly(nameof(CodeInputController.ReadOnly))
            .BindSearch(nameof(CodeInputController.Search))
            .BindMultiCaret(nameof(CodeInputController.MultiCaret))
            .BindTabSize(nameof(CodeInputController.TabSize))
            .BindStatusBar(nameof(CodeInputController.StatusBar))
            .BindCompletions(nameof(CodeInputController.Completions))
            // A small sample file under wwwroot; see "Completions" in the package's README for the JSON shape.
            .SetCompletionsSource("/completions/csharp.json")
            .BindEncoding(nameof(CodeInputController.Encoding))
            .BindLineEnding(nameof(CodeInputController.LineEnding))
            .BindAppearance(nameof(CodeInputController.Appearance))
            .OnSave(nameof(CodeInputController.Save))
            .SetPlaceholder("Type some code…")
            .SetHeight(UILayoutLength.Fill())
            .SetHorizontalAlignment(UIAlignment.Stretch);
}
