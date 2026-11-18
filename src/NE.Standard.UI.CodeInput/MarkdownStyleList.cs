using System;
using System.Collections.Generic;

namespace NE.Standard.UI.CodeInput;

/// <summary>Shared validation and storage helper for Markdown mark, span, and token styles across <see cref="CodeInputComponent"/> and <see cref="MarkdownDisplayComponent"/>.</summary>
internal static class MarkdownStyleList
{
    public static void SetMarkStyle(List<UIMarkdownMarkStyle> markStyles, UIMarkdownMark mark, UIMarkdownTextStyle style)
    {
        ArgumentNullException.ThrowIfNull(style);

        if (!Enum.IsDefined(mark))
            throw new ArgumentOutOfRangeException(nameof(mark), mark, "Not a run Markdown marks.");

        style.Validate();
        _ = markStyles.RemoveAll(existing => existing.Mark == mark);
        markStyles.Add(new UIMarkdownMarkStyle { Mark = mark, Style = style });
    }

    public static void AddSpanStyle(List<UIMarkdownSpanStyle> spanStyles, UIMarkdownSpanStyle span, string ownerLabel, string? id)
    {
        ArgumentNullException.ThrowIfNull(span);
        ArgumentException.ThrowIfNullOrWhiteSpace(span.Open);
        ArgumentNullException.ThrowIfNull(span.Close);

        if (span.Close.Length > 0 && string.IsNullOrWhiteSpace(span.Close))
            throw new ArgumentException("A closing mark cannot be whitespace.", nameof(span));

        ArgumentNullException.ThrowIfNull(span.Style);

        span.Style.Validate();

        for (var i = 0; i < spanStyles.Count; i++)
        {
            if (string.Equals(spanStyles[i].Open, span.Open, StringComparison.Ordinal))
                throw new InvalidOperationException($"{ownerLabel} '{id}' already has a run opened by '{span.Open}'.");
        }

        spanStyles.Add(span);
    }
}
