// A table's cells break between words, never inside one: the document's `overflow-wrap: anywhere` counts every letter as a break
// when the table sizes its columns, which on a phone gave the key column a letter's width ("Duratio / n").

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import less from "less";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "../src/styles/ui-markdown.less");
const css = (await less.render(readFileSync(source, "utf8"), { filename: source })).css;

const cells = css.match(/\.ui-markdown__table :is\(th, td\) \{[^}]*\}/)?.[0] ?? "";

test("the document breaks a long address anywhere", () => {
    assert.match(css, /\.ui-markdown \{[^}]*overflow-wrap: anywhere;/);
});

test("a table's cell takes that back and breaks at word boundaries", () => {
    assert.notEqual(cells, "", "no rule for a table's cells");
    assert.match(cells, /overflow-wrap: break-word;/);
    assert.match(cells, /word-break: normal;/);
});
