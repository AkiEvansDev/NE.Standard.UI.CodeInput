namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The names of the code field's regions: every control its find panel and its status bar show is the framework's own component,
/// carried under one of these.
/// </summary>
public static class UICodeInputRegions
{
    /// <summary>The status bar's tab-size picker.</summary>
    public const string TabSize = "code-tab-size";

    /// <summary>The status bar's encoding picker.</summary>
    public const string Encoding = "code-encoding";

    /// <summary>The status bar's line-ending picker.</summary>
    public const string LineEnding = "code-line-ending";

    /// <summary>The status bar's language picker.</summary>
    public const string Language = "code-language";

    /// <summary>The find panel's search field.</summary>
    public const string Find = "code-find";

    /// <summary>The find panel's replacement field.</summary>
    public const string Replace = "code-replace";

    /// <summary>The find panel's button that folds the replace row out or away.</summary>
    public const string ToggleReplace = "code-toggle-replace";

    /// <summary>The find panel's button that steps to the previous match.</summary>
    public const string Previous = "code-previous";

    /// <summary>The find panel's button that steps to the next match.</summary>
    public const string Next = "code-next";

    /// <summary>The find panel's close button.</summary>
    public const string Close = "code-close";

    /// <summary>The find panel's button that replaces the current match.</summary>
    public const string ReplaceOne = "code-replace-one";

    /// <summary>The find panel's button that replaces every match.</summary>
    public const string ReplaceAll = "code-replace-all";

    /// <summary>The find panel's match-case switch.</summary>
    public const string MatchCase = "code-match-case";

    /// <summary>The find panel's whole-word switch.</summary>
    public const string WholeWord = "code-whole-word";

    /// <summary>The find panel's regular-expression switch.</summary>
    public const string Regex = "code-regex";
}
