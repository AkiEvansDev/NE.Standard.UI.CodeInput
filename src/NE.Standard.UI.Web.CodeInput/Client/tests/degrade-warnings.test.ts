// A degrade the reader never sees is said once in the console per what failed: a tokenizer however many lines it fails on, a
// provider however many times it is asked.

import assert from "node:assert/strict";
import test from "node:test";

import { collectCompletions } from "../src/completions.ts";
import type { CompletionContext } from "../src/completions.ts";
import { Highlighter } from "../src/highlighter.ts";

/** The console's warnings while `act` runs, by their first argument. */
async function warningsDuring(act: () => unknown): Promise<string[]> {
    const said: string[] = [];
    const warn = console.warn;

    console.warn = (message: unknown) => said.push(String(message));

    try {
        await act();
    }
    finally {
        console.warn = warn;
    }

    return said;
}

test("a tokenizer that throws on every line is said once, and its lines are still drawn plain", async () => {
    const highlighter = new Highlighter({
        initialState: {},
        tokenizeLine: () => {
            throw new Error("boom");
        }
    });

    const said = await warningsDuring(() => {
        highlighter.update("a\nb\nc");
        highlighter.update("a\nb\nc\nd");
    });

    assert.equal(said.length, 1);
    assert.match(said[0], /tokenizer threw/);
    assert.equal(highlighter.renderLine(2), "<span class=\"ui-code-input__code\">c</span>");
});

test("a provider that throws is said once and left out; the others' words still come", async () => {
    const failing = (): never => {
        throw new Error("down");
    };
    const context = { prefix: "", language: "plaintext", text: "", offset: 0 } as unknown as CompletionContext;

    const said = await warningsDuring(async () => {
        assert.deepEqual(await collectCompletions([failing, [{ label: "kept" }]], context), [{ label: "kept" }]);
        await collectCompletions([failing], context);
    });

    assert.equal(said.length, 1);
    assert.match(said[0], /completions provider threw/);
});
