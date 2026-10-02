namespace DemoApp.CodeInput;

/// <summary>
/// The two components side by side, joined by nothing but the controller's property: a Markdown editor on the left, the document it
/// holds rendered on the right as the reader types. Below a wide screen the rendering stands under the editor and the page scrolls:
/// side by side on a tablet each pane had some 270 pixels, too narrow for the document's lines, words or the field's status bar.
/// </summary>
internal sealed class MarkdownView : CodeInputDemoView, IUIViewDefinition
{
    public static string ViewKey => "codeinput.markdown";

    // The editor and the rendering scroll together, line against line.
    private const string DocumentScroll = "document";

    // The editor's height when the rendering stands under it rather than beside it.
    private const double StackedEditorHeight = 420;

    protected override string Route => MarkdownRoute;

    public override string Title => "code-demo.markdown.title";

    protected override string Description => "code-demo.markdown.description";

    protected override UIResponsive<UILayoutLength> ContentHeight => Filled(UILayoutLength.Auto());

    protected override DemoPage CreatePage()
        => Page(new ContainerComponent()
            .SetHeight(Filled(UILayoutLength.Auto()))
            .AddChild(new CodeInputComponent()
                .SetTitle("code-demo.markdown.document")
                .SetLanguage(UICodeLanguages.Markdown)
                .SetWrapLines()
                .SetTabSize(2)
                .SetAppearance(UIInputAppearance.Outline)
                .BindValue(nameof(MarkdownController.Document), mode: UIBindingMode.TwoWay)
                .SetDebounceMilliseconds(300)
                // A picture pasted or dropped goes up, and the controller answers with where it keeps it.
                .OnPictureUpload(nameof(MarkdownController.AddPictureAsync))
                .SetMaxFileSize(MarkdownPictures.MaxBytes)
                .SetScrollGroup(DocumentScroll)
                .SetHeight(Filled(UILayoutLength.Absolute(StackedEditorHeight)))
                .SetMargin(UIResponsive<UIThickness>.Create(UIThickness.Uniform(0), xl: UIThickness.All(0, 0, 12, 0)))
                .SetPlacement(1, 1, 24, 1, xl: UIGridPlacement.At(1, 1, 12, 1))
            )
            .AddChild(new ScrollContainerComponent()
                .SetHeight(Filled(UILayoutLength.Auto()))
                .SetPadding(UIResponsive<UIThickness>.Create(UIThickness.All(0, 16, 0, 0), xl: UIThickness.All(16, 4, 16, 16)))
                .SetMargin(UIResponsive<UIThickness>.Create(UIThickness.All(0, 8, 0, 0), xl: UIThickness.All(12, 0, 0, 0)))
                .SetScrollGroup(DocumentScroll)
                .AddChild(new MarkdownDisplayComponent()
                    .BindText(nameof(MarkdownController.Document))
                )
                .SetPlacement(1, 2, 24, 1, xl: UIGridPlacement.At(13, 1, 12, 1))
            )
        );

    /// <summary>A part's height: the page's own side by side from a wide screen on, <paramref name="stacked"/> under it.</summary>
    private static UIResponsive<UILayoutLength> Filled(UILayoutLength stacked)
        => UIResponsive<UILayoutLength>.Create(stacked, xl: UILayoutLength.Fill());
}
