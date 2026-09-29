// The carets and selections of one field, and the keys that move them: the textarea shows the primary, the rest are drawn on a
// layer above the text.

import { CaretClass, CaretLayerClass, MultiCaretAttribute, SelectionClass, VirtualClass } from "./code-editor-dom.ts";
import type { CodeEditorSurface } from "./code-editor-surface.ts";
import type { Lines } from "./motion.ts";
import { homePosition, nextCharacter, positionAtColumn, previousCharacter, verticalPosition, visualColumn, wordAt, wordLeft, wordRight } from "./motion.ts";
import type { Selection, SelectionSet } from "./selections.ts";
import { caretAt, findOccurrences, isCaret, nextOccurrence, normalizeSelections, rangeEnd, rangeStart, singleSelection } from "./selections.ts";

export type CaretParts = {
    readonly root: HTMLElement;
    readonly textarea: HTMLTextAreaElement;
    readonly scroller: HTMLElement;
    readonly content: HTMLElement;
};

/** A column selection by line and drawn column, so a short line in the middle does not pull the columns of the lines after it. */
type Box = {
    readonly anchorLine: number;
    readonly anchorColumn: number;
    readonly headLine: number;
    readonly headColumn: number;
};

/** How many columns past its line's end each end of a range stands: the virtual space a column selection holds over a short line. */
export type CaretPadding = {
    readonly anchor: number;
    readonly head: number;
};

type Rect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

export class CodeEditorCarets {
    private readonly resize: ResizeObserver | null;
    private readonly root: HTMLElement;
    private readonly textarea: HTMLTextAreaElement;
    private readonly scroller: HTMLElement;
    private readonly content: HTMLElement;
    private readonly layer: HTMLElement;
    private readonly probe: HTMLElement;
    private readonly surface: CodeEditorSurface;

    /** Every range while there is more than one; null while the textarea's own selection is the only one. */
    private ranges: readonly Selection[] | null = null;
    private primary = 0;

    /** The drawn columns the carets keep across Up and Down, in range order; any other move forgets them. */
    private goals: readonly number[] | null = null;
    private box: Box | null = null;

    /** The primary range the box last wrote; a box whose primary has moved since is over. */
    private boxPrimary: Selection | null = null;

    /** The virtual space each range stands in, in range order; null while no box holds any. */
    private pads: readonly CaretPadding[] | null = null;

    /** The carets there were when Ctrl+Alt+click began; the one the click places joins them when the button is let go. */
    private adding: SelectionSet | null = null;
    private renderQueued = false;

    public constructor(parts: CaretParts, surface: CodeEditorSurface) {
        this.root = parts.root;
        this.textarea = parts.textarea;
        this.scroller = parts.scroller;
        this.content = parts.content;
        this.surface = surface;

        this.layer = document.createElement("div");
        this.layer.className = CaretLayerClass;
        this.layer.setAttribute("aria-hidden", "true");
        this.layer.hidden = true;

        this.probe = document.createElement("span");
        this.probe.className = `${CaretLayerClass}-probe`;
        this.probe.textContent = "0";

        this.content.insertBefore(this.layer, this.textarea);
        this.content.insertBefore(this.probe, this.textarea);

        // Kept, to be disconnected with the editor: an observer left on a field the page dropped keeps the whole editor alive.
        this.resize = typeof ResizeObserver === "function" ? new ResizeObserver(() => this.queueRender()) : null;
        this.resize?.observe(this.content);
    }

    /** Lets the size watch go; the editor's root has left the page. */
    public dispose(): void {
        this.resize?.disconnect();
    }

    private get enabled(): boolean {
        return this.root.hasAttribute(MultiCaretAttribute) && !this.textarea.readOnly;
    }

    /** The field's switches may have changed: with multiple carets switched off, the others are let go. */
    public settingsChanged(): void {
        if (!this.enabled)
            this.collapse();
    }

    /** Whether more than one caret stands in the field. */
    public get isMulti(): boolean {
        return this.read().ranges.length > 1;
    }

    /** How far past its line's end the primary caret stands, for the status bar to say the column it is drawn at. */
    public get primaryPadding(): number {
        return this.pads?.[this.primary]?.head ?? 0;
    }

    /** Every caret with the virtual space it stands in, for an edit that has to write the spaces that carry it there. */
    public readPadded(): { readonly set: SelectionSet; readonly pads: readonly CaretPadding[] | null } {
        const set = this.read();

        return { set, pads: this.pads !== null && this.pads.length === set.ranges.length ? this.pads : null };
    }

    /** Where a caret at a position would be drawn, in the content's own coordinates — the anchor a popup opens against. */
    public contentCaretRect(position: number): { readonly left: number; readonly top: number; readonly bottom: number } | null {
        const rect = this.caretRect(this.surface.lines, position);

        if (rect === null)
            return null;

        const origin = this.content.getBoundingClientRect();

        return { left: rect.left - origin.left, top: rect.top - origin.top, bottom: rect.bottom - origin.top };
    }

    /** Every caret, the textarea's own as the primary. */
    public read(): SelectionSet {
        if (this.ranges !== null && this.adding === null) {
            const primary = this.ranges[this.primary];

            // The textarea's selection moved without this concern — a click, Ctrl+A, the find panel: the others are let go.
            if (this.textarea.selectionStart !== rangeStart(primary) || this.textarea.selectionEnd !== rangeEnd(primary))
                this.collapse();
        }

        if (this.ranges !== null)
            return { ranges: this.ranges, primary: this.primary };

        const { selectionStart, selectionEnd, selectionDirection } = this.textarea;

        return selectionDirection === "backward" ? singleSelection(selectionEnd, selectionStart) : singleSelection(selectionStart, selectionEnd);
    }

    /** Puts the carets in place: the primary into the textarea, the others onto the layer; `reveal` scrolls the primary into view. */
    public write(set: SelectionSet, reveal: boolean): void {
        const primary = set.ranges[set.primary];

        this.ranges = set.ranges.length > 1 ? set.ranges : null;
        this.primary = set.ranges.length > 1 ? set.primary : 0;
        this.goals = null;
        this.box = null;
        this.pads = null;
        this.textarea.setSelectionRange(rangeStart(primary), rangeEnd(primary), primary.head < primary.anchor ? "backward" : "forward");
        this.render();

        if (reveal)
            this.reveal(primary.head);
    }

    /** Draws every range but the primary, which the textarea draws itself; only the lines in view, since a field may hold thousands of carets. */
    private render(): void {
        const set = this.adding ?? (this.ranges === null ? null : { ranges: this.ranges, primary: this.primary });

        if (set === null) {
            this.root.classList.remove(VirtualClass);

            if (!this.layer.hidden) {
                this.layer.replaceChildren();
                this.layer.hidden = true;
            }

            return;
        }

        const origin = this.content.getBoundingClientRect();
        const [firstLine, lastLine] = this.visibleLines();
        const lines = this.surface.lines;
        const fragment = document.createDocumentFragment();
        const pads = this.adding === null ? this.pads : null;
        // The textarea can't draw a caret in virtual space, so while any caret stands there, every caret — the primary included —
        // is drawn here, and the textarea's own caret and selection are hidden.
        const virtual = pads !== null && pads.some(pad => pad.anchor > 0 || pad.head > 0);
        const width = virtual ? this.probe.getBoundingClientRect().width : 0;

        this.root.classList.toggle(VirtualClass, virtual);

        // While a click adds a caret, the textarea shows the new one, and the old primary is drawn with the rest.
        const skip = this.adding === null && !virtual ? set.primary : -1;

        for (let i = 0; i < set.ranges.length; i++) {
            const range = set.ranges[i];

            if (i === skip || lines.lineAt(rangeEnd(range)) < firstLine || lines.lineAt(rangeStart(range)) > lastLine)
                continue;

            const pad = pads?.[i] ?? null;

            if (!isCaret(range) || (pad !== null && pad.anchor !== pad.head)) {
                for (const rect of this.selectionRects(lines, range, firstLine, lastLine, pad))
                    fragment.append(this.mark(SelectionClass, rect, origin));
            }

            const caret = this.caretRect(lines, range.head);

            if (caret === null)
                continue;

            if (pad !== null && pad.head > 0) {
                caret.left += pad.head * width;
                caret.right = caret.left;
            }

            fragment.append(this.mark(CaretClass, caret, origin));
        }

        this.layer.replaceChildren(fragment);
        this.layer.hidden = false;
    }

    /** The first and the last line any part of which is in the scroller's view. */
    private visibleLines(): [number, number] {
        const count = this.surface.lines.count;
        const top = this.scroller.scrollTop;
        const bottom = top + this.scroller.clientHeight;

        return [this.lineAtOffset(count, top), this.lineAtOffset(count, bottom)];
    }

    /** The line whose box holds a vertical offset within the content, by halving: the lines are in order down the page. */
    private lineAtOffset(count: number, offset: number): number {
        let low = 0;
        let high = count - 1;

        while (low < high) {
            const middle = (low + high + 1) >> 1;
            const line = this.surface.lineElement(middle);

            if (line !== undefined && line.offsetTop <= offset)
                low = middle;
            else
                high = middle - 1;
        }

        return low;
    }

    /** One row's box for each drawn row a selection covers in view; a line break renders as a character's width. */
    private selectionRects(lines: Lines, range: Selection, firstLine: number, lastLine: number, pad: CaretPadding | null): Rect[] {
        const rects: Rect[] = [];
        const start = rangeStart(range);
        const end = rangeEnd(range);
        const startLine = lines.lineAt(start);
        const endLine = lines.lineAt(end);
        const width = this.probe.getBoundingClientRect().width;

        for (let line = Math.max(startLine, firstLine); line <= Math.min(endLine, lastLine); line++) {
            const from = line === startLine ? start : lines.start(line);
            const to = line === endLine ? end : lines.end(line);
            const rows = from === to ? [] : this.textRects(lines, line, from, to);

            if (line !== endLine) {
                const last = rows.at(-1);

                if (last !== undefined)
                    last.right += width;
                else {
                    const caret = this.caretRect(lines, from);

                    if (caret !== null)
                        rows.push({ ...caret, right: caret.left + width });
                }
            }

            rects.push(...rows);
        }

        // Past the line's end there is no text to measure, so a box selection's tail is drawn in character widths from the line's
        // end; the padded side closes the row.
        if (pad !== null && pad.anchor !== pad.head) {
            const lineEnd = this.caretRect(lines, rangeEnd(range));

            if (lineEnd !== null) {
                const from = Math.min(pad.anchor, pad.head);
                const to = Math.max(pad.anchor, pad.head);

                rects.push({ left: lineEnd.left + from * width, top: lineEnd.top, right: lineEnd.left + to * width, bottom: lineEnd.bottom });
            }
        }

        const rowHeight = Number.parseFloat(getComputedStyle(this.scroller).lineHeight);

        for (const rect of rects) {
            const grow = Number.isFinite(rowHeight) ? Math.max(0, (rowHeight - (rect.bottom - rect.top)) / 2) : 0;

            rect.top -= grow;
            rect.bottom += grow;
        }

        return rects;
    }

    /** The boxes a span of one line is drawn in, one per row: a range's rects hold a box per text run, merged here by row. */
    private textRects(lines: Lines, line: number, from: number, to: number): Rect[] {
        const start = this.domPoint(lines, line, from);
        const end = this.domPoint(lines, line, to);

        if (start === null || end === null)
            return [];

        const range = document.createRange();

        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);

        const rows: Rect[] = [];

        for (const box of range.getClientRects()) {
            if (box.width === 0)
                continue;

            const row = rows.find(existing => Math.abs(existing.top - box.top) < 1);

            if (row === undefined)
                rows.push({ left: box.left, top: box.top, right: box.right, bottom: box.bottom });
            else {
                row.left = Math.min(row.left, box.left);
                row.right = Math.max(row.right, box.right);
            }
        }

        return rows;
    }

    /** Where a caret at a position is drawn, in the viewport's coordinates. */
    private caretRect(lines: Lines, position: number): Rect | null {
        const line = lines.lineAt(position);
        const point = this.domPoint(lines, line, position);

        if (point !== null) {
            const range = document.createRange();

            range.setStart(point.node, point.offset);

            const box = range.getClientRects()[0];

            if (box !== undefined)
                return { left: box.left, top: box.top, right: box.left, bottom: box.bottom };
        }

        // An empty line holds no text to measure: its code cell's left edge, a row high.
        const code = this.surface.lineElement(line)?.lastElementChild;

        if (code === null || code === undefined)
            return null;

        const box = code.getBoundingClientRect();
        const height = Number.parseFloat(getComputedStyle(code).lineHeight);

        return { left: box.left, top: box.top, right: box.left, bottom: box.top + (Number.isFinite(height) ? height : box.height) };
    }

    /** The text node and the offset in it a position of a line is drawn at; null on a line with no text. */
    private domPoint(lines: Lines, line: number, position: number): { readonly node: Text; readonly offset: number } | null {
        const code = this.surface.lineElement(line)?.lastElementChild;

        if (code === null || code === undefined)
            return null;

        const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
        let remaining = position - lines.start(line);
        let last: Text | null = null;

        for (let node = walker.nextNode() as Text | null; node !== null; node = walker.nextNode() as Text | null) {
            if (remaining <= node.length)
                return { node, offset: remaining };

            remaining -= node.length;
            last = node;
        }

        return last === null ? null : { node: last, offset: last.length };
    }

    private mark(className: string, rect: Rect, origin: DOMRect): HTMLElement {
        const element = document.createElement("div");

        element.className = className;
        element.style.left = `${rect.left - origin.left}px`;
        element.style.top = `${rect.top - origin.top}px`;
        element.style.height = `${rect.bottom - rect.top}px`;

        // A caret's width is the stylesheet's.
        if (rect.right > rect.left)
            element.style.width = `${rect.right - rect.left}px`;

        return element;
    }

    /** Scrolls the scroller the least that brings a caret into view, clear of the sticky gutter. */
    private reveal(position: number): void {
        const caret = this.caretRect(this.surface.lines, position);

        if (caret === null)
            return;

        const view = this.scroller.getBoundingClientRect();
        const gutter = Number.parseFloat(getComputedStyle(this.textarea).paddingLeft) || 0;
        const width = this.probe.getBoundingClientRect().width;

        if (caret.top < view.top)
            this.scroller.scrollTop -= view.top - caret.top;
        else if (caret.bottom > view.top + this.scroller.clientHeight)
            this.scroller.scrollTop += caret.bottom - (view.top + this.scroller.clientHeight);

        if (caret.left < view.left + gutter)
            this.scroller.scrollLeft -= view.left + gutter - caret.left + width;
        else if (caret.left + width > view.left + this.scroller.clientWidth)
            this.scroller.scrollLeft += caret.left + width - (view.left + this.scroller.clientWidth);
    }

    /** Leaves the primary caret alone in the field. */
    public collapse(): void {
        if (this.ranges === null)
            return;

        this.ranges = null;
        this.primary = 0;
        this.goals = null;
        this.box = null;
        this.pads = null;
        this.render();
    }

    /** The document's selection moved: other carets are let go when the textarea's moved without them. */
    public selectionChanged(): void {
        this.read();
    }

    /** Redraws after the geometry changed under the carets — a tab size, a wrap, the scroll. */
    public queueRender(): void {
        if (this.renderQueued || (this.ranges === null && this.adding === null))
            return;

        this.renderQueued = true;
        requestAnimationFrame(() => {
            this.renderQueued = false;
            this.render();
        });
    }

    /** The textarea's `mousedown`: Ctrl+Alt starts adding a caret; a plain press lets the others go. */
    public pointerDown(domEvent: MouseEvent): void {
        if (domEvent.button !== 0)
            return;

        if (!this.enabled || !(domEvent.ctrlKey || domEvent.metaKey) || !domEvent.altKey || domEvent.shiftKey) {
            this.collapse();
            return;
        }

        this.adding = this.read();
        this.render();
        window.addEventListener("mouseup", () => this.finishAdding(), { once: true });
    }

    /** The click placed the textarea's caret: it joins the others, or takes away a caret that stood exactly there. */
    private finishAdding(): void {
        const adding = this.adding;

        if (adding === null)
            return;

        this.adding = null;

        const { selectionStart, selectionEnd, selectionDirection } = this.textarea;
        const added = selectionDirection === "backward" ? { anchor: selectionEnd, head: selectionStart } : { anchor: selectionStart, head: selectionEnd };
        const existing = isCaret(added) ? adding.ranges.findIndex(range => isCaret(range) && range.head === added.head) : -1;

        if (existing >= 0 && adding.ranges.length > 1) {
            const ranges = adding.ranges.filter((_, index) => index !== existing);

            this.write({ ranges, primary: ranges.length - 1 }, false);
            return;
        }

        this.write(normalizeSelections([...adding.ranges, added], adding.ranges.length), false);
    }

    /** The textarea's `keydown`, ahead of the editing keys: the multi-caret commands, and every caret's moves while there are several. */
    public key(domEvent: KeyboardEvent): void {
        if (domEvent.defaultPrevented || domEvent.isComposing)
            return;

        const command = domEvent.ctrlKey || domEvent.metaKey;

        // By the key's position, as the editor's other shortcuts: under another layout the letter differs, the place does not.
        if (this.enabled && domEvent.shiftKey && domEvent.altKey && !command && this.boxOrOccurrence(domEvent.code)) {
            domEvent.preventDefault();
            return;
        }

        if (this.ranges === null || domEvent.altKey)
            return;

        const text = this.textarea.value;
        const lines = this.surface.lines;
        const extend = domEvent.shiftKey;
        let handled = true;

        switch (domEvent.key) {
            case "Escape":
                if (command || extend)
                    handled = false;
                else
                    this.collapse();
                break;
            case "ArrowLeft":
                this.moveEach(range => !extend && !isCaret(range) ? rangeStart(range) : command ? wordLeft(text, range.head) : previousCharacter(text, range.head), extend);
                break;
            case "ArrowRight":
                this.moveEach(range => !extend && !isCaret(range) ? rangeEnd(range) : command ? wordRight(text, range.head) : nextCharacter(text, range.head), extend);
                break;
            case "Home":
                this.moveEach(range => command ? 0 : homePosition(text, lines, range.head), extend);
                break;
            case "End":
                this.moveEach(range => command ? text.length : lines.end(lines.lineAt(range.head)), extend);
                break;
            case "ArrowUp":
            case "ArrowDown":
                handled = !command;

                if (handled)
                    this.moveVertically(domEvent.key === "ArrowUp" ? -1 : 1, extend);
                break;
            case "PageUp":
            case "PageDown":
                this.moveVertically((domEvent.key === "PageUp" ? -1 : 1) * this.rowsInView(), extend);
                break;
            default:
                handled = false;
        }

        if (handled)
            domEvent.preventDefault();
    }

    private boxOrOccurrence(code: string): boolean {
        switch (code) {
            case "Period":
                this.addNextOccurrence();
                return true;
            case "Semicolon":
                this.selectAllOccurrences();
                return true;
            case "ArrowUp":
                this.extendBox(-1, 0);
                return true;
            case "ArrowDown":
                this.extendBox(1, 0);
                return true;
            case "ArrowLeft":
                this.extendBox(0, -1);
                return true;
            case "ArrowRight":
                this.extendBox(0, 1);
                return true;
            default:
                return false;
        }
    }

    /** Shift+Alt+.: a caret selects the word it touches; a selection adds the next place its text occurs, which becomes the primary. */
    private addNextOccurrence(): void {
        const text = this.textarea.value;
        const set = this.read();
        const primary = set.ranges[set.primary];

        if (isCaret(primary)) {
            const word = wordAt(text, primary.head);

            if (word !== null)
                this.write(normalizeSelections(set.ranges.map((range, index) => index === set.primary ? { anchor: word.from, head: word.to } : range), set.primary), true);

            return;
        }

        const found = nextOccurrence(text, set);

        if (found < 0)
            return;

        const length = rangeEnd(primary) - rangeStart(primary);

        this.write(normalizeSelections([...set.ranges, { anchor: found, head: found + length }], set.ranges.length), true);
    }

    /** Shift+Alt+;: every place the primary's text occurs — the word a caret touches — selected at once. */
    private selectAllOccurrences(): void {
        const text = this.textarea.value;
        const set = this.read();
        const primary = set.ranges[set.primary];
        const span = isCaret(primary) ? wordAt(text, primary.head) : { from: rangeStart(primary), to: rangeEnd(primary) };

        if (span === null)
            return;

        const length = span.to - span.from;
        const found = findOccurrences(text, text.slice(span.from, span.to));
        const ranges = found.map(at => ({ anchor: at, head: at + length }));

        this.write({ ranges, primary: Math.max(0, found.indexOf(span.from)) }, false);
    }

    /**
     * Shift+Alt+arrows: a column selection between two drawn columns, one range per text line (not a wrapped row). A short line
     * keeps its caret in virtual space past its end, like Visual Studio's box selection.
     */
    private extendBox(lineStep: number, columnStep: number): void {
        const text = this.textarea.value;
        const lines = this.surface.lines;
        const tabSize = this.surface.tabSize;
        const set = this.read();
        const primary = set.ranges[set.primary];
        let box = this.box;

        if (box !== null && (this.boxPrimary?.anchor !== primary.anchor || this.boxPrimary.head !== primary.head))
            box = null;

        if (box === null) {
            box = {
                anchorLine: lines.lineAt(primary.anchor),
                anchorColumn: visualColumn(text, lines, primary.anchor, tabSize),
                headLine: lines.lineAt(primary.head),
                headColumn: visualColumn(text, lines, primary.head, tabSize)
            };
        }

        const headLine = Math.min(Math.max(box.headLine + lineStep, 0), lines.count - 1);
        let headColumn = box.headColumn;

        if (columnStep !== 0) {
            const at = positionAtColumn(text, lines, headLine, headColumn, tabSize);
            const lineEndColumn = visualColumn(text, lines, lines.end(headLine), tabSize);

            if (columnStep < 0)
                headColumn = headColumn > lineEndColumn ? headColumn - 1 : visualColumn(text, lines, Math.max(previousCharacter(text, at), lines.start(headLine)), tabSize);
            else if (at < lines.end(headLine))
                headColumn = visualColumn(text, lines, nextCharacter(text, at), tabSize);
            // Past the head line's end, as far as the longest line the box spans.
            else if (headColumn < this.widestColumn(text, lines, box.anchorLine, headLine, tabSize))
                headColumn++;
        }

        const next = { ...box, headLine, headColumn };
        const step = next.headLine >= next.anchorLine ? 1 : -1;
        const ranges: Selection[] = [];
        const pads: CaretPadding[] = [];

        for (let line = next.anchorLine; line !== next.headLine + step; line += step) {
            const anchor = positionAtColumn(text, lines, line, next.anchorColumn, tabSize);
            const head = positionAtColumn(text, lines, line, next.headColumn, tabSize);

            ranges.push({ anchor, head });
            pads.push({
                anchor: this.virtualSpace(text, lines, line, anchor, next.anchorColumn, tabSize),
                head: this.virtualSpace(text, lines, line, head, next.headColumn, tabSize)
            });
        }

        if (step < 0) {
            ranges.reverse();
            pads.reverse();
        }

        const written = { ranges, primary: step < 0 ? 0 : ranges.length - 1 };

        this.write(written, true);
        this.box = next;
        this.boxPrimary = written.ranges[written.primary];
        // After write, which lets the previous box's go: a lone range is the textarea's own caret, which has no virtual space.
        this.pads = ranges.length > 1 ? pads : null;
        this.render();
    }

    /** How far past the line's end a column stands; a column the line reaches, and one inside a tab, stand in the text itself. */
    private virtualSpace(text: string, lines: Lines, line: number, position: number, column: number, tabSize: number): number {
        return position === lines.end(line) ? Math.max(0, column - visualColumn(text, lines, position, tabSize)) : 0;
    }

    private widestColumn(text: string, lines: Lines, fromLine: number, toLine: number, tabSize: number): number {
        let widest = 0;

        for (let line = Math.min(fromLine, toLine); line <= Math.max(fromLine, toLine); line++)
            widest = Math.max(widest, visualColumn(text, lines, lines.end(line), tabSize));

        return widest;
    }

    /** Moves every caret to where `target` says; Shift keeps each anchor and makes selections. */
    private moveEach(target: (range: Selection) => number, extend: boolean): void {
        const set = this.read();
        const ranges = set.ranges.map(range => extend ? { anchor: range.anchor, head: target(range) } : caretAt(target(range)));

        this.write(normalizeSelections(ranges, set.primary), true);
    }

    /** Up and Down by lines, every caret keeping the column it had when the vertical moves began. */
    private moveVertically(step: number, extend: boolean): void {
        const text = this.textarea.value;
        const lines = this.surface.lines;
        const tabSize = this.surface.tabSize;
        const set = this.read();
        const goals = this.goals ?? set.ranges.map(range => visualColumn(text, lines, range.head, tabSize));
        const ranges = set.ranges.map((range, index) => {
            const head = verticalPosition(text, lines, range.head, step, goals[index], tabSize);

            return extend ? { anchor: range.anchor, head } : caretAt(head);
        });
        const after = normalizeSelections(ranges, set.primary);

        this.write(after, true);
        // A merge changed which goal belongs to which caret; the survivors measure theirs afresh on the next move.
        this.goals = after.ranges.length === goals.length ? goals : null;
    }

    private rowsInView(): number {
        const height = Number.parseFloat(getComputedStyle(this.scroller).lineHeight);

        return Math.max(1, Math.floor(this.scroller.clientHeight / (Number.isFinite(height) && height > 0 ? height : 20)) - 1);
    }
}
