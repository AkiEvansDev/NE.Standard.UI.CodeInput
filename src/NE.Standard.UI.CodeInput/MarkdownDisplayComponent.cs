using System;
using System.Collections.Generic;
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
    private readonly List<UIMarkdownMarkStyle> _markStyles = [];
    private readonly List<UIMarkdownSpanStyle> _spanStyles = [];

    /// <summary>
    /// Gets or sets the Markdown document to show; a value the server pushes renders it again.
    /// </summary>
    [UIComponentProperty(DefaultValue = null)]
    public string? Text { get; set; }

    /// <summary>
    /// Gets the styles Markdown's own runs are drawn in, set by <see cref="SetMarkStyle"/>.
    /// </summary>
    /// <remarks>Render-time only: the styles are how the display is built.</remarks>
    [UIComponentProperty(IsBindable = false, GenerateSetter = false, DefaultValue = null)]
    public IReadOnlyList<UIMarkdownMarkStyle> MarkStyles => _markStyles;

    /// <summary>
    /// Gets the author's own runs and their styles, added by <see cref="AddSpanStyle(string, string, UIMarkdownTextStyle)"/>.
    /// </summary>
    /// <remarks>Render-time only, as <see cref="MarkStyles"/>.</remarks>
    [UIComponentProperty(IsBindable = false, GenerateSetter = false, DefaultValue = null)]
    public IReadOnlyList<UIMarkdownSpanStyle> SpanStyles => _spanStyles;

    /// <summary>
    /// Draws one of Markdown's own runs — <c>**strong**</c>, <c>*emphasis*</c>, … — in a style; a mark styled again takes the new one.
    /// </summary>
    public T SetMarkStyle(UIMarkdownMark mark, UIMarkdownTextStyle style)
    {
        ArgumentNullException.ThrowIfNull(style);

        if (!Enum.IsDefined(mark))
            throw new ArgumentOutOfRangeException(nameof(mark), mark, "Not a run Markdown marks.");

        style.Validate();
        _ = _markStyles.RemoveAll(existing => existing.Mark == mark);
        _markStyles.Add(new UIMarkdownMarkStyle { Mark = mark, Style = style });
        return Self;
    }

    /// <summary>
    /// Draws the words from <paramref name="open"/> to the next <paramref name="close"/> in a style, the marks included —
    /// <c>AddSpanStyle("\"", "\"", style)</c> for quoted speech. An opening mark never closed styles nothing.
    /// </summary>
    public T AddSpanStyle(string open, string close, UIMarkdownTextStyle style)
        => AddSpanStyle(new UIMarkdownSpanStyle { Open = open, Close = close, Style = style });

    /// <summary>
    /// Adds an author's own run as it stands; one opening mark opens one run only.
    /// </summary>
    public T AddSpanStyle(UIMarkdownSpanStyle span)
    {
        ArgumentNullException.ThrowIfNull(span);
        ArgumentException.ThrowIfNullOrWhiteSpace(span.Open);
        ArgumentException.ThrowIfNullOrWhiteSpace(span.Close);
        ArgumentNullException.ThrowIfNull(span.Style);

        span.Style.Validate();

        for (var i = 0; i < _spanStyles.Count; i++)
        {
            if (string.Equals(_spanStyles[i].Open, span.Open, StringComparison.Ordinal))
                throw new InvalidOperationException($"Markdown display '{Id}' already has a run opened by '{span.Open}'.");
        }

        _spanStyles.Add(span);
        return Self;
    }
}

/// <summary>
/// A Markdown document shown as formatted text.
/// </summary>
public sealed class MarkdownDisplayComponent(string? id = null) : MarkdownDisplayComponent<MarkdownDisplayComponent>(id), IUIComponentDefinition
{
    /// <inheritdoc/>
    public static string ComponentTypeKey => "codeinput.display.markdown";
}
