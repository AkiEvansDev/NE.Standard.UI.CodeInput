using System.Globalization;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The names of the code field's regions: every control its find panel and its status bar show is the framework's own component,
/// carried under one of these.
/// </summary>
public static class UICodeInputRegions
{
    public const string TabSize = "code-tab-size";
    public const string Encoding = "code-encoding";
    public const string LineEnding = "code-line-ending";
    public const string Language = "code-language";
    public const string Find = "code-find";
    public const string Replace = "code-replace";
    public const string ToggleReplace = "code-toggle-replace";
    public const string Previous = "code-previous";
    public const string Next = "code-next";
    public const string Close = "code-close";
    public const string ReplaceOne = "code-replace-one";
    public const string ReplaceAll = "code-replace-all";
    public const string MatchCase = "code-match-case";
    public const string WholeWord = "code-whole-word";
    public const string Regex = "code-regex";
}

/// <summary>
/// The keys of the words the code field's controls carry, translated as the framework's own are; the web package lists their English.
/// </summary>
public static class UICodeInputStrings
{
    public const string Find = "ui.code.find";
    public const string Replace = "ui.code.replace";
    public const string ReplaceOne = "ui.code.replace-one";
    public const string ReplaceAll = "ui.code.replace-all";
    public const string ToggleReplace = "ui.code.toggle-replace";
    public const string Previous = "ui.code.previous";
    public const string Next = "ui.code.next";
    public const string Close = "ui.code.close";
    public const string MatchCase = "ui.code.match-case";
    public const string WholeWord = "ui.code.whole-word";
    public const string Regex = "ui.code.regex";
    public const string Indentation = "ui.code.indentation";
    public const string Encoding = "ui.code.encoding";
    public const string LineEnding = "ui.code.line-ending";
    public const string Language = "ui.code.language";

    /// <summary>The tab stops the status bar offers, one to eight — every size <c>SetTabSize</c> accepts.</summary>
    public const int MaxTabSize = 8;

    /// <summary>The key of one tab stop's word, "Spaces: 4"; a key per size, since an option's title is a word, not a template.</summary>
    public static string Spaces(int size)
        => "ui.code.spaces-" + size.ToString(CultureInfo.InvariantCulture);
}
