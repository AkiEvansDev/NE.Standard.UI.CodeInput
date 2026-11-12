namespace NE.Standard.UI.CodeInput;

/// <summary>
/// A run of the author's own: words from an opening mark to the next closing one within a paragraph, the marks included and shown —
/// a quotation's <c>"…"</c> or <c>«…»</c> — or an opening mark alone with no <see cref="Close"/> (<c>&lt;START&gt;</c>). An opening mark
/// with a closing one that is never reached styles nothing, as an unclosed <c>**</c> does not; a mark inside code is the code's.
/// </summary>
public sealed record UIMarkdownSpanStyle
{
    /// <summary>The mark that opens the run, or the whole token when <see cref="Close"/> is empty.</summary>
    public required string Open { get; init; }

    /// <summary>The mark that closes it (it may be the opening one, as a straight quote is), or empty when <see cref="Open"/> stands alone.</summary>
    public string Close { get; init; } = string.Empty;

    /// <summary>How the run is drawn.</summary>
    public required UIMarkdownTextStyle Style { get; init; }
}
