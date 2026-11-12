// Runs every Markdown display on the page: renders the document its root carries, again when the server pushes another or switches
// its line breaks, and again when a code block's language is registered after the display was drawn. A document that grows as a reply
// streams in is revealed across animation frames and patched in place, so the blocks and inline nodes already on screen stay in the
// DOM while new words arrive.

import type { PluginEngineContext } from "ne-standard-ui";
import type { MarkdownNames } from "./code-editor-dom.ts";
import { MarkdownBodyClass, MarkdownImageSourcesAttribute, MarkdownLineBreaksAttribute, MarkdownRootClass, MarkdownSourceAttribute, MarkdownStylesAttribute } from "./code-editor-dom.ts";
import { escapeHtml, renderSegments } from "./highlighter.ts";
import { languages } from "./languages/index.ts";
import { fenceLanguageId } from "./languages/markdown.ts";
import { parseMarkdown } from "./markdown-blocks.ts";
import { renderMarkdownBlocks, renderParsedBlocks } from "./markdown-render.ts";
import type { MarkdownPictureSources, MarkdownStyles, MarkdownUrls } from "./markdown-render.ts";
import { parseMarkdownStyles } from "./markdown-syntax.ts";
import type { Token } from "./tokenizer.ts";
import { warnOnce } from "./warn-once.ts";

const RootSelector = `.${MarkdownRootClass}`;
const BodySelector = `.${MarkdownBodyClass}`;
// An empty display that receives a short first chunk is starting a stream; one given a whole document at once draws it immediately.
const MaxInitialStreamChunk = 160;
const MaxHighlightCache = 256;
const highlightCache = new Map<string, string | null>();

/** Which of a body's blocks a new render replaces: those from `start` to `removeEnd` of the old, by `start` to `insertEnd` of the new. */
export type BlockChange = {
    readonly start: number;
    readonly removeEnd: number;
    readonly insertEnd: number;
};

/** What a root was last drawn from: its document, whether a single line break is drawn as one, and whether it stood inside a link. */
type Drawn = {
    readonly source: string;
    readonly lineBreaks: boolean;
    readonly insideLink: boolean;
};

/** A root whose streamed text is being revealed across animation frames toward `target`. */
type StreamState = {
    target: string;
    shown: number;
    readonly lineBreaks: boolean;
    readonly insideLink: boolean;
    frame: number;
    settledLine: number;
    settledOffset: number;
    settledHtml: readonly string[];
    unsettledReferences: boolean;
};

export class MarkdownDisplayEngine {
    private readonly names: MarkdownNames;
    private readonly urls: MarkdownUrls;
    // What each root was last rendered from: the observer also reports the render's own writes, and those change nothing.
    private readonly rendered = new WeakMap<HTMLElement, Drawn>();
    // The blocks each body holds, as they were rendered, one element each.
    private readonly blocks = new WeakMap<HTMLElement, readonly string[]>();
    private readonly streams = new Map<HTMLElement, StreamState>();
    private readonly live = new Set<HTMLElement>();
    private readonly cleanups: (() => void)[] = [];

    public constructor(context: PluginEngineContext) {
        this.names = context.names;
        this.urls = context.urls;

        // Watching first: a document that fails to render must not leave every display on the page without its watch.
        const observer = context.observeComponents(context.root, RootSelector, { childList: true, addedOnly: true, attributeFilter: [MarkdownSourceAttribute, MarkdownLineBreaksAttribute] }, roots => this.renderAll(roots, false));
        const stopLanguages = languages.onRegistered(() => {
            highlightCache.clear();

            for (const stream of this.streams.values()) {
                stream.settledLine = 1;
                stream.settledOffset = 0;
                stream.settledHtml = [];
            }

            this.renderAll([...this.live], true);
        });

        this.cleanups.push(() => observer?.disconnect(), stopLanguages);
        this.renderAll(context.root.querySelectorAll<HTMLElement>(RootSelector), false);
    }

    /** Disposes the observer, active stream frames and language subscription when the engine is disposed. */
    public dispose(): void {
        for (const root of [...this.streams.keys()])
            this.stopStream(root);

        for (const cleanup of this.cleanups)
            cleanup();

        this.cleanups.length = 0;
        this.live.clear();
    }

    private renderAll(roots: Iterable<HTMLElement>, force: boolean): void {
        for (const root of this.live) {
            if (!root.isConnected) {
                this.stopStream(root);
                this.live.delete(root);
            }
        }

        for (const root of roots) {
            const source = root.getAttribute(MarkdownSourceAttribute) ?? "";
            const lineBreaks = root.hasAttribute(MarkdownLineBreaksAttribute);
            // Any anchor, a disabled link's with its address kept aside too, as the framework's inline markup reads it.
            const insideLink = root.closest("a") !== null;
            const body = root.querySelector<HTMLElement>(BodySelector);
            const last = this.rendered.get(root);

            if (body === null || (!force && last?.source === source && last.lineBreaks === lineBreaks && last.insideLink === insideLink))
                continue;

            const activeStream = this.streams.get(root);

            if (!force && last !== undefined && last.lineBreaks === lineBreaks && last.insideLink === insideLink && source.length > last.source.length && source.startsWith(last.source) && (last.source.length > 0 || activeStream !== undefined || source.length <= MaxInitialStreamChunk) && canStream()) {
                this.rendered.set(root, { source, lineBreaks, insideLink });
                this.live.add(root);
                this.startOrExtendStream(root, body, last.source.length, source, lineBreaks, insideLink);
                continue;
            }

            if (force && activeStream !== undefined && activeStream.lineBreaks === lineBreaks && activeStream.insideLink === insideLink && activeStream.target === source) {
                this.draw(body, renderSafely(source.slice(0, activeStream.shown), readStyles(root), readPictureSources(root), lineBreaks, insideLink, this.names, this.urls));
                continue;
            }

            this.stopStream(root);
            this.rendered.set(root, { source, lineBreaks, insideLink });
            this.live.add(root);
            this.draw(body, renderSafely(source, readStyles(root), readPictureSources(root), lineBreaks, insideLink, this.names, this.urls));
        }
    }

    private stopStream(root: HTMLElement): void {
        const stream = this.streams.get(root);

        if (stream === undefined)
            return;

        this.streams.delete(root);

        if (typeof cancelAnimationFrame === "function")
            cancelAnimationFrame(stream.frame);
    }

    private startOrExtendStream(root: HTMLElement, body: HTMLElement, previousLength: number, target: string, lineBreaks: boolean, insideLink: boolean): void {
        const existing = this.streams.get(root);

        if (existing !== undefined) {
            existing.target = target;
            return;
        }

        const stream: StreamState = {
            target,
            shown: previousLength,
            lineBreaks,
            insideLink,
            frame: 0,
            settledLine: 1,
            settledOffset: 0,
            settledHtml: [],
            unsettledReferences: false
        };

        this.streams.set(root, stream);
        stream.frame = requestAnimationFrame(() => this.stepStream(root, body));
    }

    private stepStream(root: HTMLElement, body: HTMLElement): void {
        const stream = this.streams.get(root);

        if (stream === undefined)
            return;

        if (!root.isConnected) {
            this.streams.delete(root);
            this.live.delete(root);
            return;
        }

        const remaining = stream.target.length - stream.shown;
        let nextShown = Math.min(stream.target.length, stream.shown + Math.max(2, Math.ceil(remaining / 4)));

        if (nextShown < stream.target.length) {
            const code = stream.target.charCodeAt(nextShown - 1);

            if (code >= 0xD800 && code <= 0xDBFF)
                nextShown++;
        }

        stream.shown = nextShown;
        this.draw(body, renderStreamSafely(stream.target.slice(0, nextShown), stream, readStyles(root), readPictureSources(root), this.names, this.urls));

        if (nextShown < stream.target.length)
            stream.frame = requestAnimationFrame(() => this.stepStream(root, body));
        else
            this.streams.delete(root);
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

        if (change.removeEnd === change.start && change.insertEnd === change.start)
            return;

        const template = document.createElement("template");

        template.innerHTML = next.slice(change.start, change.insertEnd).join("");

        let index = change.start;

        while (index < change.removeEnd && template.content.firstElementChild !== null && body.children[index].tagName === template.content.firstElementChild.tagName) {
            patchElement(body.children[index], template.content.firstElementChild);
            template.content.firstElementChild.remove();
            index++;
        }

        for (let removeIndex = change.removeEnd - 1; removeIndex >= index; removeIndex--)
            body.children[removeIndex].remove();

        if (template.content.childNodes.length > 0)
            body.insertBefore(template.content, body.children[index] ?? null);
    }
}

/** Whether the browser can pace a streaming document across animation frames without overriding reduced motion. */
function canStream(): boolean {
    if (typeof requestAnimationFrame !== "function" || typeof cancelAnimationFrame !== "function")
        return false;

    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)
        return false;

    return true;
}

/** The blocks between the run both renders share at the start and the run both share at the end: all a render changes. */
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

/** Updates `existing` in place to match `incoming`, keeping unchanged child subtrees and text nodes alive in the DOM. */
export function patchElement(existing: Element, incoming: Element): void {
    for (const name of existing.getAttributeNames()) {
        if (!incoming.hasAttribute(name))
            existing.removeAttribute(name);
    }

    for (const name of incoming.getAttributeNames()) {
        const value = incoming.getAttribute(name)!;

        if (existing.getAttribute(name) !== value)
            existing.setAttribute(name, value);
    }

    if ("checked" in existing && "checked" in incoming)
        (existing as HTMLInputElement).checked = (incoming as HTMLInputElement).checked;

    const nextChildren = [...incoming.childNodes];

    for (let index = 0; index < nextChildren.length; index++) {
        const current = existing.childNodes[index];
        const next = nextChildren[index];

        if (current === undefined) {
            existing.appendChild(next);
        }
        else if (current.nodeType === 3 && next.nodeType === 3) {
            if (current.nodeValue !== next.nodeValue)
                current.nodeValue = next.nodeValue;
        }
        else if (current.nodeType === 1 && next.nodeType === 1 && (current as Element).tagName === (next as Element).tagName) {
            patchElement(current as Element, next as Element);
        }
        else {
            existing.replaceChild(next, current);
        }
    }

    while (existing.childNodes.length > nextChildren.length)
        existing.lastChild!.remove();
}

/** The document as HTML, block by block; one that cannot be rendered is shown as its source, and the displays beside it render as ever. */
function renderSafely(source: string, styles: MarkdownStyles, pictures: MarkdownPictureSources, lineBreaks: boolean, insideLink: boolean, names: MarkdownNames, urls: MarkdownUrls): string[] {
    try {
        return renderMarkdownBlocks(source, highlightCode, names, urls, styles, pictures, lineBreaks, insideLink);
    }
    catch (error) {
        console.warn("NE.Standard.UI.Web.CodeInput: a Markdown document could not be rendered; its source is shown instead.", error);

        return [`<pre class="${MarkdownRootClass}__code"><code>${escapeHtml(source)}</code></pre>`];
    }
}

/**
 * Renders `slice` during progressive streaming, caching closed blocks that precede the active tail so long replies do not re-parse
 * from byte 0 on every animation frame. Falls back to full parsing whenever carriage returns or link reference definitions appear.
 */
function renderStreamSafely(slice: string, stream: StreamState, styles: MarkdownStyles, pictures: MarkdownPictureSources, names: MarkdownNames, urls: MarkdownUrls): string[] {
    if (stream.unsettledReferences || slice.includes("\r"))
        return renderSafely(slice, styles, pictures, stream.lineBreaks, stream.insideLink, names, urls);

    try {
        const tail = slice.slice(stream.settledOffset);
        const tailDocument = parseMarkdown(tail, stream.settledLine);

        if (tailDocument.references.size > 0) {
            stream.unsettledReferences = true;
            stream.settledLine = 1;
            stream.settledOffset = 0;
            stream.settledHtml = [];
            return renderMarkdownBlocks(slice, highlightCode, names, urls, styles, pictures, stream.lineBreaks, stream.insideLink);
        }

        const tailHtml = renderParsedBlocks(tailDocument.blocks, tailDocument.references, highlightCode, names, urls, styles, pictures, stream.lineBreaks, stream.insideLink);
        const combined = stream.settledHtml.length === 0 ? tailHtml : [...stream.settledHtml, ...tailHtml];

        if (tailDocument.blocks.length >= 3) {
            let cut = tailDocument.blocks.length - 2;

            while (cut > 0 && (tailDocument.blocks[cut - 1].type === "list" || tailDocument.blocks[cut - 1].type === "quote"))
                cut--;

            if (cut > 0) {
                const cutLine = tailDocument.blocks[cut].line;
                const cutOffset = offsetOfLine(tail, cutLine - stream.settledLine);

                if (cutOffset > 0 && tail.includes("\n", cutOffset)) {
                    stream.settledHtml = [...stream.settledHtml, ...tailHtml.slice(0, cut)];
                    stream.settledOffset += cutOffset;
                    stream.settledLine = cutLine;
                }
            }
        }

        return combined;
    }
    catch (error) {
        console.warn("NE.Standard.UI.Web.CodeInput: a Markdown document could not be rendered; its source is shown instead.", error);

        return [`<pre class="${MarkdownRootClass}__code"><code>${escapeHtml(slice)}</code></pre>`];
    }
}

function offsetOfLine(text: string, deltaLines: number): number {
    let offset = 0;

    for (let count = 0; count < deltaLines; count++) {
        const next = text.indexOf("\n", offset);

        if (next < 0)
            return -1;

        offset = next + 1;
    }

    return offset;
}

/** A code block's text in the editor's colours, by the language its info string names; null when no such language is registered. */
function highlightCode(text: string, info: string): string | null {
    const languageId = fenceLanguageId(info);
    const tokenizer = languages.get(languageId);

    if (tokenizer === null)
        return null;

    const cacheKey = `${languageId}\0${text}`;
    const cached = highlightCache.get(cacheKey);

    if (cached !== undefined)
        return cached;

    let state = tokenizer.initialState;

    // A package's tokenizer that throws leaves this block plain rather than the whole document unrendered.
    try {
        const html = text.split("\n").map(line => {
            const tokens: Token[] = [];

            state = tokenizer.tokenizeLine(line, state, (from, to, kind) => tokens.push({ from, to, kind }));

            return renderSegments(line, tokens, []);
        }).join("\n");

        if (highlightCache.size >= MaxHighlightCache)
            highlightCache.clear();

        highlightCache.set(cacheKey, html);

        return html;
    }
    catch (error) {
        warnOnce(tokenizer, `the tokenizer of '${languageId}' threw; the code blocks it fails on are shown plain.`, error);

        return null;
    }
}

/** The display's styles, as its root carries them; render-time only, so read again only with a new root. */
const styleCache = new WeakMap<HTMLElement, MarkdownStyles>();

function readStyles(root: HTMLElement): MarkdownStyles {
    const cached = styleCache.get(root);

    if (cached !== undefined)
        return cached;

    const styles = parseMarkdownStyles(root.getAttribute(MarkdownStylesAttribute));

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
