// A Markdown heading and a table's header cell are set in the theme's title weight, as the framework's own titles are, not a
// number of the package's.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import less from "less";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "../src/styles/ui-markdown.less");
const css = (await less.render(readFileSync(source, "utf8"), { filename: source })).css;

test("a heading and a header cell take the theme's title weight", () => {
    assert.match(css, /\.ui-markdown[^{]*:is\(h1, h2, h3, h4, h5, h6\) \{[^}]*font-weight: var\(--ui-text-title-font-weight\);/);
    assert.match(css, /\.ui-markdown[^{]*th \{[^}]*font-weight: var\(--ui-text-title-font-weight\);/);
    assert.doesNotMatch(css, /font-weight: 600;/);
});
