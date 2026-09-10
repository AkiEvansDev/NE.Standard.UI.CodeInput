using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using NE.Standard.UI.Shell.Localization;

namespace NE.Standard.UI.Web.CodeInput;

/// <summary>
/// The words the code field's own chrome writes — the find and replace panel, the status bar — with their English, translated by an
/// application through its localization source exactly as the framework's <see cref="UIStrings"/> are.
/// </summary>
public sealed class CodeInputStrings : IUIStringsSource
{
    public const string Find = "ui.code.find";
    public const string Replace = "ui.code.replace";
    public const string ReplaceOne = "ui.code.replace-one";
    public const string ReplaceAll = "ui.code.replace-all";
    public const string Previous = "ui.code.previous";
    public const string Next = "ui.code.next";
    public const string Close = "ui.code.close";
    public const string MatchCase = "ui.code.match-case";
    public const string WholeWord = "ui.code.whole-word";
    public const string Regex = "ui.code.regex";
    public const string Matches = "ui.code.matches";
    public const string NoMatches = "ui.code.no-matches";
    public const string InvalidPattern = "ui.code.invalid-pattern";
    public const string Position = "ui.code.position";
    public const string Spaces = "ui.code.spaces";
    public const string Indentation = "ui.code.indentation";
    public const string Encoding = "ui.code.encoding";
    public const string LineEnding = "ui.code.line-ending";
    public const string Language = "ui.code.language";

    /// <inheritdoc/>
    public IReadOnlyDictionary<string, string> English { get; } = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        [Find] = "Find",
        [Replace] = "Replace",
        [ReplaceOne] = "Replace",
        [ReplaceAll] = "Replace all",
        [Previous] = "Previous match",
        [Next] = "Next match",
        [Close] = "Close",
        [MatchCase] = "Match case",
        [WholeWord] = "Whole word",
        [Regex] = "Regular expression",
        [Matches] = "{current} of {total}",
        [NoMatches] = "No matches",
        [InvalidPattern] = "Invalid pattern",
        [Position] = "Ln {line}, Col {column}",
        [Spaces] = "Spaces: {size}",
        [Indentation] = "Indentation",
        [Encoding] = "Encoding",
        [LineEnding] = "End of line",
        [Language] = "Language"
    }.ToFrozenDictionary(StringComparer.Ordinal);
}
