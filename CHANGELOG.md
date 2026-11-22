# Changelog — CodeInput

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.CodeInput`) and is removed from this file after the release is cut.

## 2.13.0

- **Async `CompletionsSource` readiness on first trigger**: awaits in-flight external completions JSON fetches on the initial trigger keystroke or `Ctrl+Space` and opens the popup once resolved if the caret and editor state still match.
- **Markdown tokenizer comment and URL masking**: masks HTML comments (`<!-- ... -->`), inline link destinations, autolinks, and bare URLs before scanning inline emphasis, heading, and custom span rules so underscores and markers inside URLs or comments are not mis-highlighted.
- Built on the framework's 2.13.0 release.
