// A long line written against the Markdown readers still reads in time linear in its length: each case takes seconds for a
// pattern or a scan that reads the rest of the line again from every place it could start, and a document another viewer wrote
// would freeze the page on every push.

import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { languages } from "../src/languages/index.ts";
import type { MarkdownUrls } from "../src/markdown-render.ts";
import { renderMarkdown } from "../src/markdown-render.ts";

// A linear read of a line four times as long takes about four times as long, a quadratic one sixteen: the ratio tells them apart
// on a machine of any speed and under any load, where a bound in milliseconds failed the build on a busy one.
const Length = 100000;
const Quarter = Length / 4;
const Ratio = 8;
// Under this the long read is fast whatever its ratio: a ratio of two small times is mostly noise (a garbage collection under a
// busy build doubled one), and a quadratic read of this length takes seconds.
const Quick = 150;
const names = { sourceLine: "data-ui-source-line", readOnlyClass: "ui-readonly" } as const;

// The framework's reading of an address, as the plugin surface hands it over.
const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const urls = await import(pathToFileURL(resolve(repository, "src/Platforms/Web/NE.Standard.UI.Web/Client/src/rendering/url-safety.ts")).href) as MarkdownUrls;

function elapsed(read: () => void): number {
    const start = performance.now();

    read();

    return performance.now() - start;
}

/** The display's parse of the document, and the editor's reading of it line by line, inside a fence and out. */
function readBoth(source: string): number {
    const markdown = languages.get("markdown")!;

    return elapsed(() => {
        renderMarkdown(source, () => null, names, urls);

        let state = markdown.initialState;

        for (const line of ["```md", ...source.split("\n"), "```", ...source.split("\n")])
            state = markdown.tokenizeLine(line, state, () => undefined);
    });
}

const cases: readonly (readonly [string, (length: number) => string])[] = [
    ["a heading's text followed by a run of spaces", n => `x
# a${" ".repeat(n)}b`],
    ["a table's delimiter row with a run of spaces and no end", n => `| a |
|---${" ".repeat(n)}x`],
    ["a long delimiter cell and a run of spaces", n => `| a |
|${"-".repeat(n)}${" ".repeat(n)}|${" ".repeat(n)}x`],
    ["a tag with a run of spaces and no end", n => `<a${" ".repeat(n)}`],
    ["emphasis openers with no close", n => "*a ".repeat(n / 3)],
    ["underscore openers with no close", n => "_a ".repeat(n / 3)],
    ["brackets with no close", n => "[".repeat(n)],
    ["links with no address's end", n => "[a](".repeat(n / 4)],
    ["links whose title in parentheses has no end", n => "[a](x (".repeat(n / 7)]
];

/** The fastest of three reads, so a pause the machine takes elsewhere does not count. */
function fastest(source: string): number {
    return Math.min(readBoth(source), readBoth(source), readBoth(source));
}

for (const [name, build] of cases) {
    test(`linear: ${name}`, () => {
        const short = fastest(build(Quarter));
        const long = fastest(build(Length));

        assert.ok(long < Quick || long / Math.max(short, 1) < Ratio, `${name}: ${Math.round(short)} ms at ${Quarter}, ${Math.round(long)} ms at ${Length}`);
    });
}
