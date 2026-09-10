using System;
using System.Collections.Generic;
using System.Globalization;
using NE.Standard.UI.CodeInput;
using NE.Standard.UI.Controllers;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Primitives.Styling;

namespace DemoApp.CodeInput;

/// <summary>
/// One editor and the settings that shape it; the sample follows the language, and the status line follows the text.
/// </summary>
internal sealed partial class CodeInputController : UIControllerBase
{
    private static readonly UIInputAppearance[] Appearances = [UIInputAppearance.Ghost, UIInputAppearance.Filled, UIInputAppearance.Outline, UIInputAppearance.Underline];

    [RecursiveMember]
    public partial string Language { get; set; } = UICodeLanguages.CSharp;

    [RecursiveMember]
    public partial string Code { get; set; } = Samples[UICodeLanguages.CSharp];

    [RecursiveMember]
    public partial bool LineNumbers { get; set; } = true;

    [RecursiveMember]
    public partial bool WrapLines { get; set; }

    [RecursiveMember]
    public partial bool ReadOnly { get; set; }

    [RecursiveMember]
    public partial bool Search { get; set; } = true;

    [RecursiveMember]
    public partial int TabSize { get; set; } = 4;

    [RecursiveMember]
    public partial bool StatusBar { get; set; } = true;

    [RecursiveMember]
    public partial string? Encoding { get; set; } = UICodeEncodings.Utf8;

    /// <summary>Null until the status bar's picker chooses: the field keeps the line break the sample came with.</summary>
    [RecursiveMember]
    public partial string? LineEnding { get; set; }

    [RecursiveMember]
    public partial UIInputAppearance Appearance { get; set; } = UIInputAppearance.Ghost;

    [RecursiveMember]
    public partial string AppearanceCaption { get; set; } = "Appearance: Ghost";

    [RecursiveMember]
    public partial string Status { get; set; } = Describe(Samples[UICodeLanguages.CSharp], UICodeEncodings.Utf8, null);

    /// <summary>The select changed the language: the sample of that language replaces the text.</summary>
    [UICommand]
    public void ChangeLanguage()
    {
        Code = Samples.TryGetValue(Language, out var sample) ? sample : string.Empty;
        Status = Describe(Code, Encoding, LineEnding);
    }

    /// <summary>The editor committed a value: what the server holds is what the status line says.</summary>
    [UICommand]
    public void CodeChanged()
        => Status = Describe(Code, Encoding, LineEnding);

    /// <summary>Ctrl+S in the editor: the value has already arrived, so this is where an application would write it out — in <c>Encoding</c>.</summary>
    [UICommand]
    public void Save()
        => Status = string.Create(CultureInfo.InvariantCulture, $"Saved at {DateTime.Now:HH:mm:ss} — {Describe(Code, Encoding, LineEnding)}");

    [UICommand]
    public void CycleAppearance()
    {
        Appearance = Appearances[(Array.IndexOf(Appearances, Appearance) + 1) % Appearances.Length];
        AppearanceCaption = $"Appearance: {Appearance}";
    }

    /// <summary>Puts the language's sample back, from the server: what a value pushed onto a live editor looks like.</summary>
    [UICommand]
    public void ResetSample()
        => ChangeLanguage();

    private static string Describe(string code, string? encoding, string? lineEnding)
    {
        var lines = code.Length == 0 ? 0 : code.Split('\n').Length;
        var ending = lineEnding ?? (code.Contains("\r\n", StringComparison.Ordinal) ? UICodeLineEndings.CrLf : UICodeLineEndings.Lf);

        return string.Create(CultureInfo.InvariantCulture, $"On the server: {lines} lines, {code.Length} characters, {encoding ?? UICodeEncodings.Utf8}, {ending.ToUpperInvariant()}.");
    }

    // Each sample has more than keywords — strings, numbers, comments, nesting, operators and a construction of its own.
    private static readonly Dictionary<string, string> Samples = new(StringComparer.Ordinal)
    {
        [UICodeLanguages.PlainText] = """
            Hello, world!

            Name: Alice
            Version: 1.2.3
            Enabled: true

            This is just plain text.
            No syntax should be highlighted here.
            """,
        [UICodeLanguages.Json] = /*lang=json,strict*/ """
            {
              "name": "Demo",
              "version": 3,
              "enabled": true,
              "tags": ["ui", "framework", "test"],
              "options": {
                "theme": "dark",
                "timeout": null
              }
            }
            """,
        [UICodeLanguages.Css] = """
            /* Card component */
            .card:hover {
              background: #1f2937;
              border: 1px solid rgba(255, 255, 255, 0.15);
              transform: translateY(-2px);
            }

            .card > .title {
              font-weight: 600;
              color: var(--text-primary);
            }
            """,
        [UICodeLanguages.Less] = """
            @accent: #4f8cff;
            @spacing: 8px;

            .rounded(@radius: 6px) {
              border-radius: @radius;
            }

            .button {
              .rounded();

              padding: @spacing (@spacing * 2);
              background: @accent;

              &:hover {
                opacity: 0.85;
              }
            }
            """,
        [UICodeLanguages.JavaScript] = """
            const users = [
              { id: 1, name: "Alice", active: true },
              { id: 2, name: "Bob", active: false }
            ];

            function getActiveNames(items) {
              return items
                .filter(user => user.active)
                .map(user => `${user.id}: ${user.name}`);
            }

            console.log(getActiveNames(users));
            """,
        [UICodeLanguages.TypeScript] = """
            interface User {
              id: number;
              name: string;
              active?: boolean;
            }

            const formatUser = (user: User): string => {
              const state = user.active ?? false;
              return `${user.name} (${state ? "active" : "inactive"})`;
            };

            const user: User = { id: 42, name: "Alice", active: true };
            console.log(formatUser(user));
            """,
        [UICodeLanguages.Html] = """
            <!doctype html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <title>Syntax Test</title>
            </head>
            <body>
              <!-- Main content -->
              <button class="primary" disabled>
                Save
              </button>

              <input type="text" value="Hello">
            </body>
            </html>
            """,
        [UICodeLanguages.Bash] = """
            #!/usr/bin/env bash

            set -euo pipefail

            name="${1:-world}"
            count=3

            for ((i = 1; i <= count; i++)); do
              echo "Hello, $name! Attempt: $i"
            done

            [[ -f "./config.json" ]] && echo "Config found"
            """,
        [UICodeLanguages.CSharp] = """
            public sealed class UserService
            {
                private readonly Dictionary<int, string> _users = new()
                {
                    [1] = "Alice",
                    [2] = "Bob"
                };

                public string? GetName(int id)
                {
                    // Return null when the user is unknown.
                    return _users.TryGetValue(id, out var name)
                        ? $"{id}: {name}"
                        : null;
                }
            }
            """,
        [UICodeLanguages.Python] = """
            from dataclasses import dataclass


            @dataclass
            class User:
                id: int
                name: str
                active: bool = True


            def describe(user: User) -> str:
                # Format a readable user status.
                state = "active" if user.active else "inactive"
                return f"{user.id}: {user.name} ({state})"


            user = User(42, "Alice")
            print(describe(user))
            """
    };
}
