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
    public const string Json = "json";
    public const string Css = "css";
    public const string Less = "less";
    public const string JavaScript = "javascript";
    public const string TypeScript = "typescript";
    public const string Html = "html";
    public const string Bash = "bash";
    public const string CSharp = "csharp";
    public const string Python = "python";
    public const string Markdown = "markdown";

    private static readonly Lock Gate = new();

    // Replaced whole on a registration, so a reader always holds one consistent list without taking the lock.
    private static KeyValuePair<string, string>[] _all =
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
        new(Python, "Python"),
        new(Markdown, "Markdown")
    ];

    /// <summary>Every language the status bar lists — the ones the package ships, then the ones an application registered — with its name.</summary>
    public static IReadOnlyList<KeyValuePair<string, string>> All => _all;

    /// <summary>
    /// Registers a language's display name for the status bar; call once at startup, beside the script that registers its tokenizer.
    /// A second call for the same id renames it.
    /// </summary>
    public static void Register(string id, string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        lock (Gate)
        {
            KeyValuePair<string, string>[] next = [.. _all];

            for (var i = 0; i < next.Length; i++)
            {
                if (!string.Equals(next[i].Key, id, StringComparison.OrdinalIgnoreCase))
                    continue;

                next[i] = new(next[i].Key, name);
                _all = next;
                return;
            }

            _all = [.. next, new(id.Trim(), name)];
        }
    }

    /// <summary>The name a language is listed under; an id nobody declared is its own name.</summary>
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
