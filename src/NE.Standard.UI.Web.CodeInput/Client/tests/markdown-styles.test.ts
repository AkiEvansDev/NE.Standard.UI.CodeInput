// A display's own styles: Markdown's runs drawn in the author's declarations, the author's own runs from an opening mark to its
// close — never an unclosed one, never inside code — and a document drawn again replacing only the blocks that changed.

import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { PluginEngineContext } from "ne-standard-ui";

import { changedBlocks, MarkdownDisplayEngine, patchElement } from "../src/markdown-display-engine.ts";
import { parseInlines } from "../src/markdown-inlines.ts";
import type { MarkdownStyles, MarkdownUrls } from "../src/markdown-render.ts";
import { NoMarkdownStyles, NoPictureSources, renderMarkdown, renderMarkdownBlocks } from "../src/markdown-render.ts";
import { markSpans } from "../src/markdown-spans.ts";

const names = { sourceLine: "data-ui-source-line", readOnlyClass: "ui-readonly", checkboxClass: "ui-checkbox", checkboxInputClass: "ui-checkbox__input", checkboxBoxClass: "ui-checkbox__box", smallInputClass: "ui-input--small" } as const;

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const urls = await import(pathToFileURL(resolve(repository, "src/Platforms/Web/NE.Standard.UI.Web/Client/src/rendering/url-safety.ts")).href) as MarkdownUrls;

const quotes: MarkdownStyles = {
    marks: { strong: "color: red", link: "font-weight: 700" },
    spans: [
        { open: "\"", close: "\"", css: "color: var(--ui-color-accent-ink)" },
        { open: "«", close: "»", css: "font-style: italic" },
    ],
};

function html(source: string, styles = quotes): string {
    return renderMarkdown(source, () => null, names, urls, styles).replace(/ data-ui-source-line="\d+"/g, "");
}

const speech = (words: string): string => `<span class="ui-markdown__span" style="color: var(--ui-color-accent-ink)">${words}</span>`;

test("Markdown's own runs take the author's declarations, and stay bare where none is given", () => {
    assert.equal(html("**a** *b* [c](https://x.test)"), "<p><strong style=\"color: red\">a</strong> <em>b</em> <a href=\"https://x.test\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"font-weight: 700\">c</a></p>");
    assert.equal(html("**a**", { marks: {}, spans: [] }), "<p><strong>a</strong></p>");
});

test("a quoted run is styled with its marks, as many times as it closes", () => {
    assert.equal(html("He said \"hi\" and \"bye\"."), `<p>He said ${speech("&quot;hi&quot;")} and ${speech("&quot;bye&quot;")}.</p>`);
});

test("an opening mark never closed styles nothing", () => {
    assert.equal(html("He said \"hi"), "<p>He said &quot;hi</p>");
    assert.equal(html("\"a\" then \"b"), `<p>${speech("&quot;a&quot;")} then &quot;b</p>`);
});

test("a run holds Markdown's own runs, another rule's run, and a line break; it never opens or closes inside code", () => {
    assert.equal(html("\"he *quietly* said\""), `<p>${speech("&quot;he <em>quietly</em> said&quot;")}</p>`);
    assert.equal(html("\"one\ntwo\""), `<p>${speech("&quot;one\ntwo&quot;")}</p>`);
    assert.equal(html("\"a «b» c\""), `<p>${speech("&quot;a <span class=\"ui-markdown__span\" style=\"font-style: italic\">«b»</span> c&quot;")}</p>`);
    assert.equal(html("`\"x\"` and `say \"`"), "<p><code>&quot;x&quot;</code> and <code>say &quot;</code></p>");
    assert.equal(html("**\"in\"** out"), `<p><strong style="color: red">${speech("&quot;in&quot;")}</strong> out</p>`);
});

test("runs reach headings and table cells, each block on its own", () => {
    assert.equal(html("# \"t\""), `<h1>${speech("&quot;t&quot;")}</h1>`);
    assert.match(html("| \"a\" |\n|---|\n| b |"), /<th>.*ui-markdown__span.*<\/th>/);
});

test("a line of unclosed marks is read in linear time", () => {
    const line = "«".repeat(20000);
    const started = performance.now();

    html(line);
    assert.ok(performance.now() - started < 500, "twenty thousand unclosed marks take under half a second");
});

test("a paragraph of many closed runs is read in linear time, beside a mark it never closes", () => {
    // Four times the runs take about four times as long, where a rescan of the rest after each run took sixteen — or the long read is
    // quick whatever its ratio: a quadratic one of these runs takes tens of seconds. The fastest of three reads, as markdown-linear.test.ts
    // takes. Rejected: the ratio alone, of one read each — the short read is a few milliseconds, and a busy build's garbage collections,
    // each as long as the live tree is large, grew it up to 23-fold.
    const timed = (runs: number): number => {
        const root = parseInlines(`«${"\"a\" ".repeat(runs)}`, new Map());
        const started = performance.now();

        markSpans(root, quotes.spans);

        return performance.now() - started;
    };
    const fastest = (runs: number): number => Math.min(timed(runs), timed(runs), timed(runs));

    timed(5000);

    const short = fastest(40000);
    const long = fastest(160000);

    assert.ok(long < 2000 || long / Math.max(short, 1) < 10, `${Math.round(short)} ms for 40000 runs, ${Math.round(long)} ms for 160000`);
});

test("runs that close in a later node go on in the text after the close", () => {
    assert.equal(html("\"a *b* c\" d \"e\""), `<p>${speech("&quot;a <em>b</em> c&quot;")} d ${speech("&quot;e&quot;")}</p>`);
    assert.equal(html("x «y» \"z\" «w"), `<p>x <span class="ui-markdown__span" style="font-style: italic">«y»</span> ${speech("&quot;z&quot;")} «w</p>`);
});

test("single tilde stays literal text while double tilde strikes through", () => {
    assert.equal(html("Wait~ really~"), "<p>Wait~ really~</p>");
    assert.equal(html("~~struck~~ and ~kept~"), "<p><del>struck</del> and ~kept~</p>");
});

test("unclosed inline marks inside custom spans never bridge across span boundaries or invert quote pairing", () => {
    const styles: MarkdownStyles = {
        marks: { emphasis: "color: var(--ui-color-secondary-ink); font-style: italic;" },
        spans: [{ open: "\"", close: "\"", css: "color: var(--ui-color-primary-ink);" }]
    };
    const quote = (words: string): string => `<span class="ui-markdown__span" style="color: var(--ui-color-primary-ink);">${words}</span>`;
    const action = "<em style=\"color: var(--ui-color-secondary-ink); font-style: italic;\">action</em>";

    assert.equal(html("\"Phrase!~\" *action* \"Phrase~\"", styles), `<p>${quote("&quot;Phrase!~&quot;")} ${action} ${quote("&quot;Phrase~&quot;")}</p>`);
    assert.equal(html("\"Phrase!*\" *action* \"Phrase*\"", styles), `<p>${quote("&quot;Phrase!*&quot;")} ${action} ${quote("&quot;Phrase*&quot;")}</p>`);
    assert.equal(html("\"*Phrase\" *action* \"Phrase*\"", styles), `<p>${quote("&quot;*Phrase&quot;")} ${action} ${quote("&quot;Phrase*&quot;")}</p>`);
    assert.equal(html("\"Phrase!~~\" *action* \"Phrase~~\"", styles), `<p>${quote("&quot;Phrase!~~&quot;")} ${action} ${quote("&quot;Phrase~~&quot;")}</p>`);
});

test("standalone token rules with an empty close wrap exact literals outside code", () => {
    const styles: MarkdownStyles = {
        marks: {},
        spans: [
            { open: "<START>", close: "", css: "color: var(--ui-color-warning-ink); font-weight: 600;" },
            { open: "\"", close: "\"", css: "color: var(--ui-color-primary-ink);" }
        ]
    };

    assert.equal(
        html("<START>\n\n\"Hello!\" `<START>`", styles),
        "<p><span class=\"ui-markdown__span\" style=\"color: var(--ui-color-warning-ink); font-weight: 600;\">&lt;START&gt;</span></p><p><span class=\"ui-markdown__span\" style=\"color: var(--ui-color-primary-ink);\">&quot;Hello!&quot;</span> <code>&lt;START&gt;</code></p>"
    );
});

test("a document drawn again replaces only the blocks between the runs both renders share", () => {
    const before = renderMarkdownBlocks("one\n\ntwo\n\nthr", () => null, names, urls);
    const after = renderMarkdownBlocks("one\n\ntwo\n\nthree and more", () => null, names, urls);

    assert.deepEqual(changedBlocks(before, after), { start: 2, removeEnd: 3, insertEnd: 3 });
    assert.deepEqual(changedBlocks(before, before), { start: 3, removeEnd: 3, insertEnd: 3 });
    assert.deepEqual(changedBlocks(["a", "b"], ["a", "x", "y", "b"]), { start: 1, removeEnd: 1, insertEnd: 3 });
    assert.deepEqual(changedBlocks(["a", "b", "c"], ["a", "c"]), { start: 1, removeEnd: 2, insertEnd: 1 });
    assert.deepEqual(changedBlocks(["a"], ["a", "a"]), { start: 1, removeEnd: 1, insertEnd: 2 });
});

test("a display whose line breaks are switched replaces only the blocks that hold one", () => {
    const source = "# A\n\none\ntwo\n\nthree";
    const before = renderMarkdownBlocks(source, () => null, names, urls);
    const after = renderMarkdownBlocks(source, () => null, names, urls, NoMarkdownStyles, NoPictureSources, true);

    assert.deepEqual(changedBlocks(before, after), { start: 1, removeEnd: 2, insertEnd: 2 });
});

const VoidTags = new Set(["BR", "HR", "IMG", "INPUT"]);

type FakeNode = FakeElement | FakeText;

class FakeText {
    public readonly nodeType = 3 as const;
    public parent: FakeElement | null = null;
    public nodeValue: string;

    public constructor(text: string) {
        this.nodeValue = text;
    }

    public remove(): void {
        if (this.parent === null)
            return;

        const index = this.parent.childNodes.indexOf(this);

        if (index >= 0)
            this.parent.childNodes.splice(index, 1);

        this.parent = null;
    }

    public isEqualNode(other: FakeNode): boolean {
        return other.nodeType === 3 && other.nodeValue === this.nodeValue;
    }
}

class FakeElement {
    public readonly nodeType = 1 as const;
    public readonly nodeValue: string | null = null;
    public readonly tagName: string;
    public parent: FakeElement | null = null;
    public readonly attributes = new Map<string, string>();
    public readonly childNodes: FakeNode[] = [];
    public checked = false;

    public constructor(tagName: string) {
        this.tagName = tagName.toUpperCase();
    }

    public get children(): FakeElement[] {
        return this.childNodes.filter((child): child is FakeElement => child.nodeType === 1);
    }

    public get firstElementChild(): FakeElement | null {
        return this.children[0] ?? null;
    }

    public get lastChild(): FakeNode | null {
        return this.childNodes[this.childNodes.length - 1] ?? null;
    }

    public get innerHTML(): string {
        return this.childNodes.map(serializeNode).join("");
    }

    public set innerHTML(markup: string) {
        for (const child of [...this.childNodes])
            child.remove();

        parseInto(this, markup);
    }

    public getAttributeNames(): string[] {
        return [...this.attributes.keys()];
    }

    public hasAttribute(name: string): boolean {
        return this.attributes.has(name);
    }

    public getAttribute(name: string): string | null {
        return this.attributes.get(name) ?? null;
    }

    public setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);

        if (name === "checked")
            this.checked = true;
    }

    public removeAttribute(name: string): void {
        this.attributes.delete(name);

        if (name === "checked")
            this.checked = false;
    }

    public appendChild(node: FakeNode): FakeNode {
        if (node.nodeType === 1 && node.tagName === "#FRAGMENT") {
            for (const child of [...node.childNodes])
                this.appendChild(child);

            return node;
        }

        node.remove();
        node.parent = this;
        this.childNodes.push(node);

        return node;
    }

    public replaceChild(next: FakeNode, current: FakeNode): FakeNode {
        const index = this.childNodes.indexOf(current);

        next.remove();
        next.parent = this;
        current.parent = null;
        this.childNodes[index] = next;

        return current;
    }

    public insertBefore(node: FakeNode, reference: FakeNode | null): FakeNode {
        if (reference === null)
            return this.appendChild(node);

        if (node.nodeType === 1 && node.tagName === "#FRAGMENT") {
            for (const child of [...node.childNodes])
                this.insertBefore(child, reference);

            return node;
        }

        node.remove();
        node.parent = this;

        const index = this.childNodes.indexOf(reference);

        this.childNodes.splice(index, 0, node);

        return node;
    }

    public remove(): void {
        if (this.parent === null)
            return;

        const index = this.parent.childNodes.indexOf(this);

        if (index >= 0)
            this.parent.childNodes.splice(index, 1);

        this.parent = null;
    }

    public isEqualNode(other: FakeNode): boolean {
        if (other.nodeType !== 1 || other.tagName !== this.tagName || other.attributes.size !== this.attributes.size || other.childNodes.length !== this.childNodes.length)
            return false;

        for (const [key, value] of this.attributes) {
            if (other.attributes.get(key) !== value)
                return false;
        }

        return this.childNodes.every((child, index) => child.isEqualNode(other.childNodes[index]));
    }
}

function serializeNode(node: FakeNode): string {
    if (node.nodeType === 3)
        return node.nodeValue;

    const tag = node.tagName.toLowerCase();
    const attrs = [...node.attributes.entries()].map(([name, value]) => value === "" && name === "checked" ? " checked" : ` ${name}="${value}"`).join("");

    if (VoidTags.has(node.tagName))
        return `<${tag}${attrs}>`;

    return `<${tag}${attrs}>${node.innerHTML}</${tag}>`;
}

function parseInto(root: FakeElement, markup: string): void {
    const stack: FakeElement[] = [root];
    const tokens = markup.matchAll(/<\/([a-z0-9]+)>|<([a-z0-9]+)([^>]*)>|([^<]+)/gi);

    for (const match of tokens) {
        const [, closeTag, openTag, rawAttrs, text] = match;
        const current = stack[stack.length - 1];

        if (closeTag !== undefined) {
            if (stack.length > 1)
                stack.pop();
        }
        else if (openTag !== undefined) {
            const element = new FakeElement(openTag);

            for (const attr of (rawAttrs ?? "").matchAll(/([a-z0-9-]+)(?:="([^"]*)")?/gi))
                element.setAttribute(attr[1], attr[2] ?? "");

            current.appendChild(element);

            if (!VoidTags.has(element.tagName))
                stack.push(element);
        }
        else if (text !== undefined) {
            current.appendChild(new FakeText(text));
        }
    }
}

function parseElement(markup: string): Element {
    const holder = new FakeElement("#FRAGMENT");

    holder.innerHTML = markup;

    return holder.firstElementChild as unknown as Element;
}

test("patchElement updates growing paragraphs and lists in place while keeping existing nodes and text nodes alive", () => {
    const paragraph = parseElement("<p data-ui-source-line=\"1\">Hello</p>") as unknown as FakeElement;
    const initialText = paragraph.childNodes[0];

    patchElement(paragraph as unknown as Element, parseElement("<p data-ui-source-line=\"1\">Hello <strong>world</strong></p>"));

    assert.equal(paragraph.innerHTML, "Hello <strong>world</strong>");
    assert.equal(paragraph.childNodes[0], initialText);
    assert.equal(initialText.nodeValue, "Hello ");

    const strong = paragraph.children[0];

    patchElement(paragraph as unknown as Element, parseElement("<p data-ui-source-line=\"1\">Hello <strong>world</strong> again</p>"));

    assert.equal(paragraph.innerHTML, "Hello <strong>world</strong> again");
    assert.equal(paragraph.childNodes[0], initialText);
    assert.equal(paragraph.children[0], strong);

    const list = parseElement("<ul><li data-ui-source-line=\"1\">first</li><li data-ui-source-line=\"2\">sec</li></ul>") as unknown as FakeElement;
    const firstItem = list.children[0];
    const secondItem = list.children[1];
    const secondText = secondItem.childNodes[0];

    patchElement(list as unknown as Element, parseElement("<ul><li data-ui-source-line=\"1\">first</li><li data-ui-source-line=\"2\">second</li><li data-ui-source-line=\"3\">third</li></ul>"));

    assert.equal(list.children[0], firstItem);
    assert.equal(list.children[1], secondItem);
    assert.equal(secondItem.childNodes[0], secondText);
    assert.equal(secondText.nodeValue, "second");
    assert.equal(list.children.length, 3);
    assert.equal(list.children[2].innerHTML, "third");
});

test("a streaming display paces incremental updates across animation frames and patches the active block in place", () => {
    let source = "Hello";
    let changed: ((roots: Iterable<HTMLElement>) => void) | undefined;
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    const body = new FakeElement("div");
    const root = {
        isConnected: true,
        getAttribute: (name: string) => name === "data-ui-markdown-source" ? source : null,
        hasAttribute: () => false,
        querySelector: () => body,
        closest: () => null
    } as unknown as HTMLElement;
    const context = {
        names,
        urls,
        root: { querySelectorAll: () => [root] },
        observeComponents: (_root: unknown, _selector: string, _options: unknown, callback: (roots: Iterable<HTMLElement>) => void) => {
            changed = callback;
        }
    } as unknown as PluginEngineContext;
    const globals = globalThis as {
        document?: unknown;
        requestAnimationFrame?: typeof requestAnimationFrame;
        cancelAnimationFrame?: typeof cancelAnimationFrame;
    };
    const previousDocument = globals.document;
    const previousRaf = globals.requestAnimationFrame;
    const previousCancel = globals.cancelAnimationFrame;

    globals.document = {
        baseURI: "https://app.test/",
        createElement: () => {
            const content = new FakeElement("#FRAGMENT");

            return {
                content,
                get innerHTML(): string {
                    return content.innerHTML;
                },
                set innerHTML(markup: string) {
                    content.innerHTML = markup;
                }
            };
        }
    };
    globals.requestAnimationFrame = (callback: FrameRequestCallback): number => {
        const id = nextFrameId++;

        frames.set(id, callback);

        return id;
    };
    globals.cancelAnimationFrame = (id: number): void => {
        frames.delete(id);
    };

    try {
        const engine = new MarkdownDisplayEngine(context);

        // Initial render draws the full starting document immediately with no animation frame queued.
        assert.equal(body.innerHTML, "<p data-ui-source-line=\"1\">Hello</p>");
        assert.equal(frames.size, 0);

        const paragraph = body.children[0];
        const textNode = paragraph.childNodes[0] as FakeText;

        // A streamed append queues progressive frame delivery instead of jumping straight to the end or recreating the paragraph.
        source = "Hello world 👋!";
        changed?.([root]);

        assert.equal(body.innerHTML, "<p data-ui-source-line=\"1\">Hello</p>");
        assert.equal(frames.size, 1);

        const steps: string[] = [];

        while (frames.size > 0) {
            const [id, callback] = frames.entries().next().value!;

            frames.delete(id);
            callback(16);
            steps.push(textNode.nodeValue);
            assert.equal(body.children[0], paragraph);
            assert.equal(paragraph.childNodes[0], textNode);
            // Surrogate pair for 👋 must never be split across frames.
            assert.equal(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(textNode.nodeValue), false);
        }

        assert.ok(steps.length >= 2, `expected multiple progressive steps, got ${steps.length}`);
        assert.equal(textNode.nodeValue, "Hello world 👋!");

        // A non-prefix replacement cancels any active stream and renders immediately.
        source = "Hello world 👋! More text arriving";
        changed?.([root]);
        assert.equal(frames.size, 1);

        source = "Replaced outright";
        changed?.([root]);
        assert.equal(frames.size, 0);
        assert.equal(textNode.nodeValue, "Replaced outright");

        engine.dispose();
    }
    finally {
        globals.document = previousDocument;
        globals.requestAnimationFrame = previousRaf;
        globals.cancelAnimationFrame = previousCancel;
    }
});

test("custom span scoping isolates unclosed emphasis across links and bare URLs", () => {
    const braces: MarkdownStyles = {
        marks: {},
        spans: [{ open: "{{", close: "}}", css: "color: teal" }]
    };

    assert.equal(
        html("{{ *a [docs](https://x.test \"title\") }} *b*", braces),
        "<p><span class=\"ui-markdown__span\" style=\"color: teal\">{{ *a <a href=\"https://x.test\" title=\"title\" target=\"_blank\" rel=\"noopener noreferrer\">docs</a> }}</span> <em>b</em></p>"
    );
    assert.equal(
        html("{{ *a https://x.test/path}} b*", braces),
        "<p>{{ <em>a <a href=\"https://x.test/path}}\" target=\"_blank\" rel=\"noopener noreferrer\">https://x.test/path}}</a> b</em></p>"
    );
});

test("streaming multi-block documents with code fences, lists and late reference definitions matches full render at every frame", () => {
    let source = "# Start";
    let changed: ((roots: Iterable<HTMLElement>) => void) | undefined;
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    const body = new FakeElement("div");
    const root = {
        isConnected: true,
        getAttribute: (name: string) => name === "data-ui-markdown-source" ? source : null,
        hasAttribute: () => false,
        querySelector: () => body,
        closest: () => null
    } as unknown as HTMLElement;
    const context = {
        names,
        urls,
        root: { querySelectorAll: () => [root] },
        observeComponents: (_root: unknown, _selector: string, _options: unknown, callback: (roots: Iterable<HTMLElement>) => void) => {
            changed = callback;
        }
    } as unknown as PluginEngineContext;
    const globals = globalThis as {
        document?: unknown;
        requestAnimationFrame?: typeof requestAnimationFrame;
        cancelAnimationFrame?: typeof cancelAnimationFrame;
    };
    const previousDocument = globals.document;
    const previousRaf = globals.requestAnimationFrame;
    const previousCancel = globals.cancelAnimationFrame;

    globals.document = {
        baseURI: "https://app.test/",
        createElement: () => {
            const content = new FakeElement("#FRAGMENT");

            return {
                content,
                get innerHTML(): string {
                    return content.innerHTML;
                },
                set innerHTML(markup: string) {
                    content.innerHTML = markup;
                }
            };
        }
    };
    globals.requestAnimationFrame = (callback: FrameRequestCallback): number => {
        const id = nextFrameId++;

        frames.set(id, callback);
        return id;
    };
    globals.cancelAnimationFrame = (id: number): void => {
        frames.delete(id);
    };

    const settledBlocksDocument = [
        "# Start",
        "",
        "First paragraph.",
        "",
        "```json",
        "{\"ok\": true}",
        "```",
        "",
        "Second paragraph.",
        "",
        "- item one",
        "",
        "- item two",
        "",
        "Third paragraph."
    ].join("\n");
    const lateRefDocument = `${settledBlocksDocument}\n\nSee [guide][ref].\n\n[ref]: https://x.test/guide`;

    try {
        const engine = new MarkdownDisplayEngine(context);

        source = settledBlocksDocument;
        changed?.([root]);

        while (frames.size > 0) {
            const [id, callback] = frames.entries().next().value!;

            frames.delete(id);
            callback(16);
        }

        assert.match(body.innerHTML, /<li data-ui-source-line="11"><p data-ui-source-line="11">item one<\/p><\/li><li data-ui-source-line="13"><p data-ui-source-line="13">item two<\/p><\/li>/);
        assert.match(body.innerHTML, /<p data-ui-source-line="15">Third paragraph\.<\/p>/);

        source = lateRefDocument;
        changed?.([root]);

        while (frames.size > 0) {
            const [id, callback] = frames.entries().next().value!;

            frames.delete(id);
            callback(16);
        }

        const freshBody = new FakeElement("div");
        const freshRoot = {
            isConnected: true,
            getAttribute: (name: string) => name === "data-ui-markdown-source" ? lateRefDocument : null,
            hasAttribute: () => false,
            querySelector: () => freshBody,
            closest: () => null
        } as unknown as HTMLElement;
        const freshEngine = new MarkdownDisplayEngine({
            names,
            urls,
            root: { querySelectorAll: () => [freshRoot] },
            observeComponents: () => undefined
        } as unknown as PluginEngineContext);

        assert.equal(body.innerHTML, freshBody.innerHTML);
        assert.match(body.innerHTML, /<a href="https:\/\/x\.test\/guide"/);

        freshEngine.dispose();
        engine.dispose();
    }
    finally {
        globals.document = previousDocument;
        globals.requestAnimationFrame = previousRaf;
        globals.cancelAnimationFrame = previousCancel;
    }
});
