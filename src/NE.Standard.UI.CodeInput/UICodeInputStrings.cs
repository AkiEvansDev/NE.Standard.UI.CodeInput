using System.Globalization;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The keys of the words the code field's controls carry, translated as the framework's own are; the web package lists their English.
/// </summary>
public static class UICodeInputStrings
{
    /// <summary>The find field's placeholder.</summary>
    public const string Find = "ui.code.find";

    /// <summary>The replace field's placeholder.</summary>
    public const string Replace = "ui.code.replace";

    /// <summary>The tooltip of the button that replaces the match the reader is on.</summary>
    public const string ReplaceOne = "ui.code.replace-one";

    /// <summary>The tooltip of the button that replaces every match.</summary>
    public const string ReplaceAll = "ui.code.replace-all";

    /// <summary>The tooltip of the chevron that folds the replace row out.</summary>
    public const string ToggleReplace = "ui.code.toggle-replace";

    /// <summary>The tooltip of the arrow to the previous match.</summary>
    public const string Previous = "ui.code.previous";

    /// <summary>The tooltip of the arrow to the next match.</summary>
    public const string Next = "ui.code.next";

    /// <summary>The tooltip of the find panel's cross.</summary>
    public const string Close = "ui.code.close";

    /// <summary>The match-case switch's tooltip and name.</summary>
    public const string MatchCase = "ui.code.match-case";

    /// <summary>The whole-word switch's tooltip and name.</summary>
    public const string WholeWord = "ui.code.whole-word";

    /// <summary>The regular-expression switch's tooltip and name.</summary>
    public const string Regex = "ui.code.regex";

    /// <summary>The tooltip of the status bar's tab size picker.</summary>
    public const string Indentation = "ui.code.indentation";

    /// <summary>The tooltip of the status bar's encoding picker.</summary>
    public const string Encoding = "ui.code.encoding";

    /// <summary>The tooltip of the status bar's line-ending picker.</summary>
    public const string LineEnding = "ui.code.line-ending";

    /// <summary>The tooltip of the status bar's language picker.</summary>
    public const string Language = "ui.code.language";

    /// <summary>What the language picker lists plain text as — the one language name that is a word.</summary>
    public const string PlainText = "ui.code.plain-text";

    /// <summary>What the encoding picker lists UTF-8 with a byte order mark as — the one encoding name that is a word.</summary>
    public const string Utf8Bom = "ui.code.utf8-bom";

    /// <summary>Whether a name <see cref="UICodeLanguages.All"/> or <see cref="UICodeEncodings.All"/> lists is a word's key, not a name.</summary>
    public static bool IsWord(string name)
        => name is PlainText or Utf8Bom;

    /// <summary>The tab stops the status bar offers, one to eight — every size <c>SetTabSize</c> accepts.</summary>
    public const int MaxTabSize = 8;

    /// <summary>The key of one tab stop's word, "Spaces: 4"; a key per size, since an option's title is a word, not a template.</summary>
    public static string Spaces(int size)
        => "ui.code.spaces-" + size.ToString(CultureInfo.InvariantCulture);
}
