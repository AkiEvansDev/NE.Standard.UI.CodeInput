import assert from "node:assert/strict";
import test from "node:test";

import { LanguageRegistry } from "../src/languages/index.ts";
import { compileQuery, expandReplacement, findMatches, nextMatchFrom, previousMatchFrom, replaceAll } from "../src/search.ts";

const plain = { matchCase: false, wholeWord: false, regex: false };

test("a plain query is literal and case-insensitive by default", () => {
    const query = compileQuery("a.b", plain);
    const matches = findMatches("A.B axb a.b", query);

    assert.deepEqual(matches, [{ from: 0, to: 3 }, { from: 8, to: 11 }]);
});

test("match case and whole word narrow the matches", () => {
    assert.equal(findMatches("Cat cat", compileQuery("cat", { ...plain, matchCase: true })).length, 1);
    assert.equal(findMatches("cat concat cat", compileQuery("cat", { ...plain, wholeWord: true })).length, 2);
});

test("a regex query is a pattern, and a broken one is reported rather than thrown", () => {
    assert.equal(findMatches("a1 b22 c", compileQuery("[a-z]\\d+", { ...plain, regex: true })).length, 2);

    const broken = compileQuery("(", { ...plain, regex: true });

    assert.ok(broken !== null && "invalid" in broken);
    assert.deepEqual(findMatches("(", broken), []);
});

test("an empty query is nothing and an empty match does not spin", () => {
    assert.equal(compileQuery("", plain), null);
    assert.deepEqual(findMatches("abc", compileQuery("x*", { ...plain, regex: true })), []);
});

test("next and previous wrap around", () => {
    const matches = [{ from: 2, to: 3 }, { from: 5, to: 6 }, { from: 9, to: 10 }];

    assert.equal(nextMatchFrom(matches, 0), 0);
    assert.equal(nextMatchFrom(matches, 3), 1);
    assert.equal(nextMatchFrom(matches, 10), 0);
    assert.equal(previousMatchFrom(matches, 9), 1);
    assert.equal(previousMatchFrom(matches, 2), 2);
    assert.equal(nextMatchFrom([], 0), -1);
});

test("replacement is literal unless the query is a regex", () => {
    const text = "x1 y2";
    const literal = compileQuery("x1", plain);
    const regex = compileQuery("([a-z])(\\d)", { ...plain, regex: true });

    assert.equal(expandReplacement(text, { from: 0, to: 2 }, literal, "$1", false), "$1");
    assert.equal(expandReplacement(text, { from: 0, to: 2 }, regex, "$2$1", true), "1x");
    assert.equal(replaceAll(text, literal, "$&", false), "$& y2");
    assert.equal(replaceAll(text, regex, "$2$1", true), "1x 2y");
});

test("the language registry keys ids case-insensitively, ships the built-ins and takes a package's own", () => {
    const registry = new LanguageRegistry();

    assert.equal(LanguageRegistry.normalize(" CSharp "), "csharp");
    assert.equal(LanguageRegistry.normalize(null), "plain-text");
    assert.ok(registry.get("json") !== null);
    assert.ok(registry.get("Bash") !== null);
    assert.equal(registry.get("plain-text"), null);
    assert.equal(registry.get("toml"), null);

    const registered: string[] = [];
    registry.onRegistered(id => registered.push(id));
    registry.register("TOML", { initialState: {}, tokenizeLine: (_line, state) => state });

    assert.deepEqual(registered, ["toml"]);
    assert.ok(registry.get("toml") !== null);
    assert.throws(() => registry.register("plain-text", { initialState: {}, tokenizeLine: (_line, state) => state }));
});
