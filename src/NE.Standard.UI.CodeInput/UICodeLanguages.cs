using System;
using System.Collections.Generic;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The languages the code field highlights out of the box, by id. A language is a string so that a package can add one: it ships
/// a script that registers its tokenizer with the editor under an id of its own, and an application names that id here.
/// </summary>
public static class UICodeLanguages
{
    /// <summary>No highlighting: a monospaced field with line numbers.</summary>
    public const string PlainText = "plain-text";
    public const string Json = "json";
    public const string Css = "css";
    public const string Less = "less";
    public const string JavaScript = "javascript";
    public const string TypeScript = "typescript";
    public const string Html = "html";
    public const string Bash = "bash";
    public const string CSharp = "csharp";
    public const string Python = "python";

    /// <summary>Every language the package ships, with the name the status bar lists it under; a package's own is listed by its id.</summary>
    public static IReadOnlyList<KeyValuePair<string, string>> All { get; } =
    [
        new(PlainText, "Plain text"),
        new(Json, "JSON"),
        new(Css, "CSS"),
        new(Less, "LESS"),
        new(JavaScript, "JavaScript"),
        new(TypeScript, "TypeScript"),
        new(Html, "HTML"),
        new(Bash, "Bash"),
        new(CSharp, "C#"),
        new(Python, "Python")
    ];

    /// <summary>The name a language is listed under; an id the package does not ship is its own name.</summary>
    public static string DisplayName(string id)
    {
        foreach (KeyValuePair<string, string> language in All)
        {
            if (string.Equals(language.Key, id, StringComparison.OrdinalIgnoreCase))
                return language.Value;
        }

        return id;
    }
}
