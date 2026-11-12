using System.Diagnostics.CodeAnalysis;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// A word or snippet a code field offers in its completion list.
/// </summary>
public sealed record UICodeCompletion
{
    /// <summary>Initializes a new instance of the <see cref="UICodeCompletion"/> class.</summary>
    public UICodeCompletion()
    {
    }

    /// <summary>Initializes a new instance of the <see cref="UICodeCompletion"/> class.</summary>
    [SetsRequiredMembers]
    public UICodeCompletion(string label, string? insertText = null, string? detail = null, string? kind = null)
    {
        Label = label;
        InsertText = insertText;
        Detail = detail;
        Kind = kind;
    }

    /// <summary>The word shown in the completion list, and inserted when <see cref="InsertText"/> is unset.</summary>
    public required string Label { get; init; }

    /// <summary>The text inserted when the item is accepted, when different from <see cref="Label"/>.</summary>
    public string? InsertText { get; init; }

    /// <summary>Short muted note shown beside <see cref="Label"/> in the completion list.</summary>
    public string? Detail { get; init; }

    /// <summary>Optional kind tag shown in the completion list.</summary>
    public string? Kind { get; init; }
}
