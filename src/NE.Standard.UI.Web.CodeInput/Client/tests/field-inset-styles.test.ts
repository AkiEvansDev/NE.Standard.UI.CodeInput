// Where the code field's text stands, read back from its compiled stylesheet: without line numbers it stands where every field's
// does — the framework's `--ui-field-inset`, which its message and the note under it read — so a code field's text, its message and
// its note line up with a text field's in each appearance and size.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import less from "less";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../src/styles/ui-code-input.less");
const css = (await less.render(readFileSync(source, "utf8"), { filename: source })).css;

function rule(selector: string): string {
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (match[1].trim() === selector)
            return match[2];
    }

    assert.fail(`no rule for ${selector}`);
}

test("without line numbers the text stands at the field's inset, less the box's border, never a step of its own", () => {
    const gutter = /--ui-code-gutter: ([^;]+);/.exec(rule(".ui-code-input:not([data-ui-code-line-numbers])"))?.[1];

    assert.equal(gutter, "max(0px, var(--ui-field-inset, calc(0.5rem + var(--ui-border-width, 1px))) - var(--ui-border-width, 1px))");
});

test("without line numbers the caret's position on the status bar starts where the text does", () => {
    assert.match(rule(".ui-code-input:not([data-ui-code-line-numbers]) .ui-code-input__status"), /padding-left: var\(--ui-code-gutter\);/);
});
