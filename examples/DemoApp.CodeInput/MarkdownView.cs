using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Authoring.Views;
using NE.Standard.UI.CodeInput;
using NE.Standard.UI.Components.BuiltIns.Layouts;
using NE.Standard.UI.Primitives.Binding;
using NE.Standard.UI.Primitives.Styling;

namespace DemoApp.CodeInput;

/// <summary>
/// The two components side by side, joined by nothing but the controller's property: a Markdown editor on the left, the document it
/// holds rendered on the right as the reader types.
/// </summary>
internal sealed class MarkdownView : CodeInputDemoView, IUIViewDefinition
{
    public static string ViewKey => "codeinput.markdown";

    // The editor and the rendering scroll together, line against line.
    private const string DocumentScroll = "document";

    protected override string Route => MarkdownRoute;

    public override string Title => "Markdown";

    protected override string Description
        => "A code field in Markdown and a MarkdownDisplay bound to the same text; neither knows about the other.";

    protected override IVisualComponent CreatePage()
        => new ContainerComponent()
            .SetHeight(UILayoutLength.Fill())
            .AddChild(new CodeInputComponent()
                .SetTitle("Document")
                .SetLanguage(UICodeLanguages.Markdown)
                .SetWrapLines()
                .SetTabSize(2)
                .SetAppearance(UIInputAppearance.Outline)
                .BindValue(nameof(MarkdownController.Document), mode: UIBindingMode.TwoWay)
                .SetDebounceMilliseconds(300)
                .SetScrollGroup(DocumentScroll)
                .SetHeight(UILayoutLength.Fill())
                .SetMargin(UIThickness.All(0, 0, 12, 0))
                .SetPlacement(1, 1, 12, 1)
            )
            .AddChild(new ScrollContainerComponent()
                .SetHeight(UILayoutLength.Fill())
                .SetPadding(UIThickness.All(16, 4, 16, 16))
                .SetMargin(UIThickness.All(12, 0, 0, 0))
                .SetScrollGroup(DocumentScroll)
                .AddChild(new MarkdownDisplayComponent()
                    .BindText(nameof(MarkdownController.Document))
                )
                .SetPlacement(13, 1, 12, 1)
            );
}
