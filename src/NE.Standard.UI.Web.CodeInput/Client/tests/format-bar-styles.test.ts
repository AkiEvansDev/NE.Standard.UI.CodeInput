// The format bar read back from the compiled stylesheet: its buttons are the framework's strip of icons (`.ui-icon-bar-button()`),
// the keyboard's frame and a glyph on whole pixels included, with nothing of the package's own on top.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import less from "less";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "../src/styles/ui-code-input.less");
const css = (await less.render(readFileSync(source, "utf8"), { filename: source })).css;

test("a button is the strip's square, its glyph on whole pixels, so the icon stands in its middle", () => {
    assert.match(/\n\.ui-code-input__format-button \{([^}]*)\}/.exec(css)?.[1] ?? "", /aspect-ratio: 1;/);
    assert.match(/\n\.ui-code-input__format-button > \.ui-icon \{([^}]*)\}/.exec(css)?.[1] ?? "", /font-size: 1\.125rem;/);
    assert.equal(/format-button[^{]*\{[^}]*font-size: 1\.25em/.test(css), false);
});

test("the keyboard's place wears the strip's frame, never after a pointer", () => {
    const frame = /\.ui-code-input__format-button:focus-visible:not\(\[data-ui-pointer-focus\]\) \{([^}]*)\}/.exec(css)?.[1] ?? "";

    assert.match(frame, /outline: 2px solid var\(--ui-color-primary-ink\);/);
    assert.equal(css.split(".ui-code-input__format-button:focus-visible").length - 1, 1, "one frame, the strip's, not a copy of the package's own");
});
