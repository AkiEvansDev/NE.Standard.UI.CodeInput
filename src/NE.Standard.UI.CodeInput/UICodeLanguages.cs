using System;
using System.Collections.Generic;
using System.Threading;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The languages the code field highlights, by id. A package adds one by shipping a tokenizer script and declaring the id here
/// with <see cref="Register"/>.
/// </summary>
public static class UICodeLanguages
{
    /// <summary>No highlighting: a monospaced field with line numbers.</summary>
    public const string PlainText = "plain-text";

    /// <summary>JSON: keys, strings, numbers and literals.</summary>
    public const string Json = "json";

    /// <summary>CSS: selectors, properties, values and at-rules.</summary>
    public const string Css = "css";

    /// <summary>LESS: CSS with variables, mixins, nesting and line comments.</summary>
    public const string Less = "less";

    /// <summary>JavaScript, template literals and regular expressions included.</summary>
    public const string JavaScript = "javascript";

    /// <summary>TypeScript, read as JavaScript with its own words as keywords.</summary>
    public const string TypeScript = "typescript";

    /// <summary>HTML, with its embedded script and style read as JavaScript and CSS.</summary>
    public const string Html = "html";

    /// <summary>Bash: commands, options, variables, substitutions and here-documents.</summary>
    public const string Bash = "bash";

    /// <summary>C#: keywords, types, calls, interpolated, verbatim and raw strings.</summary>
    public const string CSharp = "csharp";

    /// <summary>Python: definitions, decorators, strings and f-string holes.</summary>
    public const string Python = "python";

    /// <summary>Markdown, with each fenced block read in the language its info string names.</summary>
    public const string Markdown = "markdown";

    private static readonly Lock Gate = new();

    // Replaced whole on a registration, so a reader always holds one consistent list without taking the lock.
    private static KeyValuePair<string, string>[] _all =
    [
        new(PlainText, UICodeInputStrings.PlainText),
        new(Json, "JSON"),
        new(Css, "CSS"),
        new(Less, "LESS"),
        new(JavaScript, "JavaScript"),
        new(TypeScript, "TypeScript"),
        new(Html, "HTML"),
        new(Bash, "Bash"),
        new(CSharp, "C#"),
        new(Python, "Python"),
        new(Markdown, "Markdown")
    ];

    /// <summary>Every language the status bar lists, shipped then registered, with its name — or a word's key (plain text's).</summary>
    public static IReadOnlyList<KeyValuePair<string, string>> All => _all;

    /// <summary>Registers a language's name for the status bar, shown as written; a second call for the same id renames it.</summary>
    public static void Register(string id, string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        var key = id.Trim();

        lock (Gate)
        {
            KeyValuePair<string, string>[] next = [.. _all];

            for (var i = 0; i < next.Length; i++)
            {
                if (!string.Equals(next[i].Key, key, StringComparison.OrdinalIgnoreCase))
                    continue;

                next[i] = new(next[i].Key, name);
                _all = next;
                return;
            }

            _all = [.. next, new(key, name)];
        }
    }

    /// <summary>The name a language is listed under, as <see cref="All"/> gives it; an id nobody declared is its own name.</summary>
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
