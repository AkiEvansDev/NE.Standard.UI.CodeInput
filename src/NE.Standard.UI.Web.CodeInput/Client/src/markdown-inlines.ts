// A paragraph's inline markup as a tree: CommonMark's inline rules (code spans, emphasis, links, images, autolinks, entities,
// escapes, breaks) plus GitHub's strikethrough and bare links. Raw HTML stays text, so a document can't inject elements of its own.

export type InlineType =
    | "root"
    | "text"
    | "entity"
    | "code"
    | "emphasis"
    | "strong"
    | "strikethrough"
    | "link"
    | "image"
    | "hardbreak"
    | "softbreak";

export type LinkTarget = {
    readonly href: string;
    readonly title: string;
};

/** A node of the inline tree, linked to its siblings so the emphasis pass can wrap a run of them in place. */
export class Inline {
    public readonly type: InlineType;
    public literal: string;
    public href = "";
    public title = "";
    public parent: Inline | null = null;
    public firstChild: Inline | null = null;
    public lastChild: Inline | null = null;
    public previous: Inline | null = null;
    public next: Inline | null = null;

    public constructor(type: InlineType, literal = "") {
        this.type = type;
        this.literal = literal;
    }

    public appendChild(child: Inline): void {
        child.unlink();
        child.parent = this;

        if (this.lastChild === null)
            this.firstChild = child;
        else {
            this.lastChild.next = child;
            child.previous = this.lastChild;
        }

        this.lastChild = child;
    }

    public insertAfter(sibling: Inline): void {
        sibling.unlink();
        sibling.parent = this.parent;
        sibling.previous = this;
        sibling.next = this.next;

        if (this.next === null) {
            if (this.parent !== null)
                this.parent.lastChild = sibling;
        }
        else
            this.next.previous = sibling;

        this.next = sibling;
    }

    public unlink(): void {
        if (this.previous === null) {
            if (this.parent !== null)
                this.parent.firstChild = this.next;
        }
        else
            this.previous.next = this.next;

        if (this.next === null) {
            if (this.parent !== null)
                this.parent.lastChild = this.previous;
        }
        else
            this.next.previous = this.previous;

        this.parent = null;
        this.previous = null;
        this.next = null;
    }
}

type Delimiter = {
    readonly node: Inline;
    readonly character: string;
    count: number;
    readonly original: number;
    readonly canOpen: boolean;
    readonly canClose: boolean;
    previous: Delimiter | null;
    next: Delimiter | null;
};

type Bracket = {
    readonly node: Inline;
    readonly image: boolean;
    /** Where the bracket's text starts in the source, for a shortcut reference's label. */
    readonly index: number;
    readonly previousBracket: Bracket | null;
    readonly previousDelimiter: Delimiter | null;
    active: boolean;
    /** Another bracket opened after this one, which rules out a shortcut reference. */
    bracketAfter: boolean;
};

/** A reference label as definitions and uses are matched: trimmed, its white space collapsed, its case folded. */
export function normalizeLabel(label: string): string {
    return label.trim().replace(/\s+/g, " ").toLowerCase().toUpperCase();
}

const Special = /[\n\\`*_~[\]!<&]/g;
const Escapable = /^[!-/:-@[-`{-~]$/;
const Whitespace = /^\s$/u;
const Punctuation = /^[\p{P}\p{S}]$/u;
const EntityPattern = /&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[A-Za-z][A-Za-z\d]{1,31});/y;
const UriAutolink = /<([A-Za-z][A-Za-z\d+.-]{1,31}:[^<>\u0000-\u0020]*)>/y;
const EmailAutolink = /<([A-Za-z\d.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?)*)>/y;
const BacktickRun = /`+/g;
const BareLink = /(?:https?:\/\/|www\.)[^\s<]+/g;

/** Parses one block's inline text into a tree under a root node. */
export function parseInlines(text: string, references: ReadonlyMap<string, LinkTarget>): Inline {
    const root = new Inline("root");

    new InlineParser(text, references).parse(root);
    linkBareAddresses(root);

    return root;
}

class InlineParser {
    private readonly text: string;
    private readonly references: ReadonlyMap<string, LinkTarget>;
    private position = 0;
    private delimiters: Delimiter | null = null;
    private brackets: Bracket | null = null;

    public constructor(text: string, references: ReadonlyMap<string, LinkTarget>) {
        this.text = text;
        this.references = references;
    }

    public parse(root: Inline): void {
        while (this.position < this.text.length)
            this.parseInline(root);

        this.processEmphasis(null);
    }

    private parseInline(root: Inline): void {
        switch (this.text.charAt(this.position)) {
            case "\n":
                this.lineBreak(root);
                break;
            case "\\":
                this.backslash(root);
                break;
            case "`":
                this.codeSpan(root);
                break;
            case "*":
            case "_":
            case "~":
                this.delimiterRun(root);
                break;
            case "[":
                this.position++;
                this.openBracket(root, "[", false);
                break;
            case "!":
                this.bang(root);
                break;
            case "]":
                this.closeBracket(root);
                break;
            case "<":
                this.autolink(root);
                break;
            case "&":
                this.entity(root);
                break;
            default:
                this.plainText(root);
                break;
        }
    }

    private lineBreak(root: Inline): void {
        this.position++;

        const last = root.lastChild;
        let hard = false;

        // Two spaces or more before the break make it a hard one; the spaces themselves are not text.
        if (last !== null && last.type === "text" && last.literal.endsWith(" ")) {
            hard = last.literal.endsWith("  ");
            last.literal = last.literal.replace(/ +$/, "");
        }

        root.appendChild(new Inline(hard ? "hardbreak" : "softbreak"));
        this.skipSpaces();
    }

    private backslash(root: Inline): void {
        this.position++;

        const next = this.text.charAt(this.position);

        if (next === "\n") {
            this.position++;
            root.appendChild(new Inline("hardbreak"));
            this.skipSpaces();
        }
        else if (Escapable.test(next)) {
            this.position++;
            root.appendChild(new Inline("text", next));
        }
        else
            root.appendChild(new Inline("text", "\\"));
    }

    private codeSpan(root: Inline): void {
        const start = this.position;

        while (this.text.charAt(this.position) === "`")
            this.position++;

        const length = this.position - start;

        BacktickRun.lastIndex = this.position;

        for (let run = BacktickRun.exec(this.text); run !== null; run = BacktickRun.exec(this.text)) {
            if (run[0].length !== length)
                continue;

            let content = this.text.slice(this.position, run.index).replace(/\n/g, " ");

            if (content.length > 2 && content.startsWith(" ") && content.endsWith(" ") && /[^ ]/.test(content))
                content = content.slice(1, -1);

            root.appendChild(new Inline("code", content));
            this.position = run.index + length;

            return;
        }

        root.appendChild(new Inline("text", this.text.slice(start, this.position)));
    }

    private delimiterRun(root: Inline): void {
        const start = this.position;
        const character = this.text.charAt(start);

        while (this.text.charAt(this.position) === character)
            this.position++;

        const count = this.position - start;
        const node = new Inline("text", this.text.slice(start, this.position));

        root.appendChild(node);

        // Strikethrough is one tilde or two; a longer run is text.
        if (character === "~" && count > 2)
            return;

        const before = start === 0 ? "\n" : this.text.charAt(start - 1);
        const after = this.position >= this.text.length ? "\n" : this.text.charAt(this.position);
        const beforeSpace = Whitespace.test(before);
        const afterSpace = Whitespace.test(after);
        const beforePunctuation = Punctuation.test(before);
        const afterPunctuation = Punctuation.test(after);
        const leftFlanking = !afterSpace && (!afterPunctuation || beforeSpace || beforePunctuation);
        const rightFlanking = !beforeSpace && (!beforePunctuation || afterSpace || afterPunctuation);

        // An underscore inside a word neither opens nor closes: snake_case stays as written.
        const canOpen = character === "_" ? leftFlanking && (!rightFlanking || beforePunctuation) : leftFlanking;
        const canClose = character === "_" ? rightFlanking && (!leftFlanking || afterPunctuation) : rightFlanking;

        const delimiter: Delimiter = { node, character, count, original: count, canOpen, canClose, previous: this.delimiters, next: null };

        if (this.delimiters !== null)
            this.delimiters.next = delimiter;

        this.delimiters = delimiter;
    }

    private bang(root: Inline): void {
        if (this.text.charAt(this.position + 1) === "[") {
            this.position += 2;
            this.openBracket(root, "![", true);
        }
        else {
            this.position++;
            root.appendChild(new Inline("text", "!"));
        }
    }

    private openBracket(root: Inline, literal: string, image: boolean): void {
        const node = new Inline("text", literal);

        root.appendChild(node);

        if (this.brackets !== null)
            this.brackets.bracketAfter = true;

        this.brackets = {
            node,
            image,
            index: this.position,
            previousBracket: this.brackets,
            previousDelimiter: this.delimiters,
            active: true,
            bracketAfter: false
        };
    }

    private closeBracket(root: Inline): void {
        this.position++;

        const after = this.position;
        const opener = this.brackets;

        if (opener === null) {
            root.appendChild(new Inline("text", "]"));

            return;
        }

        if (!opener.active) {
            root.appendChild(new Inline("text", "]"));
            this.brackets = opener.previousBracket;

            return;
        }

        const target = this.inlineTarget() ?? this.referenceTarget(opener, after);

        if (target === null) {
            this.brackets = opener.previousBracket;
            this.position = after;
            root.appendChild(new Inline("text", "]"));

            return;
        }

        const node = new Inline(opener.image ? "image" : "link");

        node.href = target.href;
        node.title = target.title;

        for (let child = opener.node.next; child !== null;) {
            const next = child.next;

            node.appendChild(child);
            child = next;
        }

        root.appendChild(node);
        this.processEmphasis(opener.previousDelimiter);
        this.brackets = opener.previousBracket;
        opener.node.unlink();

        // No link inside a link: every bracket still open before this one can no longer make one.
        if (!opener.image) {
            for (let bracket = this.brackets; bracket !== null; bracket = bracket.previousBracket) {
                if (!bracket.image)
                    bracket.active = false;
            }
        }
    }

    /** `(destination "title")` right after the closing bracket; null, moving nothing, when it is not one. */
    private inlineTarget(): LinkTarget | null {
        if (this.text.charAt(this.position) !== "(")
            return null;

        const start = this.position;

        this.position++;
        this.skipWhitespace();

        const href = this.destination();

        if (href !== null) {
            const beforeTitle = this.position;

            this.skipWhitespace();

            const title = this.position > beforeTitle ? this.linkTitle() : null;

            if (title === null)
                this.position = beforeTitle;

            this.skipWhitespace();

            if (this.text.charAt(this.position) === ")") {
                this.position++;

                return { href, title: title ?? "" };
            }
        }

        this.position = start;

        return null;
    }

    private destination(): string | null {
        if (this.text.charAt(this.position) === "<") {
            for (let i = this.position + 1; i < this.text.length; i++) {
                const character = this.text.charAt(i);

                if (character === "\\") {
                    i++;
                    continue;
                }

                if (character === "\n" || character === "<")
                    return null;

                if (character === ">") {
                    const href = unescape(this.text.slice(this.position + 1, i));

                    this.position = i + 1;

                    return href;
                }
            }

            return null;
        }

        const start = this.position;
        let depth = 0;

        while (this.position < this.text.length) {
            const character = this.text.charAt(this.position);

            if (character === "\\" && Escapable.test(this.text.charAt(this.position + 1))) {
                this.position += 2;
                continue;
            }

            if (character === "(")
                depth++;
            else if (character === ")") {
                if (depth === 0)
                    break;

                depth--;
            }
            else if (/[\s\u0000-\u001f]/.test(character))
                break;

            this.position++;
        }

        if (depth !== 0) {
            this.position = start;

            return null;
        }

        return unescape(this.text.slice(start, this.position));
    }

    private linkTitle(): string | null {
        const open = this.text.charAt(this.position);
        const close = open === "(" ? ")" : open;

        if (open !== "\"" && open !== "'" && open !== "(")
            return null;

        for (let i = this.position + 1; i < this.text.length; i++) {
            const character = this.text.charAt(i);

            if (character === "\\") {
                i++;
                continue;
            }

            if (character === close) {
                const title = unescape(this.text.slice(this.position + 1, i));

                this.position = i + 1;

                return title;
            }
        }

        return null;
    }

    /** `[label]`, `[]` or nothing after the bracket, looked up among the document's definitions. */
    private referenceTarget(opener: Bracket, after: number): LinkTarget | null {
        let label: string | null = null;

        if (this.text.charAt(this.position) === "[") {
            const close = this.text.indexOf("]", this.position + 1);

            if (close > this.position + 1 && !this.text.slice(this.position + 1, close).includes("[")) {
                label = this.text.slice(this.position + 1, close);
                this.position = close + 1;
            }
            else if (close === this.position + 1)
                this.position = close + 1;
        }

        // A collapsed `[]` or a shortcut takes the bracket's own text as its label, unless another bracket opened inside it.
        if (label === null && !opener.bracketAfter)
            label = this.text.slice(opener.index, after - 1);

        const target = label === null || label.length > 999 ? undefined : this.references.get(normalizeLabel(label));

        if (target === undefined) {
            this.position = after;

            return null;
        }

        return target;
    }

    private autolink(root: Inline): void {
        for (const [pattern, prefix] of [[UriAutolink, ""], [EmailAutolink, "mailto:"]] as const) {
            pattern.lastIndex = this.position;

            const found = pattern.exec(this.text);

            if (found === null)
                continue;

            const link = new Inline("link");

            link.href = prefix + found[1];
            link.appendChild(new Inline("text", found[1]));
            root.appendChild(link);
            this.position += found[0].length;

            return;
        }

        this.position++;
        root.appendChild(new Inline("text", "<"));
    }

    private entity(root: Inline): void {
        EntityPattern.lastIndex = this.position;

        const found = EntityPattern.exec(this.text);

        if (found === null) {
            this.position++;
            root.appendChild(new Inline("text", "&"));

            return;
        }

        this.position += found[0].length;
        root.appendChild(new Inline("entity", found[0]));
    }

    private plainText(root: Inline): void {
        Special.lastIndex = this.position + 1;

        const found = Special.exec(this.text);
        const end = found === null ? this.text.length : found.index;

        root.appendChild(new Inline("text", this.text.slice(this.position, end)));
        this.position = end;
    }

    private skipSpaces(): void {
        while (this.text.charAt(this.position) === " ")
            this.position++;
    }

    private skipWhitespace(): void {
        while (/\s/.test(this.text.charAt(this.position)) && this.position < this.text.length)
            this.position++;
    }

    /** CommonMark's emphasis pass over the delimiters above `bottom`: each closer finds the nearest opener it may pair with. */
    private processEmphasis(bottom: Delimiter | null): void {
        const openersBottom = new Map<string, Delimiter | null>();
        let closer = this.delimiters;

        while (closer !== null && closer.previous !== bottom)
            closer = closer.previous;

        while (closer !== null) {
            if (!closer.canClose) {
                closer = closer.next;
                continue;
            }

            const character = closer.character;
            const key = `${character}${closer.canOpen ? 1 : 0}${closer.original % 3}`;
            const floor = openersBottom.has(key) ? openersBottom.get(key) ?? null : bottom;
            let opener = closer.previous;
            let found = false;

            while (opener !== null && opener !== bottom && opener !== floor) {
                // The rule of three: a run that can both open and close pairs with another only when their lengths do not sum to a multiple of three.
                const oddMatch = character !== "~" && (closer.canOpen || opener.canClose) && closer.original % 3 !== 0 && (opener.original + closer.original) % 3 === 0;

                if (opener.character === character && opener.canOpen && !oddMatch && (character !== "~" || opener.count === closer.count)) {
                    found = true;
                    break;
                }

                opener = opener.previous;
            }

            const current = closer;

            if (found && opener !== null) {
                const used = character === "~" ? closer.count : closer.count >= 2 && opener.count >= 2 ? 2 : 1;
                const wrap = new Inline(character === "~" ? "strikethrough" : used === 1 ? "emphasis" : "strong");

                opener.count -= used;
                closer.count -= used;
                opener.node.literal = opener.node.literal.slice(used);
                closer.node.literal = closer.node.literal.slice(used);

                for (let child = opener.node.next; child !== null && child !== closer.node;) {
                    const next = child.next;

                    wrap.appendChild(child);
                    child = next;
                }

                opener.node.insertAfter(wrap);

                // Whatever delimiters stood between the two can pair with nothing outside them any more.
                opener.next = closer;
                closer.previous = opener;

                if (opener.count === 0) {
                    opener.node.unlink();
                    this.removeDelimiter(opener);
                }

                if (closer.count === 0) {
                    const next = closer.next;

                    closer.node.unlink();
                    this.removeDelimiter(closer);
                    closer = next;
                }
            }
            else {
                closer = closer.next;
                openersBottom.set(key, current.previous);

                if (!current.canOpen)
                    this.removeDelimiter(current);
            }
        }

        while (this.delimiters !== null && this.delimiters !== bottom)
            this.removeDelimiter(this.delimiters);
    }

    private removeDelimiter(delimiter: Delimiter): void {
        if (delimiter.previous !== null)
            delimiter.previous.next = delimiter.next;

        if (delimiter.next === null)
            this.delimiters = delimiter.previous;
        else
            delimiter.next.previous = delimiter.previous;
    }
}

function unescape(text: string): string {
    return text.replace(/\\([!-/:-@[-`{-~])/g, "$1");
}

/** GitHub's bare links: an address written in text, outside any link, becomes one, less the punctuation that ends its sentence. */
function linkBareAddresses(parent: Inline): void {
    mergeText(parent);

    for (let child = parent.firstChild; child !== null;) {
        const next = child.next;

        if (child.type === "text")
            linkInText(child);
        else if (child.type !== "link" && child.type !== "image" && child.firstChild !== null)
            linkBareAddresses(child);

        child = next;
    }
}

/** Joins neighbouring text nodes: the delimiter runs emphasis left alone are nodes of their own, and an address may run through one. */
function mergeText(parent: Inline): void {
    for (let child = parent.firstChild; child !== null; child = child.next) {
        while (child.type === "text" && child.next !== null && child.next.type === "text") {
            child.literal += child.next.literal;
            child.next.unlink();
        }
    }
}

/** Splits a text node around the addresses in it, each address a link of its own. */
function linkInText(node: Inline): void {
    const text = node.literal;
    const pieces: Inline[] = [];
    let last = 0;

    BareLink.lastIndex = 0;

    for (let found = BareLink.exec(text); found !== null; found = BareLink.exec(text)) {
        if (found.index > 0 && !/[\s(*_~]/.test(text.charAt(found.index - 1)))
            continue;

        const address = trimAddress(found[0]);

        // Nothing past the scheme or the `www.`.
        if (!/^(?:https?:\/\/|www\.)[^./]/.test(address))
            continue;

        if (found.index > last)
            pieces.push(new Inline("text", text.slice(last, found.index)));

        const link = new Inline("link");

        link.href = address.startsWith("www.") ? `http://${address}` : address;
        link.appendChild(new Inline("text", address));
        pieces.push(link);

        last = found.index + address.length;
        BareLink.lastIndex = last;
    }

    if (pieces.length === 0)
        return;

    if (last < text.length)
        pieces.push(new Inline("text", text.slice(last)));

    let anchor = node;

    for (const piece of pieces) {
        anchor.insertAfter(piece);
        anchor = piece;
    }

    node.unlink();
}

/** An address less its trailing punctuation, and less a closing parenthesis it did not open. */
function trimAddress(address: string): string {
    let end = address.length;

    for (;;) {
        const character = address.charAt(end - 1);

        if (/[?!.,:*_~'"]/.test(character)) {
            end--;
            continue;
        }

        if (character === ")") {
            const opened = address.slice(0, end).split("(").length - 1;
            const closed = address.slice(0, end).split(")").length - 1;

            if (closed > opened) {
                end--;
                continue;
            }
        }

        return address.slice(0, end);
    }
}
