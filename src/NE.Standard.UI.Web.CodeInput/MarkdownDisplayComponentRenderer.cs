using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Text.Json;
using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.CodeInput;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Abstractions.Theming;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.CodeInput;

/// <summary>
/// Renders the Markdown display: the document as the root's attribute, into an empty body the client fills and refills whenever
/// that attribute changes.
/// </summary>
public sealed class MarkdownDisplayComponentRenderer : WebComponentRendererBase
{
    /// <summary>On the root: the Markdown document the client renders into the body.</summary>
    public const string SourceAttribute = "data-ui-markdown-source";

    /// <summary>On the root: the styles of Markdown's own runs and of the author's, as the declarations the client writes on each.</summary>
    public const string StylesAttribute = "data-ui-markdown-styles";

    /// <summary>On the root: where the client fetches a picture from besides an image data address and the content route, as JSON.</summary>
    public const string ImageSourcesAttribute = "data-ui-markdown-image-sources";

    private static readonly JsonSerializerOptions AttributeJsonOptions = WebWireJson.CreateOptions();

    public override string ComponentTypeKey => MarkdownDisplayComponent.ComponentTypeKey;

    protected override string ClassName => "ui-markdown";

    protected override void RenderComponent(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        // A document is read, so its words select as a Text's do.
        _ = root.Class(WebClassNames.ContentText);

        RenderTooltip(context, root);

        _ = RenderProperty<string?>(context, root, MarkdownDisplayComponent.TextProperty, static (target, value) =>
            _ = target.Attribute(SourceAttribute, value ?? string.Empty)
        , [WebDomOperation.Attribute(SourceAttribute)]);

        // Its region is held until the engine has drawn the document, or a page load paints the display empty. Render-time only: a
        // document pushed later is drawn as it arrives.
        if (!string.IsNullOrEmpty(ReadRenderValue<string?>(context, MarkdownDisplayComponent.TextProperty, null)))
            _ = root.Attribute(WebAttributes.AwaitsDraw);

        RenderStyles(context, root);
        RenderImageSources(context, root);

        _ = root.Element("div", body => _ = body.Class($"{ClassName}__body"));
    }

    // Render-time only: the styles are how the display is built, so a pushed document is drawn in the same ones.
    private static void RenderStyles(WebRenderContext context, IHtmlElementBuilder root)
    {
        IReadOnlyList<UIMarkdownMarkStyle> marks = ReadRenderValue<IReadOnlyList<UIMarkdownMarkStyle>?>(context, MarkdownDisplayComponent.MarkStylesProperty, null) ?? [];
        IReadOnlyList<UIMarkdownSpanStyle> spans = ReadRenderValue<IReadOnlyList<UIMarkdownSpanStyle>?>(context, MarkdownDisplayComponent.SpanStylesProperty, null) ?? [];

        if (marks.Count == 0 && spans.Count == 0)
            return;

        Dictionary<string, string> markCss = [];
        List<SpanModel> spanModels = new(spans.Count);

        for (var i = 0; i < marks.Count; i++)
            markCss[MarkKey(marks[i].Mark)] = Declarations(marks[i].Style);

        for (var i = 0; i < spans.Count; i++)
            spanModels.Add(new SpanModel(spans[i].Open, spans[i].Close, Declarations(spans[i].Style)));

        _ = root.Attribute(StylesAttribute, JsonSerializer.Serialize(new StylesModel(markCss, spanModels), AttributeJsonOptions));
    }

    // The client's names for the runs, as its inline tree types them (markdown-inlines.ts).
    private static string MarkKey(UIMarkdownMark mark)
        => mark switch
        {
            UIMarkdownMark.Strong => "strong",
            UIMarkdownMark.Emphasis => "emphasis",
            UIMarkdownMark.Strikethrough => "strikethrough",
            UIMarkdownMark.Code => "code",
            UIMarkdownMark.Link => "link",
            _ => throw new ArgumentOutOfRangeException(nameof(mark), mark, null)
        };

    /// <summary>A style as CSS declarations: its colour as words' ink, followed through the theme, and its face.</summary>
    private static string Declarations(UIMarkdownTextStyle style)
    {
        StringBuilder css = new();

        if (style.Color is UIThemeColor color && WebCssValues.ThemeInk(color) is { Length: > 0 } ink)
            _ = css.Append("color: ").Append(ink).Append("; ");

        if (style.FontFamily is string family)
            _ = css.Append("font-family: ").Append(WebCssValues.FontFamily(family)).Append("; ");

        if (style.FontWeight is int weight)
            _ = css.Append("font-weight: ").Append(weight.ToString(CultureInfo.InvariantCulture)).Append("; ");

        if (style.Italic is bool italic)
            _ = css.Append("font-style: ").Append(italic ? "italic" : "normal").Append("; ");

        return css.ToString().TrimEnd();
    }

    // Render-time only, as the styles are: a pushed document's pictures are judged by the same sources.
    private static void RenderImageSources(WebRenderContext context, IHtmlElementBuilder root)
    {
        IReadOnlyList<string> sources = ReadRenderValue<IReadOnlyList<string>?>(context, MarkdownDisplayComponent.ImageSourcesProperty, null) ?? [];

        if (sources.Count > 0)
            _ = root.Attribute(ImageSourcesAttribute, JsonSerializer.Serialize(sources, AttributeJsonOptions));
    }

    private sealed record StylesModel(IReadOnlyDictionary<string, string> Marks, IReadOnlyList<SpanModel> Spans);

    private sealed record SpanModel(string Open, string Close, string Css);
}
