using System;
using System.Collections.Generic;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.Foundation;
using NE.Standard.UI.Primitives.Annotations;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// A Markdown document shown as formatted text: headings, lists, quotes, tables, links, images and code blocks. Raw HTML renders as
/// text, a link is kept only when its address is safe, and a picture only from where the display takes one (<see cref="ImageSources"/>).
/// </summary>
public abstract partial class MarkdownDisplayComponent<T>(string? id = null) : VisualComponentBase<T>(id)
    where T : MarkdownDisplayComponent<T>, IUIComponentDefinition
{
    private readonly List<UIMarkdownMarkStyle> _markStyles = [];
    private readonly List<UIMarkdownSpanStyle> _spanStyles = [];
    private readonly List<string> _imageSources = [];

    /// <summary>
    /// Gets or sets the Markdown document to show; a value the server pushes renders it again.
    /// </summary>
    [UIComponentProperty(DefaultValue = null)]
    public string? Text { get; set; }

    /// <summary>
    /// Gets or sets whether a single line break inside a paragraph is drawn as one, as a chat or a GitHub comment draws it, rather
    /// than as a space, as CommonMark does. A blank line still starts a paragraph, and code is untouched.
    /// </summary>
    [UIComponentProperty(DefaultValue = false)]
    public bool? LineBreaks { get; set; }

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
    /// Gets where the display fetches a picture from besides an image <c>data:</c> address and the framework's content route, added by
    /// <see cref="AddImageSource"/>; a picture from anywhere else shows as its words.
    /// </summary>
    /// <remarks>Render-time only, as <see cref="MarkStyles"/>.</remarks>
    [UIComponentProperty(IsBindable = false, GenerateSetter = false, DefaultValue = null)]
    public IReadOnlyList<string> ImageSources => _imageSources;

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

    /// <summary>
    /// Lets the display fetch pictures from under <paramref name="source"/>: an origin (<c>https://cdn.example.com</c>), an address
    /// with a path (<c>https://cdn.example.com/pictures/</c>) or a path of this site (<c>/media/</c>). A picture is fetched as the
    /// reader, so a document another user wrote could otherwise call any address — a tracker, or a route of this site.
    /// </summary>
    public T AddImageSource(string source)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(source);

        if (!IsImageSource(source))
            throw new ArgumentException($"'{source}' is no picture source: an http or https address with no query, fragment or user, or a path of this site starting with one slash.", nameof(source));

        _imageSources.Add(source);
        return Self;
    }

    /// <summary>Whether a source is an http(s) address standing for itself, or a path of this site the browser cannot read as another.</summary>
    private static bool IsImageSource(string source)
    {
        // A backslash anywhere, or a path's second slash, and the browser may read another host or another path than the one written.
        if (HasControlOrSpace(source) || source.Contains('\\', StringComparison.Ordinal))
            return false;

        if (source[0] == '/')
            return source.Length == 1 || (source[1] != '/' && source.AsSpan().IndexOfAny('?', '#') < 0);

        // Uri refuses `https:cdn.example.com` and `https:/cdn.example.com`, which the browser reads as paths of the page's own site.
        return Uri.TryCreate(source, UriKind.Absolute, out Uri? address)
            && (address.Scheme == Uri.UriSchemeHttps || address.Scheme == Uri.UriSchemeHttp)
            && address.Query.Length == 0
            && address.Fragment.Length == 0
            && address.UserInfo.Length == 0;
    }

    /// <summary>Whether a text holds a space or a control character, which the browser strips or reads past.</summary>
    private static bool HasControlOrSpace(string text)
    {
        foreach (var character in text)
        {
            if (character <= ' ' || char.IsControl(character))
                return true;
        }

        return false;
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
