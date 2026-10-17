// Runs every Markdown display on the page: renders the document its root carries, again when the server pushes another or switches
// its line breaks, and again when a code block's language is registered after the display was drawn. A document drawn again replaces only the blocks that
// came out differently, so a reply streaming in keeps what the reader selected, or points at, in the blocks already written.

import type { PluginEngineContext } from "ne-standard-ui";
import type { MarkdownNames } from "./code-editor-dom.ts";
import { MarkdownBodyClass, MarkdownImageSourcesAttribute, MarkdownLineBreaksAttribute, MarkdownRootClass, MarkdownSourceAttribute, MarkdownStylesAttribute } from "./code-editor-dom.ts";
import { escapeHtml, renderSegments } from "./highlighter.ts";
import { languages } from "./languages/index.ts";
import { fenceLanguageId } from "./languages/markdown.ts";
import { NoMarkdownStyles, renderMarkdownBlocks } from "./markdown-render.ts";
import type { MarkdownPictureSources, MarkdownStyles, MarkdownUrls } from "./markdown-render.ts";
import type { Token } from "./tokenizer.ts";

const RootSelector = `.${MarkdownRootClass}`;
const BodySelector = `.${MarkdownBodyClass}`;

/** Which of a body's blocks a new render replaces: those from `start` to `removeEnd` of the old, by `start` to `insertEnd` of the new. */
export type BlockChange = {
    readonly start: number;
    readonly removeEnd: number;
    readonly insertEnd: number;
};

/** What a root was last drawn from: its document, and whether a single line break is drawn as one. */
type Drawn = {
    readonly source: string;
    readonly lineBreaks: boolean;
};

export class MarkdownDisplayEngine {
    private readonly names: MarkdownNames;
    private readonly urls: MarkdownUrls;
    // What each root was last rendered from: the observer also reports the render's own writes, and those change nothing.
    private readonly rendered = new WeakMap<HTMLElement, Drawn>();
    // The blocks each body holds, as they were rendered, one element each.
    private readonly blocks = new WeakMap<HTMLElement, readonly string[]>();
    private readonly live = new Set<HTMLElement>();

    public constructor(context: PluginEngineContext) {
        this.names = context.names;
        this.urls = context.urls;

        // Watching first: a document that fails to render must not leave every display on the page without its watch.
        context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: [MarkdownSourceAttribute, MarkdownLineBreaksAttribute] }, roots => this.renderAll(roots, false));
        languages.onRegistered(() => this.renderAll([...this.live], true));

        this.renderAll(context.root.querySelectorAll<HTMLElement>(RootSelector), false);
    }

    private renderAll(roots: Iterable<HTMLElement>, force: boolean): void {
        for (const root of this.live) {
            if (!root.isConnected)
                this.live.delete(root);
        }

        for (const root of roots) {
            const source = root.getAttribute(MarkdownSourceAttribute) ?? "";
            const lineBreaks = root.hasAttribute(MarkdownLineBreaksAttribute);
            const body = root.querySelector<HTMLElement>(BodySelector);
            const last = this.rendered.get(root);

            if (body === null || (!force && last?.source === source && last.lineBreaks === lineBreaks))
                continue;

            this.rendered.set(root, { source, lineBreaks });
            this.live.add(root);
            this.draw(body, renderSafely(source, readStyles(root), readPictureSources(root), lineBreaks, this.names, this.urls));
        }
    }

    private draw(body: HTMLElement, next: readonly string[]): void {
        const previous = this.blocks.get(body);

        this.blocks.set(body, next);

        // A body this engine did not fill, or one something else has changed since, is filled whole.
        if (previous === undefined || body.children.length !== previous.length) {
            body.innerHTML = next.join("");
            return;
        }

        const change = changedBlocks(previous, next);

        for (let index = change.removeEnd - 1; index >= change.start; index--)
            body.children[index].remove();

        if (change.insertEnd === change.start)
            return;

        const template = document.createElement("template");

        template.innerHTML = next.slice(change.start, change.insertEnd).join("");
        body.insertBefore(template.content, body.children[change.start] ?? null);
    }
}

/** The blocks between the run both renders begin with and the run both end with: all a render changes. */
export function changedBlocks(previous: readonly string[], next: readonly string[]): BlockChange {
    const shorter = Math.min(previous.length, next.length);
    let start = 0;

    while (start < shorter && previous[start] === next[start])
        start++;

    let end = 0;

    while (end < shorter - start && previous[previous.length - 1 - end] === next[next.length - 1 - end])
        end++;

    return { start, removeEnd: previous.length - end, insertEnd: next.length - end };
}

/** The display's styles, as its root carries them; render-time only, so read again only with a new root. */
const styleCache = new WeakMap<HTMLElement, MarkdownStyles>();

function readStyles(root: HTMLElement): MarkdownStyles {
    const cached = styleCache.get(root);

    if (cached !== undefined)
        return cached;

    const json = root.getAttribute(MarkdownStylesAttribute);
    let styles = NoMarkdownStyles;

    // Written by the server; one that cannot be read leaves the document in the display's own styles rather than unrendered.
    try {
        if (json !== null)
            styles = JSON.parse(json) as MarkdownStyles;
    }
    catch (error) {
        console.warn("NE.Standard.UI.Web.CodeInput: a Markdown display's styles could not be read; it is drawn without them.", error);
    }

    styleCache.set(root, styles);

    return styles;
}

/** Where the display's pictures come from, as its root carries them; render-time only, so read again only with a new root. */
const pictureCache = new WeakMap<HTMLElement, readonly string[]>();

function readPictureSources(root: HTMLElement): MarkdownPictureSources {
    let sources = pictureCache.get(root);

    if (sources === undefined) {
        sources = readSourceList(root.getAttribute(MarkdownImageSourcesAttribute));
        pictureCache.set(root, sources);
    }

    // Read now, not kept: a relative picture is fetched against the page's address as it stands.
    return { base: document.baseURI, sources };
}

/** The author's sources as the server wrote them; a list that cannot be read takes no picture from anywhere but the framework's. */
function readSourceList(json: string | null): readonly string[] {
    if (json === null)
        return [];

    try {
        const parsed: unknown = JSON.parse(json);

        return Array.isArray(parsed) ? parsed.filter((source): source is string => typeof source === "string") : [];
    }
    catch (error) {
        console.warn("NE.Standard.UI.Web.CodeInput: a Markdown display's picture sources could not be read; it draws pictures from the framework's own alone.", error);

        return [];
    }
}

/** The document as HTML, block by block; one that cannot be rendered is shown as its source, and the displays beside it render as ever. */
function renderSafely(source: string, styles: MarkdownStyles, pictures: MarkdownPictureSources, lineBreaks: boolean, names: MarkdownNames, urls: MarkdownUrls): string[] {
    try {
        return renderMarkdownBlocks(source, highlightCode, names, urls, styles, pictures, lineBreaks);
    }
    catch (error) {
        console.warn("NE.Standard.UI.Web.CodeInput: a Markdown document could not be rendered; its source is shown instead.", error);

        return [`<pre class="${MarkdownRootClass}__code"><code>${escapeHtml(source)}</code></pre>`];
    }
}

/** A code block's text in the editor's colours, by the language its info string names; null when no such language is registered. */
function highlightCode(text: string, info: string): string | null {
    const tokenizer = languages.get(fenceLanguageId(info));

    if (tokenizer === null)
        return null;

    let state = tokenizer.initialState;

    // A package's tokenizer that throws leaves this block plain rather than the whole document unrendered.
    try {
        return text.split("\n").map(line => {
            const tokens: Token[] = [];

            state = tokenizer.tokenizeLine(line, state, (from, to, kind) => tokens.push({ from, to, kind }));

            return renderSegments(line, tokens, []);
        }).join("\n");
    }
    catch {
        return null;
    }
}
