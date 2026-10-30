// The code field's focus edge, read back from its compiled stylesheet: the box draws its border and outer halo via `.ui-field-box`,
// and the scroller sits inside the field's padding box (`overflow: hidden`) without an inner inset clip.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import less from "less";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../src/styles/ui-code-input.less");
const css = (await less.render(readFileSync(source, "utf8"), { filename: source })).css;

// The focus edge the framework gives a field's box, compiled from the same contract the stylesheet imports.
const fieldEdge = (await less.render(`@import (reference) "../../plugin/ne-standard-ui.less";\n.probe { .ui-field-edge-active(); }`, { filename: source })).css;

function declaration(rules: string, selector: string, property: string): string | undefined {
    for (const match of rules.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (match[1].trim() !== selector)
            continue;

        const value = new RegExp(`(?:^|;)\\s*${property}: ([^;]+);`).exec(match[2])?.[1];
        if (value)
            return value;
    }

    return undefined;
}

test("the field box clips its inner layers at its border while its active edge draws an outer halo", () => {
    assert.equal(declaration(css, ".ui-code-input__field", "overflow"), "hidden");
    assert.equal(declaration(css, ".ui-code-input__scroller", "clip-path"), undefined);
    assert.equal(declaration(fieldEdge, ".probe", "box-shadow"), "0 0 0 var(--ui-input-focus-ring, 2px) color-mix(in srgb, var(--ui-mark-field) 28%, transparent)");
});

test("status-bar pickers lift under keyboard focus as under pointer hover and suppress the browser outline", () => {
    assert.doesNotMatch(css, /--ui-field-hover/);
    const focused = declaration(css, ".ui-code-input__status-picker > .ui-select:not(.ui-disabled):not(.ui-readonly) > .ui-select__trigger:is([aria-expanded=\"true\"], :focus-visible:not([data-ui-pointer-focus]))", "background");
    const outline = declaration(css, ".ui-code-input__status-picker > .ui-select:not(.ui-disabled):not(.ui-readonly) > .ui-select__trigger:focus-visible:not([data-ui-pointer-focus])", "outline");

    assert.equal(focused, "var(--ui-wash-hover)");
    assert.equal(outline, "none");
});
