// The author's own runs (MarkdownDisplayComponent.AddSpanStyle): words from an opening mark to the next closing one, marks included,
// wrapped in a span of the inline tree once Markdown's own rules have built it, so a run may hold emphasis and a link but never
// reaches into code.

import { Inline, mergeText } from "./markdown-inlines.ts";

/** An author's run: the marks that open and close it. */
export type MarkdownSpanRule = {
    readonly open: string;
    readonly close: string;
};

/** A run wrapped: its span, and the text after its closing mark, which the walk goes on in. */
type Wrapped = {
    readonly span: Inline;
    /** The text after the closing mark, a node of its own; null where the mark ended its node. */
    readonly after: Inline | null;
    /** Where `after` began in the text the run opened in; -1 where the run closed in a later node. */
    readonly cut: number;
};

/**
 * Wraps every closed run under a parent in a `span` node whose `rule` names it; an opening mark with no closing one after it among
 * its siblings styles nothing, as an unclosed `**` does not.
 */
export function markSpans(parent: Inline, rules: readonly MarkdownSpanRule[]): void {
    mergeText(parent);

    // A rule whose mark found no close among these siblings finds none further on either: a line of unclosed marks is read once.
    const closeless = new Set<number>();

    for (let child = parent.firstChild; child !== null; child = child.next) {
        if (child.type === "text")
            child = markInText(child, rules, closeless);
        else if (child.type !== "code" && child.type !== "image" && child.type !== "span" && child.firstChild !== null)
            markSpans(child, rules);
    }
}

/**
 * Opens every run a text node holds that closes, each in turn, going on in the text after its close; answers the last node it left,
 * for the walk to go on after it.
 */
function markInText(node: Inline, rules: readonly MarkdownSpanRule[], closeless: Set<number>): Inline {
    // Where each rule's next opening mark stands in the text, -1 where none is left: looked for again only once a run has passed it,
    // so a paragraph of many runs is read once, not once a run.
    const openings = rules.map((rule, index) => (closeless.has(index) ? -1 : node.literal.indexOf(rule.open)));
    let text = node;

    for (;;) {
        const rule = firstOpening(openings, rules);

        if (rule < 0)
            return text;

        const wrapped = wrapRun(text, openings[rule], rule, rules);

        if (wrapped === null) {
            closeless.add(rule);
            openings[rule] = -1;
            continue;
        }

        if (wrapped.after === null)
            return wrapped.span;

        moveOpenings(openings, wrapped.after, wrapped.cut, rules, closeless);
        text = wrapped.after;
    }
}

/** The rule whose opening mark comes first, -1 for none; of two at one place, the longer, so `«` and `<<` cannot both claim one run. */
function firstOpening(openings: readonly number[], rules: readonly MarkdownSpanRule[]): number {
    let found = -1;

    for (let rule = 0; rule < openings.length; rule++) {
        const at = openings[rule];

        if (at < 0)
            continue;

        if (found < 0 || at < openings[found] || (at === openings[found] && rules[rule].open.length > rules[found].open.length))
            found = rule;
    }

    return found;
}

/**
 * Wraps the run an opening mark starts, if a closing mark follows it in this text node or in a later sibling's; the siblings between
 * — emphasis, a link, a line break — go into the run whole, and any run of another rule inside it is wrapped in turn. Null where
 * nothing closes it.
 */
function wrapRun(node: Inline, at: number, ruleIndex: number, rules: readonly MarkdownSpanRule[]): Wrapped | null {
    const rule = rules[ruleIndex];
    const contentStart = at + rule.open.length;
    let closingNode: Inline | null = null;
    let closingIndex = node.literal.indexOf(rule.close, contentStart);

    if (closingIndex >= 0)
        closingNode = node;
    else {
        for (let sibling = node.next; sibling !== null; sibling = sibling.next) {
            if (sibling.type !== "text")
                continue;

            closingIndex = sibling.literal.indexOf(rule.close);

            if (closingIndex >= 0) {
                closingNode = sibling;
                break;
            }
        }
    }

    if (closingNode === null)
        return null;

    const inner = new Inline("root");

    if (closingNode === node)
        inner.appendChild(new Inline("text", node.literal.slice(contentStart, closingIndex)));
    else {
        inner.appendChild(new Inline("text", node.literal.slice(contentStart)));

        while (node.next !== closingNode)
            inner.appendChild(node.next as Inline);

        inner.appendChild(new Inline("text", closingNode.literal.slice(0, closingIndex)));
    }

    const cut = closingIndex + rule.close.length;
    const rest = closingNode.literal.slice(cut);
    const sameNode = closingNode === node;

    if (!sameNode)
        closingNode.unlink();

    markSpans(inner, rules);

    const span = new Inline("span");

    span.rule = ruleIndex;
    span.appendChild(new Inline("text", rule.open));

    while (inner.firstChild !== null)
        span.appendChild(inner.firstChild);

    span.appendChild(new Inline("text", rule.close));

    node.literal = node.literal.slice(0, at);
    node.insertAfter(span);

    if (rest.length === 0)
        return { span, after: null, cut: -1 };

    const after = new Inline("text", rest);

    span.insertAfter(after);

    return { span, after, cut: sameNode ? cut : -1 };
}

/**
 * Carries the openings over to the text after a run: one past the run moves back by where that text began, one the run took is
 * looked for again; a mark absent from the text the run closed in is absent from its tail too. A run that closed in a later node
 * leaves a text not read yet, read whole.
 */
function moveOpenings(openings: number[], after: Inline, cut: number, rules: readonly MarkdownSpanRule[], closeless: ReadonlySet<number>): void {
    for (let rule = 0; rule < rules.length; rule++) {
        const at = openings[rule];

        if (closeless.has(rule) || (cut >= 0 && at < 0))
            continue;

        openings[rule] = cut >= 0 && at >= cut ? at - cut : after.literal.indexOf(rules[rule].open);
    }
}
