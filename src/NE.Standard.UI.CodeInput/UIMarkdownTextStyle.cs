using System;
using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Abstractions.Styling.Theme;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// How a run of a Markdown document is drawn: its colour and its face; what is unset stays as the document draws it.
/// </summary>
public sealed record UIMarkdownTextStyle
{
    /// <summary>The words' colour, followed live through the light and the dark theme.</summary>
    public UIThemeColor? Color { get; init; }

    /// <summary>
    /// A font family list, as a theme's (<see cref="UITypography.FontFamily"/>); a face the page does not load falls to the next name.
    /// </summary>
    public string? FontFamily { get; init; }

    /// <summary>The font weight, from 1 to 1000.</summary>
    public int? FontWeight { get; init; }

    /// <summary>Whether the words are italic; <see langword="false"/> straightens a run Markdown itself would slant.</summary>
    public bool? Italic { get; init; }

    /// <summary>
    /// Validates the style.
    /// </summary>
    public void Validate()
    {
        if (FontFamily is not null)
            UITypography.ValidateFontFamily(FontFamily);

        if (FontWeight is int weight)
        {
            ArgumentOutOfRangeException.ThrowIfLessThan(weight, 1, nameof(FontWeight));
            ArgumentOutOfRangeException.ThrowIfGreaterThan(weight, 1000, nameof(FontWeight));
        }
    }
}
