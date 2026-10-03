import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as names from "../src/code-editor-dom.ts";

// The C# each name is held to, as the client meets its markup: a part's class is written `$"{ClassName}__part"`.
function source(path: string, prefix: string, className: string): string {
    return read(path).replaceAll(`{${prefix}}`, className);
}

function read(path: string): string {
    return code(readFileSync(new URL(path, import.meta.url), "utf8"));
}

// A string literal, kept whole so a `//` inside one stays; or a comment, which goes.
const LiteralOrComment = /("(?:[^"\\\r\n]|\\.)*")|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g;

/** A C# file without its comments: a name one only mentions is not one it writes. */
function code(text: string): string {
    return text.replace(LiteralOrComment, (_match, literal: string | undefined) => literal ?? "");
}

const renderer = source("../../CodeInputComponentRenderer.cs", "ClassName", names.RootClass);
const markdown = source("../../MarkdownDisplayComponentRenderer.cs", "ClassName", names.MarkdownRootClass);
const words = read("../../CodeInputStrings.cs");
const events = read("../../../NE.Standard.UI.CodeInput/CodeInputComponentExtensions.cs");
const pictureEffect = read("../../../NE.Standard.UI.CodeInput/InsertPictureEffect.cs");

// The framework's own sources, for the names its plugin surface does not carry.
const Core = "../../../../../../src/Platforms/Web/";
const checkbox = source(`${Core}NE.Standard.UI.Web.Renderers/Inputs/CheckboxComponentRenderer.cs`, "classPrefix", names.CoreNames.checkboxClass);
const classNames = read(`${Core}NE.Standard.UI.Web.Abstractions/Theming/WebClassNames.cs`);
const coreWords = read("../../../../../../src/Contracts/NE.Standard.UI.Shell/Localization/UIStrings.cs");
const glyphs = read("../../../../../../src/Contracts/NE.Standard.UI.Primitives/Constants/UIGlyphs.cs");

function assertWritten(file: string, fileName: string, name: string): void {
    assert.ok(file.includes(`"${name}"`), `${fileName} writes no "${name}", which the client looks for`);
}

function assertRendered(name: string): void {
    assertWritten(renderer, "CodeInputComponentRenderer.cs", name);
}

/** The module's string names that start with a prefix; `CoreNames` is a group, not a name. */
function namesStartingWith(prefix: string): string[] {
    return Object.values(names).flatMap(value => typeof value === "string" && value.startsWith(prefix) ? [value] : []);
}

test("a name the C# only mentions in a comment is not written, and a string's own slashes stay", () => {
    const text = code([
        "// the \"ui-code-input__gone\" wrapper",
        "/// <summary>Writes \"ui-code-input__doc\".</summary>",
        "/* \"ui-code-input__block\" */ Class(\"ui-code-input__kept\"); // \"ui-code-input__trailing\"",
        "Attribute(\"data-ui-code-url\", \"https://host/a\");"
    ].join("\n"));

    for (const name of ["ui-code-input__gone", "ui-code-input__doc", "ui-code-input__block", "ui-code-input__trailing"])
        assert.equal(text.includes(name), false, name);

    assert.ok(text.includes(`"ui-code-input__kept"`));
    assert.ok(text.includes(`"https://host/a"`));
});

test("every part class the client finds is one the renderer writes", () => {
    for (const name of [names.RootClass, names.TextClass, names.ScrollerClass, names.ContentClass, names.HighlightClass, names.SearchPanelClass, names.SearchPartClass, names.ReplaceRowClass, names.StatusBarClass, names.StatusPickerClass])
        assertRendered(name);
});

test("every code attribute the client reads is one the renderer writes", () => {
    const attributes = namesStartingWith("data-ui-code-");

    assert.ok(attributes.length > 20);

    for (const name of attributes)
        assertRendered(name);
});

test("the tab size variable is the one the renderer writes", () => {
    assertRendered(names.TabSizeVariable);
});

test("every word the client writes is a key CodeInputStrings lists", () => {
    const keys = namesStartingWith("ui.code.");

    assert.equal(keys.length, 15);

    for (const key of keys)
        assertWritten(words, "CodeInputStrings.cs", key);
});

test("the picture's event and effect are the ones the server raises and answers with, and the framework's word is its own", () => {
    assertWritten(events, "CodeInputComponentExtensions.cs", names.PictureUploadEvent);
    assertWritten(pictureEffect, "InsertPictureEffect.cs", names.InsertPictureEffectKind);

    for (const key of Object.values(names.CoreWords))
        assertWritten(coreWords, "UIStrings.cs", key);
});

test("the Markdown display's names are the ones its renderer writes", () => {
    for (const name of [names.MarkdownRootClass, names.MarkdownBodyClass, names.MarkdownSourceAttribute])
        assertWritten(markdown, "MarkdownDisplayComponentRenderer.cs", name);
});

test("the checkbox a task item draws by hand wears the framework checkbox's classes", () => {
    for (const name of [names.CoreNames.checkboxClass, names.CoreNames.checkboxInputClass, names.CoreNames.checkboxBoxClass])
        assertWritten(checkbox, "CheckboxComponentRenderer.cs", name);

    assertWritten(classNames, "WebClassNames.cs", names.CoreNames.smallInputClass);
});

test("the format bar's buttons wear the framework's small ghost button and its glyphs", () => {
    for (const name of [names.CoreNames.ghostButtonClass, names.CoreNames.smallButtonClass])
        assertWritten(classNames, "WebClassNames.cs", name);

    for (const glyph of Object.values(names.CoreGlyphs))
        assertWritten(glyphs, "UIGlyphs.cs", glyph);
});
