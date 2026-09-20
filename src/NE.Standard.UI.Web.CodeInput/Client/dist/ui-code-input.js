//#region src/motion.ts
function e(e) {
	let t = [0];
	for (let n = e.indexOf("\n"); n >= 0; n = e.indexOf("\n", n + 1)) t.push(n + 1);
	return {
		count: t.length,
		start: (e) => t[e],
		end: (n) => n + 1 < t.length ? t[n + 1] - 1 : e.length,
		lineAt: (e) => {
			let n = 0, r = t.length - 1;
			for (; n < r;) {
				let i = n + r + 1 >> 1;
				t[i] <= e ? n = i : r = i - 1;
			}
			return n;
		}
	};
}
function t(e, t) {
	return t <= 0 ? 0 : t >= 2 && i(e.charCodeAt(t - 1)) && r(e.charCodeAt(t - 2)) ? t - 2 : t - 1;
}
function n(e, t) {
	return t >= e.length ? e.length : t + 1 < e.length && r(e.charCodeAt(t)) && i(e.charCodeAt(t + 1)) ? t + 2 : t + 1;
}
function r(e) {
	return e >= 55296 && e <= 56319;
}
function i(e) {
	return e >= 56320 && e <= 57343;
}
var a = /[\p{L}\p{N}_]/u;
function o(e) {
	return e === "\n" ? 3 : e === " " || e === "	" ? 0 : a.test(e) ? 1 : 2;
}
function s(e, t) {
	if (t >= e.length) return e.length;
	if (e[t] === "\n") return t + 1;
	let n = t, r = o(e[n]);
	if (r !== 0) for (; n < e.length && o(e[n]) === r;) n++;
	for (; n < e.length && o(e[n]) === 0;) n++;
	return n;
}
function c(e, t) {
	if (t <= 0) return 0;
	if (e[t - 1] === "\n") return t - 1;
	let n = t;
	for (; n > 0 && o(e[n - 1]) === 0;) n--;
	if (n === 0 || e[n - 1] === "\n") return n;
	let r = o(e[n - 1]);
	for (; n > 0 && o(e[n - 1]) === r;) n--;
	return n;
}
function l(e, t) {
	let n = t, r = t;
	for (; n > 0 && o(e[n - 1]) === 1;) n--;
	for (; r < e.length && o(e[r]) === 1;) r++;
	return n === r ? null : {
		from: n,
		to: r
	};
}
function u(e, t, n) {
	let r = t.lineAt(n), i = t.start(r), a = t.end(r), o = i;
	for (; o < a && (e[o] === " " || e[o] === "	");) o++;
	return n === o ? i : o;
}
function d(e, t, r, i) {
	let a = 0;
	for (let o = t.start(t.lineAt(r)); o < r; o = n(e, o)) a += e[o] === "	" ? i - a % i : 1;
	return a;
}
function f(e, t, r, i, a) {
	let o = t.end(r), s = 0, c = t.start(r);
	for (; c < o;) {
		let t = n(e, c), r = e[c] === "	" ? a - s % a : 1;
		if (s + r > i) return i - s >= r / 2 ? t : c;
		s += r, c = t;
	}
	return o;
}
function p(e, t, n, r, i, a) {
	let o = t.lineAt(n), s = Math.min(Math.max(o + r, 0), t.count - 1);
	return s === o ? r < 0 ? 0 : e.length : f(e, t, s, i, a);
}
//#endregion
//#region src/selections.ts
function m(e) {
	return Math.min(e.anchor, e.head);
}
function h(e) {
	return Math.max(e.anchor, e.head);
}
function g(e) {
	return e.anchor === e.head;
}
function _(e) {
	return {
		anchor: e,
		head: e
	};
}
function v(e, t = e) {
	return {
		ranges: [{
			anchor: e,
			head: t
		}],
		primary: 0
	};
}
function y(e, t) {
	let n = e.map((e, t) => ({
		range: e,
		index: t
	})).sort((e, t) => m(e.range) - m(t.range) || h(e.range) - h(t.range)), r = [], i = 0;
	for (let { range: e, index: a } of n) {
		let n = r.at(-1), o = a === t;
		if (n !== void 0 && ee(n, e)) {
			let t = m(n), i = Math.max(h(n), h(e)), a = o ? e.head < e.anchor : n.head < n.anchor;
			r[r.length - 1] = a ? {
				anchor: i,
				head: t
			} : {
				anchor: t,
				head: i
			};
		} else r.push(e);
		o && (i = r.length - 1);
	}
	return {
		ranges: r,
		primary: i
	};
}
function ee(e, t) {
	let n = h(e), r = m(t);
	return r < n || r === n && (g(e) || g(t));
}
function te(e, t) {
	if (e.primary !== t.primary || e.ranges.length !== t.ranges.length) return !1;
	for (let n = 0; n < e.ranges.length; n++) if (e.ranges[n].anchor !== t.ranges[n].anchor || e.ranges[n].head !== t.ranges[n].head) return !1;
	return !0;
}
function ne(e, t) {
	let n = "", r = 0;
	for (let i of t) n += e.slice(r, i.from) + i.text, r = i.to;
	return n + e.slice(r);
}
function b(e, t) {
	let n = 0;
	for (let r of t) {
		if (e < r.from || e === r.from && r.from === r.to) break;
		if (e < r.to) return r.from + n;
		n += r.text.length - (r.to - r.from);
	}
	return e + n;
}
function x(e, t) {
	let n = [], r = [], i = 0, a = 0;
	for (let o = 0; o < e.ranges.length; o++) {
		let s = t(e.ranges[o], o);
		if (s === null) {
			r.push(null);
			continue;
		}
		let c = Math.max(s.from, i), l = Math.max(s.to, c), u = c + a, d = u + Math.min(s.caret, s.text.length), f = s.anchor === void 0 ? d : u + Math.min(s.anchor, s.text.length);
		r.push({
			anchor: f,
			head: d
		}), (c !== l || s.text.length !== 0) && (n.push({
			from: c,
			to: l,
			text: s.text
		}), a += s.text.length - (l - c), i = l);
	}
	return {
		edits: n,
		after: y(e.ranges.map((e, t) => r[t] ?? {
			anchor: b(e.anchor, n),
			head: b(e.head, n)
		}), e.primary)
	};
}
function re(e, t) {
	let n = [];
	if (t.length === 0) return n;
	for (let r = e.indexOf(t); r >= 0; r = e.indexOf(t, r + t.length)) n.push(r);
	return n;
}
function ie(e, t) {
	let n = t.ranges[t.primary], r = e.slice(m(n), h(n)), i = new Set(t.ranges.map(m)), a = re(e, r).filter((e) => !i.has(e) && !ae(t.ranges, e, e + r.length));
	return a.find((e) => e >= h(n)) ?? a[0] ?? -1;
}
function ae(e, t, n) {
	return e.some((e) => m(e) < n && h(e) > t);
}
function oe(e, t, n) {
	if (n !== null && n.length === t && n.join("\n") === e) return n;
	let r = (e.endsWith("\n") ? e.slice(0, -1) : e).split("\n");
	return r.length === t ? r : null;
}
//#endregion
//#region src/code-editor-carets.ts
var se = "ui-code-input__carets", ce = "ui-code-input--virtual", le = class {
	resize;
	root;
	textarea;
	scroller;
	content;
	layer;
	probe;
	surface;
	ranges = null;
	primary = 0;
	goals = null;
	box = null;
	boxPrimary = null;
	pads = null;
	adding = null;
	renderQueued = !1;
	constructor(e, t) {
		this.root = e.root, this.textarea = e.textarea, this.scroller = e.scroller, this.content = e.content, this.surface = t, this.layer = document.createElement("div"), this.layer.className = se, this.layer.setAttribute("aria-hidden", "true"), this.layer.hidden = !0, this.probe = document.createElement("span"), this.probe.className = `${se}-probe`, this.probe.textContent = "0", this.content.insertBefore(this.layer, this.textarea), this.content.insertBefore(this.probe, this.textarea), this.resize = typeof ResizeObserver == "function" ? new ResizeObserver(() => this.queueRender()) : null, this.resize?.observe(this.content);
	}
	dispose() {
		this.resize?.disconnect();
	}
	get enabled() {
		return this.root.hasAttribute("data-ui-code-multi-caret") && !this.textarea.readOnly;
	}
	get isMulti() {
		return this.read().ranges.length > 1;
	}
	get primaryPadding() {
		return this.pads?.[this.primary]?.head ?? 0;
	}
	readPadded() {
		let e = this.read();
		return {
			set: e,
			pads: this.pads !== null && this.pads.length === e.ranges.length ? this.pads : null
		};
	}
	primaryCaretRect() {
		let e = this.read(), t = this.caretRect(this.surface.lines, e.ranges[e.primary].head);
		if (t === null) return null;
		let n = this.content.getBoundingClientRect();
		return {
			left: t.left - n.left,
			top: t.top - n.top,
			bottom: t.bottom - n.top
		};
	}
	read() {
		if (this.ranges !== null && this.adding === null) {
			let e = this.ranges[this.primary];
			(this.textarea.selectionStart !== m(e) || this.textarea.selectionEnd !== h(e)) && this.collapse();
		}
		if (this.ranges !== null) return {
			ranges: this.ranges,
			primary: this.primary
		};
		let { selectionStart: e, selectionEnd: t, selectionDirection: n } = this.textarea;
		return n === "backward" ? v(t, e) : v(e, t);
	}
	write(e, t) {
		let n = e.ranges[e.primary];
		this.ranges = e.ranges.length > 1 ? e.ranges : null, this.primary = e.ranges.length > 1 ? e.primary : 0, this.goals = null, this.box = null, this.pads = null, this.textarea.setSelectionRange(m(n), h(n), n.head < n.anchor ? "backward" : "forward"), this.render(), t && this.reveal(n.head);
	}
	collapse() {
		this.ranges !== null && (this.ranges = null, this.primary = 0, this.goals = null, this.box = null, this.pads = null, this.render());
	}
	selectionChanged() {
		this.read();
	}
	queueRender() {
		this.renderQueued || this.ranges === null && this.adding === null || (this.renderQueued = !0, requestAnimationFrame(() => {
			this.renderQueued = !1, this.render();
		}));
	}
	render() {
		let e = this.adding ?? (this.ranges === null ? null : {
			ranges: this.ranges,
			primary: this.primary
		});
		if (e === null) {
			this.root.classList.remove(ce), this.layer.hidden || (this.layer.replaceChildren(), this.layer.hidden = !0);
			return;
		}
		let t = this.content.getBoundingClientRect(), [n, r] = this.visibleLines(), i = this.surface.lines, a = document.createDocumentFragment(), o = this.adding === null ? this.pads : null, s = o !== null && o.some((e) => e.anchor > 0 || e.head > 0), c = s ? this.probe.getBoundingClientRect().width : 0;
		this.root.classList.toggle(ce, s);
		let l = this.adding === null && !s ? e.primary : -1;
		for (let s = 0; s < e.ranges.length; s++) {
			let u = e.ranges[s];
			if (s === l || i.lineAt(h(u)) < n || i.lineAt(m(u)) > r) continue;
			let d = o?.[s] ?? null;
			if (!g(u) || d !== null && d.anchor !== d.head) for (let e of this.selectionRects(i, u, n, r, d)) a.append(this.mark("ui-code-input__selection", e, t));
			let f = this.caretRect(i, u.head);
			f !== null && (d !== null && d.head > 0 && (f.left += d.head * c, f.right = f.left), a.append(this.mark("ui-code-input__caret", f, t)));
		}
		this.layer.replaceChildren(a), this.layer.hidden = !1;
	}
	visibleLines() {
		let e = this.surface.lines.count, t = this.scroller.scrollTop, n = t + this.scroller.clientHeight;
		return [this.lineAtOffset(e, t), this.lineAtOffset(e, n)];
	}
	lineAtOffset(e, t) {
		let n = 0, r = e - 1;
		for (; n < r;) {
			let e = n + r + 1 >> 1, i = this.surface.lineElement(e);
			i !== void 0 && i.offsetTop <= t ? n = e : r = e - 1;
		}
		return n;
	}
	selectionRects(e, t, n, r, i) {
		let a = [], o = m(t), s = h(t), c = e.lineAt(o), l = e.lineAt(s), u = this.probe.getBoundingClientRect().width;
		for (let t = Math.max(c, n); t <= Math.min(l, r); t++) {
			let n = t === c ? o : e.start(t), r = t === l ? s : e.end(t), i = n === r ? [] : this.textRects(e, t, n, r);
			if (t !== l) {
				let t = i.at(-1);
				if (t !== void 0) t.right += u;
				else {
					let t = this.caretRect(e, n);
					t !== null && i.push({
						...t,
						right: t.left + u
					});
				}
			}
			a.push(...i);
		}
		if (i !== null && i.anchor !== i.head) {
			let n = this.caretRect(e, h(t));
			if (n !== null) {
				let e = Math.min(i.anchor, i.head), t = Math.max(i.anchor, i.head);
				a.push({
					left: n.left + e * u,
					top: n.top,
					right: n.left + t * u,
					bottom: n.bottom
				});
			}
		}
		let d = Number.parseFloat(getComputedStyle(this.scroller).lineHeight);
		for (let e of a) {
			let t = Number.isFinite(d) ? Math.max(0, (d - (e.bottom - e.top)) / 2) : 0;
			e.top -= t, e.bottom += t;
		}
		return a;
	}
	textRects(e, t, n, r) {
		let i = this.domPoint(e, t, n), a = this.domPoint(e, t, r);
		if (i === null || a === null) return [];
		let o = document.createRange();
		o.setStart(i.node, i.offset), o.setEnd(a.node, a.offset);
		let s = [];
		for (let e of o.getClientRects()) {
			if (e.width === 0) continue;
			let t = s.find((t) => Math.abs(t.top - e.top) < 1);
			t === void 0 ? s.push({
				left: e.left,
				top: e.top,
				right: e.right,
				bottom: e.bottom
			}) : (t.left = Math.min(t.left, e.left), t.right = Math.max(t.right, e.right));
		}
		return s;
	}
	caretRect(e, t) {
		let n = e.lineAt(t), r = this.domPoint(e, n, t);
		if (r !== null) {
			let e = document.createRange();
			e.setStart(r.node, r.offset);
			let t = e.getClientRects()[0];
			if (t !== void 0) return {
				left: t.left,
				top: t.top,
				right: t.left,
				bottom: t.bottom
			};
		}
		let i = this.surface.lineElement(n)?.lastElementChild;
		if (i == null) return null;
		let a = i.getBoundingClientRect(), o = Number.parseFloat(getComputedStyle(i).lineHeight);
		return {
			left: a.left,
			top: a.top,
			right: a.left,
			bottom: a.top + (Number.isFinite(o) ? o : a.height)
		};
	}
	domPoint(e, t, n) {
		let r = this.surface.lineElement(t)?.lastElementChild;
		if (r == null) return null;
		let i = document.createTreeWalker(r, NodeFilter.SHOW_TEXT), a = n - e.start(t), o = null;
		for (let e = i.nextNode(); e !== null; e = i.nextNode()) {
			if (a <= e.length) return {
				node: e,
				offset: a
			};
			a -= e.length, o = e;
		}
		return o === null ? null : {
			node: o,
			offset: o.length
		};
	}
	mark(e, t, n) {
		let r = document.createElement("div");
		return r.className = e, r.style.left = `${t.left - n.left}px`, r.style.top = `${t.top - n.top}px`, r.style.height = `${t.bottom - t.top}px`, t.right > t.left && (r.style.width = `${t.right - t.left}px`), r;
	}
	reveal(e) {
		let t = this.caretRect(this.surface.lines, e);
		if (t === null) return;
		let n = this.scroller.getBoundingClientRect(), r = Number.parseFloat(getComputedStyle(this.textarea).paddingLeft) || 0, i = this.probe.getBoundingClientRect().width;
		t.top < n.top ? this.scroller.scrollTop -= n.top - t.top : t.bottom > n.top + this.scroller.clientHeight && (this.scroller.scrollTop += t.bottom - (n.top + this.scroller.clientHeight)), t.left < n.left + r ? this.scroller.scrollLeft -= n.left + r - t.left + i : t.left + i > n.left + this.scroller.clientWidth && (this.scroller.scrollLeft += t.left + i - (n.left + this.scroller.clientWidth));
	}
	pointerDown(e) {
		if (e.button === 0) {
			if (!this.enabled || !(e.ctrlKey || e.metaKey) || !e.altKey || e.shiftKey) {
				this.collapse();
				return;
			}
			this.adding = this.read(), this.render(), window.addEventListener("mouseup", () => this.finishAdding(), { once: !0 });
		}
	}
	finishAdding() {
		let e = this.adding;
		if (e === null) return;
		this.adding = null;
		let { selectionStart: t, selectionEnd: n, selectionDirection: r } = this.textarea, i = r === "backward" ? {
			anchor: n,
			head: t
		} : {
			anchor: t,
			head: n
		}, a = g(i) ? e.ranges.findIndex((e) => g(e) && e.head === i.head) : -1;
		if (a >= 0 && e.ranges.length > 1) {
			let t = e.ranges.filter((e, t) => t !== a);
			this.write({
				ranges: t,
				primary: t.length - 1
			}, !1);
			return;
		}
		this.write(y([...e.ranges, i], e.ranges.length), !1);
	}
	key(e) {
		if (e.defaultPrevented || e.isComposing) return;
		let r = e.ctrlKey || e.metaKey;
		if (this.enabled && e.shiftKey && e.altKey && !r && this.boxOrOccurrence(e.code)) {
			e.preventDefault();
			return;
		}
		if (this.ranges === null || e.altKey) return;
		let i = this.textarea.value, a = this.surface.lines, o = e.shiftKey, l = !0;
		switch (e.key) {
			case "Escape":
				r || o ? l = !1 : this.collapse();
				break;
			case "ArrowLeft":
				this.moveEach((e) => !o && !g(e) ? m(e) : r ? c(i, e.head) : t(i, e.head), o);
				break;
			case "ArrowRight":
				this.moveEach((e) => !o && !g(e) ? h(e) : r ? s(i, e.head) : n(i, e.head), o);
				break;
			case "Home":
				this.moveEach((e) => r ? 0 : u(i, a, e.head), o);
				break;
			case "End":
				this.moveEach((e) => r ? i.length : a.end(a.lineAt(e.head)), o);
				break;
			case "ArrowUp":
			case "ArrowDown":
				l = !r, l && this.moveVertically(e.key === "ArrowUp" ? -1 : 1, o);
				break;
			case "PageUp":
			case "PageDown":
				this.moveVertically((e.key === "PageUp" ? -1 : 1) * this.rowsInView(), o);
				break;
			default: l = !1;
		}
		l && e.preventDefault();
	}
	boxOrOccurrence(e) {
		switch (e) {
			case "Period": return this.addNextOccurrence(), !0;
			case "Semicolon": return this.selectAllOccurrences(), !0;
			case "ArrowUp": return this.extendBox(-1, 0), !0;
			case "ArrowDown": return this.extendBox(1, 0), !0;
			case "ArrowLeft": return this.extendBox(0, -1), !0;
			case "ArrowRight": return this.extendBox(0, 1), !0;
			default: return !1;
		}
	}
	addNextOccurrence() {
		let e = this.textarea.value, t = this.read(), n = t.ranges[t.primary];
		if (g(n)) {
			let r = l(e, n.head);
			r !== null && this.write(y(t.ranges.map((e, n) => n === t.primary ? {
				anchor: r.from,
				head: r.to
			} : e), t.primary), !0);
			return;
		}
		let r = ie(e, t);
		if (r < 0) return;
		let i = h(n) - m(n);
		this.write(y([...t.ranges, {
			anchor: r,
			head: r + i
		}], t.ranges.length), !0);
	}
	selectAllOccurrences() {
		let e = this.textarea.value, t = this.read(), n = t.ranges[t.primary], r = g(n) ? l(e, n.head) : {
			from: m(n),
			to: h(n)
		};
		if (r === null) return;
		let i = r.to - r.from, a = re(e, e.slice(r.from, r.to)), o = a.map((e) => ({
			anchor: e,
			head: e + i
		}));
		this.write({
			ranges: o,
			primary: Math.max(0, a.indexOf(r.from))
		}, !1);
	}
	extendBox(e, r) {
		let i = this.textarea.value, a = this.surface.lines, o = this.surface.tabSize, s = this.read(), c = s.ranges[s.primary], l = this.box;
		l !== null && (this.boxPrimary?.anchor !== c.anchor || this.boxPrimary.head !== c.head) && (l = null), l === null && (l = {
			anchorLine: a.lineAt(c.anchor),
			anchorColumn: d(i, a, c.anchor, o),
			headLine: a.lineAt(c.head),
			headColumn: d(i, a, c.head, o)
		});
		let u = Math.min(Math.max(l.headLine + e, 0), a.count - 1), p = l.headColumn;
		if (r !== 0) {
			let e = f(i, a, u, p, o), s = d(i, a, a.end(u), o);
			r < 0 ? p = p > s ? p - 1 : d(i, a, Math.max(t(i, e), a.start(u)), o) : e < a.end(u) ? p = d(i, a, n(i, e), o) : p < this.widestColumn(i, a, l.anchorLine, u, o) && p++;
		}
		let m = {
			...l,
			headLine: u,
			headColumn: p
		}, h = m.headLine >= m.anchorLine ? 1 : -1, g = [], _ = [];
		for (let e = m.anchorLine; e !== m.headLine + h; e += h) {
			let t = f(i, a, e, m.anchorColumn, o), n = f(i, a, e, m.headColumn, o);
			g.push({
				anchor: t,
				head: n
			}), _.push({
				anchor: this.virtualSpace(i, a, e, t, m.anchorColumn, o),
				head: this.virtualSpace(i, a, e, n, m.headColumn, o)
			});
		}
		h < 0 && (g.reverse(), _.reverse());
		let v = {
			ranges: g,
			primary: h < 0 ? 0 : g.length - 1
		};
		this.write(v, !0), this.box = m, this.boxPrimary = v.ranges[v.primary], this.pads = g.length > 1 ? _ : null, this.render();
	}
	virtualSpace(e, t, n, r, i, a) {
		return r === t.end(n) ? Math.max(0, i - d(e, t, r, a)) : 0;
	}
	widestColumn(e, t, n, r, i) {
		let a = 0;
		for (let o = Math.min(n, r); o <= Math.max(n, r); o++) a = Math.max(a, d(e, t, t.end(o), i));
		return a;
	}
	moveEach(e, t) {
		let n = this.read(), r = n.ranges.map((n) => t ? {
			anchor: n.anchor,
			head: e(n)
		} : _(e(n)));
		this.write(y(r, n.primary), !0);
	}
	moveVertically(e, t) {
		let n = this.textarea.value, r = this.surface.lines, i = this.surface.tabSize, a = this.read(), o = this.goals ?? a.ranges.map((e) => d(n, r, e.head, i)), s = y(a.ranges.map((a, s) => {
			let c = p(n, r, a.head, e, o[s], i);
			return t ? {
				anchor: a.anchor,
				head: c
			} : _(c);
		}), a.primary);
		this.write(s, !0), this.goals = s.ranges.length === o.length ? o : null;
	}
	rowsInView() {
		let e = Number.parseFloat(getComputedStyle(this.scroller).lineHeight);
		return Math.max(1, Math.floor(this.scroller.clientHeight / (Number.isFinite(e) && e > 0 ? e : 20)) - 1);
	}
}, ue = /[\p{L}\p{N}_]/u;
function de(e, t) {
	let n = t;
	for (; n > 0 && ue.test(e.charAt(n - 1));) n--;
	return n;
}
function fe(e, t) {
	return e.slice(de(e, t), t);
}
async function pe(e, t) {
	let n = [];
	for (let r of e) try {
		let e = typeof r == "function" ? await r(t) : r;
		n.push(...e);
	} catch {}
	return n;
}
function me(e, t, n = 50) {
	let r = t.toLowerCase(), i = [];
	for (let n = 0; n < e.length; n++) {
		let a = t.length === 0 ? 0 : he(e[n].label, t, r);
		a >= 0 && i.push({
			item: e[n],
			tier: a,
			index: n
		});
	}
	i.sort((e, t) => e.tier - t.tier || e.index - t.index);
	let a = /* @__PURE__ */ new Set(), o = [];
	for (let { item: e } of i) if (!a.has(e.label) && (a.add(e.label), o.push(e), o.length >= n)) break;
	return o;
}
function he(e, t, n) {
	if (e.startsWith(t)) return 0;
	let r = e.toLowerCase();
	return r.startsWith(n) ? 1 : r.includes(n) ? 2 : -1;
}
var ge = /[\p{L}\p{N}_]+/gu;
function _e(e) {
	let t = l(e.text, e.offset), n = /* @__PURE__ */ new Set(), r = [];
	ge.lastIndex = 0;
	for (let i = ge.exec(e.text); i !== null; i = ge.exec(e.text)) {
		let e = i[0], a = i.index;
		(t === null || a !== t.from || a + e.length !== t.to) && e.length >= 2 && !n.has(e) && (n.add(e), r.push({
			label: e,
			kind: "text"
		}));
	}
	return r;
}
var ve = /* @__PURE__ */ new Set([
	"keyword",
	"type",
	"function",
	"variable",
	"property",
	"text"
]);
function ye(e) {
	let t = be(e) ? e : {}, n = Array.isArray(t.items) ? t.items : [], r = [];
	for (let e of n) {
		if (!be(e) || typeof e.label != "string" || e.label.length === 0) continue;
		let t = typeof e.kind == "string" && ve.has(e.kind) ? e.kind : void 0, n = typeof e.insert == "string" && e.insert.length > 0 ? e.insert : e.label, i = typeof e.detail == "string" ? e.detail : void 0;
		r.push({
			label: e.label,
			insert: n,
			detail: i,
			kind: t
		});
	}
	return {
		items: r,
		triggers: (Array.isArray(t.triggers) ? t.triggers : []).filter((e) => typeof e == "string" && e.length > 0)
	};
}
function be(e) {
	return typeof e == "object" && !!e;
}
//#endregion
//#region src/completions-registry.ts
var xe = "*", Se = class {
	sources = /* @__PURE__ */ new Map();
	register(e, t) {
		let n = Ce(e), r = this.sources.get(n);
		r === void 0 ? this.sources.set(n, [t]) : r.push(t);
	}
	sourcesFor(e) {
		let t = this.sources.get(xe) ?? [], n = this.sources.get(Ce(e)) ?? [];
		return [...t, ...n];
	}
	hasOwnSource(e) {
		return this.sourcesFor(e).length > 0;
	}
};
function Ce(e) {
	return e.trim().toLowerCase();
}
var we = new Se(), Te = class {
	text;
	end;
	pos;
	start;
	constructor(e, t = 0, n = e.length) {
		this.text = e, this.end = n, this.pos = t, this.start = t;
	}
	eol() {
		return this.pos >= this.end;
	}
	peek(e = 0) {
		let t = this.pos + e;
		return t < this.end ? this.text.charAt(t) : "";
	}
	next() {
		return this.pos < this.end ? this.text.charAt(this.pos++) : "";
	}
	eat(e) {
		let t = this.peek();
		return t === "" || !(typeof e == "string" ? t === e : e.test(t)) ? null : (this.pos++, t);
	}
	eatWhile(e) {
		let t = this.pos;
		for (; this.pos < this.end && e.test(this.text.charAt(this.pos));) this.pos++;
		return this.pos > t;
	}
	match(e, t = !0) {
		if (typeof e == "string") return !this.text.startsWith(e, this.pos) || this.pos + e.length > this.end ? !1 : (t && (this.pos += e.length), !0);
		e.lastIndex = this.pos;
		let n = e.exec(this.text);
		return n === null || n.index !== this.pos || this.pos + n[0].length > this.end ? !1 : (t && (this.pos += n[0].length), !0);
	}
	indexOf(e) {
		let t = this.text.indexOf(e, this.pos);
		return t >= 0 && t + e.length <= this.end ? t : -1;
	}
	skipToEnd() {
		this.pos = this.end;
	}
	skipTo(e) {
		this.pos = e < 0 ? this.end : Math.min(e, this.end);
	}
	current() {
		return this.text.slice(this.start, this.pos);
	}
	sol() {
		return this.pos === 0;
	}
};
function S(e) {
	return {
		initialState: e.initialState(),
		tokenizeLine(t, n, r) {
			let i = De(n);
			return Ee(new Te(t), i, e, r), i;
		}
	};
}
function Ee(e, t, n, r) {
	for (; !e.eol();) {
		e.start = e.pos;
		let i = n.token(e, t);
		e.pos === e.start && e.pos++, i !== null && r(e.start, e.pos, i);
	}
}
function De(e) {
	if (Array.isArray(e)) return e.map(De);
	if (typeof e == "object" && e) {
		let t = {};
		for (let [n, r] of Object.entries(e)) t[n] = De(r);
		return t;
	}
	return e;
}
function Oe(e, t) {
	if (e === t) return !0;
	if (Array.isArray(e) || Array.isArray(t)) {
		if (!Array.isArray(e) || !Array.isArray(t) || e.length !== t.length) return !1;
		for (let n = 0; n < e.length; n++) if (!Oe(e[n], t[n])) return !1;
		return !0;
	}
	if (e !== null && t !== null && typeof e == "object" && typeof t == "object") {
		let n = e, r = t, i = Object.keys(n);
		if (i.length !== Object.keys(r).length) return !1;
		for (let e of i) if (!Oe(n[e], r[e])) return !1;
		return !0;
	}
	return !1;
}
function C(e) {
	return new Set(e.split(/\s+/).filter((e) => e.length > 0));
}
function w(e, t, n = !0) {
	for (; !e.eol();) {
		let r = e.next();
		if (n && r === "\\") {
			e.next();
			continue;
		}
		if (r === t) return !0;
	}
	return !1;
}
//#endregion
//#region src/languages/bash.ts
var ke = C("\n    if then else elif fi for while until do done case esac in function select time return exit local export declare readonly\n    unset shift source break continue eval exec set trap\n"), Ae = C("if then else elif while until do time exec ! [ [["), je = /[A-Za-z_][\w]*/y, Me = /--?[A-Za-z][\w-]*/y, Ne = /\$(?:[A-Za-z_]\w*|\d|[@*#?$!-])/y, Pe = /[A-Za-z_]\w*(?=\+?=)/y, Fe = /<<-?\s*(?:'([^']+)'|"([^"]+)"|\\?([A-Za-z_]\w*))/y, Ie = /\d?>>?|\d?>&\d?|<|\|\||&&|\||;;|;|&/y, Le = {
	initialState: () => ({
		mode: "code",
		frames: [],
		command: !0,
		heredoc: "",
		heredocPending: "",
		heredocIndented: !1,
		arithmetic: !1
	}),
	token(e, t) {
		switch (e.sol() && (t.command = !0, t.heredocPending !== "" && (t.heredoc = t.heredocPending, t.heredocPending = "", t.mode = "heredoc")), t.mode) {
			case "single": return Re(e, t);
			case "heredoc": return ze(e, t);
			default: return Be(e, t);
		}
	}
};
function Re(e, t) {
	let n = e.indexOf("'");
	return e.skipTo(n < 0 ? -1 : n + 1), n >= 0 && (t.mode = "code"), "string";
}
function ze(e, t) {
	let n = t.heredocIndented ? e.text.replace(/^\t+/, "") : e.text;
	return e.skipToEnd(), n === t.heredoc ? (t.mode = "code", t.heredoc = "", t.command = !0, "keyword") : "string";
}
function Be(e, t) {
	let n = t.frames[t.frames.length - 1];
	return n === "\"" ? Ve(e, t) : n === "${" ? He(e, t) : Ue(e, t);
}
function Ve(e, t) {
	if (e.match("\"")) return t.frames.pop(), "string";
	if (e.match("\\")) return e.next(), "escape";
	let n = T(e, t);
	if (n !== null) return n;
	for (e.next(); !e.eol();) {
		let t = e.peek();
		if (t === "\"" || t === "\\" || t === "$" || t === "`") break;
		e.next();
	}
	return "string";
}
function T(e, t) {
	return e.match("$(") ? (t.frames.push("$("), t.command = !0, "punctuation") : e.match("${") ? (t.frames.push("${"), He(e, t)) : e.match("`") ? (t.frames[t.frames.length - 1] === "`" ? t.frames.pop() : (t.frames.push("`"), t.command = !0), "punctuation") : e.match(Ne) ? "variable" : null;
}
function He(e, t) {
	for (; !e.eol();) {
		let n = e.peek();
		if (n === "}") {
			e.next(), t.frames.pop();
			break;
		}
		if (n === "$" && (e.peek(1) === "(" || e.peek(1) === "{")) {
			if (e.pos > e.start) break;
			return T(e, t) ?? "variable";
		}
		e.next();
	}
	return "variable";
}
function Ue(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = e.peek(), r = e.pos === 0 || /\s/.test(e.text.charAt(e.pos - 1));
	if (n === "#" && r) return e.skipToEnd(), "comment";
	if (n === "'") return e.next(), t.mode = "single", t.command = !1, Re(e, t);
	if (n === "\"") return e.next(), t.frames.push("\""), t.command = !1, "string";
	if (e.match("((")) return t.arithmetic = !0, t.command = !1, "punctuation";
	if (t.arithmetic && e.match("))")) return t.arithmetic = !1, t.command = !0, "punctuation";
	if (t.arithmetic) return e.match(/\d+/y) ? "number" : e.match(je) ? "variable" : e.match(/[-+*/%=<>!&|^~?:,]+/y) ? "operator" : (e.next(), null);
	if (e.match(Fe)) {
		let n = e.current();
		return t.heredocPending = n.replace(/^<<-?\s*/, "").replace(/^\\/, "").replace(/^['"]|['"]$/g, ""), t.heredocIndented = n.startsWith("<<-"), "keyword";
	}
	let i = t.frames[t.frames.length - 1];
	if (n === ")" && i === "$(") return e.next(), t.frames.pop(), t.command = !1, "punctuation";
	let a = T(e, t);
	if (a !== null) return t.command = !1, a;
	if (e.match("\\")) return e.next(), "escape";
	if (e.match("=")) return "operator";
	if (e.match(Ie)) {
		let n = e.current();
		return t.command = n === "|" || n === "||" || n === "&&" || n === ";" || n === "&" || n === ";;", "operator";
	}
	if (e.match(/[(){}]/y)) return t.command = !0, "punctuation";
	if (e.match(Me)) return t.command = !1, "attribute";
	if (t.command && e.match(Pe)) return "variable";
	if (e.match(je)) {
		let n = e.current();
		return t.command && ke.has(n) ? (t.command = Ae.has(n), "keyword") : t.command ? (t.command = !1, "function") : null;
	}
	return e.match(/\d+(?=\s|$)/y) ? "number" : e.match(/\[\[?|\]\]?|!/y) ? (t.command = !0, "keyword") : (e.next(), null);
}
var We = {
	...S(Le),
	keywords: [...ke]
}, Ge = C("\n    break case catch class const continue debugger default delete do else enum export extends finally for function if import in\n    instanceof new return super switch this throw try typeof var void while with yield let static async await of get set\n    abstract any as asserts boolean constructor declare implements interface is keyof module namespace never number object\n    private protected public readonly require string symbol type unique unknown from global override satisfies bigint\n    infer out accessor\n"), Ke = C("true false null undefined NaN Infinity"), qe = C("return typeof case in of instanceof new delete void throw yield await else do"), Je = /[A-Za-z_$][\w$]*/y, Ye = /0[xX][\da-fA-F_]+n?|0[bB][01_]+n?|0[oO][0-7_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?/y, Xe = /[+\-*/%=<>!&|^~?:]+/y, Ze = /\s*\(/y, E = {
	initialState: () => ({
		mode: "code",
		frames: [],
		regexAllowed: !0
	}),
	token(e, t) {
		switch (t.mode) {
			case "comment": return Qe(e, t);
			case "template": return $e(e, t);
			default: return et(e, t);
		}
	}
};
function Qe(e, t) {
	let n = e.indexOf("*/");
	return e.skipTo(n < 0 ? -1 : n + 2), t.mode = n < 0 ? "comment" : "code", "comment";
}
function $e(e, t) {
	if (e.match("${")) return t.frames.push(0), t.mode = "code", t.regexAllowed = !0, "punctuation";
	for (; !e.eol();) {
		let n = e.peek();
		if (n === "\\") {
			e.next(), e.next();
			continue;
		}
		if (n === "`") return e.next(), t.mode = "code", t.regexAllowed = !1, "string";
		if (n === "$" && e.peek(1) === "{") return "string";
		e.next();
	}
	return "string";
}
function et(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = e.peek();
	if (e.match("//")) return e.skipToEnd(), "comment";
	if (e.match("/*")) return t.mode = "comment", Qe(e, t);
	if (n === "\"" || n === "'") return e.next(), w(e, n), t.regexAllowed = !1, "string";
	if (n === "`") return e.next(), t.mode = "template", $e(e, t);
	if (e.match(Ye)) return t.regexAllowed = !1, "number";
	if (n === "@") return e.next(), e.match(Je), "meta";
	if (e.match(Je)) {
		let n = e.current();
		return Ge.has(n) ? (t.regexAllowed = qe.has(n), "keyword") : (t.regexAllowed = !1, Ke.has(n) ? "keyword" : (Ze.lastIndex = e.pos, Ze.test(e.text) ? "function" : D(n) ? "type" : null));
	}
	if (n === "/" && t.regexAllowed && tt(e)) return t.regexAllowed = !1, "regex";
	if (e.match(Xe)) return t.regexAllowed = !0, "operator";
	if (n === "{") return e.next(), t.frames.length > 0 && t.frames[t.frames.length - 1]++, t.regexAllowed = !0, "punctuation";
	if (n === "}") {
		if (e.next(), t.frames.length > 0) {
			let e = t.frames.length - 1;
			if (t.frames[e] === 0) return t.frames.pop(), t.mode = "template", "punctuation";
			t.frames[e]--;
		}
		return t.regexAllowed = !0, "punctuation";
	}
	return e.match(/[([,;]/y) ? (t.regexAllowed = !0, "punctuation") : e.match(/[)\].]/y) ? (t.regexAllowed = !1, "punctuation") : (e.next(), null);
}
function tt(e) {
	let t = e.pos, n = !1;
	for (e.next(); !e.eol();) {
		let t = e.next();
		if (t === "\\") {
			e.next();
			continue;
		}
		if (n) {
			t === "]" && (n = !1);
			continue;
		}
		if (t === "[") n = !0;
		else if (t === "/") return e.eatWhile(/[gimsuyd]/), !0;
	}
	return e.pos = t, !1;
}
function D(e) {
	let t = e.charAt(0);
	return t >= "A" && t <= "Z";
}
var nt = {
	...S(E),
	keywords: [...Ge]
}, rt = C("\n    abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum\n    event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace\n    new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc\n    static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while\n    add alias and ascending async await by descending dynamic equals from get global group init into join let managed nameof nint\n    not notnull nuint on or orderby partial record remove required scoped select set unmanaged value var when where with yield file\n"), it = /@?[A-Za-z_][\w]*/y, at = /0[xX][\da-fA-F_]+[uUlL]*|0[bB][01_]+[uUlL]*|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[fFdDmMuUlL]*/y, ot = /'(?:\\.|[^'\\])'/y, st = /[+\-*/%=<>!&|^~?:]+/y, O = /\s*[(<]/y, ct = /#[a-z]+/y, lt = C("new class struct interface enum record is as"), ut = {
	initialState: () => ({
		mode: "code",
		rawQuotes: 0,
		frames: [],
		verbatims: [],
		afterNew: !1
	}),
	token(e, t) {
		switch (t.mode) {
			case "comment": return dt(e, t);
			case "verbatim": return ft(e, t);
			case "raw": return pt(e, t);
			case "interpolated": return mt(e, t);
			default: return gt(e, t);
		}
	}
};
function dt(e, t) {
	let n = e.indexOf("*/");
	return e.skipTo(n < 0 ? -1 : n + 2), t.mode = n < 0 ? "comment" : "code", "comment";
}
function ft(e, t) {
	for (; !e.eol();) if (!e.match("\"\"") && e.next() === "\"") {
		t.mode = "code";
		break;
	}
	return "string";
}
function pt(e, t) {
	let n = "\"".repeat(t.rawQuotes), r = e.indexOf(n);
	return e.skipTo(r < 0 ? -1 : r + n.length), r >= 0 && (t.mode = "code"), "string";
}
function mt(e, t) {
	let n = t.verbatims[t.verbatims.length - 1] === !0;
	if (e.match("{{") || e.match("}}")) return "escape";
	if (e.match("{")) return t.frames.push(0), t.mode = "code", "punctuation";
	for (; !e.eol();) {
		let r = e.peek();
		if (r === "{") return "string";
		if (n && r === "\"" && e.peek(1) === "\"") {
			e.next(), e.next();
			continue;
		}
		if (!n && r === "\\") {
			e.next(), e.next();
			continue;
		}
		if (e.next(), r === "\"") return ht(t), "string";
	}
	return n || ht(t), "string";
}
function ht(e) {
	e.verbatims.pop(), e.mode = "code";
}
function gt(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = e.peek();
	if (e.match("//")) return e.skipToEnd(), "comment";
	if (e.match("/*")) return t.mode = "comment", dt(e, t);
	if (n === "#" && e.text.slice(0, e.pos).trim() === "" && e.match(ct)) return e.skipToEnd(), "meta";
	if (e.match(/\$@"|@\$"/y)) return t.verbatims.push(!0), t.mode = "interpolated", "string";
	if (e.match(/\$+"""/y)) return t.rawQuotes = 3, t.mode = "raw", "string";
	if (e.match("$\"")) return t.verbatims.push(!1), t.mode = "interpolated", "string";
	if (e.match("@\"")) return t.mode = "verbatim", ft(e, t);
	if (e.match(/"""+/y)) return t.rawQuotes = e.current().length, t.mode = "raw", pt(e, t);
	if (n === "\"") return e.next(), w(e, "\""), "string";
	if (e.match(ot)) return "string";
	if (e.match(at)) return t.afterNew = !1, "number";
	if (e.match(it)) {
		let n = e.current();
		if (n.charAt(0) !== "@" && rt.has(n)) return t.afterNew = lt.has(n), "keyword";
		let r = t.afterNew;
		return t.afterNew = !1, D(n.charAt(0) === "@" ? n.slice(1) : n) ? (O.lastIndex = e.pos, !r && O.test(e.text) && e.text.charAt(O.lastIndex - 1) === "(" ? "function" : "type") : (O.lastIndex = e.pos, O.test(e.text) && e.text.charAt(O.lastIndex - 1) === "(" ? "function" : null);
	}
	if (n === "{") return e.next(), t.frames.length > 0 && t.frames[t.frames.length - 1]++, "punctuation";
	if (n === "}") {
		if (e.next(), t.frames.length > 0) {
			let e = t.frames.length - 1;
			if (t.frames[e] === 0) return t.frames.pop(), t.mode = "interpolated", "punctuation";
			t.frames[e]--;
		}
		return "punctuation";
	}
	return e.match(/[()[\],;.]/y) ? "punctuation" : e.match(st) ? "operator" : (e.next(), null);
}
var _t = {
	...S(ut),
	keywords: [...rt]
}, k = /-?[A-Za-z_][\w-]*/y, vt = /--[\w-]+/y, yt = /--[\w-]+|-?[A-Za-z_][\w-]*/y, A = /\s*:/y, bt = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?:%|[a-zA-Z]+)?/y, xt = /#[\da-fA-F]{3,8}\b/y, St = /-?[A-Za-z_][\w-]*\(/y, Ct = /@\{[\w-]+\}/y, wt = C("and not only or"), Tt = C("\n    charset import namespace media supports document page font-face keyframes viewport counter-style font-feature-values layer\n    property container scope starting-style plugin\n");
function Et(e) {
	yt.lastIndex = e.pos;
	let t = yt.exec(e.text);
	if (t === null || (A.lastIndex = e.pos + t[0].length, !A.test(e.text))) return !1;
	for (let t = A.lastIndex; t < e.end; t++) {
		let n = e.text.charAt(t);
		if (n === ";" || n === "}") return !0;
		if (n === "{") return !1;
	}
	return t[0].startsWith("--") || /\s/.test(e.text.charAt(A.lastIndex)) || A.lastIndex >= e.end;
}
function Dt(e) {
	return {
		initialState: () => ({
			context: "selector",
			depth: 0,
			comment: !1,
			afterProperty: !1,
			bracket: 0
		}),
		token(t, n) {
			if (n.comment) {
				let e = t.indexOf("*/");
				return t.skipTo(e < 0 ? -1 : e + 2), n.comment = e < 0, "comment";
			}
			if (t.eatWhile(/\s/)) return null;
			if (t.match("/*")) {
				let e = t.indexOf("*/");
				return t.skipTo(e < 0 ? -1 : e + 2), n.comment = e < 0, "comment";
			}
			if (e && t.match("//")) return t.skipToEnd(), "comment";
			let r = t.peek();
			if (r === "\"" || r === "'") return t.next(), w(t, r), "string";
			if (r === "{") return t.next(), n.depth++, n.context = "block", n.afterProperty = !1, n.bracket = 0, "punctuation";
			if (r === "}") return t.next(), n.depth = Math.max(0, n.depth - 1), n.context = n.depth > 0 ? "block" : "selector", n.afterProperty = !1, "punctuation";
			if (r === ";") return t.next(), n.context = n.depth > 0 ? "block" : "selector", n.afterProperty = !1, "punctuation";
			if (r === ":" && n.afterProperty) return t.next(), n.context = "value", n.afterProperty = !1, "punctuation";
			switch (n.context) {
				case "value": return Nt(t, e);
				case "prelude": return Mt(t, e);
				case "block": return Ot(t, n, e);
				default: return n.depth === 0 && r === "@" ? Ot(t, n, e) : kt(t, n, e);
			}
		}
	};
}
function Ot(e, t, n) {
	if (e.peek() === "@" && !e.match(Ct, !1)) {
		e.next(), e.eatWhile(/[\w-]/);
		let r = e.current().slice(1).toLowerCase();
		return n && !Tt.has(r) ? (t.afterProperty = e.match(A, !1), "variable") : (t.context = "prelude", "meta");
	}
	if (Et(e)) {
		let n = e.match(vt);
		return n || e.match(k), t.afterProperty = !0, n ? "variable" : "attribute";
	}
	return t.context = "selector", kt(e, t, n);
}
function kt(e, t, n) {
	let r = e.peek();
	return t.bracket > 0 ? jt(e, t) : r === "@" ? (e.next(), e.eat("{") ? (e.eatWhile(/[\w-]/), e.eat("}")) : e.eatWhile(/[\w-]/), n ? "variable" : "meta") : r === "." || r === "#" ? (e.next(), At(e), "selector") : r === ":" ? (e.next(), e.eat(":"), At(e) ? "selector" : "punctuation") : r === "&" ? (e.next(), At(e), "selector") : r === "*" ? (e.next(), "selector") : r === "[" ? (e.next(), t.bracket = 1, "punctuation") : r === "!" ? (e.next(), e.eatWhile(/[\w-]/), "keyword") : n && r === "~" && (e.peek(1) === "\"" || e.peek(1) === "'") ? (e.next(), w(e, e.next()), "string") : e.match(bt) ? "number" : e.match(/[>+~,()]/y) ? "punctuation" : e.match(/[=<>]+/y) ? "operator" : e.match(k) ? n && e.current() === "when" ? "keyword" : "selector" : (e.next(), null);
}
function At(e) {
	let t = e.pos;
	for (; e.eatWhile(/[\w-]/) || e.match(Ct);) continue;
	return e.pos > t;
}
function jt(e, t) {
	return e.eat("]") ? (t.bracket = 0, "punctuation") : e.match(/[~|^$*]?=/y) ? (t.bracket = 2, "operator") : e.match(/[\w-]+/y) ? t.bracket === 1 ? "attribute" : "value" : (e.next(), null);
}
function Mt(e, t) {
	if (e.peek() === "@") return e.next(), e.eatWhile(/[\w-]/), t ? "variable" : "meta";
	let n = Pt(e);
	if (n !== null) return n;
	if (e.match(St, !1)) return e.match(k), "function";
	if (e.match(bt)) return "number";
	if (e.match(k)) {
		let t = e.current();
		return wt.has(t.toLowerCase()) ? "keyword" : e.match(A, !1) ? "attribute" : "value";
	}
	return e.match(/[,():]/y) ? "punctuation" : e.match(/[<>=]+/y) ? "operator" : (e.next(), null);
}
function Nt(e, t) {
	let n = e.peek();
	if (n === "!") return e.next(), e.eatWhile(/[\w-]/), "keyword";
	if (n === "@" && t) return e.next(), e.eat("@"), e.eatWhile(/[\w-]/), "variable";
	if (n === "~" && t && (e.peek(1) === "\"" || e.peek(1) === "'")) return e.next(), w(e, e.next()), "string";
	if (e.match(vt)) return "variable";
	if (e.match(xt)) return "value";
	let r = Pt(e);
	return r === null ? e.match(St, !1) ? (e.match(k), "function") : e.match(bt) ? "number" : e.match(k) ? "value" : e.match(/[,()]/y) ? "punctuation" : e.match(/[+\-*/=<>]/y) ? "operator" : (e.next(), null) : r;
}
function Pt(e) {
	if (e.match(/url(?=\()/y)) return "function";
	let t = e.text.slice(Math.max(0, e.pos - 4), e.pos);
	if (e.peek() === "(" && t.endsWith("url")) return e.next(), "punctuation";
	if (t === "url(" && e.peek() !== "\"" && e.peek() !== "'") {
		let t = e.indexOf(")");
		return e.skipTo(t), "string";
	}
	return null;
}
var Ft = S(Dt(!1)), It = S(Dt(!0)), Lt = /<\/?[A-Za-z][\w:-]*/y, Rt = /[^\s"'<>/=]+/y, zt = /[^\s"'<>`=]+/y, Bt = /&(?:#\d+|#x[\da-fA-F]+|[A-Za-z]\w*);/y, Vt = Dt(!1), Ht = {
	initialState: () => ({
		mode: "text",
		tag: "",
		closing: !1,
		quote: "",
		inner: null,
		closingAt: null
	}),
	token(e, t) {
		switch (t.mode) {
			case "comment": return Ut(e, t);
			case "tag": return Gt(e, t);
			case "attribute-value": return Kt(e, t);
			case "script": return qt(e, t, "script");
			case "style": return qt(e, t, "style");
			default: return Wt(e, t);
		}
	}
};
function Ut(e, t) {
	let n = e.indexOf("-->");
	return e.skipTo(n < 0 ? -1 : n + 3), t.mode = n < 0 ? "comment" : "text", "comment";
}
function Wt(e, t) {
	if (e.match("<!--")) return t.mode = "comment", Ut(e, t);
	if (e.match("<!")) {
		let t = e.indexOf(">");
		return e.skipTo(t < 0 ? -1 : t + 1), "meta";
	}
	if (e.match(Lt)) {
		let n = e.current();
		return t.closing = n.startsWith("</"), t.tag = n.slice(t.closing ? 2 : 1).toLowerCase(), t.mode = "tag", "tag";
	}
	if (e.match(Bt)) return "escape";
	for (e.next(); !e.eol() && e.peek() !== "<" && e.peek() !== "&";) e.next();
	return null;
}
function Gt(e, t) {
	if (e.eatWhile(/\s/)) return null;
	if (e.match("/>")) return t.mode = "text", "punctuation";
	if (e.match(">")) return !t.closing && t.tag === "script" ? (t.mode = "script", t.inner = E.initialState()) : !t.closing && t.tag === "style" ? (t.mode = "style", t.inner = Vt.initialState()) : t.mode = "text", "punctuation";
	if (e.match("=")) return "operator";
	let n = e.peek();
	return n === "\"" || n === "'" ? (e.next(), w(e, n, !1) || (t.mode = "attribute-value", t.quote = n), "string") : e.match(Rt) ? e.text.slice(0, e.start).trimEnd().endsWith("=") ? "string" : "attribute" : e.match(zt) ? "string" : (e.next(), null);
}
function Kt(e, t) {
	return w(e, t.quote, !1) && (t.mode = "tag"), "string";
}
function qt(e, t, n) {
	let r = `</${n}`;
	(e.pos === 0 || t.closingAt === null) && (t.closingAt = Xt(e, n === "script" ? Jt : Yt));
	let i = t.closingAt;
	if (i === e.pos) return e.skipTo(i + r.length), t.mode = "tag", t.tag = n, t.closing = !0, t.inner = null, t.closingAt = null, "tag";
	let a = i < 0 ? e.end : i, o = new Te(e.text, e.pos, a);
	o.start = e.pos;
	let s = n === "script" ? E.token(o, t.inner) : Vt.token(o, t.inner);
	return e.pos = o.pos > o.start ? o.pos : o.start + 1, s;
}
var Jt = /<\/script/gi, Yt = /<\/style/gi;
function Xt(e, t) {
	t.lastIndex = e.pos;
	let n = t.exec(e.text);
	return n === null || n.index + n[0].length > e.end ? -1 : n.index;
}
var Zt = S(Ht), Qt = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y, $t = /(?:true|false|null)\b/y, en = /\s*:/y;
function tn(e) {
	return en.lastIndex = e.pos, en.test(e.text);
}
var nn = {
	...S({
		initialState: () => ({}),
		token(e) {
			return e.eatWhile(/\s/) ? null : e.peek() === "\"" ? (e.next(), w(e, "\""), tn(e) ? "property" : "string") : e.match(Qt) ? "number" : e.match($t) ? "keyword" : e.match(/[{}[\]:,]/y) ? "punctuation" : (e.next(), "invalid");
		}
	}),
	keywords: [
		"true",
		"false",
		"null"
	]
}, rn = {
	"c#": "csharp",
	cs: "csharp",
	js: "javascript",
	jsx: "javascript",
	mjs: "javascript",
	ts: "typescript",
	tsx: "typescript",
	sh: "bash",
	shell: "bash",
	zsh: "bash",
	py: "python",
	md: "markdown",
	htm: "html",
	xml: "html",
	svg: "html",
	jsonc: "json"
};
function an(e) {
	let t = e.trim().split(/\s+/, 1)[0].replace(/^\{?\.?|\}$/g, "").toLowerCase();
	return rn[t] ?? t;
}
var j = {
	fence: "",
	language: "",
	inner: null,
	comment: !1
}, on = /^( {0,3})(`{3,}|~{3,})(.*)$/, sn = /^#{1,6}(?=\s|$)/, cn = /^ {0,3}=+[ \t]*$/, ln = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/, un = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)+\|?[ \t]*$/, dn = /^( {0,3})(\[[^\]]+\]:)([ \t]*)(\S+)(.*)$/, M = /(?:[-*+]|\d{1,9}[.)])(?=[ \t]|$)/y, N = /\[[ xX]\](?=[ \t]|$)/y, fn = /[!-/:-@[-`{-~]/, pn = /&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[A-Za-z][A-Za-z\d]{1,31});/y, mn = /<(?:[A-Za-z][A-Za-z\d+.-]{1,31}:[^<>\s]*|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)>/y, hn = /<\/?[A-Za-z][\w-]*(?:\s+[^<>]*)?\/?>/y, gn = /(?:https?:\/\/|www\.)[^\s<]*[^\s<?!.,:*_~)]/y;
function _n(e) {
	return {
		initialState: j,
		tokenizeLine(t, n, r) {
			let i = n;
			return i.fence.length > 0 ? vn(t, i, r, e) : yn(t, i, r, e);
		}
	};
}
function vn(e, t, n, r) {
	let i = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(e);
	if (i !== null && i[1][0] === t.fence[0] && i[1].length >= t.fence.length) return n(e.indexOf(i[1]), e.indexOf(i[1]) + i[1].length, "code"), j;
	let a = t.language.length > 0 ? r(t.language) : null;
	if (a === null) return e.length > 0 && n(0, e.length, "code"), t;
	let o = a.tokenizeLine(e, t.inner ?? a.initialState, n);
	return {
		...t,
		inner: o
	};
}
function yn(e, t, n, r) {
	let i = 0;
	if (t.comment) {
		let r = e.indexOf("-->");
		if (r < 0) return e.length > 0 && n(0, e.length, "comment"), t;
		n(0, r + 3, "comment"), i = r + 3;
	}
	if (i === 0) {
		let t = on.exec(e);
		if (t !== null && !(t[2][0] === "`" && t[3].includes("`"))) {
			let i = t[1].length, a = an(t[3]);
			return n(i, i + t[2].length, "code"), t[3].trim().length > 0 && n(i + t[2].length + t[3].search(/\S/), e.trimEnd().length, "keyword"), {
				fence: t[2],
				language: a,
				inner: r(a)?.initialState ?? null,
				comment: !1
			};
		}
		if (cn.test(e)) return n(e.search(/\S/), e.trimEnd().length, "heading"), j;
		if (ln.test(e) || un.test(e)) return n(e.search(/\S/), e.trimEnd().length, "punctuation"), j;
		let i = dn.exec(e);
		if (i !== null) {
			let t = i[1].length, r = t + i[2].length + i[3].length;
			return n(t, t + i[2].length - 1, "link"), n(r, r + i[4].length, "string"), i[5].trim().length > 0 && n(r + i[4].length + i[5].search(/\S/), e.trimEnd().length, "string"), j;
		}
	}
	return {
		...j,
		comment: bn(e, i, n)
	};
}
function bn(e, t, n) {
	let r = t, i = !1;
	for (;;) {
		let t = xn(e, r);
		if (e.charAt(t) === ">") {
			n(t, t + 1, "quote"), i = !0, r = t + 1;
			continue;
		}
		if (M.lastIndex = t, M.test(e)) {
			n(t, M.lastIndex, "keyword"), r = M.lastIndex;
			let i = xn(e, r);
			N.lastIndex = i, N.test(e) && (n(i, N.lastIndex, "keyword"), r = N.lastIndex);
			continue;
		}
		r = t;
		break;
	}
	return sn.test(e.slice(r)) ? (n(r, e.trimEnd().length, "heading"), !1) : Sn(e, r, i ? "quote" : null, n);
}
function xn(e, t) {
	let n = t;
	for (; e.charAt(n) === " " || e.charAt(n) === "	";) n++;
	return n;
}
function Sn(e, t, n, r) {
	let i = t, a = t, o = (e, t, o) => {
		n !== null && e > i && r(i, e, n), r(e, t, o), i = t, a = t;
	};
	for (; a < e.length;) {
		let t = e.charAt(a);
		if (t === "\\" && fn.test(e.charAt(a + 1))) {
			o(a, a + 2, "escape");
			continue;
		}
		if (t === "`") {
			let t = P(e, a, "`"), n = Cn(e, a + t, "`", t);
			if (n < 0) {
				a += t;
				continue;
			}
			o(a, n + t, "code");
			continue;
		}
		if (t === "*" || t === "_" || t === "~") {
			let n = wn(e, a, t);
			if (n < 0) {
				a += P(e, a, t);
				continue;
			}
			let r = Math.min(P(e, a, t), 3);
			o(a, n, t === "~" ? "strikethrough" : r >= 2 ? "strong" : "emphasis");
			continue;
		}
		if (t === "[" || t === "!" && e.charAt(a + 1) === "[") {
			if (Tn(e, a, o)) continue;
			a += t === "!" ? 2 : 1;
			continue;
		}
		if (t === "<") {
			if (e.startsWith("<!--", a)) {
				let t = e.indexOf("-->", a + 4);
				if (t < 0) return o(a, e.length, "comment"), !0;
				o(a, t + 3, "comment");
				continue;
			}
			if (mn.lastIndex = a, mn.test(e)) {
				o(a, mn.lastIndex, "link");
				continue;
			}
			if (hn.lastIndex = a, hn.test(e)) {
				o(a, hn.lastIndex, "tag");
				continue;
			}
		}
		if (t === "&" && (pn.lastIndex = a, pn.test(e))) {
			o(a, pn.lastIndex, "escape");
			continue;
		}
		if ((t === "h" || t === "w") && (a === 0 || /[\s(]/.test(e.charAt(a - 1))) && (gn.lastIndex = a, gn.test(e))) {
			o(a, gn.lastIndex, "link");
			continue;
		}
		if (t === "|") {
			o(a, a + 1, "punctuation");
			continue;
		}
		a++;
	}
	return n !== null && e.length > i && r(i, e.length, n), !1;
}
function P(e, t, n) {
	let r = t;
	for (; e.charAt(r) === n;) r++;
	return r - t;
}
function Cn(e, t, n, r) {
	let i = e.indexOf(n, t);
	for (; i >= 0;) {
		let t = P(e, i, n);
		if (t === r) return i;
		i = e.indexOf(n, i + t);
	}
	return -1;
}
function wn(e, t, n) {
	let r = P(e, t, n), i = n === "~" ? r : Math.min(r, 3);
	if (n === "~" && r > 2) return -1;
	let a = e.charAt(t + r);
	if (a === "" || /\s/.test(a) || n === "_" && t > 0 && /[\p{L}\p{N}]/u.test(e.charAt(t - 1))) return -1;
	let o = t + r;
	for (;;) {
		let t = e.indexOf(n.repeat(i), o);
		if (t < 0) return -1;
		let r = P(e, t, n), a = !/\s/.test(e.charAt(t - 1)), s = n === "_" && /[\p{L}\p{N}]/u.test(e.charAt(t + r));
		if (a && !s && r === i) return t + r;
		o = t + r;
	}
}
function Tn(e, t, n) {
	let r = En(e, e.charAt(t) === "!" ? t + 1 : t, "[", "]");
	if (r < 0) return !1;
	let i = e.charAt(r + 1);
	if (i !== "(" && i !== "[") return !1;
	let a = En(e, r + 1, i, i === "(" ? ")" : "]");
	return a < 0 ? !1 : (n(t, r + 1, "link"), n(r + 1, a + 1, i === "(" ? "string" : "link"), !0);
}
function En(e, t, n, r) {
	let i = 0;
	for (let a = t; a < e.length; a++) {
		let t = e.charAt(a);
		if (t === "\\") {
			a++;
			continue;
		}
		if (t === n) i++;
		else if (t === r && --i === 0) return a;
	}
	return -1;
}
//#endregion
//#region src/languages/python.ts
var Dn = C("\n    False None True and as assert async await break class continue def del elif else except finally for from global if import in\n    is lambda nonlocal not or pass raise return try while with yield match case\n"), On = C("\n    print len range int str float list dict set tuple bool type isinstance issubclass enumerate zip map filter sorted reversed min\n    max sum abs any all open super object iter next getattr setattr hasattr callable format repr round divmod pow input id hash\n    vars dir globals locals Exception ValueError TypeError KeyError IndexError RuntimeError StopIteration AttributeError\n"), kn = /[A-Za-z_]\w*/y, An = /0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[jJ]?/y, jn = /(?:[rRbBuUfF]{1,2})?(?:'''|"""|'|")/y, Mn = /[+\-*/%=<>!&|^~@:]+|->/y, Nn = /\s*\(/y, Pn = {
	initialState: () => ({
		mode: "code",
		strings: [],
		frames: [],
		declaring: null
	}),
	token(e, t) {
		return t.mode === "string" ? Fn(e, t) : Ln(e, t);
	}
};
function Fn(e, t) {
	let n = t.strings[t.strings.length - 1];
	if (n.formatted) {
		if (e.match("{{") || e.match("}}")) return "escape";
		if (e.match("{")) return t.frames.push(0), t.mode = "code", "punctuation";
	}
	for (; !e.eol();) {
		let r = e.peek();
		if (n.formatted && r === "{") return "string";
		if (!n.raw && r === "\\") {
			e.next(), e.next();
			continue;
		}
		if (e.match(n.quote)) return In(t), "string";
		e.next();
	}
	return n.quote.length === 1 && In(t), "string";
}
function In(e) {
	e.strings.pop(), e.mode = "code";
}
function Ln(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = e.peek();
	if (n === "#") return e.skipToEnd(), "comment";
	if (e.match(jn)) {
		let n = e.current(), r = n.search(/['"]/), i = n.slice(0, r).toLowerCase();
		return t.strings.push({
			quote: n.slice(r),
			raw: i.includes("r"),
			formatted: i.includes("f")
		}), t.mode = "string", t.declaring = null, Fn(e, t);
	}
	if (e.match(An)) return t.declaring = null, "number";
	if (n === "@" && e.match(/@[A-Za-z_][\w.]*/y)) return "meta";
	if (e.match(kn)) {
		let n = e.current(), r = t.declaring;
		return t.declaring = null, Dn.has(n) ? (t.declaring = n === "def" || n === "class" ? n : null, "keyword") : r === "def" ? "function" : r === "class" ? "type" : n === "self" || n === "cls" ? "variable" : (Nn.lastIndex = e.pos, Nn.test(e.text) ? "function" : On.has(n) || D(n) ? "type" : null);
	}
	if (n === "{") return e.next(), t.frames.length > 0 && t.frames[t.frames.length - 1]++, "punctuation";
	if (n === "}") {
		if (e.next(), t.frames.length > 0) {
			let e = t.frames.length - 1;
			if (t.frames[e] === 0) return t.frames.pop(), t.mode = "string", "punctuation";
			t.frames[e]--;
		}
		return "punctuation";
	}
	return e.match(/[()[\],;.]/y) ? "punctuation" : e.match(Mn) ? "operator" : (e.next(), null);
}
var Rn = {
	...S(Pn),
	keywords: [...Dn, ...On]
}, zn = [
	["json", nn],
	["css", Ft],
	["less", It],
	["javascript", nt],
	["typescript", nt],
	["html", Zt],
	["bash", We],
	["csharp", _t],
	["python", Rn]
], Bn = "plain-text", Vn = class e {
	tokenizers = new Map(zn);
	listeners = /* @__PURE__ */ new Set();
	constructor() {
		this.tokenizers.set("markdown", _n((e) => this.get(e)));
	}
	static normalize(e) {
		let t = (e ?? "").trim().toLowerCase();
		return t.length === 0 ? Bn : t;
	}
	get(t) {
		return this.tokenizers.get(e.normalize(t)) ?? null;
	}
	has(t) {
		return this.tokenizers.has(e.normalize(t));
	}
	ids() {
		return [...this.tokenizers.keys()];
	}
	register(t, n) {
		let r = e.normalize(t);
		if (r === "plain-text") throw Error("The plain-text language cannot be redefined.");
		if (typeof n?.tokenizeLine != "function" || n.initialState === void 0) throw Error(`The language '${t}' needs a tokenizer with an initialState and a tokenizeLine.`);
		this.tokenizers.set(r, n);
		for (let e of this.listeners) e(r);
	}
	onRegistered(e) {
		return this.listeners.add(e), () => this.listeners.delete(e);
	}
}, F = new Vn(), Hn = "data-ui-code-completions", Un = "data-ui-code-completions-source", Wn = "ui-code-input__completions", I = "ui-code-input__completion", Gn = "ui-code-input__completion--active", Kn = "ui-code-input__completions-anchor", qn = /* @__PURE__ */ new Map();
function Jn(e) {
	let t = qn.get(e);
	return t === void 0 && (t = fetch(e).then((t) => t.ok ? t.json() : Promise.reject(/* @__PURE__ */ Error(`Failed to load completions: ${e}`))).then(ye).catch(() => ({
		items: [],
		triggers: []
	})), qn.set(e, t)), t;
}
function Yn(e) {
	return e instanceof InputEvent && e.inputType === "insertText";
}
var Xn = class {
	root;
	textarea;
	context;
	surface;
	editing;
	carets;
	getLanguage;
	anchor;
	handle = null;
	list = null;
	items = [];
	active = -1;
	requestId = 0;
	lastKnownCaret = -1;
	sourceUrl = null;
	loadedFile = null;
	constructor(e, t, n, r, i, a) {
		this.root = e.root, this.textarea = e.textarea, this.context = t, this.surface = n, this.editing = r, this.carets = i, this.getLanguage = a, this.anchor = document.createElement("span"), this.anchor.className = Kn, this.anchor.setAttribute("aria-hidden", "true"), e.content.appendChild(this.anchor);
	}
	get isOpen() {
		return this.handle !== null;
	}
	get enabled() {
		return this.root.hasAttribute(Hn) && !this.textarea.readOnly;
	}
	key(e) {
		if (!(e.defaultPrevented || e.isComposing)) {
			if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.code === "Space") {
				this.enabled && (e.preventDefault(), this.openExplicit());
				return;
			}
			if (this.isOpen) switch (e.key) {
				case "ArrowDown":
					e.preventDefault(), this.move(1);
					break;
				case "ArrowUp":
					e.preventDefault(), this.move(-1);
					break;
				case "Enter":
				case "Tab":
					this.active >= 0 ? (e.preventDefault(), this.accept(this.active)) : this.close();
					break;
				case "Escape": e.preventDefault(), this.close();
			}
		}
	}
	textChanged(e) {
		if (!this.enabled) return;
		if (e instanceof InputEvent && e.isComposing) {
			this.close();
			return;
		}
		this.ensureFileLoaded();
		let t = this.textarea.value, n = this.textarea.selectionStart, r = fe(t, n), i = r.length > 0 || this.triggers().includes(t.charAt(n - 1));
		if (this.isOpen) {
			if (!i) {
				this.close();
				return;
			}
		} else if (!Yn(e) || !i || this.tokenBlocks(n) || !this.hasExtraSource(this.getLanguage())) return;
		this.lastKnownCaret = n, this.gatherAndShow(r, n);
	}
	openExplicit() {
		this.ensureFileLoaded();
		let e = this.textarea.selectionStart;
		this.tokenBlocks(e) || (this.lastKnownCaret = e, this.gatherAndShow(fe(this.textarea.value, e), e));
	}
	tokenBlocks(e) {
		let t = this.surface.tokenKindAt(e);
		return t === "comment" || t === "string";
	}
	triggers() {
		return this.loadedFile?.triggers ?? [];
	}
	hasExtraSource(e) {
		return this.sourceUrl !== null && this.sourceUrl.length > 0 || we.hasOwnSource(e) ? !0 : (F.get(e)?.keywords?.length ?? 0) > 0;
	}
	ensureFileLoaded() {
		let e = this.root.getAttribute(Un);
		e !== this.sourceUrl && (this.sourceUrl = e, this.loadedFile = null, e !== null && e.length !== 0 && Jn(e).then((t) => {
			this.root.getAttribute(Un) === e && (this.loadedFile = t);
		}));
	}
	async gatherAndShow(e, t) {
		let n = ++this.requestId, r = this.getLanguage(), i = this.buildContext(e, t, r), a = await pe(this.sourcesFor(r), i);
		if (n !== this.requestId || !this.textarea.isConnected) return;
		let o = me(a, e);
		if (o.length === 0 || o.length === 1 && o[0].label === e) {
			this.close();
			return;
		}
		this.show(o);
	}
	buildContext(e, t, n) {
		let r = this.surface.lines, i = r.lineAt(t);
		return {
			text: this.textarea.value,
			offset: t,
			line: i,
			column: t - r.start(i),
			prefix: e,
			languageId: n
		};
	}
	sourcesFor(e) {
		let t = [];
		this.loadedFile !== null && this.loadedFile.items.length > 0 && t.push(this.loadedFile.items), t.push(...we.sourcesFor(e));
		let n = F.get(e)?.keywords;
		return n !== void 0 && n.length > 0 && t.push(n.map((e) => ({
			label: e,
			kind: "keyword"
		}))), t.push(_e), t;
	}
	show(e) {
		this.items = e, this.active = 0, this.positionAnchor(), this.handle === null ? (this.list = document.createElement("ul"), this.list.className = Wn, this.list.setAttribute("role", "listbox"), this.list.setAttribute("aria-label", this.context.strings.text("ui.code.suggestions")), this.list.id = this.context.dom.ensureId(this.list, "code-completions"), this.list.addEventListener("mousedown", (e) => e.preventDefault()), this.list.addEventListener("click", (e) => this.pointerAccept(e)), this.root.append(this.list), this.handle = this.context.popups.open(this.anchor, this.list, {
			placement: "bottom-start",
			gap: 2,
			onDismiss: () => this.dismissed()
		}), this.textarea.setAttribute("aria-expanded", "true"), this.textarea.setAttribute("aria-controls", this.list.id)) : this.handle.reposition(), this.renderItems();
	}
	positionAnchor() {
		let e = this.carets.primaryCaretRect();
		e !== null && (this.anchor.style.left = `${e.left}px`, this.anchor.style.top = `${e.bottom}px`);
	}
	renderItems() {
		if (this.list !== null) {
			this.list.replaceChildren();
			for (let e = 0; e < this.items.length; e++) {
				let t = this.items[e], n = document.createElement("li");
				n.id = `${this.list.id}-${e}`, n.className = I, n.setAttribute("role", "option"), t.kind !== void 0 && n.classList.add(`${I}--${t.kind}`);
				let r = document.createElement("span");
				if (r.className = `${I}-label`, r.textContent = t.label, n.append(r), t.detail !== void 0) {
					let e = document.createElement("span");
					e.className = `${I}-detail`, e.textContent = t.detail, n.append(e);
				}
				this.list.append(n);
			}
			this.updateActive();
		}
	}
	updateActive() {
		if (this.list === null) return;
		for (let e = 0; e < this.list.children.length; e++) {
			let t = this.list.children[e], n = e === this.active;
			t.classList.toggle(Gn, n), t.setAttribute("aria-selected", n ? "true" : "false");
		}
		let e = this.list.children[this.active];
		e instanceof HTMLElement && (this.textarea.setAttribute("aria-activedescendant", e.id), e.scrollIntoView({ block: "nearest" }));
	}
	move(e) {
		this.items.length !== 0 && (this.active = (this.active + e + this.items.length) % this.items.length, this.updateActive());
	}
	pointerAccept(e) {
		if (this.list === null || !(e.target instanceof Element)) return;
		let t = e.target.closest(`.${I}`);
		if (t === null) return;
		let n = Array.prototype.indexOf.call(this.list.children, t);
		n >= 0 && this.accept(n);
	}
	accept(e) {
		let t = this.items[e];
		t !== void 0 && (this.close(), this.editing.acceptCompletion(t.insert ?? t.label));
	}
	selectionChanged() {
		this.isOpen && this.textarea.selectionStart !== this.lastKnownCaret && this.close();
	}
	close() {
		this.handle !== null && (this.handle.close(), this.dismissed());
	}
	dismissed() {
		this.list?.remove(), this.handle = null, this.list = null, this.items = [], this.active = -1, this.textarea.removeAttribute("aria-expanded"), this.textarea.removeAttribute("aria-controls"), this.textarea.removeAttribute("aria-activedescendant");
	}
}, L = "data-ui-code-language", Zn = "data-ui-code-eol", Qn = "crlf", $n = "--ui-code-tab-size";
//#endregion
//#region src/case-change.ts
function er(e, t, n) {
	let r = !1, i = (e) => n ? e.toUpperCase() : e.toLowerCase(), a = x(t, (t) => {
		if (g(t)) {
			let n = l(e, t.head);
			if (n === null) return null;
			let a = i(e.slice(n.from, n.to));
			return a === e.slice(n.from, n.to) ? null : (r = !0, {
				from: n.from,
				to: n.to,
				text: a,
				caret: t.head - n.from
			});
		}
		let n = m(t), a = h(t), o = i(e.slice(n, a));
		if (o === e.slice(n, a)) return null;
		r = !0;
		let s = t.anchor <= t.head;
		return {
			from: n,
			to: a,
			text: o,
			caret: s ? o.length : 0,
			anchor: s ? 0 : o.length
		};
	});
	return r ? a : null;
}
//#endregion
//#region src/indent.ts
function tr(t, n, r, i) {
	if (!i && n.ranges.every(g)) {
		let i = e(t);
		return x(n, (e) => {
			let n = " ".repeat(r - d(t, i, e.head, r) % r);
			return {
				from: e.head,
				to: e.head,
				text: n,
				caret: n.length
			};
		});
	}
	let a = [], o = -1;
	for (let e of n.ranges) {
		let n = m(e), s = h(e), c = t.lastIndexOf("\n", n - 1) + 1, l = t.indexOf("\n", s > n ? s - 1 : s);
		for (l < 0 && (l = t.length); c <= l;) {
			let e = t.indexOf("\n", c);
			if (e < 0 && (e = t.length), c > o) {
				let n = nr(t, c, e, r, i);
				n !== null && a.push(n), o = c;
			}
			c = e + 1;
		}
	}
	return a.length === 0 ? null : {
		edits: a,
		after: y(n.ranges.map((e) => ({
			anchor: b(e.anchor, a),
			head: b(e.head, a)
		})), n.primary)
	};
}
function nr(e, t, n, r, i) {
	if (!i) return n === t ? null : {
		from: t,
		to: t,
		text: " ".repeat(r)
	};
	let a = rr(e, t, n, r);
	return a === 0 ? null : {
		from: t,
		to: t + a,
		text: ""
	};
}
function rr(e, t, n, r) {
	if (e[t] === "	") return 1;
	let i = 0;
	for (; i < r && t + i < n && e[t + i] === " ";) i++;
	return i;
}
function ir(e, t, n, r) {
	let i = e.lastIndexOf("\n", t - 1) + 1, a = e.slice(i, t), o = /^[ \t]*/.exec(a)?.[0] ?? "", s = a.trimEnd(), c = s.charAt(s.length - 1);
	return (c === "{" || c === "[" || c === "(" || c === ":" && r) && (o += " ".repeat(n)), "\n" + o;
}
//#endregion
//#region src/code-editor-editing.ts
var ar = class {
	textarea;
	surface;
	carets;
	getLanguage;
	copied = null;
	constructor(e, t, n, r) {
		this.textarea = e, this.surface = t, this.carets = n, this.getLanguage = r;
	}
	key(e) {
		if (e.defaultPrevented || e.isComposing) return;
		let t = e.ctrlKey || e.metaKey;
		if (t && !e.altKey && e.code === "KeyZ") e.preventDefault(), e.shiftKey ? this.surface.redo() : this.surface.undo();
		else if (t && !e.altKey && !e.shiftKey && e.code === "KeyY") e.preventDefault(), this.surface.redo();
		else if (t && !e.altKey && e.code === "KeyU") e.preventDefault(), this.textarea.readOnly || this.changeCase(e.shiftKey);
		else if (t || e.altKey || this.textarea.readOnly) return;
		else e.key === "Tab" ? (e.preventDefault(), this.tab(e.shiftKey)) : e.key === "Enter" && !e.shiftKey && (e.preventDefault(), this.newLine());
	}
	changeCase(e) {
		let t = er(this.textarea.value, this.carets.read(), e);
		t !== null && this.surface.apply(t.edits, t.after, "other");
	}
	tab(e) {
		let t = tr(this.textarea.value, this.carets.read(), this.surface.tabSize, e);
		t !== null && this.surface.apply(t.edits, t.after, "other");
	}
	newLine() {
		let e = this.textarea.value, t = this.surface.tabSize, n = this.getLanguage() === "python";
		this.replaceEach((r) => ir(e, m(r), t, n), "other");
	}
	replaceEach(e, t) {
		let { set: n, pads: r } = this.carets.readPadded(), { edits: i, after: a } = x(n, (t, n) => {
			let i = r === null ? 0 : Math.min(r[n].anchor, r[n].head), a = " ".repeat(i) + e(t, n);
			return {
				from: m(t),
				to: h(t),
				text: a,
				caret: a.length
			};
		});
		this.surface.apply(i, a, t);
	}
	beforeInput(e) {
		if (e.inputType === "historyUndo" || e.inputType === "historyRedo") {
			e.preventDefault(), e.inputType === "historyUndo" ? this.surface.undo() : this.surface.redo();
			return;
		}
		if (!this.carets.isMulti) {
			this.surface.beforeNativeEdit();
			return;
		}
		let r = this.textarea.value;
		switch (e.inputType) {
			case "insertText":
			case "insertReplacementText": {
				let t = e.data ?? e.dataTransfer?.getData("text/plain") ?? null;
				if (t === null) break;
				e.preventDefault(), this.replaceEach(() => t, "typing");
				return;
			}
			case "insertLineBreak":
			case "insertParagraph":
				e.preventDefault(), this.replaceEach(() => "\n", "other");
				return;
			case "deleteContentBackward":
				e.preventDefault(), this.deleteEach((e) => t(r, e), "deleting");
				return;
			case "deleteContentForward":
				e.preventDefault(), this.deleteEach((e) => n(r, e), "deleting");
				return;
			case "deleteWordBackward":
				e.preventDefault(), this.deleteEach((e) => c(r, e), "other");
				return;
			case "deleteWordForward":
				e.preventDefault(), this.deleteEach((e) => s(r, e), "other");
				return;
			case "deleteSoftLineBackward":
			case "deleteHardLineBackward":
				e.preventDefault(), this.deleteEach((e) => r.lastIndexOf("\n", e - 1) + 1, "other");
				return;
			case "deleteSoftLineForward":
			case "deleteHardLineForward":
				e.preventDefault(), this.deleteEach((e) => r.indexOf("\n", e) < 0 ? r.length : r.indexOf("\n", e), "other");
				return;
		}
		this.carets.collapse(), this.surface.beforeNativeEdit();
	}
	deleteEach(e, t) {
		let { edits: n, after: r } = x(this.carets.read(), (t) => {
			if (!g(t)) return {
				from: m(t),
				to: h(t),
				text: "",
				caret: 0
			};
			let n = e(t.head);
			return {
				from: Math.min(t.head, n),
				to: Math.max(t.head, n),
				text: "",
				caret: 0
			};
		});
		this.surface.apply(n, r, t);
	}
	compositionStart() {
		this.carets.collapse();
	}
	copy(e) {
		let t = this.selectedPieces();
		t !== null && e.clipboardData !== null && (e.preventDefault(), e.clipboardData.setData("text/plain", t.join("\n")), this.copied = t);
	}
	selectedPieces() {
		let e = this.carets.read();
		return e.ranges.length < 2 || e.ranges.every(g) ? null : e.ranges.map((e) => this.textarea.value.slice(m(e), h(e)));
	}
	cut(e) {
		if (this.textarea.readOnly) return;
		let t = this.selectedPieces();
		t !== null && e.clipboardData !== null && (e.preventDefault(), e.clipboardData.setData("text/plain", t.join("\n")), this.copied = t, this.deleteEach((e) => e, "other"));
	}
	paste(e) {
		let t = this.carets.read();
		if (t.ranges.length < 2 || this.textarea.readOnly || e.clipboardData === null) return;
		let n = e.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n"), r = oe(n, t.ranges.length, this.copied);
		e.preventDefault(), this.replaceEach((e, t) => r?.[t] ?? n, "other");
	}
	acceptCompletion(e) {
		let t = this.textarea.value, { edits: n, after: r } = x(this.carets.read(), (n) => g(n) ? {
			from: de(t, n.head),
			to: n.head,
			text: e,
			caret: e.length
		} : null);
		this.surface.apply(n, r, "other");
	}
}, or = 5e3, sr = class {
	done = [];
	undone = [];
	open = !1;
	record(e, t) {
		this.undone.length = 0;
		let n = this.done.at(-1);
		this.open && n !== void 0 && cr(n, e, t) ? n.changes.push(e) : (this.done.push({
			kind: t,
			changes: [e]
		}), this.done.length > or && this.done.shift()), this.open = !0;
	}
	undo(e) {
		let t = this.done.pop();
		if (t === void 0) return null;
		let n = e;
		for (let e = t.changes.length - 1; e >= 0; e--) n = ne(n, lr(t.changes[e]));
		return this.undone.push(t), this.open = !1, {
			text: n,
			selections: t.changes[0].before
		};
	}
	redo(e) {
		let t = this.undone.pop();
		if (t === void 0) return null;
		let n = e;
		for (let e of t.changes) n = ne(n, e.edits);
		return this.done.push(t), this.open = !1, {
			text: n,
			selections: t.changes[t.changes.length - 1].after
		};
	}
	clear() {
		this.done.length = 0, this.undone.length = 0, this.open = !1;
	}
};
function cr(e, t, n) {
	let r = e.changes[e.changes.length - 1];
	if (n === "other" || n !== e.kind || !te(r.after, t.before)) return !1;
	if (n !== "typing") return !0;
	let i = r.edits.at(-1)?.text ?? "", a = t.edits[0]?.text ?? "";
	return !(/\s$/.test(i) && /^\S/.test(a));
}
function lr(e) {
	let t = [], n = 0;
	for (let r = 0; r < e.edits.length; r++) {
		let i = e.edits[r], a = i.from + n;
		t.push({
			from: a,
			to: a + i.text.length,
			text: e.removed[r]
		}), n += i.text.length - (i.to - i.from);
	}
	return t;
}
function ur(e, t, n) {
	let r = Math.min(e.length, t.length), i = 0;
	for (; i < r && e.charCodeAt(e.length - 1 - i) === t.charCodeAt(t.length - 1 - i);) i++;
	i = Math.min(i, Math.max(0, t.length - n));
	let a = 0, o = r - i;
	for (; a < o && e.charCodeAt(a) === t.charCodeAt(a);) a++;
	return {
		from: a,
		to: e.length - i,
		text: t.slice(a, t.length - i)
	};
}
//#endregion
//#region src/search.ts
function dr(e, t) {
	if (e.length === 0) return null;
	let n = t.regex ? e : e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	t.wholeWord && (n = `\\b(?:${n})\\b`);
	try {
		return { pattern: new RegExp(n, t.matchCase ? "gm" : "gim") };
	} catch {
		return { invalid: !0 };
	}
}
function fr(e, t) {
	if (t === null || "invalid" in t) return [];
	let n = [], r = t.pattern;
	for (r.lastIndex = 0;;) {
		let t = r.exec(e);
		if (t === null) break;
		if (t[0].length === 0) {
			r.lastIndex++;
			continue;
		}
		n.push({
			from: t.index,
			to: t.index + t[0].length
		});
	}
	return n;
}
function pr(e, t) {
	if (e.length === 0) return -1;
	for (let n = 0; n < e.length; n++) if (e[n].from >= t) return n;
	return 0;
}
function mr(e, t) {
	if (e.length === 0) return -1;
	for (let n = e.length - 1; n >= 0; n--) if (e[n].from < t) return n;
	return e.length - 1;
}
function hr(e, t, n, r, i) {
	if (!i || n === null || "invalid" in n) return r;
	let a = new RegExp(n.pattern.source, n.pattern.flags.replace("g", ""));
	return e.slice(t.from, t.to).replace(a, r);
}
function gr(e, t, n, r) {
	return t === null || "invalid" in t ? e : (t.pattern.lastIndex = 0, r ? e.replace(t.pattern, n) : e.replace(t.pattern, () => n));
}
//#endregion
//#region src/code-editor-find-replace.ts
var _r = "ui-code-input--invalid-pattern", vr = class {
	root;
	textarea;
	scroller;
	panel;
	findField;
	replaceField;
	replaceRow;
	expand;
	count;
	strings;
	surface;
	matches = [];
	current = -1;
	query = null;
	constructor(e, t, n) {
		this.root = e.root, this.textarea = e.textarea, this.scroller = e.scroller, this.panel = e.panel, this.findField = e.findField, this.replaceField = e.replaceField, this.replaceRow = e.replaceRow, this.expand = e.expand, this.count = e.count, this.strings = t, this.surface = n;
	}
	get isOpen() {
		return !this.panel.hidden;
	}
	get options() {
		return {
			matchCase: this.pressed("data-ui-code-match-case"),
			wholeWord: this.pressed("data-ui-code-whole-word"),
			regex: this.pressed("data-ui-code-regex")
		};
	}
	pressed(e) {
		return this.panel.querySelector(`[${e}] > .ui-button`)?.getAttribute("aria-pressed") === "true";
	}
	get isReplacing() {
		return !this.replaceRow.hidden && !this.textarea.readOnly;
	}
	showReplace(e) {
		let t = e && !this.textarea.readOnly;
		this.replaceRow.hidden = !t, this.expand?.setAttribute("aria-expanded", t ? "true" : "false");
	}
	toggleReplace() {
		this.showReplace(!this.isReplacing), (this.isReplacing ? this.replaceField : this.findField).focus({ preventScroll: !0 });
	}
	open(e) {
		let t = this.textarea.value.slice(this.textarea.selectionStart, this.textarea.selectionEnd);
		this.panel.hidden = !1, e && this.showReplace(!0), t.length > 0 && !t.includes("\n") && (this.findField.value = t), this.search(!1, !0);
		let n = e && this.isReplacing ? this.replaceField : this.findField;
		n.focus({ preventScroll: !0 }), n.select();
	}
	close() {
		this.panel.hidden = !0, this.matches = [], this.current = -1, this.surface.applyMatches([], -1), this.root.classList.remove(_r), this.findField.closest(".ui-text-input")?.classList.remove("ui-invalid"), this.textarea.focus({ preventScroll: !0 });
	}
	search(e, t) {
		let n = this.options, r = this.current >= 0 ? this.matches[this.current] : void 0;
		this.query = dr(this.findField.value, n), this.matches = fr(this.textarea.value, this.query);
		let i = this.query !== null && "invalid" in this.query;
		this.root.classList.toggle(_r, i), this.findField.closest(".ui-text-input")?.classList.toggle("ui-invalid", i);
		let a = e && r !== void 0 ? this.matches.findIndex((e) => e.from === r.from) : -1, o = a >= 0 ? a : pr(this.matches, this.textarea.selectionStart);
		this.goTo(o, t);
	}
	refreshIfOpen(e) {
		this.isOpen && this.search(!0, e);
	}
	findFieldKey(e) {
		e.key === "Enter" && !e.isComposing && (e.preventDefault(), this.step(e.shiftKey ? -1 : 1));
	}
	step(e) {
		if (this.panel.hidden) {
			this.open(!1);
			return;
		}
		if (this.matches.length === 0) {
			this.search(!1, !0);
			return;
		}
		let t = this.current >= 0 ? this.matches[this.current].from : this.textarea.selectionStart, n = e > 0 ? pr(this.matches, t + 1) : mr(this.matches, t);
		this.goTo(n, !0);
	}
	goTo(e, t) {
		if (this.current = e, this.surface.applyMatches(this.matches, e), this.writeCount(), e < 0 || !t) return;
		let n = this.matches[e];
		this.surface.select(n.from, n.to), this.reveal(n);
	}
	writeCount() {
		let e;
		e = this.query !== null && "invalid" in this.query ? this.strings.text("ui.code.invalid-pattern") : this.query === null ? "" : this.matches.length === 0 ? this.strings.text("ui.code.no-matches") : this.strings.format("ui.code.matches", {
			current: this.current + 1,
			total: this.matches.length
		}), this.count.textContent !== e && (this.count.textContent = e);
	}
	reveal(e) {
		let t = this.surface.lineElement(this.surface.lineAt(e.from));
		if (t === void 0) return;
		let n = this.scroller, r = t.offsetTop, i = r + t.offsetHeight;
		(r < n.scrollTop || i > n.scrollTop + n.clientHeight) && (n.scrollTop = Math.max(0, r - n.clientHeight / 2));
		let a = t.querySelector(".ui-code-match--current");
		if (a === null) return;
		let o = a.offsetLeft, s = o + a.offsetWidth;
		(o < n.scrollLeft || s > n.scrollLeft + n.clientWidth) && (n.scrollLeft = Math.max(0, o - n.clientWidth / 2));
	}
	replaceFieldKey(e) {
		e.key === "Enter" && !e.isComposing && (e.preventDefault(), e.ctrlKey || e.metaKey ? this.replaceEvery() : this.replaceOne());
	}
	replaceOne() {
		if (this.textarea.readOnly) return;
		if (this.current < 0) {
			this.search(!1, !0);
			return;
		}
		let e = this.matches[this.current], t = hr(this.textarea.value, e, this.query, this.replaceField.value, this.options.regex);
		this.surface.replaceRange(e.from, e.to, t), this.replaceField.focus({ preventScroll: !0 }), this.goTo(this.matches.length === 0 ? -1 : Math.min(this.current < 0 ? 0 : this.current, this.matches.length - 1), !0);
	}
	replaceEvery() {
		if (this.textarea.readOnly || this.matches.length === 0) return;
		let e = this.textarea.value, t = gr(e, this.query, this.replaceField.value, this.options.regex);
		if (t === e) return;
		let n = ur(e, t, 0);
		this.surface.replaceRange(n.from, n.to, n.text), this.replaceField.focus({ preventScroll: !0 });
	}
}, yr = class {
	root;
	textarea;
	lineEnding;
	pickers;
	values;
	properties;
	constructor(e, t, n, r) {
		this.root = e.root, this.textarea = e.textarea, this.lineEnding = e.lineEnding, this.values = t, this.properties = n, this.pickers = [
			e.tabSize,
			e.encoding,
			e.lineEnding,
			e.language
		].filter((e) => e !== null), e.tabSize?.carrier.addEventListener("change", () => {
			this.root.style.setProperty($n, e.tabSize?.carrier.value ?? "4");
		}), this.lineEnding?.carrier.addEventListener("change", () => {
			this.textarea.dispatchEvent(new Event("change", { bubbles: !0 }));
		}), e.language?.carrier.addEventListener("change", () => {
			this.root.setAttribute(L, e.language?.carrier.value ?? ""), r();
		});
		for (let e of this.pickers) e.select.addEventListener("change", () => this.chosen(e));
		this.showDetectedEnding(this.root.getAttribute("data-ui-code-eol") ?? "lf"), this.syncPickers();
	}
	chosen(e) {
		if (this.textarea.readOnly) {
			this.syncPickers();
			return;
		}
		let t = this.values.read(e.select), n = t == null ? "" : String(t);
		e.carrier.value !== n && (e.carrier.value = n, e.carrier.dispatchEvent(new Event("change", { bubbles: !0 })));
	}
	syncPickers() {
		for (let e of this.pickers) {
			let t = e.carrier.value;
			String(this.values.read(e.select) ?? "") !== t && this.properties.set(e.select, "Value", t.length === 0 ? null : t);
		}
	}
	showDetectedEnding(e) {
		this.lineEnding !== null && this.properties.set(this.lineEnding.select, "Placeholder", e === "crlf" ? "CRLF" : "LF");
	}
}, br = {}, xr = [], Sr = [], Cr = class {
	tokenizer;
	lines = [];
	starts = [0];
	constructor(e) {
		this.tokenizer = e;
	}
	get lineCount() {
		return this.lines.length;
	}
	lineText(e) {
		return this.lines[e]?.text ?? "";
	}
	lineStart(e) {
		return this.starts[e] ?? 0;
	}
	lineAt(e) {
		let t = 0, n = this.starts.length - 1;
		for (; t < n;) {
			let r = t + n + 1 >> 1;
			this.starts[r] <= e ? t = r : n = r - 1;
		}
		return t;
	}
	update(e) {
		let t = e.split("\n"), n = this.lines, r = [], i = [], a = this.tokenizer?.initialState ?? br, o = -1, s = 0, c = 0, l = 0, u = 0;
		for (; l < t.length;) {
			if (u < n.length && n[u].text === t[l] && Oe(n[u].startState, a)) {
				o >= 0 && (i.push({
					from: o,
					removed: s,
					added: c
				}), o = -1), r.push(n[u]), a = n[u].endState, l++, u++;
				continue;
			}
			o < 0 && (o = l, s = 0, c = 0);
			let [e, d] = u < n.length && n[u].text === t[l] ? [1, 1] : Tr(t, l, n, u);
			for (let n = 0; n < e; n++) {
				let e = this.tokenize(t[l + n], a);
				r.push(e), a = e.endState;
			}
			c += e, s += d, l += e, u += d;
		}
		return u < n.length && (o < 0 && (o = l, s = 0, c = 0), s += n.length - u), o >= 0 && i.push({
			from: o,
			removed: s,
			added: c
		}), this.lines = r, this.rebuildStarts(), i;
	}
	tokenize(e, t) {
		if (this.tokenizer === null) return {
			text: e,
			startState: br,
			endState: br,
			tokens: xr,
			marks: Sr
		};
		let n = [];
		return {
			text: e,
			startState: t,
			endState: this.tokenizer.tokenizeLine(e, t, (e, t, r) => n.push({
				from: e,
				to: t,
				kind: r
			})),
			tokens: n,
			marks: Sr
		};
	}
	rebuildStarts() {
		let e = Array(this.lines.length), t = 0;
		for (let n = 0; n < this.lines.length; n++) e[n] = t, t += this.lines[n].text.length + 1;
		this.starts = e;
	}
	setMatches(e, t) {
		let n = /* @__PURE__ */ new Map();
		for (let r = 0; r < e.length; r++) {
			let i = e[r], a = this.lineAt(i.from), o = this.lineAt(Math.max(i.from, i.to - 1));
			for (let e = a; e <= o; e++) {
				let a = this.starts[e], o = Math.max(0, i.from - a), s = Math.min(this.lines[e].text.length, i.to - a), c = n.get(e);
				c === void 0 && (c = [], n.set(e, c)), c.push({
					from: o,
					to: s,
					current: r === t
				});
			}
		}
		let r = [];
		for (let e = 0; e < this.lines.length; e++) {
			let t = this.lines[e], i = n.get(e) ?? Sr;
			Er(t.marks, i) || (t.marks = i, r.push(e));
		}
		return r;
	}
	tokenKindAt(e) {
		let t = this.lineAt(e), n = this.lines[t];
		if (n === void 0 || n.tokens.length === 0) return null;
		let r = Math.max(0, e - this.starts[t] - 1);
		return n.tokens.find((e) => r >= e.from && r < e.to)?.kind ?? null;
	}
	renderLine(e) {
		let t = this.lines[e];
		return t === void 0 ? "" : t.text.length === 0 ? "<span class=\"ui-code-input__code\"><br></span>" : `<span class="ui-code-input__code">${Dr(t.text, t.tokens, t.marks)}</span>`;
	}
}, wr = 8;
function Tr(e, t, n, r) {
	for (let i = 1; i <= 16; i++) for (let a = Math.min(i, wr); a >= 0 && i - a <= wr; a--) {
		let o = i - a;
		if (t + a < e.length && r + o < n.length && e[t + a] === n[r + o].text) return [a, o];
	}
	return [+(t < e.length), +(r < n.length)];
}
function Er(e, t) {
	if (e.length !== t.length) return !1;
	for (let n = 0; n < e.length; n++) if (e[n].from !== t[n].from || e[n].to !== t[n].to || e[n].current !== t[n].current) return !1;
	return !0;
}
function Dr(e, t, n) {
	if (t.length === 0 && n.length === 0) return kr(e);
	let r = /* @__PURE__ */ new Set([0, e.length]);
	for (let e of t) r.add(e.from), r.add(e.to);
	for (let e of n) r.add(e.from), r.add(e.to);
	let i = [...r].sort((e, t) => e - t), a = "", o = 0, s = 0;
	for (let r = 0; r + 1 < i.length; r++) {
		let c = i[r], l = i[r + 1];
		for (; o < t.length && t[o].to <= c;) o++;
		for (; s < n.length && n[s].to <= c;) s++;
		let u = o < t.length && t[o].from <= c ? t[o].kind : null, d = s < n.length && n[s].from <= c ? n[s] : null, f = kr(e.slice(c, l));
		if (u === null && d === null) {
			a += f;
			continue;
		}
		a += `<span class="${Or(u, d)}">${f}</span>`;
	}
	return a;
}
function Or(e, t) {
	let n = e === null ? "" : `ui-tk-${e}`;
	return t !== null && (n += (n.length > 0 ? " " : "") + (t.current ? "ui-code-match ui-code-match--current" : "ui-code-match")), n;
}
function kr(e) {
	return e.replace(/[&<>]/g, (e) => e === "&" ? "&amp;" : e === "<" ? "&lt;" : "&gt;");
}
//#endregion
//#region src/code-editor-surface.ts
var Ar = "--ui-code-gutter-digits", jr = "ui-code-input__line", Mr = class {
	root;
	textarea;
	highlight;
	position;
	strings;
	getLanguage;
	selections;
	notifyTextChanged;
	history = new sr();
	highlighter;
	lastValue;
	pendingBefore = null;
	constructor(e, t, n, r, i) {
		this.root = e.root, this.textarea = e.textarea, this.highlight = e.highlight, this.position = e.position, this.strings = t, this.getLanguage = n, this.selections = r, this.notifyTextChanged = i, this.highlighter = new Cr(F.get(n())), this.lastValue = e.textarea.value;
	}
	renderAll() {
		this.highlight.replaceChildren(), this.redraw();
	}
	redraw() {
		this.applyChanges(this.highlighter.update(this.textarea.value)), this.updateGutter();
	}
	applyChanges(e) {
		let t = "";
		for (let n of e) for (let e = n.from; e < n.from + n.added; e++) t += `<div class="${jr}">${this.highlighter.renderLine(e)}</div>`;
		if (this.highlight.childElementCount === 0) {
			this.highlight.innerHTML = t;
			return;
		}
		let n = document.createElement("template");
		n.innerHTML = t;
		let r = n.content, i = this.highlight.firstElementChild, a = 0;
		for (let t of e) {
			for (; a < t.from && i !== null; a++) i = i.nextElementSibling;
			for (let e = 0; e < t.removed && i !== null; e++) {
				let e = i.nextElementSibling;
				i.remove(), i = e;
			}
			for (let e = 0; e < t.added; e++) this.highlight.insertBefore(r.firstElementChild, i);
			a += t.added;
		}
	}
	renderLines(e) {
		for (let t of e) {
			let e = this.highlight.children[t];
			e !== void 0 && (e.innerHTML = this.highlighter.renderLine(t));
		}
	}
	updateGutter() {
		let e = String(Math.max(2, String(this.highlighter.lineCount).length));
		this.root.style.getPropertyValue(Ar) !== e && this.root.style.setProperty(Ar, e);
	}
	get tabSize() {
		let e = Number.parseInt(getComputedStyle(this.root).getPropertyValue($n), 10);
		return Number.isFinite(e) && e > 0 ? e : 4;
	}
	writePosition() {
		if (this.position === null) return;
		let e = this.textarea.value, t = this.textarea.selectionEnd, n = e.lastIndexOf("\n", t - 1) + 1, r = this.highlighter.lineAt(n) + 1, i = this.strings.format("ui.code.position", {
			line: r,
			column: t - n + 1 + this.selections.virtualColumns()
		});
		this.position.textContent !== i && (this.position.textContent = i);
	}
	setLanguage() {
		this.highlighter = new Cr(F.get(this.getLanguage())), this.renderAll();
	}
	save() {
		this.textarea.readOnly || (this.textarea.dispatchEvent(new Event("change", { bubbles: !0 })), this.textarea.dispatchEvent(new Event("save", { bubbles: !0 })));
	}
	beforeNativeEdit() {
		this.pendingBefore = this.selections.read();
	}
	nativeInput(e) {
		let t = this.textarea.value;
		if (t === this.lastValue) return;
		let n = ur(this.lastValue, t, this.textarea.selectionEnd), r = {
			edits: [n],
			removed: [this.lastValue.slice(n.from, n.to)],
			before: this.pendingBefore ?? v(n.from, n.to),
			after: this.selections.read()
		};
		this.history.record(r, Nr(e)), this.lastValue = t, this.pendingBefore = null, this.redraw(), this.writePosition(), this.notifyTextChanged(!1);
	}
	textPushed() {
		return this.textarea.value !== this.lastValue && (this.history.clear(), this.lastValue = this.textarea.value, this.redraw(), this.writePosition(), this.notifyTextChanged(!0), !0);
	}
	apply(e, t, n) {
		if (this.textarea.readOnly) return;
		if (this.adoptOutsideValue(), e.length === 0) {
			this.selections.write(t, !0), this.writePosition();
			return;
		}
		let r = this.textarea.value;
		this.history.record({
			edits: e,
			removed: e.map((e) => r.slice(e.from, e.to)),
			before: this.selections.read(),
			after: t
		}, n), this.commit(ne(r, e), e.length === 1 ? e[0] : null, t);
	}
	adoptOutsideValue() {
		this.textarea.value !== this.lastValue && (this.history.clear(), this.lastValue = this.textarea.value, this.redraw());
	}
	commit(e, t, n) {
		t === null ? this.textarea.value = e : this.textarea.setRangeText(t.text, t.from, t.to), this.lastValue = e, this.pendingBefore = null, this.redraw(), this.selections.write(n, !0), this.writePosition(), this.notifyTextChanged(!1), this.textarea.dispatchEvent(new Event("input", { bubbles: !0 }));
	}
	replaceRange(e, t, n) {
		this.apply([{
			from: e,
			to: t,
			text: n
		}], v(e + n.length), "other");
	}
	select(e, t) {
		this.selections.write(v(e, t), !1);
	}
	undo() {
		this.restore((e) => this.history.undo(e));
	}
	redo() {
		this.restore((e) => this.history.redo(e));
	}
	restore(e) {
		if (this.textarea.readOnly) return;
		this.adoptOutsideValue();
		let t = e(this.textarea.value);
		t !== null && this.commit(t.text, null, t.selections);
	}
	get lines() {
		let e = this.highlighter, t = this.textarea.value;
		return {
			count: e.lineCount,
			start: (t) => e.lineStart(t),
			end: (n) => n + 1 < e.lineCount ? e.lineStart(n + 1) - 1 : t.length,
			lineAt: (t) => e.lineAt(t)
		};
	}
	lineAt(e) {
		return this.highlighter.lineAt(e);
	}
	tokenKindAt(e) {
		return this.highlighter.tokenKindAt(e);
	}
	lineElement(e) {
		return this.highlight.children[e];
	}
	applyMatches(e, t) {
		this.renderLines(this.highlighter.setMatches(e, t));
	}
};
function Nr(e) {
	let t = e instanceof InputEvent ? e.inputType : "";
	return t === "insertText" || t === "insertCompositionText" ? "typing" : t === "deleteContentBackward" || t === "deleteContentForward" ? "deleting" : "other";
}
//#endregion
//#region src/code-editor.ts
var Pr = "data-ui-code-search", Fr = "> .ui-button", Ir = [
	"data-ui-code-match-case",
	"data-ui-code-whole-word",
	"data-ui-code-regex"
], Lr = class e {
	root;
	surface;
	carets;
	editing;
	completions;
	findReplace;
	statusBar;
	language;
	constructor(e, t, n) {
		this.root = e, this.language = Vn.normalize(e.getAttribute(L));
		let r = t.strings;
		this.surface = new Mr({
			root: e,
			textarea: n.textarea,
			highlight: n.highlight,
			position: n.position
		}, r, () => this.language, {
			read: () => this.carets.read(),
			write: (e, t) => this.carets.write(e, t),
			virtualColumns: () => this.carets.primaryPadding
		}, (e) => this.findReplace.refreshIfOpen(e)), this.surface.renderAll(), this.carets = new le({
			root: e,
			textarea: n.textarea,
			scroller: n.scroller,
			content: n.content
		}, this.surface), this.editing = new ar(n.textarea, this.surface, this.carets, () => this.language), this.completions = new Xn({
			root: e,
			textarea: n.textarea,
			content: n.content
		}, t, this.surface, this.editing, this.carets, () => this.language), this.findReplace = new vr({
			root: e,
			textarea: n.textarea,
			scroller: n.scroller,
			panel: n.panel,
			findField: n.findField,
			replaceField: n.replaceField,
			replaceRow: n.replaceRow,
			expand: n.expand,
			count: n.count
		}, r, this.surface), this.statusBar = new yr({
			root: e,
			textarea: n.textarea,
			tabSize: n.tabSize,
			encoding: n.encoding,
			lineEnding: n.lineEnding,
			language: n.language
		}, t.values, t.properties, () => {
			this.settingsChanged(), this.carets.queueRender();
		}), this.surface.writePosition();
		let { textarea: i, scroller: a, panel: o, findField: s, replaceField: c } = n;
		i.addEventListener("beforeinput", (e) => this.editing.beforeInput(e)), i.addEventListener("input", (e) => this.surface.nativeInput(e)), i.addEventListener("keydown", (e) => {
			this.completions.key(e), this.carets.key(e), this.editing.key(e);
		}), i.addEventListener("keyup", () => this.surface.writePosition()), i.addEventListener("click", () => this.surface.writePosition()), i.addEventListener("mousedown", (e) => this.carets.pointerDown(e)), i.addEventListener("compositionstart", () => this.editing.compositionStart()), i.addEventListener("copy", (e) => this.editing.copy(e)), i.addEventListener("cut", (e) => this.editing.cut(e)), i.addEventListener("paste", (e) => this.editing.paste(e)), i.addEventListener("input", (e) => this.completions.textChanged(e)), i.addEventListener("blur", () => this.completions.close()), a.addEventListener("scroll", () => this.carets.queueRender(), { passive: !0 }), a.addEventListener("scroll", () => this.completions.close(), { passive: !0 }), e.addEventListener("keydown", (e) => this.rootKey(e)), s.addEventListener("input", () => this.findReplace.search(!1, !0)), s.addEventListener("keydown", (e) => this.findReplace.findFieldKey(e)), c.addEventListener("keydown", (e) => this.findReplace.replaceFieldKey(e));
		for (let e of Ir) this.panelButton(o, e)?.addEventListener("change", () => this.findReplace.search(!1, !0));
		this.panelButton(o, "data-ui-code-toggle-replace")?.addEventListener("click", () => this.findReplace.toggleReplace()), this.panelButton(o, "data-ui-code-previous")?.addEventListener("click", () => this.findReplace.step(-1)), this.panelButton(o, "data-ui-code-next")?.addEventListener("click", () => this.findReplace.step(1)), this.panelButton(o, "data-ui-code-close")?.addEventListener("click", () => this.findReplace.close()), this.panelButton(o, "data-ui-code-replace-one")?.addEventListener("click", () => this.findReplace.replaceOne()), this.panelButton(o, "data-ui-code-replace-all")?.addEventListener("click", () => this.findReplace.replaceEvery());
	}
	static create(t, n) {
		let r = t.querySelector("textarea.ui-code-input__text"), i = t.querySelector(".ui-code-input__scroller"), a = t.querySelector(".ui-code-input__content"), o = t.querySelector(".ui-code-input__highlight"), s = t.querySelector(".ui-code-input__search"), c = t.querySelector("[data-ui-code-find] input"), l = t.querySelector("[data-ui-code-replace] input"), u = t.querySelector(".ui-code-input__search-row--replace"), d = t.querySelector("[data-ui-code-count]");
		return r === null || i === null || a === null || o === null || s === null || c === null || l === null || u === null || d === null ? null : new e(t, n, {
			textarea: r,
			scroller: i,
			content: a,
			highlight: o,
			panel: s,
			findField: c,
			replaceField: l,
			replaceRow: u,
			expand: t.querySelector(`[data-ui-code-toggle-replace] ${Fr}`),
			count: d,
			position: t.querySelector("[data-ui-code-position]"),
			tabSize: R(t, "data-ui-code-tab-size"),
			encoding: R(t, "data-ui-code-encoding"),
			lineEnding: R(t, "data-ui-code-line-ending"),
			language: R(t, "data-ui-code-language")
		});
	}
	panelButton(e, t) {
		return e.querySelector(`[${t}] ${Fr}`);
	}
	get languageId() {
		return this.language;
	}
	get connected() {
		return this.root.isConnected;
	}
	dispose() {
		this.carets.dispose();
	}
	syncPickers() {
		this.statusBar.syncPickers();
	}
	selectionChanged() {
		this.carets.selectionChanged(), this.surface.writePosition(), this.completions.selectionChanged();
	}
	settingsChanged() {
		let e = Vn.normalize(this.root.getAttribute(L));
		this.statusBar.syncPickers(), e !== this.language && (this.language = e, this.reload());
	}
	reload() {
		this.completions.close(), this.surface.setLanguage(), this.findReplace.search(!0, !1);
	}
	refresh(e) {
		if (typeof e == "string" && /\n/.test(e)) {
			let t = e.includes("\r\n") ? Qn : "lf";
			this.root.setAttribute(Zn, t), this.statusBar.showDetectedEnding(t);
		}
		this.completions.close(), this.surface.textPushed() && this.carets.collapse();
	}
	get searchEnabled() {
		return this.root.hasAttribute(Pr);
	}
	rootKey(e) {
		if (e.defaultPrevented || e.isComposing) return;
		let t = e.ctrlKey || e.metaKey;
		t && !e.altKey && e.code === "KeyF" && this.searchEnabled ? (e.preventDefault(), this.findReplace.open(!1)) : t && !e.altKey && e.code === "KeyH" && this.searchEnabled ? (e.preventDefault(), this.findReplace.open(!0)) : t && !e.altKey && e.code === "KeyS" ? (e.preventDefault(), this.surface.save()) : e.key === "Escape" && this.findReplace.isOpen ? (e.preventDefault(), this.findReplace.close()) : e.code === "F3" && this.findReplace.isOpen && (e.preventDefault(), this.findReplace.step(e.shiftKey ? -1 : 1));
	}
};
function R(e, t) {
	let n = e.querySelector(`input[${t}]`), r = n?.parentElement?.querySelector(".ui-select") ?? null;
	return n === null || r === null ? null : {
		carrier: n,
		select: r
	};
}
//#endregion
//#region src/code-input-engine.ts
var z = ".ui-code-input", Rr = /* @__PURE__ */ new Set([
	"TabSize",
	"Encoding",
	"LineEnding",
	"Language"
]);
function zr(e) {
	if (!(e instanceof HTMLTextAreaElement)) return null;
	let t = e.value, n = e.closest(z);
	return n !== null && Br(n) === "crlf" ? t.replace(/\r?\n/g, "\r\n") : t;
}
function Br(e) {
	let t = e.querySelector("input[data-ui-code-line-ending]")?.value ?? "";
	return t.length > 0 ? t : e.getAttribute("data-ui-code-eol") ?? "lf";
}
var Vr = class {
	context;
	editors = /* @__PURE__ */ new WeakMap();
	live = /* @__PURE__ */ new Set();
	constructor(e) {
		this.context = e, this.attach(e.root.querySelectorAll(z)), e.observeComponents(e.root, z, {
			childList: !0,
			attributeFilter: [L]
		}, (e) => this.attach(e)), e.observeComponents(e.root, "*", { childList: !0 }, () => this.prune()), F.onRegistered((e) => {
			for (let t of this.live) t.connected && t.languageId === e && t.reload();
		}), e.propertyPatchEngine.addValueChangeHandler((e) => {
			if (!e.local) for (let t of e.components) {
				let n = this.editors.get(t);
				e.propertyName === "Value" ? n?.refresh(e.value) : Rr.has(e.propertyName) && n?.syncPickers();
			}
		}), document.addEventListener("selectionchange", () => {
			let e = document.activeElement, t = e instanceof HTMLTextAreaElement ? e.closest(z) : null;
			t !== null && this.editors.get(t)?.selectionChanged();
		});
	}
	prune() {
		for (let e of this.live) e.connected || (this.live.delete(e), e.dispose());
	}
	attach(e) {
		this.prune();
		for (let t of e) {
			let e = this.editors.get(t);
			if (e === void 0) {
				let e = Lr.create(t, this.context);
				e !== null && (this.editors.set(t, e), this.live.add(e));
			} else e.settingsChanged();
		}
	}
};
//#endregion
//#region src/framework-api.ts
function Hr() {
	let e = window.NEStandardUI;
	if (e === void 0 || typeof e.registerEngine != "function") throw Error("NE.Standard.UI.Web.CodeInput needs the framework's client (ui.js) on the page before it.");
	return e;
}
//#endregion
//#region src/markdown-inlines.ts
var B = class {
	type;
	literal;
	href = "";
	title = "";
	parent = null;
	firstChild = null;
	lastChild = null;
	previous = null;
	next = null;
	constructor(e, t = "") {
		this.type = e, this.literal = t;
	}
	appendChild(e) {
		e.unlink(), e.parent = this, this.lastChild === null ? this.firstChild = e : (this.lastChild.next = e, e.previous = this.lastChild), this.lastChild = e;
	}
	insertAfter(e) {
		e.unlink(), e.parent = this.parent, e.previous = this, e.next = this.next, this.next === null ? this.parent !== null && (this.parent.lastChild = e) : this.next.previous = e, this.next = e;
	}
	unlink() {
		this.previous === null ? this.parent !== null && (this.parent.firstChild = this.next) : this.previous.next = this.next, this.next === null ? this.parent !== null && (this.parent.lastChild = this.previous) : this.next.previous = this.previous, this.parent = null, this.previous = null, this.next = null;
	}
};
function Ur(e) {
	return e.trim().replace(/\s+/g, " ").toLowerCase().toUpperCase();
}
var Wr = /[\n\\`*_~[\]!<&]/g, Gr = /^[!-/:-@[-`{-~]$/, Kr = /^\s$/u, qr = /^[\p{P}\p{S}]$/u, Jr = /&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[A-Za-z][A-Za-z\d]{1,31});/y, Yr = /<([A-Za-z][A-Za-z\d+.-]{1,31}:[^<>\u0000-\u0020]*)>/y, Xr = /<([A-Za-z\d.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?)*)>/y, Zr = /`+/g, V = /(?:https?:\/\/|www\.)[^\s<]+/g;
function Qr(e, t) {
	let n = new B("root");
	return new $r(e, t).parse(n), ti(n), n;
}
var $r = class {
	text;
	references;
	position = 0;
	delimiters = null;
	brackets = null;
	constructor(e, t) {
		this.text = e, this.references = t;
	}
	parse(e) {
		for (; this.position < this.text.length;) this.parseInline(e);
		this.processEmphasis(null);
	}
	parseInline(e) {
		switch (this.text.charAt(this.position)) {
			case "\n":
				this.lineBreak(e);
				break;
			case "\\":
				this.backslash(e);
				break;
			case "`":
				this.codeSpan(e);
				break;
			case "*":
			case "_":
			case "~":
				this.delimiterRun(e);
				break;
			case "[":
				this.position++, this.openBracket(e, "[", !1);
				break;
			case "!":
				this.bang(e);
				break;
			case "]":
				this.closeBracket(e);
				break;
			case "<":
				this.autolink(e);
				break;
			case "&":
				this.entity(e);
				break;
			default: this.plainText(e);
		}
	}
	lineBreak(e) {
		this.position++;
		let t = e.lastChild, n = !1;
		t !== null && t.type === "text" && t.literal.endsWith(" ") && (n = t.literal.endsWith("  "), t.literal = t.literal.replace(/ +$/, "")), e.appendChild(new B(n ? "hardbreak" : "softbreak")), this.skipSpaces();
	}
	backslash(e) {
		this.position++;
		let t = this.text.charAt(this.position);
		t === "\n" ? (this.position++, e.appendChild(new B("hardbreak")), this.skipSpaces()) : Gr.test(t) ? (this.position++, e.appendChild(new B("text", t))) : e.appendChild(new B("text", "\\"));
	}
	codeSpan(e) {
		let t = this.position;
		for (; this.text.charAt(this.position) === "`";) this.position++;
		let n = this.position - t;
		Zr.lastIndex = this.position;
		for (let t = Zr.exec(this.text); t !== null; t = Zr.exec(this.text)) {
			if (t[0].length !== n) continue;
			let r = this.text.slice(this.position, t.index).replace(/\n/g, " ");
			r.length > 2 && r.startsWith(" ") && r.endsWith(" ") && /[^ ]/.test(r) && (r = r.slice(1, -1)), e.appendChild(new B("code", r)), this.position = t.index + n;
			return;
		}
		e.appendChild(new B("text", this.text.slice(t, this.position)));
	}
	delimiterRun(e) {
		let t = this.position, n = this.text.charAt(t);
		for (; this.text.charAt(this.position) === n;) this.position++;
		let r = this.position - t, i = new B("text", this.text.slice(t, this.position));
		if (e.appendChild(i), n === "~" && r > 2) return;
		let a = t === 0 ? "\n" : this.text.charAt(t - 1), o = this.position >= this.text.length ? "\n" : this.text.charAt(this.position), s = Kr.test(a), c = Kr.test(o), l = qr.test(a), u = qr.test(o), d = !c && (!u || s || l), f = !s && (!l || c || u), p = {
			node: i,
			character: n,
			count: r,
			original: r,
			canOpen: n === "_" ? d && (!f || l) : d,
			canClose: n === "_" ? f && (!d || u) : f,
			previous: this.delimiters,
			next: null
		};
		this.delimiters !== null && (this.delimiters.next = p), this.delimiters = p;
	}
	bang(e) {
		this.text.charAt(this.position + 1) === "[" ? (this.position += 2, this.openBracket(e, "![", !0)) : (this.position++, e.appendChild(new B("text", "!")));
	}
	openBracket(e, t, n) {
		let r = new B("text", t);
		e.appendChild(r), this.brackets !== null && (this.brackets.bracketAfter = !0), this.brackets = {
			node: r,
			image: n,
			index: this.position,
			previousBracket: this.brackets,
			previousDelimiter: this.delimiters,
			active: !0,
			bracketAfter: !1
		};
	}
	closeBracket(e) {
		this.position++;
		let t = this.position, n = this.brackets;
		if (n === null) {
			e.appendChild(new B("text", "]"));
			return;
		}
		if (!n.active) {
			e.appendChild(new B("text", "]")), this.brackets = n.previousBracket;
			return;
		}
		let r = this.inlineTarget() ?? this.referenceTarget(n, t);
		if (r === null) {
			this.brackets = n.previousBracket, this.position = t, e.appendChild(new B("text", "]"));
			return;
		}
		let i = new B(n.image ? "image" : "link");
		i.href = r.href, i.title = r.title;
		for (let e = n.node.next; e !== null;) {
			let t = e.next;
			i.appendChild(e), e = t;
		}
		if (e.appendChild(i), this.processEmphasis(n.previousDelimiter), this.brackets = n.previousBracket, n.node.unlink(), !n.image) for (let e = this.brackets; e !== null; e = e.previousBracket) e.image || (e.active = !1);
	}
	inlineTarget() {
		if (this.text.charAt(this.position) !== "(") return null;
		let e = this.position;
		this.position++, this.skipWhitespace();
		let t = this.destination();
		if (t !== null) {
			let e = this.position;
			this.skipWhitespace();
			let n = this.position > e ? this.linkTitle() : null;
			if (n === null && (this.position = e), this.skipWhitespace(), this.text.charAt(this.position) === ")") return this.position++, {
				href: t,
				title: n ?? ""
			};
		}
		return this.position = e, null;
	}
	destination() {
		if (this.text.charAt(this.position) === "<") {
			for (let e = this.position + 1; e < this.text.length; e++) {
				let t = this.text.charAt(e);
				if (t === "\\") {
					e++;
					continue;
				}
				if (t === "\n" || t === "<") return null;
				if (t === ">") {
					let t = ei(this.text.slice(this.position + 1, e));
					return this.position = e + 1, t;
				}
			}
			return null;
		}
		let e = this.position, t = 0;
		for (; this.position < this.text.length;) {
			let e = this.text.charAt(this.position);
			if (e === "\\" && Gr.test(this.text.charAt(this.position + 1))) {
				this.position += 2;
				continue;
			}
			if (e === "(") t++;
			else if (e === ")") {
				if (t === 0) break;
				t--;
			} else if (/[\s\u0000-\u001f]/.test(e)) break;
			this.position++;
		}
		return t === 0 ? ei(this.text.slice(e, this.position)) : (this.position = e, null);
	}
	linkTitle() {
		let e = this.text.charAt(this.position), t = e === "(" ? ")" : e;
		if (e !== "\"" && e !== "'" && e !== "(") return null;
		for (let e = this.position + 1; e < this.text.length; e++) {
			let n = this.text.charAt(e);
			if (n === "\\") {
				e++;
				continue;
			}
			if (n === t) {
				let t = ei(this.text.slice(this.position + 1, e));
				return this.position = e + 1, t;
			}
		}
		return null;
	}
	referenceTarget(e, t) {
		let n = null;
		if (this.text.charAt(this.position) === "[") {
			let e = this.text.indexOf("]", this.position + 1);
			e > this.position + 1 && !this.text.slice(this.position + 1, e).includes("[") ? (n = this.text.slice(this.position + 1, e), this.position = e + 1) : e === this.position + 1 && (this.position = e + 1);
		}
		n === null && !e.bracketAfter && (n = this.text.slice(e.index, t - 1));
		let r = n === null || n.length > 999 ? void 0 : this.references.get(Ur(n));
		return r === void 0 ? (this.position = t, null) : r;
	}
	autolink(e) {
		for (let [t, n] of [[Yr, ""], [Xr, "mailto:"]]) {
			t.lastIndex = this.position;
			let r = t.exec(this.text);
			if (r === null) continue;
			let i = new B("link");
			i.href = n + r[1], i.appendChild(new B("text", r[1])), e.appendChild(i), this.position += r[0].length;
			return;
		}
		this.position++, e.appendChild(new B("text", "<"));
	}
	entity(e) {
		Jr.lastIndex = this.position;
		let t = Jr.exec(this.text);
		if (t === null) {
			this.position++, e.appendChild(new B("text", "&"));
			return;
		}
		this.position += t[0].length, e.appendChild(new B("entity", t[0]));
	}
	plainText(e) {
		Wr.lastIndex = this.position + 1;
		let t = Wr.exec(this.text), n = t === null ? this.text.length : t.index;
		e.appendChild(new B("text", this.text.slice(this.position, n))), this.position = n;
	}
	skipSpaces() {
		for (; this.text.charAt(this.position) === " ";) this.position++;
	}
	skipWhitespace() {
		for (; /\s/.test(this.text.charAt(this.position)) && this.position < this.text.length;) this.position++;
	}
	processEmphasis(e) {
		let t = /* @__PURE__ */ new Map(), n = this.delimiters;
		for (; n !== null && n.previous !== e;) n = n.previous;
		for (; n !== null;) {
			if (!n.canClose) {
				n = n.next;
				continue;
			}
			let r = n.character, i = `${r}${+!!n.canOpen}${n.original % 3}`, a = t.has(i) ? t.get(i) ?? null : e, o = n.previous, s = !1;
			for (; o !== null && o !== e && o !== a;) {
				let e = r !== "~" && (n.canOpen || o.canClose) && n.original % 3 != 0 && (o.original + n.original) % 3 == 0;
				if (o.character === r && o.canOpen && !e && (r !== "~" || o.count === n.count)) {
					s = !0;
					break;
				}
				o = o.previous;
			}
			let c = n;
			if (s && o !== null) {
				let e = r === "~" ? n.count : n.count >= 2 && o.count >= 2 ? 2 : 1, t = new B(r === "~" ? "strikethrough" : e === 1 ? "emphasis" : "strong");
				o.count -= e, n.count -= e, o.node.literal = o.node.literal.slice(e), n.node.literal = n.node.literal.slice(e);
				for (let e = o.node.next; e !== null && e !== n.node;) {
					let n = e.next;
					t.appendChild(e), e = n;
				}
				if (o.node.insertAfter(t), o.next = n, n.previous = o, o.count === 0 && (o.node.unlink(), this.removeDelimiter(o)), n.count === 0) {
					let e = n.next;
					n.node.unlink(), this.removeDelimiter(n), n = e;
				}
			} else n = n.next, t.set(i, c.previous), c.canOpen || this.removeDelimiter(c);
		}
		for (; this.delimiters !== null && this.delimiters !== e;) this.removeDelimiter(this.delimiters);
	}
	removeDelimiter(e) {
		e.previous !== null && (e.previous.next = e.next), e.next === null ? this.delimiters = e.previous : e.next.previous = e.previous;
	}
};
function ei(e) {
	return e.replace(/\\([!-/:-@[-`{-~])/g, "$1");
}
function ti(e) {
	ni(e);
	for (let t = e.firstChild; t !== null;) {
		let e = t.next;
		t.type === "text" ? ri(t) : t.type !== "link" && t.type !== "image" && t.firstChild !== null && ti(t), t = e;
	}
}
function ni(e) {
	for (let t = e.firstChild; t !== null; t = t.next) for (; t.type === "text" && t.next !== null && t.next.type === "text";) t.literal += t.next.literal, t.next.unlink();
}
function ri(e) {
	let t = e.literal, n = [], r = 0;
	V.lastIndex = 0;
	for (let e = V.exec(t); e !== null; e = V.exec(t)) {
		if (e.index > 0 && !/[\s(*_~]/.test(t.charAt(e.index - 1))) continue;
		let i = ii(e[0]);
		if (!/^(?:https?:\/\/|www\.)[^./]/.test(i)) continue;
		e.index > r && n.push(new B("text", t.slice(r, e.index)));
		let a = new B("link");
		a.href = i.startsWith("www.") ? `http://${i}` : i, a.appendChild(new B("text", i)), n.push(a), r = e.index + i.length, V.lastIndex = r;
	}
	if (n.length === 0) return;
	r < t.length && n.push(new B("text", t.slice(r)));
	let i = e;
	for (let e of n) i.insertAfter(e), i = e;
	e.unlink();
}
function ii(e) {
	let t = e.length;
	for (;;) {
		let n = e.charAt(t - 1);
		if (/[?!.,:*_~'"]/.test(n)) {
			t--;
			continue;
		}
		if (n === ")") {
			let n = e.slice(0, t).split("(").length - 1;
			if (e.slice(0, t).split(")").length - 1 > n) {
				t--;
				continue;
			}
		}
		return e.slice(0, t);
	}
}
//#endregion
//#region src/markdown-blocks.ts
var ai = /^( {0,3})(`{3,}|~{3,})(.*)$/, oi = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/, H = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/, si = /^ {0,3}> ?/, U = /^( {0,3})(?:([-*+])|(\d{1,9})([.)]))([ \t]+|$)/, ci = /^ {0,3}(=+|-+)[ \t]*$/, li = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/, ui = /^\[([ xX])\](?:[ \t]+|$)/, di = /^ {0,3}\[((?:[^\]\\]|\\.){1,999})\]:[ \t]*(<[^>\n]*>|\S+)(?:[ \t]+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^()\\]|\\.)*\)))?[ \t]*$/;
function fi(e) {
	let t = /* @__PURE__ */ new Map();
	return {
		blocks: W(e.replace(/\r\n?/g, "\n").split("\n").map(pi), 1, t, null),
		references: t
	};
}
function pi(e) {
	if (!e.includes("	")) return e;
	let t = "", n = 0;
	for (; n < e.length && (e.charAt(n) === " " || e.charAt(n) === "	"); n++) t += e.charAt(n) === " " ? " " : " ".repeat(4 - t.length % 4);
	return t + e.slice(n);
}
function W(e, t, n, r) {
	let i = [], a = !1, o = 0;
	for (; o < e.length;) {
		let s = e[o];
		if (q(s)) {
			a = i.length > 0, o++;
			continue;
		}
		a && r !== null && (r.separated = !0), a = !1, o = mi(e, o, t, n, i);
	}
	return i;
}
function mi(e, t, n, r, i) {
	let a = e[t], o = n + t;
	if (J(a) >= 4) return hi(e, t, o, i);
	let s = ai.exec(a);
	if (s !== null && !(s[2].startsWith("`") && s[3].includes("`"))) return gi(e, t, o, s, i);
	let c = oi.exec(a);
	if (c !== null) return i.push({
		line: o,
		type: "heading",
		level: c[1].length,
		text: (c[2] ?? "").trim()
	}), t + 1;
	if (H.test(a)) return i.push({
		line: o,
		type: "rule"
	}), t + 1;
	if (si.test(a)) return _i(e, t, o, r, i);
	let l = U.exec(a);
	return l === null ? bi(e, t) ? xi(e, t, o, i) : Ci(e, t, o, r, i) : vi(e, t, o, l, r, i);
}
function hi(e, t, n, r) {
	let i = t;
	for (; i < e.length && (q(e[i]) || J(e[i]) >= 4);) i++;
	let a = i;
	for (; a > t && q(e[a - 1]);) a--;
	return r.push({
		line: n,
		type: "code",
		info: "",
		text: e.slice(t, a).map((e) => e.slice(Math.min(4, J(e)))).join("\n")
	}), a;
}
function gi(e, t, n, r, i) {
	let a = r[1].length, o = r[2], s = [], c = t + 1;
	for (; c < e.length; c++) {
		let t = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(e[c]);
		if (t !== null && t[1][0] === o[0] && t[1].length >= o.length) {
			c++;
			break;
		}
		s.push(e[c].slice(Math.min(a, J(e[c]))));
	}
	return i.push({
		line: n,
		type: "code",
		info: Oi(r[3].trim()),
		text: s.join("\n")
	}), c;
}
function _i(e, t, n, r, i) {
	let a = [], o = t;
	for (; o < e.length; o++) {
		let t = e[o], n = si.exec(t);
		if (n !== null) {
			a.push(t.slice(n[0].length));
			continue;
		}
		if (q(t) || a.length === 0 || q(a[a.length - 1]) || K(t) || Di(a)) break;
		a.push(t);
	}
	return i.push({
		line: n,
		type: "quote",
		children: W(a, n, r, null)
	}), o;
}
function vi(e, t, n, r, i, a) {
	let o = r[3] !== void 0, s = o ? r[4] : r[2], c = [], l = !0, u = t;
	for (; u < e.length;) {
		let r = U.exec(e[u]);
		if (r === null || H.test(e[u]) || r[3] !== void 0 !== o || (o ? r[4] : r[2]) !== s) break;
		let a = r[1].length + (o ? r[3].length + 1 : 1), d = r[5].length, f = a + (d === 0 || d > 4 ? 1 : d), p = n + (u - t), m = [e[u].slice(Math.min(f, e[u].length))];
		for (u++; u < e.length;) {
			let t = e[u];
			if (q(t)) {
				m.push(""), u++;
				continue;
			}
			if (J(t) >= f) {
				m.push(t.slice(f)), u++;
				continue;
			}
			if (!q(m[m.length - 1]) && !K(t) && !U.test(t) && !Di(m)) {
				m.push(t.trimStart()), u++;
				continue;
			}
			break;
		}
		let h = 0;
		for (; m.length > 1 && q(m[m.length - 1]);) m.pop(), h++;
		c.push(yi(m, p, i, (e) => {
			e.separated && (l = !1);
		}));
		let g = U.exec(e[u] ?? ""), _ = g !== null && !H.test(e[u]) && g[3] !== void 0 === o && (o ? g[4] : g[2]) === s;
		if (h > 0) {
			if (_) l = !1;
			else {
				u -= h;
				break;
			}
		}
	}
	return a.push({
		line: n,
		type: "list",
		ordered: o,
		start: o ? Number.parseInt(r[3], 10) : 1,
		tight: l,
		items: c
	}), u;
}
function yi(e, t, n, r) {
	let i = ui.exec(e[0]), a = null;
	i !== null && e[0].length > i[0].length && (a = i[1] !== " ", e[0] = e[0].slice(i[0].length));
	let o = { separated: !1 }, s = W(e, t, n, o);
	return r(o), {
		line: t,
		checked: a,
		children: s
	};
}
function bi(e, t) {
	let n = e[t + 1];
	return e[t].includes("|") && n !== void 0 && n.includes("-") && li.test(n) && G(e[t]).length === G(n).length;
}
function xi(e, t, n, r) {
	let i = G(e[t]), a = G(e[t + 1]).map(Si), o = [], s = t + 2;
	for (; s < e.length && !q(e[s]) && !K(e[s]); s++) {
		let t = G(e[s]);
		o.push(i.map((e, n) => t[n] ?? ""));
	}
	return r.push({
		line: n,
		type: "table",
		alignments: a,
		head: i,
		rows: o
	}), s;
}
function Si(e) {
	let t = e.startsWith(":"), n = e.endsWith(":");
	return t && n ? "center" : n ? "right" : t ? "left" : null;
}
function G(e) {
	let t = e.trim();
	t.startsWith("|") && (t = t.slice(1)), t.endsWith("|") && !t.endsWith("\\|") && (t = t.slice(0, -1));
	let n = [], r = "";
	for (let e = 0; e < t.length; e++) {
		let i = t.charAt(e);
		i === "\\" && t.charAt(e + 1) === "|" ? (r += "|", e++) : i === "|" ? (n.push(r.trim()), r = "") : r += i;
	}
	return n.push(r.trim()), n;
}
function Ci(e, t, n, r, i) {
	let a = [e[t].trimStart()], o = t + 1;
	for (; o < e.length; o++) {
		let t = e[o], r = ci.exec(t);
		if (r !== null && !Ti(a)) return i.push({
			line: n,
			type: "heading",
			level: r[1].startsWith("=") ? 1 : 2,
			text: a.join("\n").trim()
		}), o + 1;
		if (q(t) || K(t) || Ei(t) || bi(e, o)) break;
		a.push(t.trimStart());
	}
	let s = wi(a, r);
	return s.length > 0 && i.push({
		line: n,
		type: "paragraph",
		text: s
	}), o;
}
function wi(e, t) {
	let n = 0;
	for (; n < e.length; n++) {
		let r = di.exec(e[n].trimEnd());
		if (r === null) break;
		let i = Ur(r[1]), a = r[2].startsWith("<") ? r[2].slice(1, -1) : r[2];
		i.length > 0 && !t.has(i) && t.set(i, {
			href: Oi(a),
			title: r[3] === void 0 ? "" : Oi(r[3].slice(1, -1))
		});
	}
	return e.slice(n).join("\n").trimEnd();
}
function Ti(e) {
	return e.every((e) => di.test(e.trimEnd()));
}
function K(e) {
	return oi.test(e) || H.test(e) || si.test(e) || ai.test(e) && J(e) < 4;
}
function Ei(e) {
	let t = U.exec(e);
	return t !== null && t[5].length > 0 && !q(e.slice(t[0].length)) && (t[3] === void 0 || t[3] === "1");
}
function Di(e) {
	let t = null;
	for (let n of e) if (t === null) {
		let e = ai.exec(n);
		e !== null && (t = e[2]);
	} else {
		let e = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(n);
		e !== null && e[1][0] === t[0] && e[1].length >= t.length && (t = null);
	}
	return t !== null;
}
function q(e) {
	return e.trim().length === 0;
}
function J(e) {
	let t = 0;
	for (; e.charAt(t) === " ";) t++;
	return t;
}
function Oi(e) {
	return e.replace(/\\([!-/:-@[-`{-~])/g, "$1");
}
//#endregion
//#region src/markdown-render.ts
var Y = "ui-markdown", ki = "data-ui-source-line";
function Ai(e, t) {
	let n = fi(e);
	return ji(n.blocks, n.references, t, !1);
}
function ji(e, t, n, r) {
	let i = "";
	for (let a of e) i += Mi(a, t, n, r);
	return i;
}
function Mi(e, t, n, r) {
	let i = X(e.line);
	switch (e.type) {
		case "paragraph": {
			let n = Z(Qr(e.text, t));
			return r ? n : `<p${i}>${n}</p>`;
		}
		case "heading": return `<h${e.level}${i}>${Z(Qr(e.text, t))}</h${e.level}>`;
		case "code": {
			let t = e.info.split(/\s+/, 1)[0], r = t.length > 0 ? n(e.text, t) : null;
			return `<pre class="${Y}__code"${t.length > 0 ? ` data-language="${Q(t)}"` : ""}${i}><code>${r ?? Q(e.text)}</code></pre>`;
		}
		case "quote": return `<blockquote${i}>${ji(e.children, t, n, !1)}</blockquote>`;
		case "list": return Ni(e.ordered, e.start, e.tight, e.items, t, n);
		case "table": return Pi(e.line, e.alignments, e.head, e.rows, t);
		case "rule": return `<hr${i}>`;
	}
}
function X(e) {
	return ` ${ki}="${e}"`;
}
function Ni(e, t, n, r, i, a) {
	let o = e ? "ol" : "ul", s = `<${o}${e && t !== 1 ? ` start="${t}"` : ""}${r.some((e) => e.checked !== null) ? ` class="${Y}__tasks"` : ""}>`;
	for (let e of r) {
		let t = ji(e.children, i, a, n);
		if (e.checked === null) {
			s += `<li${X(e.line)}>${t}</li>`;
			continue;
		}
		let r = e.checked ? " checked" : "";
		s += `<li class="${Y}__task"${X(e.line)}><span class="ui-checkbox ui-input--small ${Y}__check"><input class="ui-checkbox__input" type="checkbox" tabindex="-1" aria-readonly="true"${r}><span class="ui-checkbox__box"></span></span>${t}</li>`;
	}
	return `${s}</${o}>`;
}
function Pi(e, t, n, r, i) {
	let a = (e, n, r) => {
		let a = t[r];
		return `<${e}${a == null ? "" : ` class="${Y}__cell--${a}"`}>${Z(Qr(n, i))}</${e}>`;
	}, o = `<div class="${Y}__table"${X(e)}><table><thead><tr>`;
	if (n.forEach((e, t) => o += a("th", e, t)), o += "</tr></thead>", r.length > 0) {
		o += "<tbody>";
		for (let e of r) o += "<tr>", e.forEach((e, t) => o += a("td", e, t)), o += "</tr>";
		o += "</tbody>";
	}
	return `${o}</table></div>`;
}
function Z(e) {
	let t = "";
	for (let n = e.firstChild; n !== null; n = n.next) switch (n.type) {
		case "text":
			t += Q(n.literal);
			break;
		case "entity":
			t += n.literal;
			break;
		case "code":
			t += `<code>${Q(n.literal)}</code>`;
			break;
		case "emphasis":
			t += `<em>${Z(n)}</em>`;
			break;
		case "strong":
			t += `<strong>${Z(n)}</strong>`;
			break;
		case "strikethrough":
			t += `<del>${Z(n)}</del>`;
			break;
		case "link":
			t += Fi(n);
			break;
		case "image":
			t += Ii(n);
			break;
		case "hardbreak":
			t += "<br>";
			break;
		case "softbreak":
			t += "\n";
			break;
		default: t += Z(n);
	}
	return t;
}
function Fi(e) {
	let t = Z(e), n = zi(e.href, !1);
	if (n === null) return t;
	let r = e.title.length > 0 ? ` title="${Q(e.title)}"` : "", i = /^(?:https?:)?\/\//i.test(n) ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "";
	return `<a href="${Q(n)}"${r}${i}>${t}</a>`;
}
function Ii(e) {
	let t = Q(Li(e)), n = zi(e.href, !0);
	if (n === null) return t;
	let r = e.title.length > 0 ? ` title="${Q(e.title)}"` : "";
	return `<img src="${Q(n)}" alt="${t}"${r} loading="lazy">`;
}
function Li(e) {
	let t = "";
	for (let n = e.firstChild; n !== null; n = n.next) n.type === "text" || n.type === "code" || n.type === "entity" ? t += n.literal : n.type === "softbreak" || n.type === "hardbreak" ? t += " " : t += Li(n);
	return t;
}
var Ri = /* @__PURE__ */ new Set([
	"http",
	"https",
	"mailto",
	"tel"
]);
function zi(e, t) {
	let n = e.replace(/[\s\x00-\x1f\x7f]/g, ""), r = /^([A-Za-z][A-Za-z\d+.-]*):/.exec(n);
	if (r === null) return e.trim();
	let i = r[1].toLowerCase();
	return Ri.has(i) ? e.trim() : t && i === "data" && /^data:image\/(?:png|gif|jpe?g|webp|avif|bmp);/i.test(n) ? n : null;
}
function Q(e) {
	return e.replace(/[&<>"']/g, (e) => Bi[e]);
}
var Bi = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
}, Vi = ".ui-markdown", Hi = ".ui-markdown__body", Ui = "data-ui-markdown-source", Wi = class {
	rendered = /* @__PURE__ */ new WeakMap();
	live = /* @__PURE__ */ new Set();
	constructor(e) {
		this.renderAll(e.root.querySelectorAll(Vi), !1), e.observeComponents(e.root, Vi, {
			childList: !0,
			attributeFilter: [Ui]
		}, (e) => this.renderAll(e, !1)), F.onRegistered(() => this.renderAll([...this.live], !0));
	}
	renderAll(e, t) {
		for (let e of this.live) e.isConnected || this.live.delete(e);
		for (let n of e) {
			let e = n.getAttribute(Ui) ?? "", r = n.querySelector(Hi);
			r === null || !t && this.rendered.get(n) === e || (this.rendered.set(n, e), this.live.add(n), r.innerHTML = Ai(e, Gi));
		}
	}
};
function Gi(e, t) {
	let n = F.get(an(t));
	if (n === null) return null;
	let r = n.initialState;
	return e.split("\n").map((e) => {
		let t = [];
		return r = n.tokenizeLine(e, r, (e, n, r) => t.push({
			from: e,
			to: n,
			kind: r
		})), Dr(e, t, []);
	}).join("\n");
}
//#endregion
//#region src/package-api.ts
function Ki(e, t) {
	let n = window.NEStandardUICodeInput?.__pendingLanguages ?? [], r = window.NEStandardUICodeInput?.__pendingCompletions ?? [], i = {
		registerLanguage: (t, n) => e.register(t, n),
		createTokenizer: S,
		registerCompletions: (e, n) => t.register(e, n),
		__pendingLanguages: [],
		__pendingCompletions: []
	};
	window.NEStandardUICodeInput = i;
	for (let t of n) e.register(t.id, t.tokenizer);
	for (let e of r) t.register(e.languageId, e.source);
	return i;
}
//#endregion
//#region src/code-input.ts
Ki(F, we);
var $ = Hr();
$.registerEvent("save", {
	settlesValue: !0,
	submitsForm: !0
}), $.registerValueReader({
	kind: "code",
	read: (e) => zr(e)
}), $.registerEngine((e) => {
	new Vr(e), new Wi(e);
});
//#endregion
