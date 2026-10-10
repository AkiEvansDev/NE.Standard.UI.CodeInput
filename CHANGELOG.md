# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 1.7.2

- The plugin stylesheet's `@ui-button-live` reads the client's `data-ui-popup-hover` mark rather than a `:has()`.
- The plugin stylesheet's `@ui-field-focus` and `.ui-entry-quiet()` read the client's `data-ui-focus-within` mark rather than a
  `:has()`; `.ui-entry-quiet()` goes on the list or an element below its component root.
- The plugin stylesheet's `@ui-row-live` and `.ui-row-bar()` read the rows' `data-ui-row-idle` and `data-ui-row-bar` marks rather
  than a `:has()`; `.ui-row-bar()` takes no `@bar`.
- Needs the framework's plugin contract 4.
- A code field owns its Escape (`names.ownsKeys`): in a dialog or a drawer, Escape closes the find panel, the completions, the
  format bar or the extra carets, then leaves the text — the way out, since Tab indents — and only the next one closes the dialog.
- **Breaking:** the field's chords are matched as the framework's (`shortcuts.matches`): by the key's place, every modifier exact,
  Ctrl answering ⌘ on macOS only — the Windows key no longer stands for Ctrl, and Ctrl+F with Shift held is no find. Several
  carets' Ctrl moves (by word, to either end) read Ctrl the same way.
- The heading's levels are the framework's list of choices (`popups.openList`): opened on the checked level, walked round, a level
  reached by its first letter, closed by Tab; the format bar's arrows answer plain keys only.
- The component declares that a code field's save submits its form (`IFormSubmittingComponent`), so a test page sends its held
  value before the command, as the page does (#146).
- A picture over a Markdown field wears the framework's drop edge (`.ui-drop-edge()`), in the ink (#155).
- Safari's Enter that ends an input method's composition no longer breaks the line at every caret, accepts a completion, steps
  find to the next match or runs a format key (#153).
- A code field's `MaxWidth` and a Markdown display's `MinWidth` and `MaxWidth` apply at every tier; line numbers are unselectable in
  Safari too (#153).
- The demo's source button is the framework demo's again: the 24 px button centred in its row (#153).
- On a phone (below 640 px) the status bar's pickers open as the framework's sheet from the bottom, being its select's; the
  heading's levels and the completions stay beside the text, where the on-screen keyboard is up (no `sheetOnPhone`).
- The demo's language select is `Tonal`, a toolbar over the field it configures; the field's look is chosen in a `Tonal` select named
  inside its box, in place of a button cycling through them whose caption was cut and whose width changed at every press.
