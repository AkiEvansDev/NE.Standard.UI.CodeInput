import assert from "node:assert/strict";
import test from "node:test";

import type { EditAction, FormatAction } from "../src/markdown-format.ts";
import { formatEdits, headingChoices, headingEdits, headingLevel, isFormatted } from "../src/markdown-format.ts";
import type { SelectionSet } from "../src/selections.ts";
import { applyEdits } from "../src/selections.ts";

// Markdown is full of brackets, so a range here is written `‹…›` (forward), `›…‹` (backward), and a caret `|`.

function parse(notation: string): { readonly text: string; readonly set: SelectionSet } {
    let text = "";
    let open = -1;
    let backward = false;
    const ranges: { anchor: number; head: number }[] = [];

    for (const character of notation) {
        if (character === "|")
            ranges.push({ anchor: text.length, head: text.length });
        else if ((character === "‹" && open < 0) || (character === "›" && open < 0)) {
            open = text.length;
            backward = character === "›";
        }
        else if (character === "‹" || character === "›") {
            ranges.push(backward ? { anchor: text.length, head: open } : { anchor: open, head: text.length });
            open = -1;
        }
        else
            text += character;
    }

    return { text, set: { ranges, primary: 0 } };
}

function marked(text: string, set: SelectionSet): string {
    let result = "";
    let at = 0;

    for (const range of set.ranges) {
        const from = Math.min(range.anchor, range.head);
        const to = Math.max(range.anchor, range.head);
        const [open, close] = range.anchor === range.head ? ["|", ""] : range.anchor < range.head ? ["‹", "›"] : ["›", "‹"];

        result += text.slice(at, from) + open + text.slice(from, to) + close;
        at = to;
    }

    return result + text.slice(at);
}

/** The text after the action, its ranges written in; the notation itself when the action changes nothing. */
function format(notation: string, action: EditAction): string {
    const { text, set } = parse(notation);
    const result = formatEdits(text, set, action);

    return result === null ? notation : marked(applyEdits(text, result.edits), result.after);
}

/** The text after a heading level is chosen, as `format` writes it. */
function heading(notation: string, chosen: number): string {
    const { text, set } = parse(notation);
    const result = headingEdits(text, set, chosen);

    return result === null ? notation : marked(applyEdits(text, result.edits), result.after);
}

function level(notation: string): number {
    const { text, set } = parse(notation);

    return headingLevel(text, set);
}

function formatted(notation: string, action: FormatAction): boolean {
    const { text, set } = parse(notation);

    return isFormatted(text, set, action);
}

test("a selection is wrapped in the marks and stays selected over its words", () => {
    assert.equal(format("say ‹hello› now", "bold"), "say **‹hello›** now");
    assert.equal(format("say ‹hello› now", "italic"), "say *‹hello›* now");
    assert.equal(format("say ‹hello› now", "strikethrough"), "say ~~‹hello›~~ now");
    assert.equal(format("say ‹hello› now", "code"), "say `‹hello›` now");
});

test("a selection keeps the direction it ran in", () => {
    assert.equal(format("›hello‹", "bold"), "**›hello‹**");
});

test("white space at a selection's ends stays outside the marks, as a double click's trailing space must", () => {
    assert.equal(format("say ‹hello ›now", "bold"), "say **‹hello›** now");
    assert.equal(format("say‹ hello› now", "italic"), "say *‹hello›* now");
    assert.equal(format("a‹   ›b", "bold"), "a‹   ›b");
});

test("words already wrapped are unwrapped, selected with their marks or without", () => {
    assert.equal(format("say **‹hello›** now", "bold"), "say ‹hello› now");
    assert.equal(format("say ‹**hello**› now", "bold"), "say ‹hello› now");
    assert.equal(format("say ~~‹hello›~~", "strikethrough"), "say ‹hello›");
    assert.equal(format("say `‹hello›`", "code"), "say ‹hello›");
    assert.equal(format("‹`hello`›", "code"), "‹hello›");
});

test("bold and italic tell their runs apart: italic on bold adds a star, and each comes off its own", () => {
    assert.equal(format("**‹word›**", "italic"), "***‹word›***");
    assert.equal(format("*‹word›*", "bold"), "***‹word›***");
    assert.equal(format("***‹word›***", "italic"), "**‹word›**");
    assert.equal(format("***‹word›***", "bold"), "*‹word›*");
    assert.equal(format("‹**word**›", "italic"), "*‹**word**›*");
});

test("a toggle on and off again gives the text back", () => {
    for (const action of ["bold", "italic", "strikethrough", "code", "link"] as const) {
        const once = format("a ‹words› b", action);

        if (action === "link")
            assert.equal(once, "a [words](|) b");
        else
            assert.equal(format(once, action), "a ‹words› b", action);
    }
});

test("a caret writes the pair and stands between; inside an empty pair it takes the pair away", () => {
    assert.equal(format("a | b", "bold"), "a **|** b");
    assert.equal(format("a **|** b", "bold"), "a | b");
    assert.equal(format("a | b", "italic"), "a *|* b");
    assert.equal(format("a | b", "code"), "a `|` b");
    assert.equal(format("a `|` b", "code"), "a | b");
    assert.equal(format("a | b", "link"), "a [|]() b");
    assert.equal(format("a [|]() b", "link"), "a | b");
});

test("a caret between bold's marks writes italic's inside them, which comes off on its own", () => {
    assert.equal(format("**|**", "italic"), "***|***");
    assert.equal(format("***|***", "italic"), "**|**");
});

test("code that holds a backtick is fenced by a longer run, padded where it starts or ends with one, and comes off whole", () => {
    assert.equal(format("‹a`b›", "code"), "``‹a`b›``");
    assert.equal(format("‹`a›", "code"), "`` ‹`a› ``");
    assert.equal(format("`` ‹`a› ``", "code"), "‹`a›");
    assert.equal(format("‹`` `a ``›", "code"), "‹`a›");
});

test("a link takes the words as its text and leaves the caret for the address; an address selected becomes the address", () => {
    assert.equal(format("see ‹the docs›", "link"), "see [the docs](|)");
    assert.equal(format("see ‹https://example.com/a?b=1›", "link"), "see [|](https://example.com/a?b=1)");
});

test("a link selected whole, or its words, gives way to its words", () => {
    assert.equal(format("see ‹[the docs](https://x.y)›", "link"), "see ‹the docs›");
    assert.equal(format("see [‹the docs›](https://x.y) now", "link"), "see ‹the docs› now");
});

test("every range is formatted on its own, each by what it already wears", () => {
    assert.equal(format("‹one› and **‹two›**", "bold"), "**‹one›** and ‹two›");
});

test("a level chosen makes every selected line a heading of it, in place of another level", () => {
    assert.equal(heading("Ti|tle", 1), "# Ti|tle");
    assert.equal(heading("|Title", 2), "## |Title");
    assert.equal(heading("# Ti|tle", 3), "### Ti|tle");
    assert.equal(heading("###### |Title", 2), "## |Title");
    assert.equal(heading("‹one\n## two›", 1), "‹# one\n# two›");
    assert.equal(heading("‹one\n\ntwo›", 6), "‹###### one\n\n###### two›");
});

test("the level the lines already are, chosen again, takes the heading off", () => {
    assert.equal(heading("## Ti|tle", 2), "Ti|tle");
    assert.equal(heading("‹## one\n##   two›", 2), "‹one\ntwo›");
    assert.equal(heading("‹## one\n# two›", 2), "‹## one\n## two›");
});

test("the level checked is the one every selected line is, and none where they differ or are no headings", () => {
    assert.equal(level("### Ti|tle"), 3);
    assert.equal(level("‹## one\n## two›"), 2);
    assert.equal(level("‹## one\n# two›"), 0);
    assert.equal(level("Ti|tle"), 0);
    assert.equal(level("####### Ti|tle"), 0);
});

test("a list is put on the selected lines past their indentation, empty lines left alone, and taken off when every line is an item", () => {
    assert.equal(format("‹one\n\n  two›", "list"), "‹- one\n\n  - two›");
    assert.equal(format("‹- one\n* two\n1. three›", "list"), "‹one\ntwo\nthree›");
    assert.equal(format("- [ ] ta|sk", "list"), "ta|sk");
    assert.equal(format("|", "list"), "- |");
});

test("a selection ending at the start of a line leaves that line alone, as a triple click's does", () => {
    assert.equal(format("‹one\n›two", "list"), "‹- one\n›two");
});

test("lines that only look like marks are not taken for them", () => {
    assert.equal(format("**bo|ld**", "list"), "- **bo|ld**");
    assert.equal(heading("#hash|tag", 1), "# #hash|tag");
});

test("the bar says which formats the selection already wears", () => {
    assert.equal(formatted("**‹bold›**", "bold"), true);
    assert.equal(formatted("**‹bold›**", "italic"), false);
    assert.equal(formatted("‹plain›", "bold"), false);
    assert.equal(formatted("[‹words›](x)", "link"), true);
    assert.equal(formatted("# Ti|tle", "heading"), true);
    assert.equal(formatted("‹- a\nb›", "list"), false);
    assert.equal(formatted("|", "heading"), false);
});

test("the heading menu offers the six levels, the lines' own one checked and none where they are no one level", () => {
    assert.deepEqual(headingChoices(2).map(choice => `${choice.level}${choice.checked ? "*" : ""}`), ["1", "2*", "3", "4", "5", "6"]);
    assert.equal(headingChoices(0).some(choice => choice.checked), false);
});
