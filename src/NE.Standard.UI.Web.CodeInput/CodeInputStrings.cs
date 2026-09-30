using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using System.Globalization;
using NE.Standard.UI.CodeInput;
using NE.Standard.UI.Shell.Localization;

namespace NE.Standard.UI.Web.CodeInput;

/// <summary>
/// The words the code field's chrome writes — the find/replace panel, the status bar — translated by an application exactly as
/// the framework's <see cref="UIStrings"/> are.
/// </summary>
public sealed partial class CodeInputStrings : IUIStringsSource
{
    /// <summary>The find panel's count: which match of how many.</summary>
    public const string Matches = "ui.code.matches";

    /// <summary>The find panel's count when nothing matches.</summary>
    public const string NoMatches = "ui.code.no-matches";

    /// <summary>The find panel's count when a regular expression cannot be read.</summary>
    public const string InvalidPattern = "ui.code.invalid-pattern";

    /// <summary>The status bar's caret position: line and column.</summary>
    public const string Position = "ui.code.position";

    /// <summary>The completion list's own accessible name.</summary>
    public const string Suggestions = "ui.code.suggestions";

    /// <inheritdoc/>
    public IReadOnlyDictionary<string, string> English { get; } = CreateEnglish();

    private static FrozenDictionary<string, string> CreateEnglish()
    {
        Dictionary<string, string> words = new(StringComparer.Ordinal)
        {
            [UICodeInputStrings.Find] = "Find",
            [UICodeInputStrings.Replace] = "Replace",
            [UICodeInputStrings.ReplaceOne] = "Replace",
            [UICodeInputStrings.ReplaceAll] = "Replace all",
            [UICodeInputStrings.ToggleReplace] = "Toggle replace",
            [UICodeInputStrings.Previous] = "Previous match",
            [UICodeInputStrings.Next] = "Next match",
            [UICodeInputStrings.Close] = "Close",
            [UICodeInputStrings.MatchCase] = "Match case",
            [UICodeInputStrings.WholeWord] = "Whole word",
            [UICodeInputStrings.Regex] = "Regular expression",
            [UICodeInputStrings.Indentation] = "Indentation",
            [UICodeInputStrings.Encoding] = "Encoding",
            [UICodeInputStrings.LineEnding] = "End of line",
            [UICodeInputStrings.Language] = "Language",
            [UICodeInputStrings.PlainText] = "Plain text",
            [UICodeInputStrings.Utf8Bom] = "UTF-8 with BOM",
            [Matches] = "{current} of {total}",
            [NoMatches] = "No matches",
            [InvalidPattern] = "Invalid pattern",
            [Position] = "Ln {line}, Col {column}",
            [Suggestions] = "Suggestions"
        };

        for (var size = 1; size <= UICodeInputStrings.MaxTabSize; size++)
            words[UICodeInputStrings.Spaces(size)] = "Spaces: " + size.ToString(CultureInfo.InvariantCulture);

        return words.ToFrozenDictionary(StringComparer.Ordinal);
    }
}
