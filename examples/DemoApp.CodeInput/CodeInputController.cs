using System;
using System.Collections.Generic;
using System.Globalization;

namespace DemoApp.CodeInput;

/// <summary>
/// One editor and the settings that shape it; the sample follows the language, and the status line follows the text.
/// </summary>
internal sealed partial class CodeInputController : UIControllerBase
{
    private static readonly (UIInputAppearance Appearance, string Name)[] Appearances =
    [
        (UIInputAppearance.Ghost, "code-demo.appearance.ghost"),
        (UIInputAppearance.Filled, "code-demo.appearance.filled"),
        (UIInputAppearance.Tonal, "code-demo.appearance.tonal"),
        (UIInputAppearance.Outline, "code-demo.appearance.outline"),
        (UIInputAppearance.Underline, "code-demo.appearance.underline")
    ];

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
    public partial bool MultiCaret { get; set; } = true;

    [RecursiveMember]
    public partial int TabSize { get; set; } = 4;

    [RecursiveMember]
    public partial bool StatusBar { get; set; } = true;

    [RecursiveMember]
    public partial bool Completions { get; set; } = true;

    [RecursiveMember]
    public partial string? Encoding { get; set; } = UICodeEncodings.Utf8;

    /// <summary>Null until the status bar's picker chooses: the field keeps the line break the sample came with.</summary>
    [RecursiveMember]
    public partial string? LineEnding { get; set; }

    [RecursiveMember]
    public partial UIInputAppearance Appearance { get; set; } = UIInputAppearance.Ghost;

    [RecursiveMember]
    public partial UIPhrase? AppearanceCaption { get; set; } = Caption(0);

    [RecursiveMember]
    public partial UIPhrase? Status { get; set; } = Describe(Samples[UICodeLanguages.CSharp], UICodeEncodings.Utf8, null);

    /// <summary>The form the editor's text is held in until it is saved.</summary>
    public const string EditorForm = "editor";

    /// <summary>
    /// The select changed the language: the sample of that language replaces the text, and an edit not saved yet is let go of —
    /// the replacement is the point.
    /// </summary>
    [UICommand]
    public UICommandResult ChangeLanguage()
    {
        Code = Samples.TryGetValue(Language, out var sample) ? sample : string.Empty;
        Status = Describe(Code, Encoding, LineEnding);

        return UICommandResult.Ok([new DiscardFormEffect(EditorForm)]);
    }

    /// <summary>Ctrl+S in the editor: the value has already arrived, so this is where an application would write it out — in <c>Encoding</c>.</summary>
    [UICommand]
    public void Save()
        => Status = UIPhrase.Of("code-demo.editor.saved", ("time", DateTime.Now.ToString("HH:mm:ss", CultureInfo.InvariantCulture)), ("status", Describe(Code, Encoding, LineEnding)));

    [UICommand]
    public void CycleAppearance()
    {
        var next = (Array.FindIndex(Appearances, entry => entry.Appearance == Appearance) + 1) % Appearances.Length;

        Appearance = Appearances[next].Appearance;
        AppearanceCaption = Caption(next);
    }

    private static UIPhrase Caption(int appearance)
        => UIPhrase.Of("code-demo.editor.appearance", ("appearance", new UIPhrase(Appearances[appearance].Name)));

    /// <summary>Puts the language's sample back, from the server: what a value pushed onto a live editor looks like.</summary>
    [UICommand]
    public UICommandResult ResetSample()
        => ChangeLanguage();

    /// <summary>What the server holds: the lines, the characters, the encoding by the name the status bar lists, and the ending.</summary>
    private static UIPhrase Describe(string code, string? encoding, string? lineEnding)
    {
        var lines = code.Length == 0 ? 0 : code.Split('\n').Length;
        var ending = lineEnding ?? (code.Contains("\r\n", StringComparison.Ordinal) ? UICodeLineEndings.CrLf : UICodeLineEndings.Lf);
        var name = UICodeEncodings.DisplayName(encoding ?? UICodeEncodings.Utf8);
        UIPhrase encodingName = UICodeInputStrings.IsWord(name) ? new UIPhrase(name) : UIPhrase.Text(name);

        // Each count a phrase of its own: a plural follows the one `count` its phrase carries.
        UIPhrase lineCount = UIPhrase.Of("code-demo.editor.lines", ("count", lines));
        UIPhrase characterCount = UIPhrase.Of("code-demo.editor.characters", ("count", code.Length));

        return UIPhrase.Of("code-demo.editor.status", ("lines", lineCount), ("characters", characterCount), ("encoding", encodingName), ("ending", ending.ToUpperInvariant()));
    }

    // Each sample has more than keywords — strings, numbers, comments, nesting, operators and a construction of its own — and each
    // is a text an operator of the demo's host would edit (docs/DEMO-THEME.md).
    private static readonly Dictionary<string, string> Samples = new(StringComparer.Ordinal)
    {
        [UICodeLanguages.PlainText] = """
            Ticket #48213 — Saltmarsh Media

            Server: web-eu-west-3
            Plan: Standard
            Opened: 21 Sep 2026, 09:14

            The site has answered slowly since this morning.
            Nothing in this text should be highlighted.
            """,
        [UICodeLanguages.Json] = /*lang=json,strict*/ """
            {
              "name": "api-eu-west-1",
              "plan": "pro",
              "region": "eu-west",
              "image": "ubuntu-24.04",
              "backups": true,
              "firewall": [
                { "port": 443, "from": "0.0.0.0/0" },
                { "port": 22, "from": "10.20.0.0/16" }
              ],
              "tags": ["api", "production"],
              "maintenance": null
            }
            """,
        [UICodeLanguages.Css] = """
            /* Server status badges */
            .status--running:hover {
              background: #16a34a;
              border: 1px solid rgba(255, 255, 255, 0.15);
              transform: translateY(-1px);
            }

            .server-card > .name {
              font-weight: 600;
              color: var(--text-primary);
            }
            """,
        [UICodeLanguages.Less] = """
            @running: #16a34a;
            @spacing: 8px;

            .rounded(@radius: 6px) {
              border-radius: @radius;
            }

            .status {
              .rounded();

              padding: @spacing (@spacing * 2);
              background: @running;

              &:hover {
                opacity: 0.85;
              }
            }
            """,
        [UICodeLanguages.JavaScript] = """
            const servers = [
              { name: "api-eu-west-1", cpu: 58, status: "running" },
              { name: "db-eu-west-1", cpu: 91, status: "degraded" }
            ];

            function busiest(items, limit) {
              return items
                .filter(server => server.cpu >= limit)
                .map(server => `${server.name}: ${server.cpu}%`);
            }

            console.log(busiest(servers, 80));
            """,
        [UICodeLanguages.TypeScript] = """
            interface Subscription {
              number: string;
              seats: number;
              plan: "starter" | "standard" | "pro" | "dedicated";
              paid?: boolean;
            }

            const describe = (subscription: Subscription): string => {
              const paid = subscription.paid ?? false;
              return `${subscription.number} (${paid ? "paid" : "due"})`;
            };

            const row: Subscription = { number: "SUB-000042", seats: 12, plan: "pro", paid: true };
            console.log(describe(row));
            """,
        [UICodeLanguages.Html] = """
            <!doctype html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <title>Orvane Cloud status</title>
            </head>
            <body>
              <!-- One line per region goes here -->
              <button class="primary" disabled>
                Subscribe to updates
              </button>

              <input type="email" value="ops@orvane.example">
            </body>
            </html>
            """,
        [UICodeLanguages.Bash] = """
            #!/usr/bin/env bash

            set -euo pipefail

            server="${1:?usage: provision.sh <server>}"
            region="${2:-eu-west}"
            retries=3

            for ((i = 1; i <= retries; i++)); do
              echo "Provisioning $server in $region (attempt $i)"
              orvane servers create "$server" --region "$region" && break
              sleep $((i * 5))
            done

            [[ -f "/etc/orvane/agent.conf" ]] && systemctl restart orvane-agent
            """,
        [UICodeLanguages.CSharp] = """
            public sealed class DiskHealthCheck(IServerMetrics metrics) : IHealthCheck
            {
                private const double WarnAt = 0.80;
                private const double FailAt = 0.95;

                public async Task<HealthResult> CheckAsync(string server, CancellationToken cancellationToken)
                {
                    // Used space over capacity: the one number a full disk is judged by.
                    var used = await metrics.DiskUsedAsync(server, cancellationToken);

                    return used switch
                    {
                        >= FailAt => HealthResult.Failed($"{server}: disk {used:P0} full"),
                        >= WarnAt => HealthResult.Degraded($"{server}: disk {used:P0} full"),
                        _ => HealthResult.Healthy
                    };
                }
            }
            """,
        [UICodeLanguages.Python] = """
            from dataclasses import dataclass


            @dataclass
            class Server:
                name: str
                cpu: float
                running: bool = True


            def headroom(server: Server) -> str:
                # How much CPU is left before the server needs a larger plan.
                left = 100 - server.cpu if server.running else 0
                return f"{server.name}: {left:.0f}% left"


            server = Server("api-eu-west-1", 58.0)
            print(headroom(server))
            """,
        [UICodeLanguages.Markdown] = MarkdownController.Sample
    };
}
