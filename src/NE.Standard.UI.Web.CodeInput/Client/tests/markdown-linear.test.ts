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

// Far under what a quadratic read of these lines takes, far over what a linear one does on a slow machine.
const Bound = 500;
const Length = 100000;
const names = { sourceLine: "data-ui-source-line", readOnlyClass: "ui-readonly" } as const;

// The framework's reading of an address, as the plugin surface hands it over.
const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const urls = await import(pathToFileURL(resolve(repository, "src/Platforms/Web/NE.Standard.UI.Web/Client/src/rendering/url-safety.ts")).href) as MarkdownUrls;
const spaces = " ".repeat(Length);

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

const cases: readonly (readonly [string, string])[] = [
    ["a heading's text followed by a run of spaces", `x\n# a${spaces}b`],
    ["a table's delimiter row with a run of spaces and no end", `| a |\n|---${spaces}x`],
    ["a long delimiter cell and a run of spaces", `| a |\n|${"-".repeat(Length)}${spaces}|${spaces}x`],
    ["a tag with a run of spaces and no end", `<a${spaces}`],
    ["emphasis openers with no close", "*a ".repeat(Length / 3)],
    ["underscore openers with no close", "_a ".repeat(Length / 3)],
    ["brackets with no close", "[".repeat(Length)],
    ["links with no address's end", "[a](".repeat(Length / 4)],
    ["links whose title in parentheses has no end", "[a](x (".repeat(Length / 7)]
];

for (const [name, source] of cases) {
    test(`linear: ${name}`, () => {
        const took = readBoth(source);

        assert.ok(took < Bound, `${name} took ${Math.round(took)} ms`);
    });
}
