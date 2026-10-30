// The field's save is its own (`ownTarget`): raised on its textarea, it runs the command of the code field the textarea stands in and
// of no component around it, as the framework's pipeline judges by the component the event's target stands in.

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import type { EventRegistration } from "ne-standard-ui";
import { SaveEvent } from "../src/code-editor-dom.ts";

// The stylesheet is the bundler's to load; the module's registrations are what is read here.
registerHooks({
    load: (url, context, next) => url.endsWith(".less") ? { format: "module", source: "", shortCircuit: true } : next(url, context)
});

const registered = new Map<string, EventRegistration>();
const converters = new Map<string, (value: unknown) => string>();

// The framework's global, as its module leaves it before a package's runs: only the registrations are kept.
Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
        NEStandardUI: {
            contractVersion: 4,
            registerEvent: (name: string, registration: EventRegistration = {}) => registered.set(name, registration),
            registerConverter: (name: string, converter: (value: unknown) => string) => converters.set(name, converter),
            registerDomOperation: () => undefined,
            registerEffect: () => undefined,
            registerValueReader: () => undefined,
            registerCollectionSink: () => undefined,
            registerStrings: () => undefined,
            registerEngine: () => undefined
        }
    }
});

await import("../src/code-input.ts");

test("a code field's save is the field's own", () => {
    assert.equal(registered.get(SaveEvent)?.ownTarget, true, `${SaveEvent} hands itself to a component around the field`);
});

test("code-language converter falls back to plain-text when unset or blank", () => {
    const convert = converters.get("code-language")!;

    assert.equal(convert(null), "plain-text");
    assert.equal(convert(""), "plain-text");
    assert.equal(convert("   "), "plain-text");
    assert.equal(convert(" csharp "), "csharp");
});
