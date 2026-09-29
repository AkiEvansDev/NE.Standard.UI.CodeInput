using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.Foundation;
using NE.Standard.UI.Primitives.Annotations;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// A Markdown document shown as formatted text: headings, lists, quotes, tables, links, images and code blocks. Raw HTML renders as
/// text, and a link is kept only when its address is safe.
/// </summary>
public abstract partial class MarkdownDisplayComponent<T>(string? id = null) : VisualComponentBase<T>(id)
    where T : MarkdownDisplayComponent<T>, IUIComponentDefinition
{
    /// <summary>
    /// Gets or sets the Markdown document to show; a value the server pushes renders it again.
    /// </summary>
    [UIComponentProperty(DefaultValue = null)]
    public string? Text { get; set; }
}

/// <summary>
/// A Markdown document shown as formatted text.
/// </summary>
public sealed class MarkdownDisplayComponent(string? id = null) : MarkdownDisplayComponent<MarkdownDisplayComponent>(id), IUIComponentDefinition
{
    /// <inheritdoc/>
    public static string ComponentTypeKey => "codeinput.display.markdown";
}
