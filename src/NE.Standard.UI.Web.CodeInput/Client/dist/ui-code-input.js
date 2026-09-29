//#region src/code-editor-dom.ts
var e = "ui-code-input", t = "data-ui-code-language", n = "data-ui-code-search", r = "--ui-code-tab-size", i = "ui-markdown", a = "ui-markdown__body", o = {
	checkboxClass: "ui-checkbox",
	checkboxInputClass: "ui-checkbox__input",
	checkboxBoxClass: "ui-checkbox__box",
	smallInputClass: "ui-input--small"
}, s = "ui-code-input__line", c = "ui-code-input__code", l = "--ui-code-gutter-digits", u = "ui-code-input__carets", d = "ui-code-input__caret", f = "ui-code-input__selection", p = "ui-code-input--virtual", m = "ui-code-match", h = "ui-code-match--current", g = "ui-code-input__completions", _ = "ui-code-input__completion", ee = "ui-code-input__completion--active", v = "ui-code-input__completions-anchor", te = "crlf";
//#endregion
//#region src/motion.ts
function ne(e) {
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
function re(e, t) {
	return t <= 0 ? 0 : t >= 2 && ae(e.charCodeAt(t - 1)) && ie(e.charCodeAt(t - 2)) ? t - 2 : t - 1;
}
function y(e, t) {
	return t >= e.length ? e.length : t + 1 < e.length && ie(e.charCodeAt(t)) && ae(e.charCodeAt(t + 1)) ? t + 2 : t + 1;
}
function ie(e) {
	return e >= 55296 && e <= 56319;
}
function ae(e) {
	return e >= 56320 && e <= 57343;
}
var oe = 0, se = 1, ce = 2, le = 3, ue = /[\p{L}\p{N}_]/u;
function b(e) {
	return e === "\n" ? le : e === " " || e === "	" ? oe : ue.test(e) ? se : ce;
}
function de(e, t) {
	if (t >= e.length) return e.length;
	if (e[t] === "\n") return t + 1;
	let n = t, r = b(e[n]);
	if (r !== oe) for (; n < e.length && b(e[n]) === r;) n++;
	for (; n < e.length && b(e[n]) === oe;) n++;
	return n;
}
function fe(e, t) {
	if (t <= 0) return 0;
	if (e[t - 1] === "\n") return t - 1;
	let n = t;
	for (; n > 0 && b(e[n - 1]) === oe;) n--;
	if (n === 0 || e[n - 1] === "\n") return n;
	let r = b(e[n - 1]);
	for (; n > 0 && b(e[n - 1]) === r;) n--;
	return n;
}
function pe(e, t) {
	let n = t, r = t;
	for (; n > 0 && b(e[n - 1]) === se;) n--;
	for (; r < e.length && b(e[r]) === se;) r++;
	return n === r ? null : {
		from: n,
		to: r
	};
}
function me(e, t, n) {
	let r = t.lineAt(n), i = t.start(r), a = t.end(r), o = i;
	for (; o < a && (e[o] === " " || e[o] === "	");) o++;
	return n === o ? i : o;
}
function x(e, t, n, r) {
	let i = 0;
	for (let a = t.start(t.lineAt(n)); a < n; a = y(e, a)) i += e[a] === "	" ? r - i % r : 1;
	return i;
}
function he(e, t, n, r, i) {
	let a = t.end(n), o = 0, s = t.start(n);
	for (; s < a;) {
		let t = y(e, s), n = e[s] === "	" ? i - o % i : 1;
		if (o + n > r) return r - o >= n / 2 ? t : s;
		o += n, s = t;
	}
	return a;
}
function ge(e, t, n, r, i, a) {
	let o = t.lineAt(n), s = Math.min(Math.max(o + r, 0), t.count - 1);
	return s === o ? r < 0 ? 0 : e.length : he(e, t, s, i, a);
}
//#endregion
//#region src/selections.ts
function S(e) {
	return Math.min(e.anchor, e.head);
}
function C(e) {
	return Math.max(e.anchor, e.head);
}
function w(e) {
	return e.anchor === e.head;
}
function _e(e) {
	return {
		anchor: e,
		head: e
	};
}
function T(e, t = e) {
	return {
		ranges: [{
			anchor: e,
			head: t
		}],
		primary: 0
	};
}
function E(e, t) {
	let n = e.map((e, t) => ({
		range: e,
		index: t
	})).sort((e, t) => S(e.range) - S(t.range) || C(e.range) - C(t.range)), r = [], i = 0;
	for (let { range: e, index: a } of n) {
		let n = r.at(-1), o = a === t;
		if (n !== void 0 && ve(n, e)) {
			let t = S(n), i = Math.max(C(n), C(e)), a = o ? e.head < e.anchor : n.head < n.anchor;
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
function ve(e, t) {
	let n = C(e), r = S(t);
	return r < n || r === n && (w(e) || w(t));
}
function ye(e, t) {
	if (e.primary !== t.primary || e.ranges.length !== t.ranges.length) return !1;
	for (let n = 0; n < e.ranges.length; n++) if (e.ranges[n].anchor !== t.ranges[n].anchor || e.ranges[n].head !== t.ranges[n].head) return !1;
	return !0;
}
function be(e, t) {
	let n = "", r = 0;
	for (let i of t) n += e.slice(r, i.from) + i.text, r = i.to;
	return n + e.slice(r);
}
function xe(e, t) {
	let n = 0;
	for (let r of t) {
		if (e < r.from || e === r.from && r.from === r.to) break;
		if (e < r.to) return r.from + n;
		n += r.text.length - (r.to - r.from);
	}
	return e + n;
}
function D(e, t) {
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
		after: E(e.ranges.map((e, t) => r[t] ?? {
			anchor: xe(e.anchor, n),
			head: xe(e.head, n)
		}), e.primary)
	};
}
function Se(e, t) {
	let n = [];
	if (t.length === 0) return n;
	for (let r = e.indexOf(t); r >= 0; r = e.indexOf(t, r + t.length)) n.push(r);
	return n;
}
function Ce(e, t) {
	let n = t.ranges[t.primary], r = e.slice(S(n), C(n)), i = new Set(t.ranges.map(S)), a = Se(e, r).filter((e) => !i.has(e) && !we(t.ranges, e, e + r.length));
	return a.find((e) => e >= C(n)) ?? a[0] ?? -1;
}
function we(e, t, n) {
	return e.some((e) => S(e) < n && C(e) > t);
}
function Te(e, t, n) {
	if (n !== null && n.length === t && n.join("\n") === e) return n;
	let r = (e.endsWith("\n") ? e.slice(0, -1) : e).split("\n");
	return r.length === t ? r : null;
}
//#endregion
//#region src/code-editor-carets.ts
var Ee = class {
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
		this.root = e.root, this.textarea = e.textarea, this.scroller = e.scroller, this.content = e.content, this.surface = t, this.layer = document.createElement("div"), this.layer.className = u, this.layer.setAttribute("aria-hidden", "true"), this.layer.hidden = !0, this.probe = document.createElement("span"), this.probe.className = `${u}-probe`, this.probe.textContent = "0", this.content.insertBefore(this.layer, this.textarea), this.content.insertBefore(this.probe, this.textarea), this.resize = typeof ResizeObserver == "function" ? new ResizeObserver(() => this.queueRender()) : null, this.resize?.observe(this.content);
	}
	dispose() {
		this.resize?.disconnect();
	}
	get enabled() {
		return this.root.hasAttribute("data-ui-code-multi-caret") && !this.textarea.readOnly;
	}
	settingsChanged() {
		this.enabled || this.collapse();
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
	contentCaretRect(e) {
		let t = this.caretRect(this.surface.lines, e);
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
			(this.textarea.selectionStart !== S(e) || this.textarea.selectionEnd !== C(e)) && this.collapse();
		}
		if (this.ranges !== null) return {
			ranges: this.ranges,
			primary: this.primary
		};
		let { selectionStart: e, selectionEnd: t, selectionDirection: n } = this.textarea;
		return n === "backward" ? T(t, e) : T(e, t);
	}
	write(e, t) {
		let n = e.ranges[e.primary];
		this.ranges = e.ranges.length > 1 ? e.ranges : null, this.primary = e.ranges.length > 1 ? e.primary : 0, this.goals = null, this.box = null, this.pads = null, this.textarea.setSelectionRange(S(n), C(n), n.head < n.anchor ? "backward" : "forward"), this.render(), t && this.reveal(n.head);
	}
	render() {
		let e = this.adding ?? (this.ranges === null ? null : {
			ranges: this.ranges,
			primary: this.primary
		});
		if (e === null) {
			this.root.classList.remove(p), this.layer.hidden || (this.layer.replaceChildren(), this.layer.hidden = !0);
			return;
		}
		let t = this.content.getBoundingClientRect(), [n, r] = this.visibleLines(), i = this.surface.lines, a = document.createDocumentFragment(), o = this.adding === null ? this.pads : null, s = o !== null && o.some((e) => e.anchor > 0 || e.head > 0), c = s ? this.probe.getBoundingClientRect().width : 0;
		this.root.classList.toggle(p, s);
		let l = this.adding === null && !s ? e.primary : -1;
		for (let s = 0; s < e.ranges.length; s++) {
			let u = e.ranges[s];
			if (s === l || i.lineAt(C(u)) < n || i.lineAt(S(u)) > r) continue;
			let p = o?.[s] ?? null;
			if (!w(u) || p !== null && p.anchor !== p.head) for (let e of this.selectionRects(i, u, n, r, p)) a.append(this.mark(f, e, t));
			let m = this.caretRect(i, u.head);
			m !== null && (p !== null && p.head > 0 && (m.left += p.head * c, m.right = m.left), a.append(this.mark(d, m, t)));
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
		let a = [], o = S(t), s = C(t), c = e.lineAt(o), l = e.lineAt(s), u = this.probe.getBoundingClientRect().width;
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
			let n = this.caretRect(e, C(t));
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
		}, a = w(i) ? e.ranges.findIndex((e) => w(e) && e.head === i.head) : -1;
		if (a >= 0 && e.ranges.length > 1) {
			let t = e.ranges.filter((e, t) => t !== a);
			this.write({
				ranges: t,
				primary: t.length - 1
			}, !1);
			return;
		}
		this.write(E([...e.ranges, i], e.ranges.length), !1);
	}
	key(e) {
		if (e.defaultPrevented || e.isComposing) return;
		let t = e.ctrlKey || e.metaKey;
		if (this.enabled && e.shiftKey && e.altKey && !t && this.boxOrOccurrence(e.code)) {
			e.preventDefault();
			return;
		}
		if (this.ranges === null || e.altKey) return;
		let n = this.textarea.value, r = this.surface.lines, i = e.shiftKey, a = !0;
		switch (e.key) {
			case "Escape":
				t || i ? a = !1 : this.collapse();
				break;
			case "ArrowLeft":
				this.moveEach((e) => !i && !w(e) ? S(e) : t ? fe(n, e.head) : re(n, e.head), i);
				break;
			case "ArrowRight":
				this.moveEach((e) => !i && !w(e) ? C(e) : t ? de(n, e.head) : y(n, e.head), i);
				break;
			case "Home":
				this.moveEach((e) => t ? 0 : me(n, r, e.head), i);
				break;
			case "End":
				this.moveEach((e) => t ? n.length : r.end(r.lineAt(e.head)), i);
				break;
			case "ArrowUp":
			case "ArrowDown":
				a = !t, a && this.moveVertically(e.key === "ArrowUp" ? -1 : 1, i);
				break;
			case "PageUp":
			case "PageDown":
				this.moveVertically((e.key === "PageUp" ? -1 : 1) * this.rowsInView(), i);
				break;
			default: a = !1;
		}
		a && e.preventDefault();
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
		if (w(n)) {
			let r = pe(e, n.head);
			r !== null && this.write(E(t.ranges.map((e, n) => n === t.primary ? {
				anchor: r.from,
				head: r.to
			} : e), t.primary), !0);
			return;
		}
		let r = Ce(e, t);
		if (r < 0) return;
		let i = C(n) - S(n);
		this.write(E([...t.ranges, {
			anchor: r,
			head: r + i
		}], t.ranges.length), !0);
	}
	selectAllOccurrences() {
		let e = this.textarea.value, t = this.read(), n = t.ranges[t.primary], r = w(n) ? pe(e, n.head) : {
			from: S(n),
			to: C(n)
		};
		if (r === null) return;
		let i = r.to - r.from, a = Se(e, e.slice(r.from, r.to)), o = a.map((e) => ({
			anchor: e,
			head: e + i
		}));
		this.write({
			ranges: o,
			primary: Math.max(0, a.indexOf(r.from))
		}, !1);
	}
	extendBox(e, t) {
		let n = this.textarea.value, r = this.surface.lines, i = this.surface.tabSize, a = this.read(), o = a.ranges[a.primary], s = this.box;
		s !== null && (this.boxPrimary?.anchor !== o.anchor || this.boxPrimary.head !== o.head) && (s = null), s === null && (s = {
			anchorLine: r.lineAt(o.anchor),
			anchorColumn: x(n, r, o.anchor, i),
			headLine: r.lineAt(o.head),
			headColumn: x(n, r, o.head, i)
		});
		let c = Math.min(Math.max(s.headLine + e, 0), r.count - 1), l = s.headColumn;
		if (t !== 0) {
			let e = he(n, r, c, l, i), a = x(n, r, r.end(c), i);
			t < 0 ? l = l > a ? l - 1 : x(n, r, Math.max(re(n, e), r.start(c)), i) : e < r.end(c) ? l = x(n, r, y(n, e), i) : l < this.widestColumn(n, r, s.anchorLine, c, i) && l++;
		}
		let u = {
			...s,
			headLine: c,
			headColumn: l
		}, d = u.headLine >= u.anchorLine ? 1 : -1, f = [], p = [];
		for (let e = u.anchorLine; e !== u.headLine + d; e += d) {
			let t = he(n, r, e, u.anchorColumn, i), a = he(n, r, e, u.headColumn, i);
			f.push({
				anchor: t,
				head: a
			}), p.push({
				anchor: this.virtualSpace(n, r, e, t, u.anchorColumn, i),
				head: this.virtualSpace(n, r, e, a, u.headColumn, i)
			});
		}
		d < 0 && (f.reverse(), p.reverse());
		let m = {
			ranges: f,
			primary: d < 0 ? 0 : f.length - 1
		};
		this.write(m, !0), this.box = u, this.boxPrimary = m.ranges[m.primary], this.pads = f.length > 1 ? p : null, this.render();
	}
	virtualSpace(e, t, n, r, i, a) {
		return r === t.end(n) ? Math.max(0, i - x(e, t, r, a)) : 0;
	}
	widestColumn(e, t, n, r, i) {
		let a = 0;
		for (let o = Math.min(n, r); o <= Math.max(n, r); o++) a = Math.max(a, x(e, t, t.end(o), i));
		return a;
	}
	moveEach(e, t) {
		let n = this.read(), r = n.ranges.map((n) => t ? {
			anchor: n.anchor,
			head: e(n)
		} : _e(e(n)));
		this.write(E(r, n.primary), !0);
	}
	moveVertically(e, t) {
		let n = this.textarea.value, r = this.surface.lines, i = this.surface.tabSize, a = this.read(), o = this.goals ?? a.ranges.map((e) => x(n, r, e.head, i)), s = E(a.ranges.map((a, s) => {
			let c = ge(n, r, a.head, e, o[s], i);
			return t ? {
				anchor: a.anchor,
				head: c
			} : _e(c);
		}), a.primary);
		this.write(s, !0), this.goals = s.ranges.length === o.length ? o : null;
	}
	rowsInView() {
		let e = Number.parseFloat(getComputedStyle(this.scroller).lineHeight);
		return Math.max(1, Math.floor(this.scroller.clientHeight / (Number.isFinite(e) && e > 0 ? e : 20)) - 1);
	}
};
//#endregion
//#region src/completions.ts
function De(e, t) {
	let n = t;
	for (; n > 0 && ue.test(e.charAt(n - 1));) n--;
	return n;
}
function Oe(e, t) {
	return e.slice(De(e, t), t);
}
async function ke(e, t) {
	let n = [];
	for (let r of e) try {
		let e = typeof r == "function" ? await r(t) : r;
		n.push(...e);
	} catch {}
	return n;
}
function Ae(e, t, n = 50) {
	let r = t.toLowerCase(), i = [];
	for (let n = 0; n < e.length; n++) {
		let a = t.length === 0 ? 0 : je(e[n].label, t, r);
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
function je(e, t, n) {
	if (e.startsWith(t)) return 0;
	let r = e.toLowerCase();
	return r.startsWith(n) ? 1 : r.includes(n) ? 2 : -1;
}
var Me = /[\p{L}\p{N}_]+/gu;
function Ne(e) {
	let t = pe(e.text, e.offset), n = t === null ? e.text : e.text.slice(0, t.from) + e.text.slice(t.to), r = [];
	for (let e of Ie(n)) r.push({
		label: e,
		kind: "text"
	});
	return r;
}
var Pe = null, Fe = [];
function Ie(e) {
	if (e === Pe) return Fe;
	let t = /* @__PURE__ */ new Set();
	Me.lastIndex = 0;
	for (let n = Me.exec(e); n !== null; n = Me.exec(e)) n[0].length >= 2 && t.add(n[0]);
	return Pe = e, Fe = [...t], Fe;
}
var Le = /* @__PURE__ */ new Set([
	"keyword",
	"type",
	"function",
	"variable",
	"property",
	"text"
]);
function Re(e) {
	let t = ze(e) ? e : {}, n = Array.isArray(t.items) ? t.items : [], r = [];
	for (let e of n) {
		if (!ze(e) || typeof e.label != "string" || e.label.length === 0) continue;
		let t = typeof e.kind == "string" && Le.has(e.kind) ? e.kind : void 0, n = typeof e.insert == "string" && e.insert.length > 0 ? e.insert : e.label, i = typeof e.detail == "string" ? e.detail : void 0;
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
function ze(e) {
	return typeof e == "object" && !!e;
}
//#endregion
//#region src/tokenizer.ts
var Be = class {
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
function O(e) {
	return {
		initialState: e.initialState(),
		tokenizeLine(t, n, r) {
			let i = He(n);
			return Ve(new Be(t), i, e, r), i;
		}
	};
}
function Ve(e, t, n, r) {
	for (; !e.eol();) {
		e.start = e.pos;
		let i = n.token(e, t);
		e.pos === e.start && e.pos++, i !== null && r(e.start, e.pos, i);
	}
}
function He(e) {
	if (Array.isArray(e)) return e.map(He);
	if (typeof e == "object" && e) {
		let t = {};
		for (let [n, r] of Object.entries(e)) t[n] = He(r);
		return t;
	}
	return e;
}
function Ue(e, t) {
	if (e === t) return !0;
	if (Array.isArray(e) || Array.isArray(t)) {
		if (!Array.isArray(e) || !Array.isArray(t) || e.length !== t.length) return !1;
		for (let n = 0; n < e.length; n++) if (!Ue(e[n], t[n])) return !1;
		return !0;
	}
	if (e !== null && t !== null && typeof e == "object" && typeof t == "object") {
		let n = e, r = t, i = Object.keys(n);
		if (i.length !== Object.keys(r).length) return !1;
		for (let e of i) if (!Ue(n[e], r[e])) return !1;
		return !0;
	}
	return !1;
}
function k(e) {
	return new Set(e.split(/\s+/).filter((e) => e.length > 0));
}
function A(e, t, n = !0) {
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
var We = k("\n    if then else elif fi for while until do done case esac in function select time return exit local export declare readonly\n    unset shift source break continue eval exec set trap\n"), Ge = k("if then else elif while until do time exec ! [ [["), Ke = /[A-Za-z_][\w]*/y, qe = /--?[A-Za-z][\w-]*/y, Je = /\$(?:[A-Za-z_]\w*|\d|[@*#?$!-])/y, Ye = /[A-Za-z_]\w*(?=\+?=)/y, Xe = /<<-?\s*(?:'([^']+)'|"([^"]+)"|\\?([A-Za-z_]\w*))/y, Ze = /\d?>&\d?|\d?>>?|<|\|\||&&|\||;;|;|&/y, Qe = {
	initialState: () => ({
		mode: "code",
		frames: [],
		command: !0,
		heredoc: "",
		heredocPending: "",
		heredocIndented: !1,
		valueDepth: -1
	}),
	token(e, t) {
		switch (e.sol() && (t.command = !0, t.valueDepth = -1, t.heredocPending !== "" && (t.heredoc = t.heredocPending, t.heredocPending = "", t.mode = "heredoc")), t.mode) {
			case "single": return $e(e, t);
			case "heredoc": return et(e, t);
			default: return tt(e, t);
		}
	}
};
function $e(e, t) {
	let n = e.indexOf("'");
	return e.skipTo(n < 0 ? -1 : n + 1), n >= 0 && (t.mode = "code"), "string";
}
function et(e, t) {
	let n = t.heredocIndented ? e.text.replace(/^\t+/, "") : e.text;
	return e.skipToEnd(), n === t.heredoc ? (t.mode = "code", t.heredoc = "", t.command = !0, "keyword") : "string";
}
function tt(e, t) {
	let n = t.frames[t.frames.length - 1];
	return n === "\"" ? nt(e, t) : n === "${" ? it(e, t) : at(e, t);
}
function nt(e, t) {
	if (e.match("\"")) return t.frames.pop(), "string";
	if (e.match("\\")) return e.next(), "escape";
	let n = rt(e, t);
	if (n !== null) return n;
	for (e.next(); !e.eol();) {
		let t = e.peek();
		if (t === "\"" || t === "\\" || t === "$" || t === "`") break;
		e.next();
	}
	return "string";
}
function rt(e, t) {
	return e.match("$((") ? (t.frames.push("$(("), t.command = !1, "punctuation") : e.match("$(") ? (t.frames.push("$("), t.command = !0, "punctuation") : e.match("${") ? (t.frames.push("${"), t.command = !1, it(e, t)) : e.match("`") ? (t.frames[t.frames.length - 1] === "`" ? (t.frames.pop(), t.command = !1) : (t.frames.push("`"), t.command = !0), "punctuation") : e.match(Je) ? (t.command = !1, "variable") : null;
}
function it(e, t) {
	for (; !e.eol();) {
		let n = e.peek();
		if (n === "}") {
			e.next(), t.frames.pop();
			break;
		}
		if (n === "$" && (e.peek(1) === "(" || e.peek(1) === "{")) {
			if (e.pos > e.start) break;
			return rt(e, t) ?? "variable";
		}
		e.next();
	}
	return "variable";
}
function at(e, t) {
	if (e.eatWhile(/\s/)) return t.valueDepth === t.frames.length && (t.command = !0, t.valueDepth = -1), null;
	let n = e.peek(), r = e.pos === 0 || /\s/.test(e.text.charAt(e.pos - 1));
	if (n === "#" && r) return e.skipToEnd(), "comment";
	if (n === "'") return e.next(), t.mode = "single", t.command = !1, $e(e, t);
	if (n === "\"") return e.next(), t.frames.push("\""), t.command = !1, "string";
	if (e.match("((")) return t.frames.push("(("), t.command = !1, "punctuation";
	let i = t.frames[t.frames.length - 1], a = i === "((" || i === "$((";
	if (a && e.match("))")) return t.frames.pop(), t.command = i === "((", "punctuation";
	if (a) return e.match(/\d+/y) ? "number" : e.match(Ke) ? "variable" : e.match(/[-+*/%=<>!&|^~?:,]+/y) ? "operator" : (e.next(), null);
	if (e.match(Xe)) {
		let n = e.current();
		return t.heredocPending = n.replace(/^<<-?\s*/, "").replace(/^\\/, "").replace(/^['"]|['"]$/g, ""), t.heredocIndented = n.startsWith("<<-"), "keyword";
	}
	if (n === ")" && i === "$(") return e.next(), t.frames.pop(), t.command = !1, "punctuation";
	let o = rt(e, t);
	if (o !== null) return o;
	if (e.match("\\")) return e.next(), "escape";
	if (e.match("=")) return t.command && (t.command = !1, t.valueDepth = t.frames.length), "operator";
	if (e.match(Ze)) {
		let n = e.current();
		return t.command = n === "|" || n === "||" || n === "&&" || n === ";" || n === "&" || n === ";;", "operator";
	}
	if (e.match(/[(){}]/y)) return t.command = !0, "punctuation";
	if (e.match(qe)) return t.command = !1, "attribute";
	if (t.command && e.match(Ye)) return "variable";
	if (e.match(Ke)) {
		let n = e.current();
		return t.command && We.has(n) ? (t.command = Ge.has(n), "keyword") : t.command ? (t.command = !1, "function") : null;
	}
	return e.match(/\d+(?=\s|$)/y) ? "number" : e.match(/\[\[?|\]\]?|!/y) ? (t.command = !0, "keyword") : (e.next(), null);
}
var ot = {
	...O(Qe),
	keywords: [...We]
}, st = k("\n    break case catch class const continue debugger default delete do else enum export extends finally for function if import in\n    instanceof new return super switch this throw try typeof var void while with yield let static async await of get set\n    abstract any as asserts boolean constructor declare implements interface is keyof module namespace never number object\n    private protected public readonly require string symbol type unique unknown from global override satisfies bigint\n    infer out accessor\n"), ct = k("true false null undefined NaN Infinity"), lt = k("return typeof case in of instanceof new delete void throw yield await else do"), ut = /[A-Za-z_$][\w$]*/y, dt = /0[xX][\da-fA-F_]+n?|0[bB][01_]+n?|0[oO][0-7_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?/y, ft = /[+\-*/%=<>!&|^~?:]+/y, pt = /\s*\(/y, mt = {
	initialState: () => ({
		mode: "code",
		frames: [],
		regexAllowed: !0
	}),
	token(e, t) {
		switch (t.mode) {
			case "comment": return ht(e, t);
			case "template": return gt(e, t);
			default: return _t(e, t);
		}
	}
};
function ht(e, t) {
	let n = e.indexOf("*/");
	return e.skipTo(n < 0 ? -1 : n + 2), t.mode = n < 0 ? "comment" : "code", "comment";
}
function gt(e, t) {
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
function _t(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = e.peek();
	if (e.match("//")) return e.skipToEnd(), "comment";
	if (e.match("/*")) return t.mode = "comment", ht(e, t);
	if (n === "\"" || n === "'") return e.next(), A(e, n), t.regexAllowed = !1, "string";
	if (n === "`") return e.next(), t.mode = "template", gt(e, t);
	if (e.match(dt)) return t.regexAllowed = !1, "number";
	if (n === "@") return e.next(), e.match(ut), "meta";
	if (e.match(ut)) {
		let n = e.current();
		return st.has(n) ? (t.regexAllowed = lt.has(n), "keyword") : (t.regexAllowed = !1, ct.has(n) ? "keyword" : (pt.lastIndex = e.pos, pt.test(e.text) ? "function" : yt(n) ? "type" : null));
	}
	if (n === "/" && t.regexAllowed && vt(e)) return t.regexAllowed = !1, "regex";
	if (e.match(ft)) return t.regexAllowed = !0, "operator";
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
function vt(e) {
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
function yt(e) {
	let t = e.charAt(0);
	return t >= "A" && t <= "Z";
}
var bt = {
	...O(mt),
	keywords: [...st]
}, xt = k("\n    abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum\n    event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace\n    new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc\n    static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while\n    add alias and ascending async await by descending dynamic equals from get global group init into join let managed nameof nint\n    not notnull nuint on or orderby partial record remove required scoped select set unmanaged value var when where with yield file\n"), St = /@?[A-Za-z_][\w]*/y, Ct = /0[xX][\da-fA-F_]+[uUlL]*|0[bB][01_]+[uUlL]*|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[fFdDmMuUlL]*/y, wt = /'(?:\\(?:u[\da-fA-F]{4}|U[\da-fA-F]{8}|x[\da-fA-F]{1,4}|.)|[^'\\])'/y, Tt = /[+\-*/%=<>!&|^~?:]+/y, j = /\s*[(<]/y, Et = /\s*\.(?!\.)/y, Dt = /#[a-z]+/y, Ot = k("new class struct interface enum record is as"), kt = {
	initialState: () => ({
		mode: "code",
		rawQuotes: 0,
		frames: [],
		verbatims: [],
		afterNew: !1,
		afterDot: !1
	}),
	token(e, t) {
		switch (t.mode) {
			case "comment": return At(e, t);
			case "verbatim": return jt(e, t);
			case "raw": return Mt(e, t);
			case "interpolated": return Nt(e, t);
			default: return Ft(e, t);
		}
	}
};
function At(e, t) {
	let n = e.indexOf("*/");
	return e.skipTo(n < 0 ? -1 : n + 2), t.mode = n < 0 ? "comment" : "code", "comment";
}
function jt(e, t) {
	for (; !e.eol();) if (!e.match("\"\"") && e.next() === "\"") {
		t.mode = "code";
		break;
	}
	return "string";
}
function Mt(e, t) {
	let n = "\"".repeat(t.rawQuotes), r = e.indexOf(n);
	return e.skipTo(r < 0 ? -1 : r + n.length), r >= 0 && (t.mode = "code"), "string";
}
function Nt(e, t) {
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
		if (e.next(), r === "\"") return Pt(t), "string";
	}
	return n || Pt(t), "string";
}
function Pt(e) {
	e.verbatims.pop(), e.mode = "code";
}
function Ft(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = t.afterDot;
	t.afterDot = !1;
	let r = e.peek();
	if (e.match("//")) return e.skipToEnd(), "comment";
	if (e.match("/*")) return t.mode = "comment", At(e, t);
	if (r === "#" && e.text.slice(0, e.pos).trim() === "" && e.match(Dt)) return e.skipToEnd(), "meta";
	if (e.match(/\$@"|@\$"/y)) return t.verbatims.push(!0), t.mode = "interpolated", "string";
	if (e.match(/\$+"""+/y)) return t.rawQuotes = e.current().replace(/^\$+/, "").length, t.mode = "raw", "string";
	if (e.match("$\"")) return t.verbatims.push(!1), t.mode = "interpolated", "string";
	if (e.match("@\"")) return t.mode = "verbatim", jt(e, t);
	if (e.match(/"""+/y)) return t.rawQuotes = e.current().length, t.mode = "raw", Mt(e, t);
	if (r === "\"") return e.next(), A(e, "\""), "string";
	if (e.match(wt)) return "string";
	if (e.match(Ct)) return t.afterNew = !1, "number";
	if (e.match(St)) {
		let r = e.current();
		if (r.charAt(0) !== "@" && xt.has(r)) return t.afterNew = Ot.has(r), "keyword";
		let i = t.afterNew;
		if (t.afterNew = !1, yt(r.charAt(0) === "@" ? r.slice(1) : r)) {
			j.lastIndex = e.pos;
			let t = j.test(e.text) ? e.text.charAt(j.lastIndex - 1) : "";
			return !i && t === "(" ? "function" : (Et.lastIndex = e.pos, n && t !== "<" && !Et.test(e.text) ? "property" : "type");
		}
		return j.lastIndex = e.pos, j.test(e.text) && e.text.charAt(j.lastIndex - 1) === "(" ? "function" : null;
	}
	if (r === "{") return e.next(), t.frames.length > 0 && t.frames[t.frames.length - 1]++, "punctuation";
	if (r === "}") {
		if (e.next(), t.frames.length > 0) {
			let e = t.frames.length - 1;
			if (t.frames[e] === 0) return t.frames.pop(), t.mode = "interpolated", "punctuation";
			t.frames[e]--;
		}
		return "punctuation";
	}
	return e.match(".") ? (t.afterDot = !0, "punctuation") : e.match(/[()[\],;]/y) ? "punctuation" : e.match(Tt) ? "operator" : (e.next(), null);
}
var It = {
	...O(kt),
	keywords: [...xt]
}, M = /-?[A-Za-z_][\w-]*/y, Lt = /--[\w-]+/y, Rt = /--[\w-]+|-?[A-Za-z_][\w-]*/y, N = /\s*:/y, zt = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?:%|[a-zA-Z]+)?/y, Bt = /#[\da-fA-F]{3,8}\b/y, Vt = /-?[A-Za-z_][\w-]*\(/y, Ht = /@\{[\w-]+\}/y, Ut = k("and not only or"), Wt = k("\n    charset import namespace media supports document page font-face keyframes viewport counter-style font-feature-values layer\n    property container scope starting-style plugin\n");
function Gt(e) {
	Rt.lastIndex = e.pos;
	let t = Rt.exec(e.text);
	if (t === null || (N.lastIndex = e.pos + t[0].length, !N.test(e.text))) return !1;
	for (let t = N.lastIndex; t < e.end; t++) {
		let n = e.text.charAt(t);
		if (n === ";" || n === "}") return !0;
		if (n === "{") return !1;
	}
	return t[0].startsWith("--") || /\s/.test(e.text.charAt(N.lastIndex)) || N.lastIndex >= e.end;
}
function Kt(e) {
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
			if (r === "\"" || r === "'") return t.next(), A(t, r), "string";
			if (r === "{") return t.next(), n.depth++, n.context = "block", n.afterProperty = !1, n.bracket = 0, "punctuation";
			if (r === "}") return t.next(), n.depth = Math.max(0, n.depth - 1), n.context = n.depth > 0 ? "block" : "selector", n.afterProperty = !1, "punctuation";
			if (r === ";") return t.next(), n.context = n.depth > 0 ? "block" : "selector", n.afterProperty = !1, "punctuation";
			if (r === ":" && n.afterProperty) return t.next(), n.context = "value", n.afterProperty = !1, "punctuation";
			switch (n.context) {
				case "value": return Qt(t, e);
				case "prelude": return Zt(t, e);
				case "block": return qt(t, n, e);
				default: return n.depth === 0 && r === "@" ? qt(t, n, e) : Jt(t, n, e);
			}
		}
	};
}
function qt(e, t, n) {
	if (e.peek() === "@" && !e.match(Ht, !1)) {
		e.next(), e.eatWhile(/[\w-]/);
		let r = e.current().slice(1).toLowerCase();
		return n && !Wt.has(r) ? (t.afterProperty = e.match(N, !1), "variable") : (t.context = "prelude", "meta");
	}
	if (Gt(e)) {
		let n = e.match(Lt);
		return n || e.match(M), t.afterProperty = !0, n ? "variable" : "attribute";
	}
	return t.context = "selector", Jt(e, t, n);
}
function Jt(e, t, n) {
	let r = e.peek();
	return t.bracket > 0 ? Xt(e, t) : r === "@" ? (e.next(), e.eat("{") ? (e.eatWhile(/[\w-]/), e.eat("}")) : e.eatWhile(/[\w-]/), n ? "variable" : "meta") : r === "." || r === "#" ? (e.next(), Yt(e), "selector") : r === ":" ? (e.next(), e.eat(":"), Yt(e) ? "selector" : "punctuation") : r === "&" ? (e.next(), Yt(e), "selector") : r === "*" ? (e.next(), "selector") : r === "[" ? (e.next(), t.bracket = 1, "punctuation") : r === "!" ? (e.next(), e.eatWhile(/[\w-]/), "keyword") : n && r === "~" && (e.peek(1) === "\"" || e.peek(1) === "'") ? (e.next(), A(e, e.next()), "string") : e.match(zt) ? "number" : e.match(/[>+~,()]/y) ? "punctuation" : e.match(/[=<>]+/y) ? "operator" : e.match(M) ? n && e.current() === "when" ? "keyword" : "selector" : (e.next(), null);
}
function Yt(e) {
	let t = e.pos;
	for (; e.eatWhile(/[\w-]/) || e.match(Ht);) continue;
	return e.pos > t;
}
function Xt(e, t) {
	return e.eat("]") ? (t.bracket = 0, "punctuation") : e.match(/[~|^$*]?=/y) ? (t.bracket = 2, "operator") : e.match(/[\w-]+/y) ? t.bracket === 1 ? "attribute" : "value" : (e.next(), null);
}
function Zt(e, t) {
	if (e.peek() === "@") return e.next(), e.eatWhile(/[\w-]/), t ? "variable" : "meta";
	let n = $t(e);
	if (n !== null) return n;
	if (e.match(Vt, !1)) return e.match(M), "function";
	if (e.match(zt)) return "number";
	if (e.match(M)) {
		let t = e.current();
		return Ut.has(t.toLowerCase()) ? "keyword" : e.match(N, !1) ? "attribute" : "value";
	}
	return e.match(/[,():]/y) ? "punctuation" : e.match(/[<>=]+/y) ? "operator" : (e.next(), null);
}
function Qt(e, t) {
	let n = e.peek();
	if (n === "!") return e.next(), e.eatWhile(/[\w-]/), "keyword";
	if (n === "@" && t) return e.next(), e.eat("@"), e.eatWhile(/[\w-]/), "variable";
	if (n === "~" && t && (e.peek(1) === "\"" || e.peek(1) === "'")) return e.next(), A(e, e.next()), "string";
	if (e.match(Lt)) return "variable";
	if (e.match(Bt)) return "value";
	let r = $t(e);
	return r === null ? e.match(Vt, !1) ? (e.match(M), "function") : e.match(zt) ? "number" : e.match(M) ? "value" : e.match(/[,()]/y) ? "punctuation" : e.match(/[+\-*/=<>]/y) ? "operator" : (e.next(), null) : r;
}
function $t(e) {
	if (e.match(/url(?=\()/y)) return "function";
	let t = e.text.slice(Math.max(0, e.pos - 4), e.pos);
	if (e.peek() === "(" && t.endsWith("url")) return e.next(), "punctuation";
	if (t === "url(" && e.peek() !== "\"" && e.peek() !== "'") {
		let t = e.indexOf(")");
		return e.skipTo(t), "string";
	}
	return null;
}
var en = O(Kt(!1)), tn = O(Kt(!0)), nn = /<\/?[A-Za-z][\w:-]*/y, rn = /[^\s"'<>/=]+/y, an = /[^\s"'<>`=]+/y, on = /&(?:#\d+|#x[\da-fA-F]+|[A-Za-z]\w*);/y, sn = Kt(!1), cn = {
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
			case "comment": return ln(e, t);
			case "tag": return dn(e, t);
			case "attribute-value": return fn(e, t);
			case "script": return pn(e, t, "script");
			case "style": return pn(e, t, "style");
			default: return un(e, t);
		}
	}
};
function ln(e, t) {
	let n = e.indexOf("-->");
	return e.skipTo(n < 0 ? -1 : n + 3), t.mode = n < 0 ? "comment" : "text", "comment";
}
function un(e, t) {
	if (e.match("<!--")) return t.mode = "comment", ln(e, t);
	if (e.match("<!")) {
		let t = e.indexOf(">");
		return e.skipTo(t < 0 ? -1 : t + 1), "meta";
	}
	if (e.match(nn)) {
		let n = e.current();
		return t.closing = n.startsWith("</"), t.tag = n.slice(t.closing ? 2 : 1).toLowerCase(), t.mode = "tag", "tag";
	}
	if (e.match(on)) return "escape";
	for (e.next(); !e.eol() && e.peek() !== "<" && e.peek() !== "&";) e.next();
	return null;
}
function dn(e, t) {
	if (e.eatWhile(/\s/)) return null;
	if (e.match("/>")) return t.mode = "text", "punctuation";
	if (e.match(">")) return !t.closing && t.tag === "script" ? (t.mode = "script", t.inner = mt.initialState()) : !t.closing && t.tag === "style" ? (t.mode = "style", t.inner = sn.initialState()) : t.mode = "text", "punctuation";
	if (e.match("=")) return "operator";
	let n = e.peek();
	return n === "\"" || n === "'" ? (e.next(), A(e, n, !1) || (t.mode = "attribute-value", t.quote = n), "string") : e.match(rn) ? e.text.slice(0, e.start).trimEnd().endsWith("=") ? "string" : "attribute" : e.match(an) ? "string" : (e.next(), null);
}
function fn(e, t) {
	return A(e, t.quote, !1) && (t.mode = "tag"), "string";
}
function pn(e, t, n) {
	let r = `</${n}`;
	(e.pos === 0 || t.closingAt === null) && (t.closingAt = gn(e, n === "script" ? mn : hn));
	let i = t.closingAt;
	if (i === e.pos) return e.skipTo(i + r.length), t.mode = "tag", t.tag = n, t.closing = !0, t.inner = null, t.closingAt = null, "tag";
	let a = i < 0 ? e.end : i, o = new Be(e.text, e.pos, a);
	o.start = e.pos;
	let s = n === "script" ? mt.token(o, t.inner) : sn.token(o, t.inner);
	return e.pos = o.pos > o.start ? o.pos : o.start + 1, s;
}
var mn = /<\/script/gi, hn = /<\/style/gi;
function gn(e, t) {
	t.lastIndex = e.pos;
	let n = t.exec(e.text);
	return n === null || n.index + n[0].length > e.end ? -1 : n.index;
}
var _n = O(cn), vn = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y, yn = /(?:true|false|null)\b/y, bn = /\s*:/y;
function xn(e) {
	return bn.lastIndex = e.pos, bn.test(e.text);
}
var Sn = {
	...O({
		initialState: () => ({}),
		token(e) {
			return e.eatWhile(/\s/) ? null : e.peek() === "\"" ? (e.next(), A(e, "\""), xn(e) ? "property" : "string") : e.match(vn) ? "number" : e.match(yn) ? "keyword" : e.match(/[{}[\]:,]/y) ? "punctuation" : (e.next(), "invalid");
		}
	}),
	keywords: [
		"true",
		"false",
		"null"
	]
}, Cn = /^( {0,3})(`{3,}|~{3,})(.*)$/, wn = /^ {0,3}(`{3,}|~{3,})[ \t]*$/, P = /^ {0,3}> ?/, F = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/, Tn = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
function I(e) {
	let t = Cn.exec(e);
	return t === null || t[2][0] === "`" && t[3].includes("`") ? null : {
		indent: t[1].length,
		marker: t[2],
		info: t[3]
	};
}
function En(e, t) {
	let n = wn.exec(e);
	return n !== null && n[1][0] === t[0] && n[1].length >= t.length;
}
//#endregion
//#region src/languages/markdown.ts
var Dn = {
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
function On(e) {
	let t = e.trim().split(/\s+/, 1)[0].replace(/^\{?\.?|\}$/g, "").toLowerCase();
	return Dn[t] ?? t;
}
var L = {
	fence: "",
	quotes: 0,
	language: "",
	inner: null,
	comment: !1
}, kn = /^#{1,6}(?=\s|$)/, An = /^ {0,3}=+[ \t]*$/, jn = /^( {0,3})(\[[^\]]+\]:)([ \t]*)(\S+)(.*)$/, Mn = /(?:[-*+]|\d{1,9}[.)])(?=[ \t]|$)/y, Nn = /\[[ xX]\](?=[ \t]|$)/y, Pn = /[!-/:-@[-`{-~]/, Fn = /&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[A-Za-z][A-Za-z\d]{1,31});/y, In = /<(?:[A-Za-z][A-Za-z\d+.-]{1,31}:[^<>\s]*|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)>/y, Ln = /<\/?[A-Za-z][\w-]*(?:\s+[^<>]*)?\/?>/y, Rn = /(?:https?:\/\/|www\.)[^\s<]*[^\s<?!.,:*_~)]/y;
function zn(e) {
	return {
		initialState: L,
		tokenizeLine(t, n, r) {
			let i = n;
			return i.fence.length > 0 ? Bn(t, i, r, e) : Un(t, i, r, e);
		}
	};
}
function Bn(e, t, n, r) {
	let i = Vn(e, t.quotes);
	if (i.marks.length < t.quotes) return Un(e, L, n, r);
	Hn(i, n);
	let a = i.end, o = a === 0 ? e : e.slice(a);
	if (En(o, t.fence)) return n(a + o.search(/\S/), a + o.trimEnd().length, "code"), L;
	let s = t.language.length > 0 ? r(t.language) : null;
	if (s === null) return o.length > 0 && n(a, e.length, "code"), t;
	let c = a === 0 ? n : (e, t, r) => n(a + e, a + t, r), l = s.tokenizeLine(o, t.inner ?? s.initialState, c);
	return {
		...t,
		inner: l
	};
}
function Vn(e, t) {
	let n = [], r = 0;
	for (; n.length < t;) {
		let t = P.exec(r === 0 ? e : e.slice(r));
		if (t === null) break;
		n.push(r + t[0].indexOf(">")), r += t[0].length;
	}
	return {
		marks: n,
		end: r
	};
}
function Hn(e, t) {
	for (let n of e.marks) t(n, n + 1, "quote");
}
function Un(e, t, n, r) {
	let i = 0;
	if (t.comment) {
		let r = e.indexOf("-->");
		if (r < 0) return e.length > 0 && n(0, e.length, "comment"), t;
		n(0, r + 3, "comment"), i = r + 3;
	}
	if (i === 0) {
		let t = Vn(e, 64), i = I(t.end === 0 ? e : e.slice(t.end));
		if (i !== null) {
			let a = t.end + i.indent, o = On(i.info);
			return Hn(t, n), n(a, a + i.marker.length, "code"), i.info.trim().length > 0 && n(a + i.marker.length + i.info.search(/\S/), e.trimEnd().length, "keyword"), {
				fence: i.marker,
				quotes: t.marks.length,
				language: o,
				inner: r(o)?.initialState ?? null,
				comment: !1
			};
		}
		if (An.test(e)) return n(e.search(/\S/), e.trimEnd().length, "heading"), L;
		if (F.test(e) || Tn.test(e) && e.includes("|")) return n(e.search(/\S/), e.trimEnd().length, "punctuation"), L;
		let a = jn.exec(e);
		if (a !== null) {
			let t = a[1].length, r = t + a[2].length + a[3].length;
			return n(t, t + a[2].length - 1, "link"), n(r, r + a[4].length, "string"), a[5].trim().length > 0 && n(r + a[4].length + a[5].search(/\S/), e.trimEnd().length, "string"), L;
		}
	}
	return {
		...L,
		comment: Wn(e, i, n)
	};
}
function Wn(e, t, n) {
	let r = t, i = !1;
	for (;;) {
		let t = Gn(e, r);
		if (e.charAt(t) === ">") {
			n(t, t + 1, "quote"), i = !0, r = t + 1;
			continue;
		}
		if (Mn.lastIndex = t, Mn.test(e)) {
			n(t, Mn.lastIndex, "keyword"), r = Mn.lastIndex;
			let i = Gn(e, r);
			Nn.lastIndex = i, Nn.test(e) && (n(i, Nn.lastIndex, "keyword"), r = Nn.lastIndex);
			continue;
		}
		r = t;
		break;
	}
	return kn.test(e.slice(r)) ? (n(r, e.trimEnd().length, "heading"), !1) : Kn(e, r, i ? "quote" : null, n);
}
function Gn(e, t) {
	let n = t;
	for (; e.charAt(n) === " " || e.charAt(n) === "	";) n++;
	return n;
}
function Kn(e, t, n, r) {
	let i = t, a = t, o = (e, t, o) => {
		n !== null && e > i && r(i, e, n), r(e, t, o), i = t, a = t;
	};
	for (; a < e.length;) {
		let t = e.charAt(a);
		if (t === "\\" && Pn.test(e.charAt(a + 1))) {
			o(a, a + 2, "escape");
			continue;
		}
		if (t === "`") {
			let t = R(e, a, "`"), n = qn(e, a + t, "`", t);
			if (n < 0) {
				a += t;
				continue;
			}
			o(a, n + t, "code");
			continue;
		}
		if (t === "*" || t === "_" || t === "~") {
			let n = Jn(e, a, t);
			if (n < 0) {
				a += R(e, a, t);
				continue;
			}
			let r = Math.min(R(e, a, t), 3);
			o(a, n, t === "~" ? "strikethrough" : r >= 2 ? "strong" : "emphasis");
			continue;
		}
		if (t === "[" || t === "!" && e.charAt(a + 1) === "[") {
			if (Yn(e, a, o)) continue;
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
			if (In.lastIndex = a, In.test(e)) {
				o(a, In.lastIndex, "link");
				continue;
			}
			if (Ln.lastIndex = a, Ln.test(e)) {
				o(a, Ln.lastIndex, "tag");
				continue;
			}
		}
		if (t === "&" && (Fn.lastIndex = a, Fn.test(e))) {
			o(a, Fn.lastIndex, "escape");
			continue;
		}
		if ((t === "h" || t === "w") && (a === 0 || /[\s(]/.test(e.charAt(a - 1))) && (Rn.lastIndex = a, Rn.test(e))) {
			o(a, Rn.lastIndex, "link");
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
function R(e, t, n) {
	let r = t;
	for (; e.charAt(r) === n;) r++;
	return r - t;
}
function qn(e, t, n, r) {
	let i = e.indexOf(n, t);
	for (; i >= 0;) {
		let t = R(e, i, n);
		if (t === r) return i;
		i = e.indexOf(n, i + t);
	}
	return -1;
}
function Jn(e, t, n) {
	let r = R(e, t, n), i = n === "~" ? r : Math.min(r, 3);
	if (n === "~" && r > 2) return -1;
	let a = e.charAt(t + r);
	if (a === "" || /\s/.test(a) || n === "_" && t > 0 && /[\p{L}\p{N}]/u.test(e.charAt(t - 1))) return -1;
	let o = t + r;
	for (;;) {
		let t = e.indexOf(n.repeat(i), o);
		if (t < 0) return -1;
		let r = R(e, t, n), a = !/\s/.test(e.charAt(t - 1)), s = n === "_" && /[\p{L}\p{N}]/u.test(e.charAt(t + r));
		if (a && !s && r === i) return t + r;
		o = t + r;
	}
}
function Yn(e, t, n) {
	let r = Xn(e, e.charAt(t) === "!" ? t + 1 : t, "[", "]");
	if (r < 0) return !1;
	let i = e.charAt(r + 1);
	if (i !== "(" && i !== "[") return !1;
	let a = Xn(e, r + 1, i, i === "(" ? ")" : "]");
	return a < 0 ? !1 : (n(t, r + 1, "link"), n(r + 1, a + 1, i === "(" ? "string" : "link"), !0);
}
function Xn(e, t, n, r) {
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
var Zn = k("\n    False None True and as assert async await break class continue def del elif else except finally for from global if import in\n    is lambda nonlocal not or pass raise return try while with yield match case\n"), Qn = k("\n    print len range int str float list dict set tuple bool type isinstance issubclass enumerate zip map filter sorted reversed min\n    max sum abs any all open super object iter next getattr setattr hasattr callable format repr round divmod pow input id hash\n    vars dir globals locals Exception ValueError TypeError KeyError IndexError RuntimeError StopIteration AttributeError\n"), $n = /[A-Za-z_]\w*/y, er = /0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[jJ]?/y, tr = /(?:[rRbBuUfF]{1,2})?(?:'''|"""|'|")/y, nr = /[+\-*/%=<>!&|^~@:]+|->/y, rr = /\s*\(/y, ir = {
	initialState: () => ({
		mode: "code",
		strings: [],
		frames: [],
		declaring: null
	}),
	token(e, t) {
		return t.mode === "string" ? ar(e, t) : sr(e, t);
	}
};
function ar(e, t) {
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
		if (e.match(n.quote)) return or(t), "string";
		e.next();
	}
	return n.quote.length === 1 && or(t), "string";
}
function or(e) {
	e.strings.pop(), e.mode = "code";
}
function sr(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = e.peek();
	if (n === "#") return e.skipToEnd(), "comment";
	if (e.match(tr)) {
		let n = e.current(), r = n.search(/['"]/), i = n.slice(0, r).toLowerCase();
		return t.strings.push({
			quote: n.slice(r),
			raw: i.includes("r"),
			formatted: i.includes("f")
		}), t.mode = "string", t.declaring = null, ar(e, t);
	}
	if (e.match(er)) return t.declaring = null, "number";
	if (n === "@" && e.match(/@[A-Za-z_][\w.]*/y)) return "meta";
	if (e.match($n)) {
		let n = e.current(), r = t.declaring;
		return t.declaring = null, Zn.has(n) ? (t.declaring = n === "def" || n === "class" ? n : null, "keyword") : r === "def" ? "function" : r === "class" ? "type" : n === "self" || n === "cls" ? "variable" : (rr.lastIndex = e.pos, rr.test(e.text) ? "function" : Qn.has(n) || yt(n) ? "type" : null);
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
	return e.match(/[()[\],;.]/y) ? "punctuation" : e.match(nr) ? "operator" : (e.next(), null);
}
var cr = {
	...O(ir),
	keywords: [...Zn, ...Qn]
}, lr = [
	["json", Sn],
	["css", en],
	["less", tn],
	["javascript", bt],
	["typescript", bt],
	["html", _n],
	["bash", ot],
	["csharp", It],
	["python", cr]
], ur = "plain-text", z = class e {
	tokenizers = new Map(lr);
	listeners = /* @__PURE__ */ new Set();
	constructor() {
		this.tokenizers.set("markdown", zn((e) => this.get(e)));
	}
	static normalize(e) {
		let t = (e ?? "").trim().toLowerCase();
		return t.length === 0 ? ur : t;
	}
	get(t) {
		return this.tokenizers.get(e.normalize(t)) ?? null;
	}
	register(t, n) {
		let r = e.normalize(t);
		if (r === ur) throw Error("The plain-text language cannot be redefined.");
		if (typeof n?.tokenizeLine != "function" || n.initialState === void 0) throw Error(`The language '${t}' needs a tokenizer with an initialState and a tokenizeLine.`);
		this.tokenizers.set(r, n);
		for (let e of this.listeners) e(r);
	}
	onRegistered(e) {
		return this.listeners.add(e), () => this.listeners.delete(e);
	}
}, B = new z(), dr = "*", fr = new class {
	sources = /* @__PURE__ */ new Map();
	register(e, t) {
		let n = z.normalize(e), r = this.sources.get(n);
		r === void 0 ? this.sources.set(n, [t]) : r.push(t);
	}
	sourcesFor(e) {
		let t = this.sources.get(dr) ?? [], n = this.sources.get(z.normalize(e)) ?? [];
		return [...t, ...n];
	}
	hasOwnSource(e) {
		return this.sourcesFor(e).length > 0;
	}
}(), pr = /* @__PURE__ */ new Map();
function mr(e) {
	let t = pr.get(e);
	return t === void 0 && (t = fetch(e).then((t) => t.ok ? t.json() : Promise.reject(/* @__PURE__ */ Error(`Failed to load completions: ${e}`))).then(Re).catch(() => ({
		items: [],
		triggers: []
	})), pr.set(e, t)), t;
}
function hr(e) {
	return e instanceof InputEvent && e.inputType === "insertText";
}
var gr = class {
	root;
	textarea;
	scroller;
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
	anchoredAt = -1;
	requestId = 0;
	lastKnownCaret = -1;
	sourceUrl = null;
	loadedFile = null;
	constructor(e, t, n, r, i, a) {
		this.root = e.root, this.textarea = e.textarea, this.scroller = e.scroller, this.context = t, this.surface = n, this.editing = r, this.carets = i, this.getLanguage = a, this.anchor = document.createElement("span"), this.anchor.className = v, this.anchor.setAttribute("aria-hidden", "true"), e.content.appendChild(this.anchor);
	}
	get isOpen() {
		return this.handle !== null;
	}
	get enabled() {
		return this.root.hasAttribute("data-ui-code-completions") && !this.textarea.readOnly;
	}
	settingsChanged() {
		this.root.hasAttribute("data-ui-code-completions") || this.close();
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
		let t = this.textarea.value, n = this.textarea.selectionStart, r = Oe(t, n), i = r.length > 0 || this.triggers().includes(t.charAt(n - 1));
		if (this.isOpen) {
			if (!i) {
				this.close();
				return;
			}
		} else if (!hr(e) || !i || this.tokenBlocks(n) || !this.hasExtraSource(this.getLanguage())) return;
		this.lastKnownCaret = n, this.gatherAndShow(r, n);
	}
	openExplicit() {
		this.ensureFileLoaded();
		let e = this.textarea.selectionStart;
		this.tokenBlocks(e) || (this.lastKnownCaret = e, this.gatherAndShow(Oe(this.textarea.value, e), e));
	}
	tokenBlocks(e) {
		let t = this.surface.tokenKindAt(e);
		return t === "comment" || t === "string";
	}
	triggers() {
		return this.loadedFile?.triggers ?? [];
	}
	hasExtraSource(e) {
		return this.sourceUrl !== null && this.sourceUrl.length > 0 || fr.hasOwnSource(e) ? !0 : (B.get(e)?.keywords?.length ?? 0) > 0;
	}
	ensureFileLoaded() {
		let e = this.root.getAttribute("data-ui-code-completions-source");
		e !== this.sourceUrl && (this.sourceUrl = e, this.loadedFile = null, e !== null && e.length !== 0 && mr(e).then((t) => {
			this.root.getAttribute("data-ui-code-completions-source") === e && (this.loadedFile = t);
		}));
	}
	async gatherAndShow(e, t) {
		let n = ++this.requestId, r = this.getLanguage(), i = this.buildContext(e, t, r), a = await ke(this.sourcesFor(r), i);
		if (n !== this.requestId || !this.textarea.isConnected || document.activeElement !== this.textarea || this.textarea.selectionStart !== t) return;
		let o = Ae(a, e);
		if (o.length === 0 || o.length === 1 && o[0].label === e) {
			this.close();
			return;
		}
		this.show(o, t - e.length);
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
		this.loadedFile !== null && this.loadedFile.items.length > 0 && t.push(this.loadedFile.items), t.push(...fr.sourcesFor(e));
		let n = B.get(e)?.keywords;
		return n !== void 0 && n.length > 0 && t.push(n.map((e) => ({
			label: e,
			kind: "keyword"
		}))), t.push(Ne), t;
	}
	show(e, t) {
		this.items = e, this.active = 0;
		let n = t !== this.anchoredAt;
		if (n && (this.anchoredAt = t, this.positionAnchor(t)), this.handle === null) {
			let e = this.ensureList();
			e.setAttribute("aria-label", this.context.strings.text("ui.code.suggestions")), e.hidden = !1, this.handle = this.context.popups.open(this.anchor, e, {
				placement: "bottom-start",
				gap: 2,
				owner: this.root,
				onDismiss: () => this.dismissed()
			}), this.textarea.setAttribute("aria-autocomplete", "list"), this.textarea.setAttribute("aria-controls", e.id);
		} else n && this.handle.reposition();
		this.renderItems();
	}
	positionAnchor(e) {
		let t = this.carets.contentCaretRect(e);
		t !== null && (this.anchor.style.left = `${t.left}px`, this.anchor.style.top = `${t.bottom}px`);
	}
	ensureList() {
		if (this.list !== null) return this.list;
		let e = document.createElement("ul");
		return e.className = g, e.hidden = !0, e.setAttribute("role", "listbox"), e.id = this.context.dom.ensureId(e, "code-completions"), e.addEventListener("mousedown", (e) => e.preventDefault()), e.addEventListener("click", (e) => this.pointerAccept(e)), e.addEventListener("pointermove", (e) => this.pointerMoved(e)), this.root.append(e), this.list = e, e;
	}
	renderItems() {
		if (this.list !== null) {
			this.list.replaceChildren();
			for (let e = 0; e < this.items.length; e++) {
				let t = this.items[e], n = document.createElement("li");
				n.id = `${this.list.id}-${e}`, n.className = _, n.setAttribute("role", "option"), t.kind !== void 0 && n.classList.add(`${_}--${t.kind}`);
				let r = document.createElement("span");
				if (r.className = `${_}-label`, r.textContent = t.label, n.append(r), t.detail !== void 0) {
					let e = document.createElement("span");
					e.className = `${_}-detail`, e.textContent = t.detail, n.append(e);
				}
				this.list.append(n);
			}
			this.updateActive(!0);
		}
	}
	updateActive(e) {
		if (this.list === null) return;
		for (let e = 0; e < this.list.children.length; e++) {
			let t = this.list.children[e], n = e === this.active;
			t.classList.toggle(ee, n), t.setAttribute("aria-selected", n ? "true" : "false");
		}
		let t = this.list.children[this.active];
		t instanceof HTMLElement && (this.textarea.setAttribute("aria-activedescendant", t.id), e && t.scrollIntoView({ block: "nearest" }));
	}
	move(e) {
		this.items.length !== 0 && (this.active = (this.active + e + this.items.length) % this.items.length, this.updateActive(!0));
	}
	pointerAccept(e) {
		let t = this.rowIndex(e.target);
		t >= 0 && this.accept(t);
	}
	pointerMoved(e) {
		let t = this.rowIndex(e.target);
		t >= 0 && t !== this.active && (this.active = t, this.updateActive(!1));
	}
	rowIndex(e) {
		if (this.list === null || !(e instanceof Element)) return -1;
		let t = e.closest(`.${_}`);
		return t === null ? -1 : Array.prototype.indexOf.call(this.list.children, t);
	}
	accept(e) {
		let t = this.items[e];
		t !== void 0 && (this.close(), this.editing.acceptCompletion(t.insert ?? t.label));
	}
	selectionChanged() {
		this.isOpen && this.textarea.selectionStart !== this.lastKnownCaret && this.close();
	}
	scrolled() {
		if (!this.isOpen) return;
		let e = this.anchor.getBoundingClientRect(), t = this.scroller.getBoundingClientRect(), n = t.top + this.scroller.clientHeight, r = t.left + this.scroller.clientWidth;
		(e.top <= t.top || e.top > n || e.left < t.left || e.left > r) && this.close();
	}
	close() {
		this.handle?.close(), this.dismissed();
	}
	dismissed() {
		this.requestId++, this.list !== null && (this.list.hidden = !0), this.handle = null, this.items = [], this.active = -1, this.anchoredAt = -1, this.textarea.removeAttribute("aria-autocomplete"), this.textarea.removeAttribute("aria-controls"), this.textarea.removeAttribute("aria-activedescendant");
	}
};
//#endregion
//#region src/case-change.ts
function _r(e, t, n) {
	let r = !1, i = (e) => n ? e.toUpperCase() : e.toLowerCase(), a = D(t, (t) => {
		if (w(t)) {
			let n = pe(e, t.head);
			if (n === null) return null;
			let a = i(e.slice(n.from, n.to));
			return a === e.slice(n.from, n.to) ? null : (r = !0, {
				from: n.from,
				to: n.to,
				text: a,
				caret: t.head - n.from
			});
		}
		let n = S(t), a = C(t), o = i(e.slice(n, a));
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
function vr(e, t, n, r) {
	if (!r && t.ranges.every(w)) {
		let r = ne(e);
		return D(t, (t) => {
			let i = " ".repeat(n - x(e, r, t.head, n) % n);
			return {
				from: t.head,
				to: t.head,
				text: i,
				caret: i.length
			};
		});
	}
	let i = [], a = -1;
	for (let o of t.ranges) {
		let t = S(o), s = C(o), c = e.lastIndexOf("\n", t - 1) + 1, l = e.indexOf("\n", s > t ? s - 1 : s);
		for (l < 0 && (l = e.length); c <= l;) {
			let t = e.indexOf("\n", c);
			if (t < 0 && (t = e.length), c > a) {
				let o = yr(e, c, t, n, r);
				o !== null && i.push(o), a = c;
			}
			c = t + 1;
		}
	}
	return i.length === 0 ? null : {
		edits: i,
		after: E(t.ranges.map((e) => ({
			anchor: xe(e.anchor, i),
			head: xe(e.head, i)
		})), t.primary)
	};
}
function yr(e, t, n, r, i) {
	if (!i) return n === t ? null : {
		from: t,
		to: t,
		text: " ".repeat(r)
	};
	let a = br(e, t, n, r);
	return a === 0 ? null : {
		from: t,
		to: t + a,
		text: ""
	};
}
function br(e, t, n, r) {
	if (e[t] === "	") return 1;
	let i = 0;
	for (; i < r && t + i < n && e[t + i] === " ";) i++;
	return i;
}
function xr(e, t, n, r) {
	let i = e.lastIndexOf("\n", t - 1) + 1, a = e.slice(i, t), o = /^[ \t]*/.exec(a)?.[0] ?? "", s = a.trimEnd(), c = s.charAt(s.length - 1);
	return (c === "{" || c === "[" || c === "(" || c === ":" && r) && (o += " ".repeat(n)), "\n" + o;
}
//#endregion
//#region src/code-editor-editing.ts
var Sr = class {
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
		let t = _r(this.textarea.value, this.carets.read(), e);
		t !== null && this.surface.apply(t.edits, t.after, "other");
	}
	tab(e) {
		let t = vr(this.textarea.value, this.carets.read(), this.surface.tabSize, e);
		t !== null && this.surface.apply(t.edits, t.after, "other");
	}
	newLine() {
		let e = this.textarea.value, t = this.surface.tabSize, n = this.getLanguage() === "python";
		this.replaceEach((r) => xr(e, S(r), t, n), "other");
	}
	replaceEach(e, t) {
		let { set: n, pads: r } = this.carets.readPadded(), { edits: i, after: a } = D(n, (t, n) => {
			let i = r === null ? 0 : Math.min(r[n].anchor, r[n].head), a = " ".repeat(i) + e(t, n);
			return {
				from: S(t),
				to: C(t),
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
		let t = this.textarea.value;
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
				e.preventDefault(), this.deleteEach((e) => re(t, e), "deleting");
				return;
			case "deleteContentForward":
				e.preventDefault(), this.deleteEach((e) => y(t, e), "deleting");
				return;
			case "deleteWordBackward":
				e.preventDefault(), this.deleteEach((e) => fe(t, e), "other");
				return;
			case "deleteWordForward":
				e.preventDefault(), this.deleteEach((e) => de(t, e), "other");
				return;
			case "deleteSoftLineBackward":
			case "deleteHardLineBackward":
				e.preventDefault(), this.deleteEach((e) => t.lastIndexOf("\n", e - 1) + 1, "other");
				return;
			case "deleteSoftLineForward":
			case "deleteHardLineForward":
				e.preventDefault(), this.deleteEach((e) => t.includes("\n", e) ? t.indexOf("\n", e) : t.length, "other");
				return;
		}
		this.carets.collapse(), this.surface.beforeNativeEdit();
	}
	deleteEach(e, t) {
		let { edits: n, after: r } = D(this.carets.read(), (t) => {
			if (!w(t)) return {
				from: S(t),
				to: C(t),
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
		return e.ranges.length < 2 || e.ranges.every(w) ? null : e.ranges.map((e) => this.textarea.value.slice(S(e), C(e)));
	}
	cut(e) {
		if (this.textarea.readOnly) return;
		let t = this.selectedPieces();
		t !== null && e.clipboardData !== null && (e.preventDefault(), e.clipboardData.setData("text/plain", t.join("\n")), this.copied = t, this.deleteEach((e) => e, "other"));
	}
	paste(e) {
		let t = this.carets.read();
		if (t.ranges.length < 2 || this.textarea.readOnly || e.clipboardData === null) return;
		let n = e.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n"), r = Te(n, t.ranges.length, this.copied);
		e.preventDefault(), this.replaceEach((e, t) => r?.[t] ?? n, "other");
	}
	acceptCompletion(e) {
		let t = this.textarea.value, { edits: n, after: r } = D(this.carets.read(), (n) => w(n) ? {
			from: De(t, n.head),
			to: n.head,
			text: e,
			caret: e.length
		} : null);
		this.surface.apply(n, r, "other");
	}
}, Cr = 5e3, wr = class {
	done = [];
	undone = [];
	open = !1;
	record(e, t) {
		this.undone.length = 0;
		let n = this.done.at(-1);
		this.open && n !== void 0 && Tr(n, e, t) ? n.changes.push(e) : (this.done.push({
			kind: t,
			changes: [e]
		}), this.done.length > Cr && this.done.shift()), this.open = !0;
	}
	undo(e) {
		let t = this.done.pop();
		if (t === void 0) return null;
		let n = e;
		for (let e = t.changes.length - 1; e >= 0; e--) n = be(n, Er(t.changes[e]));
		return this.undone.push(t), this.open = !1, {
			text: n,
			selections: t.changes[0].before
		};
	}
	redo(e) {
		let t = this.undone.pop();
		if (t === void 0) return null;
		let n = e;
		for (let e of t.changes) n = be(n, e.edits);
		return this.done.push(t), this.open = !1, {
			text: n,
			selections: t.changes[t.changes.length - 1].after
		};
	}
	clear() {
		this.done.length = 0, this.undone.length = 0, this.open = !1;
	}
};
function Tr(e, t, n) {
	let r = e.changes[e.changes.length - 1];
	if (n === "other" || n !== e.kind || !ye(r.after, t.before)) return !1;
	if (n !== "typing") return !0;
	let i = r.edits.at(-1)?.text ?? "", a = t.edits[0]?.text ?? "";
	return !(/\s$/.test(i) && /^\S/.test(a));
}
function Er(e) {
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
function Dr(e, t, n) {
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
function Or(e, t) {
	if (e.length === 0) return null;
	let n = t.regex ? e : e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	try {
		return {
			pattern: new RegExp(n, t.matchCase ? "gm" : "gim"),
			wholeWord: t.wholeWord
		};
	} catch {
		return { invalid: !0 };
	}
}
function kr(e, t) {
	let n = [];
	for (let r of Ar(e, t)) n.push({
		from: r.index,
		to: r.index + r[0].length
	});
	return n;
}
function* Ar(e, t) {
	if (t === null || "invalid" in t) return;
	let n = t.pattern;
	for (n.lastIndex = 0;;) {
		let r = n.exec(e);
		if (r === null) return;
		if (r[0].length === 0) {
			n.lastIndex++;
			continue;
		}
		if (t.wholeWord && !jr(e, r.index, r.index + r[0].length)) {
			n.lastIndex = r.index + 1;
			continue;
		}
		let i = n.lastIndex;
		yield r, n.lastIndex = i;
	}
}
function jr(e, t, n) {
	return (t === 0 || !ue.test(e.charAt(t - 1))) && (n >= e.length || !ue.test(e.charAt(n)));
}
function Mr(e, t) {
	if (e.length === 0) return -1;
	for (let n = 0; n < e.length; n++) if (e[n].from >= t) return n;
	return 0;
}
function Nr(e, t) {
	if (e.length === 0) return -1;
	for (let n = e.length - 1; n >= 0; n--) if (e[n].from < t) return n;
	return e.length - 1;
}
function Pr(e, t, n, r, i) {
	if (!i || n === null || "invalid" in n) return r;
	let a = new RegExp(n.pattern.source, n.pattern.flags.replace("g", "") + "y");
	a.lastIndex = t.from;
	let o = a.exec(e);
	return o === null ? r : Ir(e, o, r);
}
function Fr(e, t, n, r) {
	let i = "", a = 0, o = !1;
	for (let s of Ar(e, t)) i += e.slice(a, s.index) + (r ? Ir(e, s, n) : n), a = s.index + s[0].length, o = !0;
	return o ? i + e.slice(a) : e;
}
function Ir(e, t, n) {
	let r = t.length - 1, i = "";
	for (let a = 0; a < n.length; a++) {
		let o = n.charAt(a), s = n.charAt(a + 1);
		if (o !== "$" || a + 1 >= n.length) {
			i += o;
			continue;
		}
		if (s === "$") i += "$", a++;
		else if (s === "&") i += t[0], a++;
		else if (s === "`") i += e.slice(0, t.index), a++;
		else if (s === "'") i += e.slice(t.index + t[0].length), a++;
		else if (s === "<" && t.groups !== void 0) {
			let e = n.indexOf(">", a + 2);
			if (e < 0) {
				i += o;
				continue;
			}
			i += t.groups[n.slice(a + 2, e)] ?? "", a = e;
		} else if (s >= "0" && s <= "9") {
			let e = Number.parseInt(n.slice(a + 1, a + 3), 10), c = Number.parseInt(s, 10);
			n.length > a + 2 && /\d/.test(n.charAt(a + 2)) && e >= 1 && e <= r ? (i += t[e] ?? "", a += 2) : c >= 1 && c <= r ? (i += t[c] ?? "", a++) : i += o;
		} else i += o;
	}
	return i;
}
//#endregion
//#region src/code-editor-find-replace.ts
var Lr = class {
	textarea;
	scroller;
	panel;
	findField;
	replaceField;
	replaceRow;
	expand;
	count;
	matchCase;
	wholeWord;
	regex;
	strings;
	names;
	validation;
	surface;
	matches = [];
	current = -1;
	query = null;
	invalid = !1;
	constructor(e, t, n, r, i) {
		this.textarea = e.textarea, this.scroller = e.scroller, this.panel = e.panel, this.findField = e.findField, this.replaceField = e.replaceField, this.replaceRow = e.replaceRow, this.expand = e.expand, this.count = e.count, this.matchCase = e.matchCase, this.wholeWord = e.wholeWord, this.regex = e.regex, this.strings = t, this.names = n, this.validation = r, this.surface = i;
	}
	get isOpen() {
		return !this.panel.hidden;
	}
	get holdsFocus() {
		return this.panel.contains(document.activeElement);
	}
	get options() {
		return {
			matchCase: Rr(this.matchCase),
			wholeWord: Rr(this.wholeWord),
			regex: Rr(this.regex)
		};
	}
	get isReplacing() {
		return !this.replaceRow.hidden && !this.textarea.readOnly;
	}
	showReplace(e) {
		let t = e && !this.textarea.readOnly;
		this.replaceRow.hidden = !t, this.expand?.setAttribute("aria-expanded", t ? "true" : "false");
	}
	replaceHidden() {
		let e = document.activeElement;
		(this.replaceRow.contains(e) || this.expand?.contains(e) === !0) && this.findField.focus({ preventScroll: !0 });
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
	close(e) {
		this.panel.hidden = !0, this.matches = [], this.current = -1, this.surface.applyMatches([], -1), this.markInvalid(!1), e && this.textarea.focus({ preventScroll: !0 });
	}
	markInvalid(e) {
		if (e === this.invalid) return;
		let t = this.findField.closest(`.${this.names.textInputClass}`);
		this.invalid = e, t !== null && this.validation.mark(t, e ? "error" : null);
	}
	search(e, t) {
		let n = this.options, r = this.current >= 0 ? this.matches[this.current] : void 0;
		this.query = Or(this.findField.value, n), this.matches = kr(this.textarea.value, this.query);
		let i = this.query !== null && "invalid" in this.query;
		this.markInvalid(i);
		let a = e && r !== void 0 ? this.matches.findIndex((e) => e.from === r.from) : -1, o = a >= 0 ? a : Mr(this.matches, this.textarea.selectionStart);
		this.goTo(o, t);
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
		let a = t.querySelector(`.${h}`);
		if (a === null) return;
		let o = a.offsetLeft, s = o + a.offsetWidth;
		(o < n.scrollLeft || s > n.scrollLeft + n.clientWidth) && (n.scrollLeft = Math.max(0, o - n.clientWidth / 2));
	}
	refreshIfOpen(e) {
		this.isOpen && this.search(!0, e);
	}
	wordsChanged() {
		this.writeCount();
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
		let t = this.current >= 0 ? this.matches[this.current].from : this.textarea.selectionStart, n = e > 0 ? Mr(this.matches, t + 1) : Nr(this.matches, t);
		this.goTo(n, !0);
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
		let e = this.matches[this.current], t = Pr(this.textarea.value, e, this.query, this.replaceField.value, this.options.regex);
		this.surface.replaceRange(e.from, e.to, t), this.replaceField.focus({ preventScroll: !0 }), this.goTo(Mr(this.matches, e.from + t.length), !0);
	}
	replaceEvery() {
		if (this.textarea.readOnly || this.matches.length === 0) return;
		let e = this.textarea.value, t = Fr(e, this.query, this.replaceField.value, this.options.regex);
		if (t === e) return;
		let n = Dr(e, t, 0);
		this.surface.replaceRange(n.from, n.to, n.text), this.replaceField.focus({ preventScroll: !0 });
	}
};
function Rr(e) {
	return e?.getAttribute("aria-pressed") === "true";
}
//#endregion
//#region src/code-editor-status-bar.ts
var zr = class {
	root;
	textarea;
	bar;
	lineEnding;
	pickers;
	values;
	properties;
	constructor(e, n, i, a) {
		this.root = e.root, this.textarea = e.textarea, this.bar = e.bar, this.lineEnding = e.lineEnding, this.values = n, this.properties = i, this.pickers = [
			e.tabSize,
			e.encoding,
			e.lineEnding,
			e.language
		].filter((e) => e !== null), e.tabSize?.carrier.addEventListener("change", () => {
			this.root.style.setProperty(r, e.tabSize?.carrier.value ?? "4"), a();
		}), this.lineEnding?.carrier.addEventListener("change", () => {
			this.textarea.dispatchEvent(new Event("change", { bubbles: !0 }));
		}), e.language?.carrier.addEventListener("change", () => {
			this.root.setAttribute(t, e.language?.carrier.value ?? ""), a();
		});
		for (let e of this.pickers) e.select.addEventListener("change", () => this.chosen(e));
		this.showDetectedEnding(this.root.getAttribute("data-ui-code-eol") ?? "lf"), this.syncPickers();
	}
	chosen(e) {
		let t = this.values.read(e.select), n = t == null ? "" : String(t);
		e.carrier.value !== n && (e.carrier.value = n, e.carrier.dispatchEvent(new Event("change", { bubbles: !0 })));
	}
	barHidden() {
		this.bar?.contains(document.activeElement) === !0 && this.textarea.focus({ preventScroll: !0 });
	}
	syncPickers() {
		for (let e of this.pickers) {
			let t = e.carrier.value;
			String(this.values.read(e.select) ?? "") !== t && this.properties.set(e.select, "Value", t.length === 0 ? null : t);
		}
	}
	syncReadOnly(e) {
		for (let t of this.pickers) this.properties.set(t.select, "IsReadOnly", e);
	}
	showDetectedEnding(e) {
		this.lineEnding !== null && this.properties.set(this.lineEnding.select, "Placeholder", e === "crlf" ? "CRLF" : "LF");
	}
}, Br = {}, Vr = [], Hr = [], Ur = class {
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
		let t = e.split("\n"), n = this.lines, r = [], i = [], a = Kr(t, n), o = t.length - a, s = n.length - a, c = this.tokenizer?.initialState ?? Br, l = -1, u = 0, d = 0, f = 0, p = 0;
		for (; f < t.length;) {
			f === o && p < s && (l < 0 && (l = f, u = 0, d = 0), u += s - p, p = s);
			let e = f < o ? s : n.length;
			if (p < e && n[p].text === t[f] && Ue(n[p].startState, c)) {
				l >= 0 && (i.push({
					from: l,
					removed: u,
					added: d
				}), l = -1), r.push(n[p]), c = n[p].endState, f++, p++;
				continue;
			}
			l < 0 && (l = f, u = 0, d = 0);
			let [a, m] = p < e && n[p].text === t[f] ? [1, 1] : Gr(t, f, o, n, p, s);
			for (let e = 0; e < a; e++) {
				let n = this.tokenize(t[f + e], c);
				r.push(n), c = n.endState;
			}
			d += a, u += m, f += a, p += m;
		}
		return p < n.length && (l < 0 && (l = f, u = 0, d = 0), u += n.length - p), l >= 0 && i.push({
			from: l,
			removed: u,
			added: d
		}), this.lines = r, this.rebuildStarts(), i;
	}
	tokenize(e, t) {
		if (this.tokenizer === null) return {
			text: e,
			startState: Br,
			endState: Br,
			tokens: Vr,
			marks: Hr
		};
		let n = [];
		try {
			return {
				text: e,
				startState: t,
				endState: this.tokenizer.tokenizeLine(e, t, (e, t, r) => n.push({
					from: e,
					to: t,
					kind: r
				})),
				tokens: n,
				marks: Hr
			};
		} catch {
			return {
				text: e,
				startState: t,
				endState: t,
				tokens: Vr,
				marks: Hr
			};
		}
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
			let t = this.lines[e], i = n.get(e) ?? Hr;
			qr(t.marks, i) || (t.marks = i, r.push(e));
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
		return t === void 0 ? "" : t.text.length === 0 ? `<span class="${c}"><br></span>` : `<span class="${c}">${Jr(t.text, t.tokens, t.marks)}</span>`;
	}
}, Wr = 8;
function Gr(e, t, n, r, i, a) {
	for (let o = 1; o <= 16; o++) for (let s = Math.min(o, Wr); s >= 0 && o - s <= Wr; s--) {
		let c = o - s;
		if (t + s < n && i + c < a && e[t + s] === r[i + c].text) return [s, c];
	}
	return [+(t < n), +(i < a)];
}
function Kr(e, t) {
	let n = Math.min(e.length, t.length), r = 0;
	for (; r < n && e[e.length - 1 - r] === t[t.length - 1 - r].text;) r++;
	return r;
}
function qr(e, t) {
	if (e.length !== t.length) return !1;
	for (let n = 0; n < e.length; n++) if (e[n].from !== t[n].from || e[n].to !== t[n].to || e[n].current !== t[n].current) return !1;
	return !0;
}
function Jr(e, t, n) {
	if (t.length === 0 && n.length === 0) return V(e);
	let r = /* @__PURE__ */ new Set([0, e.length]);
	for (let e of t) r.add(e.from), r.add(e.to);
	for (let e of n) r.add(e.from), r.add(e.to);
	let i = [...r].sort((e, t) => e - t), a = "", o = 0, s = 0;
	for (let r = 0; r + 1 < i.length; r++) {
		let c = i[r], l = i[r + 1];
		for (; o < t.length && t[o].to <= c;) o++;
		for (; s < n.length && n[s].to <= c;) s++;
		let u = o < t.length && t[o].from <= c ? t[o].kind : null, d = s < n.length && n[s].from <= c ? n[s] : null, f = V(e.slice(c, l));
		if (u === null && d === null) {
			a += f;
			continue;
		}
		a += `<span class="${Yr(u, d)}">${f}</span>`;
	}
	return a;
}
function Yr(e, t) {
	let n = e === null ? "" : `ui-tk-${e}`;
	return t !== null && (n += (n.length > 0 ? " " : "") + (t.current ? `${m} ${h}` : m)), n;
}
function V(e) {
	return e.replace(/[&<>"']/g, (e) => Xr[e]);
}
var Xr = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
}, Zr = class {
	root;
	textarea;
	highlight;
	position;
	strings;
	getLanguage;
	selections;
	notifyTextChanged;
	history = new wr();
	highlighter;
	lastValue;
	pendingBefore = null;
	constructor(e, t, n, r, i) {
		this.root = e.root, this.textarea = e.textarea, this.highlight = e.highlight, this.position = e.position, this.strings = t, this.getLanguage = n, this.selections = r, this.notifyTextChanged = i, this.highlighter = new Ur(B.get(n())), this.lastValue = e.textarea.value;
	}
	renderAll() {
		this.highlight.replaceChildren(), this.redraw();
	}
	redraw() {
		this.applyChanges(this.highlighter.update(this.textarea.value)), this.updateGutter();
	}
	applyChanges(e) {
		let t = "";
		for (let n of e) for (let e = n.from; e < n.from + n.added; e++) t += `<div class="${s}">${this.highlighter.renderLine(e)}</div>`;
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
	updateGutter() {
		let e = String(Math.max(2, String(this.highlighter.lineCount).length));
		this.root.style.getPropertyValue("--ui-code-gutter-digits") !== e && this.root.style.setProperty(l, e);
	}
	get tabSize() {
		let e = Number.parseInt(getComputedStyle(this.root).getPropertyValue(r), 10);
		return Number.isFinite(e) && e > 0 ? e : 4;
	}
	writePosition() {
		if (this.position === null) return;
		let e = this.textarea.value, t = this.textarea.selectionEnd, n = e.lastIndexOf("\n", t - 1) + 1, r = this.highlighter.lineAt(n) + 1;
		this.strings.write(this.position, null, "ui.code.position", {
			line: r,
			column: t - n + 1 + this.selections.virtualColumns()
		});
	}
	setLanguage() {
		this.highlighter = new Ur(B.get(this.getLanguage())), this.renderAll();
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
		let n = Dr(this.lastValue, t, this.textarea.selectionEnd), r = {
			edits: [n],
			removed: [this.lastValue.slice(n.from, n.to)],
			before: this.pendingBefore ?? T(n.from, n.to),
			after: this.selections.read()
		};
		this.history.record(r, Qr(e)), this.lastValue = t, this.pendingBefore = null, this.redraw(), this.writePosition(), this.notifyTextChanged(!1);
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
		}, n), this.commit(be(r, e), e.length === 1 ? e[0] : null, t, n === "typing");
	}
	adoptOutsideValue() {
		this.textarea.value !== this.lastValue && (this.history.clear(), this.lastValue = this.textarea.value, this.redraw());
	}
	commit(e, t, n, r) {
		t === null ? this.textarea.value = e : this.textarea.setRangeText(t.text, t.from, t.to), this.lastValue = e, this.pendingBefore = null, this.redraw(), this.selections.write(n, !0), this.writePosition(), this.notifyTextChanged(!1), this.textarea.dispatchEvent(r ? new InputEvent("input", {
			bubbles: !0,
			inputType: "insertText"
		}) : new Event("input", { bubbles: !0 }));
	}
	replaceRange(e, t, n) {
		this.apply([{
			from: e,
			to: t,
			text: n
		}], T(e + n.length), "other");
	}
	select(e, t) {
		this.selections.write(T(e, t), !1);
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
		t !== null && this.commit(t.text, null, t.selections, !1);
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
	renderLines(e) {
		for (let t of e) {
			let e = this.highlight.children[t];
			e !== void 0 && (e.innerHTML = this.highlighter.renderLine(t));
		}
	}
};
function Qr(e) {
	let t = e instanceof InputEvent ? e.inputType : "";
	return t === "insertText" || t === "insertCompositionText" ? "typing" : t === "deleteContentBackward" || t === "deleteContentForward" ? "deleting" : "other";
}
//#endregion
//#region src/code-editor.ts
var $r = class e {
	root;
	surface;
	carets;
	editing;
	completions;
	findReplace;
	statusBar;
	readOnlyClass;
	language;
	readOnly;
	constructor(e, n, r) {
		this.root = e, this.language = z.normalize(e.getAttribute(t)), this.readOnlyClass = n.names.readOnlyClass, this.readOnly = e.classList.contains(this.readOnlyClass);
		let i = n.strings;
		this.surface = new Zr({
			root: e,
			textarea: r.textarea,
			highlight: r.highlight,
			position: r.position
		}, i, () => this.language, {
			read: () => this.carets.read(),
			write: (e, t) => this.carets.write(e, t),
			virtualColumns: () => this.carets.primaryPadding
		}, (e) => this.findReplace?.refreshIfOpen(e)), this.surface.renderAll(), this.carets = new Ee({
			root: e,
			textarea: r.textarea,
			scroller: r.scroller,
			content: r.content
		}, this.surface), this.editing = new Sr(r.textarea, this.surface, this.carets, () => this.language), this.completions = new gr({
			root: e,
			textarea: r.textarea,
			scroller: r.scroller,
			content: r.content
		}, n, this.surface, this.editing, this.carets, () => this.language), this.findReplace = r.search === null ? null : new Lr({
			textarea: r.textarea,
			scroller: r.scroller,
			...r.search
		}, i, n.names, n.validation, this.surface), this.statusBar = new zr({
			root: e,
			textarea: r.textarea,
			bar: r.statusBar,
			tabSize: r.tabSize,
			encoding: r.encoding,
			lineEnding: r.lineEnding,
			language: r.language
		}, n.values, n.properties, () => {
			this.settingsChanged(), this.carets.queueRender();
		}), this.readOnly && this.statusBar.syncReadOnly(!0), this.surface.writePosition();
		let { textarea: a, scroller: o } = r;
		a.addEventListener("beforeinput", (e) => this.editing.beforeInput(e)), a.addEventListener("input", (e) => this.surface.nativeInput(e)), a.addEventListener("keydown", (e) => {
			this.completions.key(e), this.carets.key(e), this.editing.key(e);
		}), a.addEventListener("keyup", () => this.surface.writePosition()), a.addEventListener("click", () => this.surface.writePosition()), a.addEventListener("mousedown", (e) => this.carets.pointerDown(e)), a.addEventListener("compositionstart", () => this.editing.compositionStart()), a.addEventListener("copy", (e) => this.editing.copy(e)), a.addEventListener("cut", (e) => this.editing.cut(e)), a.addEventListener("paste", (e) => this.editing.paste(e)), a.addEventListener("input", (e) => this.completions.textChanged(e)), a.addEventListener("blur", () => this.completions.close()), o.addEventListener("scroll", () => this.carets.queueRender(), { passive: !0 }), o.addEventListener("scroll", () => this.completions.scrolled(), { passive: !0 }), e.addEventListener("keydown", (e) => this.rootKey(e));
		for (let e of [r.search?.panel, r.statusBar]) e?.addEventListener("mousedown", (e) => this.groundPressed(e));
		this.findReplace !== null && r.search !== null && this.wireSearch(this.findReplace, r.search, n.names);
	}
	wireSearch(e, t, n) {
		let { panel: r, findField: i, replaceField: a } = t;
		i.addEventListener("input", () => e.search(!1, !0)), i.addEventListener("keydown", (t) => e.findFieldKey(t)), a.addEventListener("keydown", (t) => e.replaceFieldKey(t));
		for (let n of [
			t.matchCase,
			t.wholeWord,
			t.regex
		]) n?.addEventListener("change", () => e.search(!1, !0));
		t.expand?.addEventListener("click", () => e.toggleReplace()), H(r, "data-ui-code-previous", n)?.addEventListener("click", () => e.step(-1)), H(r, "data-ui-code-next", n)?.addEventListener("click", () => e.step(1)), H(r, "data-ui-code-close", n)?.addEventListener("click", () => e.close(!0)), H(r, "data-ui-code-replace-one", n)?.addEventListener("click", () => e.replaceOne()), H(r, "data-ui-code-replace-all", n)?.addEventListener("click", () => e.replaceEvery());
	}
	groundPressed(e) {
		!(e.target instanceof Element && e.target.closest(".ui-code-input__search-part, .ui-code-input__status-picker") !== null) && this.root.contains(document.activeElement) && e.preventDefault();
	}
	static create(n, r) {
		let i = n.querySelector("textarea.ui-code-input__text"), a = n.querySelector(".ui-code-input__scroller"), o = n.querySelector(".ui-code-input__content"), s = n.querySelector(".ui-code-input__highlight");
		return i === null || a === null || o === null || s === null ? null : new e(n, r, {
			textarea: i,
			scroller: a,
			content: o,
			highlight: s,
			search: ei(n, r.names),
			statusBar: n.querySelector(".ui-code-input__status"),
			position: n.querySelector("[data-ui-code-position]"),
			tabSize: ti(n, "data-ui-code-tab-size", r.names),
			encoding: ti(n, "data-ui-code-encoding", r.names),
			lineEnding: ti(n, "data-ui-code-line-ending", r.names),
			language: ti(n, t, r.names)
		});
	}
	get languageId() {
		return this.language;
	}
	get connected() {
		return this.root.isConnected;
	}
	wordsChanged() {
		this.findReplace?.wordsChanged();
	}
	dispose() {
		this.carets.dispose();
	}
	syncPickers() {
		this.statusBar.syncPickers(), this.carets.queueRender();
	}
	selectionChanged() {
		this.carets.selectionChanged(), this.surface.writePosition(), this.completions.selectionChanged();
	}
	readOnlyChanged() {
		let e = this.root.classList.contains(this.readOnlyClass);
		e !== this.readOnly && (this.readOnly = e, this.statusBar.syncReadOnly(e), e && this.findReplace?.replaceHidden(), this.settingsChanged());
	}
	settingsChanged() {
		let e = z.normalize(this.root.getAttribute(t));
		this.statusBar.syncPickers(), this.carets.settingsChanged(), this.completions.settingsChanged(), !this.searchEnabled && this.findReplace?.isOpen === !0 && this.findReplace.close(this.findReplace.holdsFocus), this.root.hasAttribute("data-ui-code-status") || this.statusBar.barHidden(), e !== this.language && (this.language = e, this.reload());
	}
	reload() {
		this.completions.close(), this.surface.setLanguage(), this.findReplace?.search(!0, !1);
	}
	refresh(e) {
		if (typeof e == "string" && e.includes("\n")) {
			let t = e.includes("\r\n") ? te : "lf";
			this.root.setAttribute("data-ui-code-eol", t), this.statusBar.showDetectedEnding(t);
		}
		this.completions.close(), this.surface.textPushed() && this.carets.collapse();
	}
	get searchEnabled() {
		return this.root.hasAttribute(n);
	}
	rootKey(e) {
		if (e.defaultPrevented || e.isComposing) return;
		let t = e.ctrlKey || e.metaKey, n = this.findReplace;
		t && !e.altKey && e.code === "KeyF" && this.searchEnabled && n !== null ? (e.preventDefault(), n.open(!1)) : t && !e.altKey && e.code === "KeyH" && this.searchEnabled && n !== null ? (e.preventDefault(), n.open(!0)) : t && !e.altKey && e.code === "KeyS" ? (e.preventDefault(), this.surface.save()) : e.key === "Escape" && n?.isOpen === !0 ? (e.preventDefault(), n.close(!0)) : e.code === "F3" && n?.isOpen === !0 && (e.preventDefault(), n.step(e.shiftKey ? -1 : 1));
	}
};
function ei(e, t) {
	let n = e.querySelector(".ui-code-input__search"), r = e.querySelector("[data-ui-code-find] input"), i = e.querySelector("[data-ui-code-replace] input"), a = e.querySelector(".ui-code-input__search-row--replace"), o = e.querySelector("[data-ui-code-count]");
	return n === null || r === null || i === null || a === null || o === null ? null : {
		panel: n,
		findField: r,
		replaceField: i,
		replaceRow: a,
		expand: H(n, "data-ui-code-toggle-replace", t),
		count: o,
		matchCase: H(n, "data-ui-code-match-case", t),
		wholeWord: H(n, "data-ui-code-whole-word", t),
		regex: H(n, "data-ui-code-regex", t)
	};
}
function H(e, t, n) {
	return e.querySelector(`[${t}] > .${n.buttonClass}`);
}
function ti(e, t, n) {
	let r = e.querySelector(`input[${t}]`), i = r?.parentElement?.querySelector(`.${n.selectClass}`) ?? null;
	return r === null || i === null ? null : {
		carrier: r,
		select: i
	};
}
//#endregion
//#region src/code-input-engine.ts
var U = `.${e}`, ni = "markdown", ri = /* @__PURE__ */ new Set([
	"TabSize",
	"Encoding",
	"LineEnding",
	"Language"
]);
function ii(e) {
	if (!(e instanceof HTMLTextAreaElement)) return null;
	let t = e.value, n = e.closest(U);
	return n !== null && ai(n) === "crlf" ? t.replace(/\r?\n/g, "\r\n") : t;
}
function ai(e) {
	let t = e.querySelector("input[data-ui-code-line-ending]")?.value ?? "";
	return t.length > 0 ? t : e.getAttribute("data-ui-code-eol") ?? "lf";
}
var oi = class {
	context;
	editors = /* @__PURE__ */ new WeakMap();
	live = /* @__PURE__ */ new Set();
	constructor(e) {
		this.context = e, this.attach(e.root.querySelectorAll(U));
		let r = [
			t,
			n,
			"data-ui-code-multi-caret",
			"data-ui-code-completions",
			"data-ui-code-status"
		];
		e.observeComponents(e.root, U, {
			childList: !0,
			attributeFilter: r
		}, (e) => this.attach(e)), e.observeComponents(e.root, U, {
			attributeFilter: ["class"],
			relevant: (e) => e.target instanceof Element && e.target.matches(U)
		}, (e) => {
			for (let t of e) this.editors.get(t)?.readOnlyChanged();
		}), e.observeComponents(e.root, "*", { childList: !0 }, () => this.prune()), B.onRegistered((e) => {
			for (let t of this.live) t.connected && (t.languageId === e || t.languageId === ni) && t.reload();
		}), e.strings.onChange(() => {
			for (let e of this.live) e.connected && e.wordsChanged();
		}), e.propertyPatchEngine.addValueChangeHandler((e) => {
			if (!e.local) for (let t of e.components) {
				let n = this.editors.get(t);
				e.propertyName === "Value" ? n?.refresh(e.value) : ri.has(e.propertyName) && n?.syncPickers();
			}
		}), document.addEventListener("selectionchange", () => {
			let e = document.activeElement, t = e instanceof HTMLTextAreaElement ? e.closest(U) : null;
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
				let e = $r.create(t, this.context);
				e !== null && (this.editors.set(t, e), this.live.add(e));
			} else e.settingsChanged();
		}
	}
}, si = 2;
function ci() {
	let e = window.NEStandardUI;
	if (e === void 0 || typeof e.registerEngine != "function") throw Error("NE.Standard.UI.Web.CodeInput needs the framework's client (ui.js) on the page before it.");
	if (e.contractVersion !== si) throw Error(`NE.Standard.UI.Web.CodeInput was built for plugin contract ${si}, but the framework's client on the page implements ${String(e.contractVersion ?? "an older one")}; install the package version that matches the framework.`);
	return e;
}
//#endregion
//#region src/markdown-inlines.ts
var W = class {
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
function li(e) {
	return e.trim().replace(/\s+/g, " ").toLowerCase().toUpperCase();
}
var ui = /[\n\\`*_~[\]!<&]/g, di = /^[!-/:-@[-`{-~]$/, fi = /^\s$/u, pi = /^[\p{P}\p{S}]$/u, mi = /&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[A-Za-z][A-Za-z\d]{1,31});/y, hi = /<([A-Za-z][A-Za-z\d+.-]{1,31}:[^<>\u0000-\u0020]*)>/y, gi = /<([A-Za-z\d.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?)*)>/y, _i = /`+/g, vi = /(?:https?:\/\/|www\.)[^\s<]+/g;
function yi(e, t) {
	let n = new W("root");
	return new bi(e, t).parse(n), xi(n), n;
}
var bi = class {
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
		t !== null && t.type === "text" && t.literal.endsWith(" ") && (n = t.literal.endsWith("  "), t.literal = t.literal.replace(/ +$/, "")), e.appendChild(new W(n ? "hardbreak" : "softbreak")), this.skipSpaces();
	}
	backslash(e) {
		this.position++;
		let t = this.text.charAt(this.position);
		t === "\n" ? (this.position++, e.appendChild(new W("hardbreak")), this.skipSpaces()) : di.test(t) ? (this.position++, e.appendChild(new W("text", t))) : e.appendChild(new W("text", "\\"));
	}
	codeSpan(e) {
		let t = this.position;
		for (; this.text.charAt(this.position) === "`";) this.position++;
		let n = this.position - t;
		_i.lastIndex = this.position;
		for (let t = _i.exec(this.text); t !== null; t = _i.exec(this.text)) {
			if (t[0].length !== n) continue;
			let r = this.text.slice(this.position, t.index).replace(/\n/g, " ");
			r.length > 2 && r.startsWith(" ") && r.endsWith(" ") && /[^ ]/.test(r) && (r = r.slice(1, -1)), e.appendChild(new W("code", r)), this.position = t.index + n;
			return;
		}
		e.appendChild(new W("text", this.text.slice(t, this.position)));
	}
	delimiterRun(e) {
		let t = this.position, n = this.text.charAt(t);
		for (; this.text.charAt(this.position) === n;) this.position++;
		let r = this.position - t, i = new W("text", this.text.slice(t, this.position));
		if (e.appendChild(i), n === "~" && r > 2) return;
		let a = t === 0 ? "\n" : this.text.charAt(t - 1), o = this.position >= this.text.length ? "\n" : this.text.charAt(this.position), s = fi.test(a), c = fi.test(o), l = pi.test(a), u = pi.test(o), d = !c && (!u || s || l), f = !s && (!l || c || u), p = {
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
		this.text.charAt(this.position + 1) === "[" ? (this.position += 2, this.openBracket(e, "![", !0)) : (this.position++, e.appendChild(new W("text", "!")));
	}
	openBracket(e, t, n) {
		let r = new W("text", t);
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
			e.appendChild(new W("text", "]"));
			return;
		}
		if (!n.active) {
			e.appendChild(new W("text", "]")), this.brackets = n.previousBracket;
			return;
		}
		let r = this.inlineTarget() ?? this.referenceTarget(n, t);
		if (r === null) {
			this.brackets = n.previousBracket, this.position = t, e.appendChild(new W("text", "]"));
			return;
		}
		let i = new W(n.image ? "image" : "link");
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
					let t = G(this.text.slice(this.position + 1, e));
					return this.position = e + 1, t;
				}
			}
			return null;
		}
		let e = this.position, t = 0;
		for (; this.position < this.text.length;) {
			let e = this.text.charAt(this.position);
			if (e === "\\" && di.test(this.text.charAt(this.position + 1))) {
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
		return t === 0 ? G(this.text.slice(e, this.position)) : (this.position = e, null);
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
				let t = G(this.text.slice(this.position + 1, e));
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
		let r = n === null || n.length > 999 ? void 0 : this.references.get(li(n));
		return r === void 0 ? (this.position = t, null) : r;
	}
	autolink(e) {
		for (let [t, n] of [[hi, ""], [gi, "mailto:"]]) {
			t.lastIndex = this.position;
			let r = t.exec(this.text);
			if (r === null) continue;
			let i = new W("link");
			i.href = n + r[1], i.appendChild(new W("text", r[1])), e.appendChild(i), this.position += r[0].length;
			return;
		}
		this.position++, e.appendChild(new W("text", "<"));
	}
	entity(e) {
		mi.lastIndex = this.position;
		let t = mi.exec(this.text);
		if (t === null) {
			this.position++, e.appendChild(new W("text", "&"));
			return;
		}
		this.position += t[0].length, e.appendChild(new W("entity", t[0]));
	}
	plainText(e) {
		ui.lastIndex = this.position + 1;
		let t = ui.exec(this.text), n = t === null ? this.text.length : t.index;
		e.appendChild(new W("text", this.text.slice(this.position, n))), this.position = n;
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
				let e = r === "~" ? n.count : n.count >= 2 && o.count >= 2 ? 2 : 1, t = new W(r === "~" ? "strikethrough" : e === 1 ? "emphasis" : "strong");
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
function G(e) {
	return e.replace(/\\([!-/:-@[-`{-~])/g, "$1");
}
function xi(e) {
	Si(e);
	for (let t = e.firstChild; t !== null;) {
		let e = t.next;
		t.type === "text" ? Ci(t) : t.type !== "link" && t.type !== "image" && t.firstChild !== null && xi(t), t = e;
	}
}
function Si(e) {
	for (let t = e.firstChild; t !== null; t = t.next) for (; t.type === "text" && t.next !== null && t.next.type === "text";) t.literal += t.next.literal, t.next.unlink();
}
function Ci(e) {
	let t = e.literal, n = [], r = 0;
	vi.lastIndex = 0;
	for (let e = vi.exec(t); e !== null; e = vi.exec(t)) {
		if (e.index > 0 && !/[\s(*_~]/.test(t.charAt(e.index - 1))) continue;
		let i = wi(e[0]);
		if (!/^(?:https?:\/\/|www\.)[^./]/.test(i)) continue;
		e.index > r && n.push(new W("text", t.slice(r, e.index)));
		let a = new W("link");
		a.href = i.startsWith("www.") ? `http://${i}` : i, a.appendChild(new W("text", i)), n.push(a), r = e.index + i.length, vi.lastIndex = r;
	}
	if (n.length === 0) return;
	r < t.length && n.push(new W("text", t.slice(r)));
	let i = e;
	for (let e of n) i.insertAfter(e), i = e;
	e.unlink();
}
function wi(e) {
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
var Ti = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/, K = /^( {0,3})(?:([-*+])|(\d{1,9})([.)]))([ \t]+|$)/, Ei = /^ {0,3}(=+|-+)[ \t]*$/, Di = /^\[([ xX])\](?:[ \t]+|$)/, Oi = /^ {0,3}\[((?:[^\]\\]|\\.){1,999})\]:[ \t]*(<[^>\n]*>|\S+)(?:[ \t]+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^()\\]|\\.)*\)))?[ \t]*$/;
function ki(e) {
	let t = /* @__PURE__ */ new Map();
	return {
		blocks: ji(e.replace(/\r\n?/g, "\n").split("\n").map(Ai), 1, t, null, 0),
		references: t
	};
}
function Ai(e) {
	if (!e.includes("	")) return e;
	let t = "", n = 0;
	for (; n < e.length && (e.charAt(n) === " " || e.charAt(n) === "	"); n++) t += e.charAt(n) === " " ? " " : " ".repeat(4 - t.length % 4);
	return t + e.slice(n);
}
function ji(e, t, n, r, i) {
	let a = [], o = !1, s = 0;
	for (; s < e.length;) {
		let c = e[s];
		if (Y(c)) {
			o = a.length > 0, s++;
			continue;
		}
		o && r !== null && (r.separated = !0), o = !1, s = Mi(e, s, t, n, a, i);
	}
	return a;
}
function Mi(e, t, n, r, i, a) {
	let o = e[t], s = n + t;
	if (X(o) >= 4) return Ni(e, t, s, i);
	let c = I(o);
	if (c !== null) return Pi(e, t, s, c, i);
	let l = Ti.exec(o);
	if (l !== null) return i.push({
		line: s,
		type: "heading",
		level: l[1].length,
		text: (l[2] ?? "").trim()
	}), t + 1;
	if (F.test(o)) return i.push({
		line: s,
		type: "rule"
	}), t + 1;
	let u = a < 64;
	if (u && P.test(o)) return Fi(e, t, s, r, i, a);
	let d = u ? K.exec(o) : null;
	return d === null ? Vi(e, t) ? Hi(e, t, s, i) : Wi(e, t, s, r, i) : zi(e, t, s, d, r, i, a);
}
function Ni(e, t, n, r) {
	let i = t;
	for (; i < e.length && (Y(e[i]) || X(e[i]) >= 4);) i++;
	let a = i;
	for (; a > t && Y(e[a - 1]);) a--;
	return r.push({
		line: n,
		type: "code",
		info: "",
		text: e.slice(t, a).map((e) => e.slice(Math.min(4, X(e)))).join("\n")
	}), a;
}
function Pi(e, t, n, r, i) {
	let a = r.indent, o = r.marker, s = [], c = t + 1;
	for (; c < e.length; c++) {
		if (En(e[c], o)) {
			c++;
			break;
		}
		s.push(e[c].slice(Math.min(a, X(e[c]))));
	}
	return i.push({
		line: n,
		type: "code",
		info: G(r.info.trim()),
		text: s.join("\n")
	}), c;
}
function Fi(e, t, n, r, i, a) {
	let o = [], s = null, c = t;
	for (; c < e.length; c++) {
		let t = e[c], n = P.exec(t);
		if (n !== null) {
			let e = t.slice(n[0].length);
			o.push(e), s = s === !0 && qi(e) ? !0 : null;
			continue;
		}
		if (Y(t) || J(t) || Ji(t) || (s ??= Ii(o, a + 1), !s)) break;
		o.push(t);
	}
	return i.push({
		line: n,
		type: "quote",
		children: ji(o, n, r, null, a + 1)
	}), c;
}
function Ii(e, t) {
	let n = e.at(-1);
	if (n === void 0 || Y(n) || Li(e)) return !1;
	if (t < 64 && P.test(n)) {
		let n = e.length - 1;
		for (; n > 0 && P.test(e[n - 1]);) n--;
		return Ii(e.slice(n).map((e) => e.replace(P, "")), t + 1);
	}
	if (Ri(e) || e.length > 1 && !Y(e[e.length - 2]) && Ei.test(n)) return !1;
	let r = n;
	for (let e = K.exec(r); e !== null && r.length > 0; e = K.exec(r)) r = r.slice(e[0].length);
	return !Ti.test(r) && !F.test(r) && I(r) === null;
}
function Li(e) {
	let t = null, n = !1;
	for (let r of e) n = !1, t === null ? t = I(r)?.marker ?? null : En(r, t) && (t = null, n = !0);
	return t !== null || n;
}
function Ri(e) {
	for (let t = e.length - 1; t >= 0 && !Y(e[t]); t--) {
		if (Vi(e, t)) return !0;
		if (J(e[t])) return !1;
	}
	return !1;
}
function zi(e, t, n, r, i, a, o) {
	let s = r[3] !== void 0, c = s ? r[4] : r[2], l = [], u = !0, d = t;
	for (; d < e.length;) {
		let r = K.exec(e[d]);
		if (r === null || F.test(e[d]) || r[3] !== void 0 !== s || (s ? r[4] : r[2]) !== c) break;
		let a = r[1].length + (s ? r[3].length + 1 : 1), f = r[5].length, p = a + (f === 0 || f > 4 ? 1 : f), m = n + (d - t), h = [e[d].slice(Math.min(p, e[d].length))], g = null;
		for (d++; d < e.length;) {
			let t = e[d];
			if (Y(t)) {
				h.push(""), g = null, d++;
				continue;
			}
			if (X(t) >= p) {
				let e = t.slice(p);
				h.push(e), g = g === !0 && qi(e) ? !0 : null, d++;
				continue;
			}
			if (!J(t) && !K.test(t) && (g ??= Ii(h, o + 1))) {
				h.push(t.trimStart()), d++;
				continue;
			}
			break;
		}
		let _ = 0;
		for (; h.length > 1 && Y(h[h.length - 1]);) h.pop(), _++;
		let ee = { separated: !1 };
		l.push(Bi(h, m, i, o + 1, ee)), ee.separated && (u = !1);
		let v = K.exec(e[d] ?? ""), te = v !== null && !F.test(e[d]) && v[3] !== void 0 === s && (s ? v[4] : v[2]) === c;
		if (_ > 0) {
			if (te) u = !1;
			else {
				d -= _;
				break;
			}
		}
	}
	return a.push({
		line: n,
		type: "list",
		ordered: s,
		start: s ? Number.parseInt(r[3], 10) : 1,
		tight: u,
		items: l
	}), d;
}
function Bi(e, t, n, r, i) {
	let a = Di.exec(e[0]), o = null;
	a !== null && e[0].length > a[0].length && (o = a[1] !== " ", e[0] = e[0].slice(a[0].length));
	let s = ji(e, t, n, i, r);
	return {
		line: t,
		checked: o,
		children: s
	};
}
function Vi(e, t) {
	let n = e[t + 1];
	return e[t].includes("|") && n !== void 0 && n.includes("-") && Tn.test(n) && q(e[t]).length === q(n).length;
}
function Hi(e, t, n, r) {
	let i = q(e[t]), a = q(e[t + 1]).map(Ui), o = [], s = t + 2;
	for (; s < e.length && !Y(e[s]) && !J(e[s]); s++) {
		let t = q(e[s]);
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
function Ui(e) {
	let t = e.startsWith(":"), n = e.endsWith(":");
	return t && n ? "center" : n ? "right" : t ? "left" : null;
}
function q(e) {
	let t = e.trim();
	t.startsWith("|") && (t = t.slice(1)), t.endsWith("|") && !t.endsWith("\\|") && (t = t.slice(0, -1));
	let n = [], r = "";
	for (let e = 0; e < t.length; e++) {
		let i = t.charAt(e);
		i === "\\" && t.charAt(e + 1) === "|" ? (r += "|", e++) : i === "|" ? (n.push(r.trim()), r = "") : r += i;
	}
	return n.push(r.trim()), n;
}
function Wi(e, t, n, r, i) {
	let a = [e[t].trimStart()], o = t + 1;
	for (; o < e.length; o++) {
		let t = e[o], r = Ei.exec(t);
		if (r !== null && !Ki(a)) return i.push({
			line: n,
			type: "heading",
			level: r[1].startsWith("=") ? 1 : 2,
			text: a.join("\n").trim()
		}), o + 1;
		if (Y(t) || J(t) || Ji(t) || Vi(e, o)) break;
		a.push(t.trimStart());
	}
	let s = Gi(a, r);
	return s.length > 0 && i.push({
		line: n,
		type: "paragraph",
		text: s
	}), o;
}
function Gi(e, t) {
	let n = 0;
	for (; n < e.length; n++) {
		let r = Oi.exec(e[n].trimEnd());
		if (r === null) break;
		let i = li(r[1]), a = r[2].startsWith("<") ? r[2].slice(1, -1) : r[2];
		i.length > 0 && !t.has(i) && t.set(i, {
			href: G(a),
			title: r[3] === void 0 ? "" : G(r[3].slice(1, -1))
		});
	}
	return e.slice(n).join("\n").trimEnd();
}
function Ki(e) {
	return e.every((e) => Oi.test(e.trimEnd()));
}
function J(e) {
	return Ti.test(e) || F.test(e) || P.test(e) || I(e) !== null;
}
function qi(e) {
	return !Y(e) && !J(e) && !Ji(e) && !Ei.test(e) && !Tn.test(e);
}
function Ji(e) {
	let t = K.exec(e);
	return t !== null && t[5].length > 0 && !Y(e.slice(t[0].length)) && (t[3] === void 0 || t[3] === "1");
}
function Y(e) {
	return e.trim().length === 0;
}
function X(e) {
	let t = 0;
	for (; e.charAt(t) === " ";) t++;
	return t;
}
//#endregion
//#region src/markdown-render.ts
var Z = i;
function Yi(e, t, n) {
	let r = ki(e);
	return Xi(r.blocks, {
		references: r.references,
		highlight: t,
		names: n
	}, !1);
}
function Xi(e, t, n) {
	let r = "";
	for (let i of e) r += Zi(i, t, n);
	return r;
}
function Zi(e, t, n) {
	let { references: r, highlight: i } = t, a = Q(e.line, t);
	switch (e.type) {
		case "paragraph": {
			let t = $(yi(e.text, r));
			return n ? t : `<p${a}>${t}</p>`;
		}
		case "heading": return `<h${e.level}${a}>${$(yi(e.text, r))}</h${e.level}>`;
		case "code": {
			let t = e.info.split(/\s+/, 1)[0], n = t.length > 0 ? i(e.text, t) : null;
			return `<pre class="${Z}__code"${t.length > 0 ? ` data-language="${V(t)}"` : ""}${a}><code>${n ?? V(e.text)}</code></pre>`;
		}
		case "quote": return `<blockquote${a}>${Xi(e.children, t, !1)}</blockquote>`;
		case "list": return Qi(e.ordered, e.start, e.tight, e.items, t);
		case "table": return $i(e.line, e.alignments, e.head, e.rows, t);
		case "rule": return `<hr${a}>`;
	}
}
function Q(e, t) {
	return ` ${t.names.sourceLine}="${e}"`;
}
function Qi(e, t, n, r, i) {
	let a = e ? "ol" : "ul", s = `<${a}${e && t !== 1 ? ` start="${t}"` : ""}${r.some((e) => e.checked !== null) ? ` class="${Z}__tasks"` : ""}>`;
	for (let e of r) {
		let t = Xi(e.children, i, n);
		if (e.checked === null) {
			s += `<li${Q(e.line, i)}>${t}</li>`;
			continue;
		}
		let r = e.checked ? " checked" : "", a = `${o.checkboxClass} ${o.smallInputClass} ${i.names.readOnlyClass} ${Z}__check`;
		s += `<li class="${Z}__task"${Q(e.line, i)}><span class="${a}"><input class="${o.checkboxInputClass}" type="checkbox" tabindex="-1" aria-readonly="true"${r}><span class="${o.checkboxBoxClass}"></span></span>${t}</li>`;
	}
	return `${s}</${a}>`;
}
function $i(e, t, n, r, i) {
	let a = (e, n, r) => {
		let a = t[r];
		return `<${e}${a == null ? "" : ` class="${Z}__cell--${a}"`}>${$(yi(n, i.references))}</${e}>`;
	}, o = `<div class="${Z}__table"${Q(e, i)}><table>`;
	if (n.some((e) => e !== "")) {
		o += "<thead><tr>";
		for (let [e, t] of n.entries()) o += a("th", t, e);
		o += "</tr></thead>";
	}
	if (r.length > 0) {
		o += "<tbody>";
		for (let e of r) {
			o += "<tr>";
			for (let [t, n] of e.entries()) o += a("td", n, t);
			o += "</tr>";
		}
		o += "</tbody>";
	}
	return `${o}</table></div>`;
}
function $(e) {
	let t = "";
	for (let n = e.firstChild; n !== null; n = n.next) switch (n.type) {
		case "text":
			t += V(n.literal);
			break;
		case "entity":
			t += n.literal;
			break;
		case "code":
			t += `<code>${V(n.literal)}</code>`;
			break;
		case "emphasis":
			t += `<em>${$(n)}</em>`;
			break;
		case "strong":
			t += `<strong>${$(n)}</strong>`;
			break;
		case "strikethrough":
			t += `<del>${$(n)}</del>`;
			break;
		case "link":
			t += ea(n);
			break;
		case "image":
			t += ta(n);
			break;
		case "hardbreak":
			t += "<br>";
			break;
		case "softbreak":
			t += "\n";
			break;
		default: t += $(n);
	}
	return t;
}
function ea(e) {
	let t = $(e), n = ia(e.href, !1);
	if (n === null) return t;
	let r = e.title.length > 0 ? ` title="${V(e.title)}"` : "", i = /^(?:https?:|[\\/]{2})/i.test(n.replace(/[\t\n\r]/g, "")) ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "";
	return `<a href="${V(n)}"${r}${i}>${t}</a>`;
}
function ta(e) {
	let t = V(na(e)), n = ia(e.href, !0);
	if (n === null) return t;
	let r = e.title.length > 0 ? ` title="${V(e.title)}"` : "";
	return `<img src="${V(n)}" alt="${t}"${r} loading="lazy">`;
}
function na(e) {
	let t = "";
	for (let n = e.firstChild; n !== null; n = n.next) n.type === "text" || n.type === "code" || n.type === "entity" ? t += n.literal : n.type === "softbreak" || n.type === "hardbreak" ? t += " " : t += na(n);
	return t;
}
var ra = /* @__PURE__ */ new Set([
	"http",
	"https",
	"mailto",
	"tel"
]);
function ia(e, t) {
	let n = e.replace(/[\s\x00-\x1f\x7f]/g, ""), r = /^([A-Za-z][A-Za-z\d+.-]*):/.exec(n);
	if (r === null) return e.trim();
	let i = r[1].toLowerCase();
	return ra.has(i) ? e.trim() : t && i === "data" && /^data:image\/(?:png|gif|jpe?g|webp|avif|bmp);/i.test(n) ? n : null;
}
//#endregion
//#region src/markdown-display-engine.ts
var aa = `.${i}`, oa = `.${a}`, sa = class {
	names;
	rendered = /* @__PURE__ */ new WeakMap();
	live = /* @__PURE__ */ new Set();
	constructor(e) {
		this.names = e.names, e.observeComponents(e.root, aa, {
			childList: !0,
			attributeFilter: ["data-ui-markdown-source"]
		}, (e) => this.renderAll(e, !1)), B.onRegistered(() => this.renderAll([...this.live], !0)), this.renderAll(e.root.querySelectorAll(aa), !1);
	}
	renderAll(e, t) {
		for (let e of this.live) e.isConnected || this.live.delete(e);
		for (let n of e) {
			let e = n.getAttribute("data-ui-markdown-source") ?? "", r = n.querySelector(oa);
			r === null || !t && this.rendered.get(n) === e || (this.rendered.set(n, e), this.live.add(n), r.innerHTML = ca(e, this.names));
		}
	}
};
function ca(e, t) {
	try {
		return Yi(e, la, t);
	} catch (t) {
		return console.warn("NE.Standard.UI.Web.CodeInput: a Markdown document could not be rendered; its source is shown instead.", t), `<pre class="${i}__code"><code>${V(e)}</code></pre>`;
	}
}
function la(e, t) {
	let n = B.get(On(t));
	if (n === null) return null;
	let r = n.initialState;
	try {
		return e.split("\n").map((e) => {
			let t = [];
			return r = n.tokenizeLine(e, r, (e, n, r) => t.push({
				from: e,
				to: n,
				kind: r
			})), Jr(e, t, []);
		}).join("\n");
	} catch {
		return null;
	}
}
//#endregion
//#region src/package-api.ts
function ua(e, t) {
	let n = window.NEStandardUICodeInput?.__pendingLanguages ?? [], r = window.NEStandardUICodeInput?.__pendingCompletions ?? [], i = {
		registerLanguage: (n, r, i) => da(e, t, {
			id: n,
			tokenizer: r,
			completions: i
		}),
		createTokenizer: O,
		registerCompletions: (e, n) => t.register(e, n),
		__pendingLanguages: [],
		__pendingCompletions: []
	};
	window.NEStandardUICodeInput = i;
	for (let r of n) da(e, t, r);
	for (let e of r) t.register(e.languageId, e.source);
	return i;
}
function da(e, t, n) {
	e.register(n.id, n.tokenizer), n.completions !== void 0 && t.register(n.id, n.completions);
}
//#endregion
//#region src/code-input.ts
ua(B, fr);
var fa = ci();
fa.registerEvent("save", {
	settlesValue: !0,
	submitsForm: !0
}), fa.registerValueReader({
	kind: "code",
	read: (e) => ii(e)
}), fa.registerEngine((e) => {
	new oi(e), new sa(e);
});
//#endregion
