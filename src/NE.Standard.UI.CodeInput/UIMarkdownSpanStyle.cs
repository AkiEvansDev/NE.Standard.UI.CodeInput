namespace NE.Standard.UI.CodeInput;

/// <summary>
/// A run of the author's own: words from an opening mark to the next closing one within a paragraph, the marks included and shown —
/// a quotation's <c>"…"</c> or <c>«…»</c>. An opening mark with no closing one after it styles nothing, as an unclosed <c>**</c> does
/// not; a mark inside code is the code's.
/// </summary>
public sealed record UIMarkdownSpanStyle
{
    /// <summary>The mark that opens the run.</summary>
    public required string Open { get; init; }

    /// <summary>The mark that closes it; it may be the opening one, as a straight quote is.</summary>
    public required string Close { get; init; }

    /// <summary>How the run is drawn.</summary>
    public required UIMarkdownTextStyle Style { get; init; }
}
