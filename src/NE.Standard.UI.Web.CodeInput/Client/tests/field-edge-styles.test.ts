// The code field's focus edge, read back from its compiled stylesheet: the box draws it inside its border, and the scroller — a layer
// painted over it — is clipped a ring's width in, round the box's own corners, so its gutter's ground never cuts the ring.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import less from "less";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../src/styles/ui-code-input.less");
const css = (await less.render(readFileSync(source, "utf8"), { filename: source })).css;

// The corners the framework gives a field's box, compiled from the same contract the stylesheet imports.
const fieldBox = (await less.render(`@import (reference) "../../plugin/ne-standard-ui.less";\n.probe { .ui-field-ground(); }`, { filename: source })).css;

function declaration(rules: string, selector: string, property: string): string {
    for (const match of rules.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (match[1].trim() !== selector)
            continue;

        const value = new RegExp(`(?:^|;)\\s*${property}: ([^;]+);`).exec(match[2])?.[1];
        if (value)
            return value;
    }

    assert.fail(`no ${property} on ${selector}`);
}

test("the scroller is clipped a focus ring's width inside the box, so nothing it paints covers the ring", () => {
    assert.match(declaration(css, ".ui-code-input__scroller", "clip-path"), /^inset\(var\(--ui-input-focus-ring, 1px\) round /);
});

test("the scroller's clip rounds with the field box's own corners, so the ring's curve is left whole too", () => {
    const radius = declaration(fieldBox, ".probe", "border-radius");

    assert.equal(declaration(css, ".ui-code-input__scroller", "clip-path"), `inset(var(--ui-input-focus-ring, 1px) round ${radius})`);
});
