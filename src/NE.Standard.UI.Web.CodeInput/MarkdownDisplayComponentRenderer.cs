using System;
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

        _ = root.Element("div", body => _ = body.Class($"{ClassName}__body"));
    }
}
