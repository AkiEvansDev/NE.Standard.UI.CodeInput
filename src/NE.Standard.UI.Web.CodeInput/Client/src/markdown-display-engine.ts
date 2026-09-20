// Runs every Markdown display on the page: renders the document its root carries, again when the server pushes another, and again
// when a code block's language is registered after the display was drawn.

import type { PluginEngineContext } from "ne-standard-ui";
import { renderSegments } from "./highlighter.ts";
import { languages } from "./languages/index.ts";
import { fenceLanguageId } from "./languages/markdown.ts";
import { renderMarkdown } from "./markdown-render.ts";
import type { Token } from "./tokenizer.ts";

const RootSelector = ".ui-markdown";
const BodySelector = ".ui-markdown__body";
const SourceAttribute = "data-ui-markdown-source";

export class MarkdownDisplayEngine {
    // The source each root was last rendered from: the observer also reports the render's own writes, and those change nothing.
    private readonly rendered = new WeakMap<HTMLElement, string>();
    private readonly live = new Set<HTMLElement>();

    public constructor(context: PluginEngineContext) {
        this.renderAll(context.root.querySelectorAll<HTMLElement>(RootSelector), false);
        context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: [SourceAttribute] }, roots => this.renderAll(roots, false));

        languages.onRegistered(() => this.renderAll([...this.live], true));
    }

    private renderAll(roots: Iterable<HTMLElement>, force: boolean): void {
        for (const root of this.live) {
            if (!root.isConnected)
                this.live.delete(root);
        }

        for (const root of roots) {
            const source = root.getAttribute(SourceAttribute) ?? "";
            const body = root.querySelector<HTMLElement>(BodySelector);

            if (body === null || (!force && this.rendered.get(root) === source))
                continue;

            this.rendered.set(root, source);
            this.live.add(root);
            body.innerHTML = renderMarkdown(source, highlightCode);
        }
    }
}

/** A code block's text in the editor's colours, by the language its info string names; null when no such language is registered. */
function highlightCode(text: string, info: string): string | null {
    const tokenizer = languages.get(fenceLanguageId(info));

    if (tokenizer === null)
        return null;

    let state = tokenizer.initialState;

    return text.split("\n").map(line => {
        const tokens: Token[] = [];

        state = tokenizer.tokenizeLine(line, state, (from, to, kind) => tokens.push({ from, to, kind }));

        return renderSegments(line, tokens, []);
    }).join("\n");
}
