// A blockquote is drawn in the framework's quote stroke — its width and its neutral colour, the tokens a paragraph's quote line
// is drawn in — so a quotation in a Markdown message and one in a paragraph read as one thing.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import less from "less";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "../src/styles/ui-markdown.less");
const css = (await less.render(readFileSync(source, "utf8"), { filename: source })).css;

test("a blockquote's stroke is the framework's quote stroke in its neutral colour", () => {
    assert.match(css, /\.ui-markdown[^{]*blockquote \{[^}]*border-left: 3px solid var\(--ui-color-border\);/);
});
