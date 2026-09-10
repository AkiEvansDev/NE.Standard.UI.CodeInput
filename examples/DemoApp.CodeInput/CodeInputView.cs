using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Authoring.Views;
using NE.Standard.UI.CodeInput;
using NE.Standard.UI.Components.BuiltIns.Actions;
using NE.Standard.UI.Components.BuiltIns.Contents;
using NE.Standard.UI.Components.BuiltIns.Inputs;
using NE.Standard.UI.Components.BuiltIns.Layouts;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Primitives.Styling;

namespace DemoApp.CodeInput;

/// <summary>
/// A snippet editor: the language and the field's settings above, the editor filling the page, what the server holds below.
/// </summary>
internal sealed class CodeInputView : UIViewBase, IUIViewDefinition
{
    public static string ViewKey => "codeinput.demo";

    public override UIViewOptions Options { get; } = new() { ScrollContentOnly = true };

    protected override IVisualComponent? CreateHeader()
        => new ContainerComponent()
            .SetPadding(UIThickness.All(24, 20, 24, 4))
            .SetRow(1, UIGridUnit.Auto())
            .AddChild(new TextComponent()
                .SetTitle("Code input")
                .SetDescription("A field from NE.Standard.UI.CodeInput. Tab indents, Enter keeps the indentation, Ctrl+F finds and Ctrl+H replaces.")
                .SetPlacement(1, 1, 24, 1)
            );

    protected override IVisualComponent CreateContent()
        => new ContainerComponent()
            .SetPadding(UIThickness.All(24, 4, 24, 24))
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
                .SetTitle("Status bar")
                .BindValue(nameof(CodeInputController.StatusBar))
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
            .BindValue(nameof(CodeInputController.Code))
            .BindLanguage(nameof(CodeInputController.Language))
            .BindLineNumbers(nameof(CodeInputController.LineNumbers))
            .BindWrapLines(nameof(CodeInputController.WrapLines))
            .BindIsReadOnly(nameof(CodeInputController.ReadOnly))
            .BindSearch(nameof(CodeInputController.Search))
            .BindTabSize(nameof(CodeInputController.TabSize))
            .BindStatusBar(nameof(CodeInputController.StatusBar))
            .BindEncoding(nameof(CodeInputController.Encoding))
            .BindLineEnding(nameof(CodeInputController.LineEnding))
            .BindAppearance(nameof(CodeInputController.Appearance))
            .SetDebounceMilliseconds(400)
            .OnChange(nameof(CodeInputController.CodeChanged))
            .OnSave(nameof(CodeInputController.Save))
            .SetPlaceholder("Type some code…")
            .SetHeight(UILayoutLength.Fill())
            .SetHorizontalAlignment(UIAlignment.Stretch);
}
