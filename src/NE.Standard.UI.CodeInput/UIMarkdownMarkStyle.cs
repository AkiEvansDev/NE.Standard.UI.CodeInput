namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The style a display draws one of Markdown's own runs in.
/// </summary>
public sealed record UIMarkdownMarkStyle
{
    /// <summary>The run styled.</summary>
    public required UIMarkdownMark Mark { get; init; }

    /// <summary>How it is drawn.</summary>
    public required UIMarkdownTextStyle Style { get; init; }
}
