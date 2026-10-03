//#region src/code-editor-dom.ts
var e = "ui-code-input", t = "data-ui-code-language", n = "data-ui-code-search", r = "data-ui-code-format-bar", i = "--ui-code-tab-size", a = "ui-markdown", o = "ui-markdown__body", s = "ui.code.format-bold", c = "ui.code.format-italic", l = "ui.code.format-strikethrough", u = "ui.code.format-code", d = "ui.code.format-link", f = "ui.code.format-heading", p = "ui.code.format-list", m = "picture-upload", h = "codeinput.insert-picture", g = {
	checkboxClass: "ui-checkbox",
	checkboxInputClass: "ui-checkbox__input",
	checkboxBoxClass: "ui-checkbox__box",
	smallInputClass: "ui-input--small",
	ghostButtonClass: "ui-button--ghost",
	smallButtonClass: "ui-button--small"
}, ee = {
	bold: "ne-bold",
	italic: "ne-italic",
	strikethrough: "ne-strikethrough",
	code: "ne-code",
	link: "ne-link",
	heading: "ne-heading",
	list: "ne-list-bulleted"
}, te = { fileFailed: "ui.file.failed" }, _ = "ui-code-input__line", ne = "ui-code-input__code", re = "--ui-code-gutter-digits", ie = "ui-code-input__carets", ae = "ui-code-input__caret", oe = "ui-code-input__selection", se = "ui-code-input--virtual", ce = "ui-code-input--picture-over", le = "ui-code-match", ue = "ui-code-match--current", de = "ui-code-input__completions", fe = "ui-code-input__completion", pe = "ui-code-input__completion--active", me = "ui-code-input__completions-anchor", he = "ui-code-input__format-bar", ge = "ui-code-input__format-button", _e = "ui-code-input__format-anchor", ve = "ui-code-input__heading-menu", ye = "crlf";
//#endregion
//#region src/motion.ts
function be(e) {
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
function xe(e, t) {
	return t <= 0 ? 0 : t >= 2 && we(e.charCodeAt(t - 1)) && Ce(e.charCodeAt(t - 2)) ? t - 2 : t - 1;
}
function Se(e, t) {
	return t >= e.length ? e.length : t + 1 < e.length && Ce(e.charCodeAt(t)) && we(e.charCodeAt(t + 1)) ? t + 2 : t + 1;
}
function Ce(e) {
	return e >= 55296 && e <= 56319;
}
function we(e) {
	return e >= 56320 && e <= 57343;
}
var Te = 0, Ee = 1, De = 2, Oe = 3, ke = /[\p{L}\p{N}_]/u;
function v(e) {
	return e === "\n" ? Oe : e === " " || e === "	" ? Te : ke.test(e) ? Ee : De;
}
function Ae(e, t) {
	if (t >= e.length) return e.length;
	if (e[t] === "\n") return t + 1;
	let n = t, r = v(e[n]);
	if (r !== Te) for (; n < e.length && v(e[n]) === r;) n++;
	for (; n < e.length && v(e[n]) === Te;) n++;
	return n;
}
function je(e, t) {
	if (t <= 0) return 0;
	if (e[t - 1] === "\n") return t - 1;
	let n = t;
	for (; n > 0 && v(e[n - 1]) === Te;) n--;
	if (n === 0 || e[n - 1] === "\n") return n;
	let r = v(e[n - 1]);
	for (; n > 0 && v(e[n - 1]) === r;) n--;
	return n;
}
function Me(e, t) {
	let n = t, r = t;
	for (; n > 0 && v(e[n - 1]) === Ee;) n--;
	for (; r < e.length && v(e[r]) === Ee;) r++;
	return n === r ? null : {
		from: n,
		to: r
	};
}
function Ne(e, t, n) {
	let r = t.lineAt(n), i = t.start(r), a = t.end(r), o = i;
	for (; o < a && (e[o] === " " || e[o] === "	");) o++;
	return n === o ? i : o;
}
function y(e, t, n, r) {
	let i = 0;
	for (let a = t.start(t.lineAt(n)); a < n; a = Se(e, a)) i += e[a] === "	" ? r - i % r : 1;
	return i;
}
function Pe(e, t, n, r, i) {
	let a = t.end(n), o = 0, s = t.start(n);
	for (; s < a;) {
		let t = Se(e, s), n = e[s] === "	" ? i - o % i : 1;
		if (o + n > r) return r - o >= n / 2 ? t : s;
		o += n, s = t;
	}
	return a;
}
function Fe(e, t, n, r, i, a) {
	let o = t.lineAt(n), s = Math.min(Math.max(o + r, 0), t.count - 1);
	return s === o ? r < 0 ? 0 : e.length : Pe(e, t, s, i, a);
}
//#endregion
//#region src/selections.ts
function b(e) {
	return Math.min(e.anchor, e.head);
}
function x(e) {
	return Math.max(e.anchor, e.head);
}
function S(e) {
	return e.anchor === e.head;
}
function Ie(e) {
	return {
		anchor: e,
		head: e
	};
}
function C(e, t = e) {
	return {
		ranges: [{
			anchor: e,
			head: t
		}],
		primary: 0
	};
}
function w(e, t) {
	let n = e.map((e, t) => ({
		range: e,
		index: t
	})).sort((e, t) => b(e.range) - b(t.range) || x(e.range) - x(t.range)), r = [], i = 0;
	for (let { range: e, index: a } of n) {
		let n = r.at(-1), o = a === t;
		if (n !== void 0 && Le(n, e)) {
			let t = b(n), i = Math.max(x(n), x(e)), a = o ? e.head < e.anchor : n.head < n.anchor;
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
function Le(e, t) {
	let n = x(e), r = b(t);
	return r < n || r === n && (S(e) || S(t));
}
function Re(e, t) {
	if (e.primary !== t.primary || e.ranges.length !== t.ranges.length) return !1;
	for (let n = 0; n < e.ranges.length; n++) if (e.ranges[n].anchor !== t.ranges[n].anchor || e.ranges[n].head !== t.ranges[n].head) return !1;
	return !0;
}
function ze(e, t) {
	let n = "", r = 0;
	for (let i of t) n += e.slice(r, i.from) + i.text, r = i.to;
	return n + e.slice(r);
}
function T(e, t) {
	let n = 0;
	for (let r of t) {
		if (e < r.from || e === r.from && r.from === r.to) break;
		if (e < r.to) return r.from + n;
		n += r.text.length - (r.to - r.from);
	}
	return e + n;
}
function E(e, t) {
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
		after: w(e.ranges.map((e, t) => r[t] ?? {
			anchor: T(e.anchor, n),
			head: T(e.head, n)
		}), e.primary)
	};
}
function Be(e, t) {
	let n = [];
	if (t.length === 0) return n;
	for (let r = e.indexOf(t); r >= 0; r = e.indexOf(t, r + t.length)) n.push(r);
	return n;
}
function Ve(e, t) {
	let n = t.ranges[t.primary], r = e.slice(b(n), x(n)), i = new Set(t.ranges.map(b)), a = Be(e, r).filter((e) => !i.has(e) && !He(t.ranges, e, e + r.length));
	return a.find((e) => e >= x(n)) ?? a[0] ?? -1;
}
function He(e, t, n) {
	return e.some((e) => b(e) < n && x(e) > t);
}
function Ue(e, t, n) {
	if (n !== null && n.length === t && n.join("\n") === e) return n;
	let r = (e.endsWith("\n") ? e.slice(0, -1) : e).split("\n");
	return r.length === t ? r : null;
}
//#endregion
//#region src/code-editor-carets.ts
var We = class {
	stopWatchingSize;
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
	constructor(e, t, n) {
		this.root = e.root, this.textarea = e.textarea, this.scroller = e.scroller, this.content = e.content, this.surface = t, this.layer = document.createElement("div"), this.layer.className = ie, this.layer.setAttribute("aria-hidden", "true"), this.layer.hidden = !0, this.probe = document.createElement("span"), this.probe.className = `${ie}-probe`, this.probe.textContent = "0", this.content.insertBefore(this.layer, this.textarea), this.content.insertBefore(this.probe, this.textarea), this.stopWatchingSize = n(this.content, () => this.queueRender());
	}
	dispose() {
		this.stopWatchingSize();
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
			(this.textarea.selectionStart !== b(e) || this.textarea.selectionEnd !== x(e)) && this.collapse();
		}
		if (this.ranges !== null) return {
			ranges: this.ranges,
			primary: this.primary
		};
		let { selectionStart: e, selectionEnd: t, selectionDirection: n } = this.textarea;
		return n === "backward" ? C(t, e) : C(e, t);
	}
	write(e, t) {
		let n = e.ranges[e.primary];
		this.ranges = e.ranges.length > 1 ? e.ranges : null, this.primary = e.ranges.length > 1 ? e.primary : 0, this.goals = null, this.box = null, this.pads = null, this.textarea.setSelectionRange(b(n), x(n), n.head < n.anchor ? "backward" : "forward"), this.render(), t && this.reveal(n.head);
	}
	render() {
		let e = this.adding ?? (this.ranges === null ? null : {
			ranges: this.ranges,
			primary: this.primary
		});
		if (e === null) {
			this.root.classList.remove(se), this.layer.hidden || (this.layer.replaceChildren(), this.layer.hidden = !0);
			return;
		}
		let t = this.content.getBoundingClientRect(), [n, r] = this.visibleLines(), i = this.surface.lines, a = document.createDocumentFragment(), o = this.adding === null ? this.pads : null, s = o !== null && o.some((e) => e.anchor > 0 || e.head > 0), c = s ? this.probe.getBoundingClientRect().width : 0;
		this.root.classList.toggle(se, s);
		let l = this.adding === null && !s ? e.primary : -1;
		for (let s = 0; s < e.ranges.length; s++) {
			let u = e.ranges[s];
			if (s === l || i.lineAt(x(u)) < n || i.lineAt(b(u)) > r) continue;
			let d = o?.[s] ?? null;
			if (!S(u) || d !== null && d.anchor !== d.head) for (let e of this.selectionRects(i, u, n, r, d)) a.append(this.mark(oe, e, t));
			let f = this.caretRect(i, u.head);
			f !== null && (d !== null && d.head > 0 && (f.left += d.head * c, f.right = f.left), a.append(this.mark(ae, f, t)));
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
		let a = [], o = b(t), s = x(t), c = e.lineAt(o), l = e.lineAt(s), u = this.probe.getBoundingClientRect().width;
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
			let n = this.caretRect(e, x(t));
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
		}, a = S(i) ? e.ranges.findIndex((e) => S(e) && e.head === i.head) : -1;
		if (a >= 0 && e.ranges.length > 1) {
			let t = e.ranges.filter((e, t) => t !== a);
			this.write({
				ranges: t,
				primary: t.length - 1
			}, !1);
			return;
		}
		this.write(w([...e.ranges, i], e.ranges.length), !1);
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
				this.moveEach((e) => !i && !S(e) ? b(e) : t ? je(n, e.head) : xe(n, e.head), i);
				break;
			case "ArrowRight":
				this.moveEach((e) => !i && !S(e) ? x(e) : t ? Ae(n, e.head) : Se(n, e.head), i);
				break;
			case "Home":
				this.moveEach((e) => t ? 0 : Ne(n, r, e.head), i);
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
		if (S(n)) {
			let r = Me(e, n.head);
			r !== null && this.write(w(t.ranges.map((e, n) => n === t.primary ? {
				anchor: r.from,
				head: r.to
			} : e), t.primary), !0);
			return;
		}
		let r = Ve(e, t);
		if (r < 0) return;
		let i = x(n) - b(n);
		this.write(w([...t.ranges, {
			anchor: r,
			head: r + i
		}], t.ranges.length), !0);
	}
	selectAllOccurrences() {
		let e = this.textarea.value, t = this.read(), n = t.ranges[t.primary], r = S(n) ? Me(e, n.head) : {
			from: b(n),
			to: x(n)
		};
		if (r === null) return;
		let i = r.to - r.from, a = Be(e, e.slice(r.from, r.to)), o = a.map((e) => ({
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
			anchorColumn: y(n, r, o.anchor, i),
			headLine: r.lineAt(o.head),
			headColumn: y(n, r, o.head, i)
		});
		let c = Math.min(Math.max(s.headLine + e, 0), r.count - 1), l = s.headColumn;
		if (t !== 0) {
			let e = Pe(n, r, c, l, i), a = y(n, r, r.end(c), i);
			t < 0 ? l = l > a ? l - 1 : y(n, r, Math.max(xe(n, e), r.start(c)), i) : e < r.end(c) ? l = y(n, r, Se(n, e), i) : l < this.widestColumn(n, r, s.anchorLine, c, i) && l++;
		}
		let u = {
			...s,
			headLine: c,
			headColumn: l
		}, d = u.headLine >= u.anchorLine ? 1 : -1, f = [], p = [];
		for (let e = u.anchorLine; e !== u.headLine + d; e += d) {
			let t = Pe(n, r, e, u.anchorColumn, i), a = Pe(n, r, e, u.headColumn, i);
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
		return r === t.end(n) ? Math.max(0, i - y(e, t, r, a)) : 0;
	}
	widestColumn(e, t, n, r, i) {
		let a = 0;
		for (let o = Math.min(n, r); o <= Math.max(n, r); o++) a = Math.max(a, y(e, t, t.end(o), i));
		return a;
	}
	moveEach(e, t) {
		let n = this.read(), r = n.ranges.map((n) => t ? {
			anchor: n.anchor,
			head: e(n)
		} : Ie(e(n)));
		this.write(w(r, n.primary), !0);
	}
	moveVertically(e, t) {
		let n = this.textarea.value, r = this.surface.lines, i = this.surface.tabSize, a = this.read(), o = this.goals ?? a.ranges.map((e) => y(n, r, e.head, i)), s = w(a.ranges.map((a, s) => {
			let c = Fe(n, r, a.head, e, o[s], i);
			return t ? {
				anchor: a.anchor,
				head: c
			} : Ie(c);
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
function Ge(e, t) {
	let n = t;
	for (; n > 0 && ke.test(e.charAt(n - 1));) n--;
	return n;
}
function Ke(e, t) {
	return e.slice(Ge(e, t), t);
}
async function qe(e, t) {
	let n = [];
	for (let r of e) try {
		let e = typeof r == "function" ? await r(t) : r;
		n.push(...e);
	} catch {}
	return n;
}
function Je(e, t, n = 50) {
	let r = t.toLowerCase(), i = [];
	for (let n = 0; n < e.length; n++) {
		let a = t.length === 0 ? 0 : Ye(e[n].label, t, r);
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
function Ye(e, t, n) {
	if (e.startsWith(t)) return 0;
	let r = e.toLowerCase();
	return r.startsWith(n) ? 1 : r.includes(n) ? 2 : -1;
}
var Xe = /[\p{L}\p{N}_]+/gu;
function Ze(e) {
	let t = Me(e.text, e.offset), n = t === null ? e.text : e.text.slice(0, t.from) + e.text.slice(t.to), r = [];
	for (let e of et(n)) r.push({
		label: e,
		kind: "text"
	});
	return r;
}
var Qe = null, $e = [];
function et(e) {
	if (e === Qe) return $e;
	let t = /* @__PURE__ */ new Set();
	Xe.lastIndex = 0;
	for (let n = Xe.exec(e); n !== null; n = Xe.exec(e)) n[0].length >= 2 && t.add(n[0]);
	return Qe = e, $e = [...t], $e;
}
var tt = /* @__PURE__ */ new Set([
	"keyword",
	"type",
	"function",
	"variable",
	"property",
	"text"
]);
function nt(e) {
	let t = rt(e) ? e : {}, n = Array.isArray(t.items) ? t.items : [], r = [];
	for (let e of n) {
		if (!rt(e) || typeof e.label != "string" || e.label.length === 0) continue;
		let t = typeof e.kind == "string" && tt.has(e.kind) ? e.kind : void 0, n = typeof e.insert == "string" && e.insert.length > 0 ? e.insert : e.label, i = typeof e.detail == "string" ? e.detail : void 0;
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
function rt(e) {
	return typeof e == "object" && !!e;
}
//#endregion
//#region src/tokenizer.ts
var it = class {
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
function D(e) {
	return {
		initialState: e.initialState(),
		tokenizeLine(t, n, r) {
			let i = ot(n);
			return at(new it(t), i, e, r), i;
		}
	};
}
function at(e, t, n, r) {
	for (; !e.eol();) {
		e.start = e.pos;
		let i = n.token(e, t);
		e.pos === e.start && e.pos++, i !== null && r(e.start, e.pos, i);
	}
}
function ot(e) {
	if (Array.isArray(e)) return e.map(ot);
	if (typeof e == "object" && e) {
		let t = {};
		for (let [n, r] of Object.entries(e)) t[n] = ot(r);
		return t;
	}
	return e;
}
function st(e, t) {
	if (e === t) return !0;
	if (Array.isArray(e) || Array.isArray(t)) {
		if (!Array.isArray(e) || !Array.isArray(t) || e.length !== t.length) return !1;
		for (let n = 0; n < e.length; n++) if (!st(e[n], t[n])) return !1;
		return !0;
	}
	if (e !== null && t !== null && typeof e == "object" && typeof t == "object") {
		let n = e, r = t, i = Object.keys(n);
		if (i.length !== Object.keys(r).length) return !1;
		for (let e of i) if (!st(n[e], r[e])) return !1;
		return !0;
	}
	return !1;
}
function O(e) {
	return new Set(e.split(/\s+/).filter((e) => e.length > 0));
}
function k(e, t, n = !0) {
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
var ct = O("\n    if then else elif fi for while until do done case esac in function select time return exit local export declare readonly\n    unset shift source break continue eval exec set trap\n"), lt = O("if then else elif while until do time exec ! [ [["), ut = /[A-Za-z_][\w]*/y, dt = /--?[A-Za-z][\w-]*/y, ft = /\$(?:[A-Za-z_]\w*|\d|[@*#?$!-])/y, pt = /[A-Za-z_]\w*(?=\+?=)/y, mt = /<<-?\s*(?:'([^']+)'|"([^"]+)"|\\?([A-Za-z_]\w*))/y, ht = /\d?>&\d?|\d?>>?|<|\|\||&&|\||;;|;|&/y, gt = {
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
			case "single": return _t(e, t);
			case "heredoc": return vt(e, t);
			default: return yt(e, t);
		}
	}
};
function _t(e, t) {
	let n = e.indexOf("'");
	return e.skipTo(n < 0 ? -1 : n + 1), n >= 0 && (t.mode = "code"), "string";
}
function vt(e, t) {
	let n = t.heredocIndented ? e.text.replace(/^\t+/, "") : e.text;
	return e.skipToEnd(), n === t.heredoc ? (t.mode = "code", t.heredoc = "", t.command = !0, "keyword") : "string";
}
function yt(e, t) {
	let n = t.frames[t.frames.length - 1];
	return n === "\"" ? bt(e, t) : n === "${" ? St(e, t) : Ct(e, t);
}
function bt(e, t) {
	if (e.match("\"")) return t.frames.pop(), "string";
	if (e.match("\\")) return e.next(), "escape";
	let n = xt(e, t);
	if (n !== null) return n;
	for (e.next(); !e.eol();) {
		let t = e.peek();
		if (t === "\"" || t === "\\" || t === "$" || t === "`") break;
		e.next();
	}
	return "string";
}
function xt(e, t) {
	return e.match("$((") ? (t.frames.push("$(("), t.command = !1, "punctuation") : e.match("$(") ? (t.frames.push("$("), t.command = !0, "punctuation") : e.match("${") ? (t.frames.push("${"), t.command = !1, St(e, t)) : e.match("`") ? (t.frames[t.frames.length - 1] === "`" ? (t.frames.pop(), t.command = !1) : (t.frames.push("`"), t.command = !0), "punctuation") : e.match(ft) ? (t.command = !1, "variable") : null;
}
function St(e, t) {
	for (; !e.eol();) {
		let n = e.peek();
		if (n === "}") {
			e.next(), t.frames.pop();
			break;
		}
		if (n === "$" && (e.peek(1) === "(" || e.peek(1) === "{")) {
			if (e.pos > e.start) break;
			return xt(e, t) ?? "variable";
		}
		e.next();
	}
	return "variable";
}
function Ct(e, t) {
	if (e.eatWhile(/\s/)) return t.valueDepth === t.frames.length && (t.command = !0, t.valueDepth = -1), null;
	let n = e.peek(), r = e.pos === 0 || /\s/.test(e.text.charAt(e.pos - 1));
	if (n === "#" && r) return e.skipToEnd(), "comment";
	if (n === "'") return e.next(), t.mode = "single", t.command = !1, _t(e, t);
	if (n === "\"") return e.next(), t.frames.push("\""), t.command = !1, "string";
	if (e.match("((")) return t.frames.push("(("), t.command = !1, "punctuation";
	let i = t.frames[t.frames.length - 1], a = i === "((" || i === "$((";
	if (a && e.match("))")) return t.frames.pop(), t.command = i === "((", "punctuation";
	if (a) return e.match(/\d+/y) ? "number" : e.match(ut) ? "variable" : e.match(/[-+*/%=<>!&|^~?:,]+/y) ? "operator" : (e.next(), null);
	if (e.match(mt)) {
		let n = e.current();
		return t.heredocPending = n.replace(/^<<-?\s*/, "").replace(/^\\/, "").replace(/^['"]|['"]$/g, ""), t.heredocIndented = n.startsWith("<<-"), "keyword";
	}
	if (n === ")" && i === "$(") return e.next(), t.frames.pop(), t.command = !1, "punctuation";
	let o = xt(e, t);
	if (o !== null) return o;
	if (e.match("\\")) return e.next(), "escape";
	if (e.match("=")) return t.command && (t.command = !1, t.valueDepth = t.frames.length), "operator";
	if (e.match(ht)) {
		let n = e.current();
		return t.command = n === "|" || n === "||" || n === "&&" || n === ";" || n === "&" || n === ";;", "operator";
	}
	if (e.match(/[(){}]/y)) return t.command = !0, "punctuation";
	if (e.match(dt)) return t.command = !1, "attribute";
	if (t.command && e.match(pt)) return "variable";
	if (e.match(ut)) {
		let n = e.current();
		return t.command && ct.has(n) ? (t.command = lt.has(n), "keyword") : t.command ? (t.command = !1, "function") : null;
	}
	return e.match(/\d+(?=\s|$)/y) ? "number" : e.match(/\[\[?|\]\]?|!/y) ? (t.command = !0, "keyword") : (e.next(), null);
}
var wt = {
	...D(gt),
	keywords: [...ct]
}, Tt = O("\n    break case catch class const continue debugger default delete do else enum export extends finally for function if import in\n    instanceof new return super switch this throw try typeof var void while with yield let static async await of get set\n    abstract any as asserts boolean constructor declare implements interface is keyof module namespace never number object\n    private protected public readonly require string symbol type unique unknown from global override satisfies bigint\n    infer out accessor\n"), Et = O("true false null undefined NaN Infinity"), Dt = O("return typeof case in of instanceof new delete void throw yield await else do"), Ot = /[A-Za-z_$][\w$]*/y, kt = /0[xX][\da-fA-F_]+n?|0[bB][01_]+n?|0[oO][0-7_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?/y, At = /[+\-*/%=<>!&|^~?:]+/y, jt = /\s*\(/y, Mt = {
	initialState: () => ({
		mode: "code",
		frames: [],
		regexAllowed: !0
	}),
	token(e, t) {
		switch (t.mode) {
			case "comment": return Nt(e, t);
			case "template": return Pt(e, t);
			default: return Ft(e, t);
		}
	}
};
function Nt(e, t) {
	let n = e.indexOf("*/");
	return e.skipTo(n < 0 ? -1 : n + 2), t.mode = n < 0 ? "comment" : "code", "comment";
}
function Pt(e, t) {
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
function Ft(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = e.peek();
	if (e.match("//")) return e.skipToEnd(), "comment";
	if (e.match("/*")) return t.mode = "comment", Nt(e, t);
	if (n === "\"" || n === "'") return e.next(), k(e, n), t.regexAllowed = !1, "string";
	if (n === "`") return e.next(), t.mode = "template", Pt(e, t);
	if (e.match(kt)) return t.regexAllowed = !1, "number";
	if (n === "@") return e.next(), e.match(Ot), "meta";
	if (e.match(Ot)) {
		let n = e.current();
		return Tt.has(n) ? (t.regexAllowed = Dt.has(n), "keyword") : (t.regexAllowed = !1, Et.has(n) ? "keyword" : (jt.lastIndex = e.pos, jt.test(e.text) ? "function" : Lt(n) ? "type" : null));
	}
	if (n === "/" && t.regexAllowed && It(e)) return t.regexAllowed = !1, "regex";
	if (e.match(At)) return t.regexAllowed = !0, "operator";
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
function It(e) {
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
function Lt(e) {
	let t = e.charAt(0);
	return t >= "A" && t <= "Z";
}
var Rt = {
	...D(Mt),
	keywords: [...Tt]
}, zt = O("\n    abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum\n    event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace\n    new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc\n    static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while\n    add alias and ascending async await by descending dynamic equals from get global group init into join let managed nameof nint\n    not notnull nuint on or orderby partial record remove required scoped select set unmanaged value var when where with yield file\n"), Bt = /@?[A-Za-z_][\w]*/y, Vt = /0[xX][\da-fA-F_]+[uUlL]*|0[bB][01_]+[uUlL]*|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[fFdDmMuUlL]*/y, Ht = /'(?:\\(?:u[\da-fA-F]{4}|U[\da-fA-F]{8}|x[\da-fA-F]{1,4}|.)|[^'\\])'/y, Ut = /[+\-*/%=<>!&|^~?:]+/y, A = /\s*[(<]/y, Wt = /\s*\.(?!\.)/y, Gt = /#[a-z]+/y, Kt = O("new class struct interface enum record is as"), qt = {
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
			case "comment": return Jt(e, t);
			case "verbatim": return Yt(e, t);
			case "raw": return Xt(e, t);
			case "interpolated": return Zt(e, t);
			default: return $t(e, t);
		}
	}
};
function Jt(e, t) {
	let n = e.indexOf("*/");
	return e.skipTo(n < 0 ? -1 : n + 2), t.mode = n < 0 ? "comment" : "code", "comment";
}
function Yt(e, t) {
	for (; !e.eol();) if (!e.match("\"\"") && e.next() === "\"") {
		t.mode = "code";
		break;
	}
	return "string";
}
function Xt(e, t) {
	let n = "\"".repeat(t.rawQuotes), r = e.indexOf(n);
	return e.skipTo(r < 0 ? -1 : r + n.length), r >= 0 && (t.mode = "code"), "string";
}
function Zt(e, t) {
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
		if (e.next(), r === "\"") return Qt(t), "string";
	}
	return n || Qt(t), "string";
}
function Qt(e) {
	e.verbatims.pop(), e.mode = "code";
}
function $t(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = t.afterDot;
	t.afterDot = !1;
	let r = e.peek();
	if (e.match("//")) return e.skipToEnd(), "comment";
	if (e.match("/*")) return t.mode = "comment", Jt(e, t);
	if (r === "#" && e.text.slice(0, e.pos).trim() === "" && e.match(Gt)) return e.skipToEnd(), "meta";
	if (e.match(/\$@"|@\$"/y)) return t.verbatims.push(!0), t.mode = "interpolated", "string";
	if (e.match(/\$+"""+/y)) return t.rawQuotes = e.current().replace(/^\$+/, "").length, t.mode = "raw", "string";
	if (e.match("$\"")) return t.verbatims.push(!1), t.mode = "interpolated", "string";
	if (e.match("@\"")) return t.mode = "verbatim", Yt(e, t);
	if (e.match(/"""+/y)) return t.rawQuotes = e.current().length, t.mode = "raw", Xt(e, t);
	if (r === "\"") return e.next(), k(e, "\""), "string";
	if (e.match(Ht)) return "string";
	if (e.match(Vt)) return t.afterNew = !1, "number";
	if (e.match(Bt)) {
		let r = e.current();
		if (r.charAt(0) !== "@" && zt.has(r)) return t.afterNew = Kt.has(r), "keyword";
		let i = t.afterNew;
		if (t.afterNew = !1, Lt(r.charAt(0) === "@" ? r.slice(1) : r)) {
			A.lastIndex = e.pos;
			let t = A.test(e.text) ? e.text.charAt(A.lastIndex - 1) : "";
			return !i && t === "(" ? "function" : (Wt.lastIndex = e.pos, n && t !== "<" && !Wt.test(e.text) ? "property" : "type");
		}
		return A.lastIndex = e.pos, A.test(e.text) && e.text.charAt(A.lastIndex - 1) === "(" ? "function" : null;
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
	return e.match(".") ? (t.afterDot = !0, "punctuation") : e.match(/[()[\],;]/y) ? "punctuation" : e.match(Ut) ? "operator" : (e.next(), null);
}
var en = {
	...D(qt),
	keywords: [...zt]
}, j = /-?[A-Za-z_][\w-]*/y, tn = /--[\w-]+/y, nn = /--[\w-]+|-?[A-Za-z_][\w-]*/y, M = /\s*:/y, rn = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?:%|[a-zA-Z]+)?/y, an = /#[\da-fA-F]{3,8}\b/y, on = /-?[A-Za-z_][\w-]*\(/y, sn = /@\{[\w-]+\}/y, cn = O("and not only or"), ln = O("\n    charset import namespace media supports document page font-face keyframes viewport counter-style font-feature-values layer\n    property container scope starting-style plugin\n");
function un(e) {
	nn.lastIndex = e.pos;
	let t = nn.exec(e.text);
	if (t === null || (M.lastIndex = e.pos + t[0].length, !M.test(e.text))) return !1;
	for (let t = M.lastIndex; t < e.end; t++) {
		let n = e.text.charAt(t);
		if (n === ";" || n === "}") return !0;
		if (n === "{") return !1;
	}
	return t[0].startsWith("--") || /\s/.test(e.text.charAt(M.lastIndex)) || M.lastIndex >= e.end;
}
function dn(e) {
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
			if (r === "\"" || r === "'") return t.next(), k(t, r), "string";
			if (r === "{") return t.next(), n.depth++, n.context = "block", n.afterProperty = !1, n.bracket = 0, "punctuation";
			if (r === "}") return t.next(), n.depth = Math.max(0, n.depth - 1), n.context = n.depth > 0 ? "block" : "selector", n.afterProperty = !1, "punctuation";
			if (r === ";") return t.next(), n.context = n.depth > 0 ? "block" : "selector", n.afterProperty = !1, "punctuation";
			if (r === ":" && n.afterProperty) return t.next(), n.context = "value", n.afterProperty = !1, "punctuation";
			switch (n.context) {
				case "value": return _n(t, e);
				case "prelude": return gn(t, e);
				case "block": return fn(t, n, e);
				default: return n.depth === 0 && r === "@" ? fn(t, n, e) : pn(t, n, e);
			}
		}
	};
}
function fn(e, t, n) {
	if (e.peek() === "@" && !e.match(sn, !1)) {
		e.next(), e.eatWhile(/[\w-]/);
		let r = e.current().slice(1).toLowerCase();
		return n && !ln.has(r) ? (t.afterProperty = e.match(M, !1), "variable") : (t.context = "prelude", "meta");
	}
	if (un(e)) {
		let n = e.match(tn);
		return n || e.match(j), t.afterProperty = !0, n ? "variable" : "attribute";
	}
	return t.context = "selector", pn(e, t, n);
}
function pn(e, t, n) {
	let r = e.peek();
	return t.bracket > 0 ? hn(e, t) : r === "@" ? (e.next(), e.eat("{") ? (e.eatWhile(/[\w-]/), e.eat("}")) : e.eatWhile(/[\w-]/), n ? "variable" : "meta") : r === "." || r === "#" ? (e.next(), mn(e), "selector") : r === ":" ? (e.next(), e.eat(":"), mn(e) ? "selector" : "punctuation") : r === "&" ? (e.next(), mn(e), "selector") : r === "*" ? (e.next(), "selector") : r === "[" ? (e.next(), t.bracket = 1, "punctuation") : r === "!" ? (e.next(), e.eatWhile(/[\w-]/), "keyword") : n && r === "~" && (e.peek(1) === "\"" || e.peek(1) === "'") ? (e.next(), k(e, e.next()), "string") : e.match(rn) ? "number" : e.match(/[>+~,()]/y) ? "punctuation" : e.match(/[=<>]+/y) ? "operator" : e.match(j) ? n && e.current() === "when" ? "keyword" : "selector" : (e.next(), null);
}
function mn(e) {
	let t = e.pos;
	for (; e.eatWhile(/[\w-]/) || e.match(sn);) continue;
	return e.pos > t;
}
function hn(e, t) {
	return e.eat("]") ? (t.bracket = 0, "punctuation") : e.match(/[~|^$*]?=/y) ? (t.bracket = 2, "operator") : e.match(/[\w-]+/y) ? t.bracket === 1 ? "attribute" : "value" : (e.next(), null);
}
function gn(e, t) {
	if (e.peek() === "@") return e.next(), e.eatWhile(/[\w-]/), t ? "variable" : "meta";
	let n = vn(e);
	if (n !== null) return n;
	if (e.match(on, !1)) return e.match(j), "function";
	if (e.match(rn)) return "number";
	if (e.match(j)) {
		let t = e.current();
		return cn.has(t.toLowerCase()) ? "keyword" : e.match(M, !1) ? "attribute" : "value";
	}
	return e.match(/[,():]/y) ? "punctuation" : e.match(/[<>=]+/y) ? "operator" : (e.next(), null);
}
function _n(e, t) {
	let n = e.peek();
	if (n === "!") return e.next(), e.eatWhile(/[\w-]/), "keyword";
	if (n === "@" && t) return e.next(), e.eat("@"), e.eatWhile(/[\w-]/), "variable";
	if (n === "~" && t && (e.peek(1) === "\"" || e.peek(1) === "'")) return e.next(), k(e, e.next()), "string";
	if (e.match(tn)) return "variable";
	if (e.match(an)) return "value";
	let r = vn(e);
	return r === null ? e.match(on, !1) ? (e.match(j), "function") : e.match(rn) ? "number" : e.match(j) ? "value" : e.match(/[,()]/y) ? "punctuation" : e.match(/[+\-*/=<>]/y) ? "operator" : (e.next(), null) : r;
}
function vn(e) {
	if (e.match(/url(?=\()/y)) return "function";
	let t = e.text.slice(Math.max(0, e.pos - 4), e.pos);
	if (e.peek() === "(" && t.endsWith("url")) return e.next(), "punctuation";
	if (t === "url(" && e.peek() !== "\"" && e.peek() !== "'") {
		let t = e.indexOf(")");
		return e.skipTo(t), "string";
	}
	return null;
}
var yn = D(dn(!1)), bn = D(dn(!0)), xn = /<\/?[A-Za-z][\w:-]*/y, Sn = /[^\s"'<>/=]+/y, Cn = /[^\s"'<>`=]+/y, wn = /&(?:#\d+|#x[\da-fA-F]+|[A-Za-z]\w*);/y, Tn = dn(!1), En = {
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
			case "comment": return Dn(e, t);
			case "tag": return kn(e, t);
			case "attribute-value": return An(e, t);
			case "script": return jn(e, t, "script");
			case "style": return jn(e, t, "style");
			default: return On(e, t);
		}
	}
};
function Dn(e, t) {
	let n = e.indexOf("-->");
	return e.skipTo(n < 0 ? -1 : n + 3), t.mode = n < 0 ? "comment" : "text", "comment";
}
function On(e, t) {
	if (e.match("<!--")) return t.mode = "comment", Dn(e, t);
	if (e.match("<!")) {
		let t = e.indexOf(">");
		return e.skipTo(t < 0 ? -1 : t + 1), "meta";
	}
	if (e.match(xn)) {
		let n = e.current();
		return t.closing = n.startsWith("</"), t.tag = n.slice(t.closing ? 2 : 1).toLowerCase(), t.mode = "tag", "tag";
	}
	if (e.match(wn)) return "escape";
	for (e.next(); !e.eol() && e.peek() !== "<" && e.peek() !== "&";) e.next();
	return null;
}
function kn(e, t) {
	if (e.eatWhile(/\s/)) return null;
	if (e.match("/>")) return t.mode = "text", "punctuation";
	if (e.match(">")) return !t.closing && t.tag === "script" ? (t.mode = "script", t.inner = Mt.initialState()) : !t.closing && t.tag === "style" ? (t.mode = "style", t.inner = Tn.initialState()) : t.mode = "text", "punctuation";
	if (e.match("=")) return "operator";
	let n = e.peek();
	return n === "\"" || n === "'" ? (e.next(), k(e, n, !1) || (t.mode = "attribute-value", t.quote = n), "string") : e.match(Sn) ? e.text.slice(0, e.start).trimEnd().endsWith("=") ? "string" : "attribute" : e.match(Cn) ? "string" : (e.next(), null);
}
function An(e, t) {
	return k(e, t.quote, !1) && (t.mode = "tag"), "string";
}
function jn(e, t, n) {
	let r = `</${n}`;
	(e.pos === 0 || t.closingAt === null) && (t.closingAt = Pn(e, n === "script" ? Mn : Nn));
	let i = t.closingAt;
	if (i === e.pos) return e.skipTo(i + r.length), t.mode = "tag", t.tag = n, t.closing = !0, t.inner = null, t.closingAt = null, "tag";
	let a = i < 0 ? e.end : i, o = new it(e.text, e.pos, a);
	o.start = e.pos;
	let s = n === "script" ? Mt.token(o, t.inner) : Tn.token(o, t.inner);
	return e.pos = o.pos > o.start ? o.pos : o.start + 1, s;
}
var Mn = /<\/script/gi, Nn = /<\/style/gi;
function Pn(e, t) {
	t.lastIndex = e.pos;
	let n = t.exec(e.text);
	return n === null || n.index + n[0].length > e.end ? -1 : n.index;
}
var Fn = D(En), In = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y, Ln = /(?:true|false|null)\b/y, Rn = /\s*:/y;
function zn(e) {
	return Rn.lastIndex = e.pos, Rn.test(e.text);
}
var Bn = {
	...D({
		initialState: () => ({}),
		token(e) {
			return e.eatWhile(/\s/) ? null : e.peek() === "\"" ? (e.next(), k(e, "\""), zn(e) ? "property" : "string") : e.match(In) ? "number" : e.match(Ln) ? "keyword" : e.match(/[{}[\]:,]/y) ? "punctuation" : (e.next(), "invalid");
		}
	}),
	keywords: [
		"true",
		"false",
		"null"
	]
}, Vn = /^( {0,3})(`{3,}|~{3,})(.*)$/, Hn = /^ {0,3}(`{3,}|~{3,})[ \t]*$/, N = /^ {0,3}> ?/, P = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/, Un = /^[ \t]*(?:\|[ \t]*)?:?-+:?(?:[ \t]*\|[ \t]*:?-+:?)*[ \t]*(?:\|[ \t]*)?$/;
function F(e) {
	let t = Vn.exec(e);
	return t === null || t[2][0] === "`" && t[3].includes("`") ? null : {
		indent: t[1].length,
		marker: t[2],
		info: t[3]
	};
}
function Wn(e, t) {
	let n = Hn.exec(e);
	return n !== null && n[1][0] === t[0] && n[1].length >= t.length;
}
//#endregion
//#region src/languages/markdown.ts
var Gn = {
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
function Kn(e) {
	let t = e.trim().split(/\s+/, 1)[0].replace(/^\{?\.?|\}$/g, "").toLowerCase();
	return Gn[t] ?? t;
}
var I = {
	fence: "",
	quotes: 0,
	language: "",
	inner: null,
	comment: !1
}, qn = /^#{1,6}(?=\s|$)/, Jn = /^ {0,3}=+[ \t]*$/, Yn = /^( {0,3})(\[[^\]]+\]:)([ \t]*)(\S+)(.*)$/, Xn = /(?:[-*+]|\d{1,9}[.)])(?=[ \t]|$)/y, Zn = /\[[ xX]\](?=[ \t]|$)/y, Qn = /[!-/:-@[-`{-~]/, $n = /&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[A-Za-z][A-Za-z\d]{1,31});/y, er = /<(?:[A-Za-z][A-Za-z\d+.-]{1,31}:[^<>\s]*|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)>/y, tr = /<\/?[A-Za-z][\w-]*(?:\s[^<>]*)?\/?>/y, nr = /(?:https?:\/\/|www\.)[^\s<]*[^\s<?!.,:*_~)]/y;
function rr(e) {
	return {
		initialState: I,
		tokenizeLine(t, n, r) {
			let i = n;
			return i.fence.length > 0 ? ir(t, i, r, e) : sr(t, i, r, e);
		}
	};
}
function ir(e, t, n, r) {
	let i = ar(e, t.quotes);
	if (i.marks.length < t.quotes) return sr(e, I, n, r);
	or(i, n);
	let a = i.end, o = a === 0 ? e : e.slice(a);
	if (Wn(o, t.fence)) return n(a + o.search(/\S/), a + o.trimEnd().length, "code"), I;
	let s = t.language.length > 0 ? r(t.language) : null;
	if (s === null) return o.length > 0 && n(a, e.length, "code"), t;
	let c = a === 0 ? n : (e, t, r) => n(a + e, a + t, r), l = s.tokenizeLine(o, t.inner ?? s.initialState, c);
	return {
		...t,
		inner: l
	};
}
function ar(e, t) {
	let n = [], r = 0;
	for (; n.length < t;) {
		let t = N.exec(r === 0 ? e : e.slice(r));
		if (t === null) break;
		n.push(r + t[0].indexOf(">")), r += t[0].length;
	}
	return {
		marks: n,
		end: r
	};
}
function or(e, t) {
	for (let n of e.marks) t(n, n + 1, "quote");
}
function sr(e, t, n, r) {
	let i = 0;
	if (t.comment) {
		let r = e.indexOf("-->");
		if (r < 0) return e.length > 0 && n(0, e.length, "comment"), t;
		n(0, r + 3, "comment"), i = r + 3;
	}
	if (i === 0) {
		let t = ar(e, 64), i = F(t.end === 0 ? e : e.slice(t.end));
		if (i !== null) {
			let a = t.end + i.indent, o = Kn(i.info);
			return or(t, n), n(a, a + i.marker.length, "code"), i.info.trim().length > 0 && n(a + i.marker.length + i.info.search(/\S/), e.trimEnd().length, "keyword"), {
				fence: i.marker,
				quotes: t.marks.length,
				language: o,
				inner: r(o)?.initialState ?? null,
				comment: !1
			};
		}
		if (Jn.test(e)) return n(e.search(/\S/), e.trimEnd().length, "heading"), I;
		if (P.test(e) || Un.test(e) && e.includes("|")) return n(e.search(/\S/), e.trimEnd().length, "punctuation"), I;
		let a = Yn.exec(e);
		if (a !== null) {
			let t = a[1].length, r = t + a[2].length + a[3].length;
			return n(t, t + a[2].length - 1, "link"), n(r, r + a[4].length, "string"), a[5].trim().length > 0 && n(r + a[4].length + a[5].search(/\S/), e.trimEnd().length, "string"), I;
		}
	}
	return {
		...I,
		comment: cr(e, i, n)
	};
}
function cr(e, t, n) {
	let r = t, i = !1;
	for (;;) {
		let t = lr(e, r);
		if (e.charAt(t) === ">") {
			n(t, t + 1, "quote"), i = !0, r = t + 1;
			continue;
		}
		if (Xn.lastIndex = t, Xn.test(e)) {
			n(t, Xn.lastIndex, "keyword"), r = Xn.lastIndex;
			let i = lr(e, r);
			Zn.lastIndex = i, Zn.test(e) && (n(i, Zn.lastIndex, "keyword"), r = Zn.lastIndex);
			continue;
		}
		r = t;
		break;
	}
	return qn.test(e.slice(r)) ? (n(r, e.trimEnd().length, "heading"), !1) : ur(e, r, i ? "quote" : null, n);
}
function lr(e, t) {
	let n = t;
	for (; e.charAt(n) === " " || e.charAt(n) === "	";) n++;
	return n;
}
function ur(e, t, n, r) {
	let i = t, a = t, o = {
		from: t,
		closes: /* @__PURE__ */ new Map(),
		pairs: /* @__PURE__ */ new Map()
	}, s = (e, t, o) => {
		n !== null && e > i && r(i, e, n), r(e, t, o), i = t, a = t;
	};
	for (; a < e.length;) {
		let t = e.charAt(a);
		if (t === "\\" && Qn.test(e.charAt(a + 1))) {
			s(a, a + 2, "escape");
			continue;
		}
		if (t === "`") {
			let t = L(e, a, "`"), n = dr(e, a + t, "`", t);
			if (n < 0) {
				a += t;
				continue;
			}
			s(a, n + t, "code");
			continue;
		}
		if (t === "*" || t === "_" || t === "~") {
			let n = fr(e, a, t, o);
			if (n < 0) {
				a += L(e, a, t);
				continue;
			}
			let r = Math.min(L(e, a, t), 3);
			s(a, n, t === "~" ? "strikethrough" : r >= 2 ? "strong" : "emphasis");
			continue;
		}
		if (t === "[" || t === "!" && e.charAt(a + 1) === "[") {
			if (mr(e, a, s, o)) continue;
			a += t === "!" ? 2 : 1;
			continue;
		}
		if (t === "<") {
			if (e.startsWith("<!--", a)) {
				let t = e.indexOf("-->", a + 4);
				if (t < 0) return s(a, e.length, "comment"), !0;
				s(a, t + 3, "comment");
				continue;
			}
			if (er.lastIndex = a, er.test(e)) {
				s(a, er.lastIndex, "link");
				continue;
			}
			if (tr.lastIndex = a, tr.test(e)) {
				s(a, tr.lastIndex, "tag");
				continue;
			}
		}
		if (t === "&" && ($n.lastIndex = a, $n.test(e))) {
			s(a, $n.lastIndex, "escape");
			continue;
		}
		if ((t === "h" || t === "w") && (a === 0 || /[\s(]/.test(e.charAt(a - 1))) && (nr.lastIndex = a, nr.test(e))) {
			s(a, nr.lastIndex, "link");
			continue;
		}
		if (t === "|") {
			s(a, a + 1, "punctuation");
			continue;
		}
		a++;
	}
	return n !== null && e.length > i && r(i, e.length, n), !1;
}
function L(e, t, n) {
	let r = t;
	for (; e.charAt(r) === n;) r++;
	return r - t;
}
function dr(e, t, n, r) {
	let i = e.indexOf(n, t);
	for (; i >= 0;) {
		let t = L(e, i, n);
		if (t === r) return i;
		i = e.indexOf(n, i + t);
	}
	return -1;
}
function fr(e, t, n, r) {
	let i = L(e, t, n), a = n === "~" ? i : Math.min(i, 3);
	if (n === "~" && i > 2) return -1;
	let o = e.charAt(t + i);
	if (o === "" || /\s/.test(o) || n === "_" && t > 0 && /[\p{L}\p{N}]/u.test(e.charAt(t - 1))) return -1;
	let s = pr(e, t + i, n, a, r);
	return s < 0 ? -1 : s + a;
}
function pr(e, t, n, r, i) {
	let a = n + r, o = i.closes.get(a);
	if (o !== void 0 && o.from <= t && (o.close < 0 || o.close >= t)) return o.close;
	let s = t, c = -1;
	for (;;) {
		let t = e.indexOf(n.repeat(r), s);
		if (t < 0) break;
		let i = L(e, t, n), a = !/\s/.test(e.charAt(t - 1)), o = n === "_" && /[\p{L}\p{N}]/u.test(e.charAt(t + i));
		if (a && !o && i === r) {
			c = t;
			break;
		}
		s = t + i;
	}
	return i.closes.set(a, {
		from: t,
		close: c
	}), c;
}
function mr(e, t, n, r) {
	let i = hr(e, e.charAt(t) === "!" ? t + 1 : t, "[", "]", r);
	if (i < 0) return !1;
	let a = e.charAt(i + 1);
	if (a !== "(" && a !== "[") return !1;
	let o = hr(e, i + 1, a, a === "(" ? ")" : "]", r);
	return o < 0 ? !1 : (n(t, i + 1, "link"), n(i + 1, o + 1, a === "(" ? "string" : "link"), !0);
}
function hr(e, t, n, r, i) {
	let a = i.pairs.get(n);
	return a === void 0 && (a = gr(e, i.from, n, r), i.pairs.set(n, a)), a.get(t) ?? -1;
}
function gr(e, t, n, r) {
	let i = /* @__PURE__ */ new Map(), a = [];
	for (let o = t; o < e.length; o++) {
		let t = e.charAt(o);
		if (t === "\\") {
			o++;
			continue;
		}
		if (t === n) a.push(o);
		else if (t === r) {
			let e = a.pop();
			e !== void 0 && i.set(e, o);
		}
	}
	return i;
}
//#endregion
//#region src/languages/python.ts
var _r = O("\n    False None True and as assert async await break class continue def del elif else except finally for from global if import in\n    is lambda nonlocal not or pass raise return try while with yield match case\n"), vr = O("\n    print len range int str float list dict set tuple bool type isinstance issubclass enumerate zip map filter sorted reversed min\n    max sum abs any all open super object iter next getattr setattr hasattr callable format repr round divmod pow input id hash\n    vars dir globals locals Exception ValueError TypeError KeyError IndexError RuntimeError StopIteration AttributeError\n"), yr = /[A-Za-z_]\w*/y, br = /0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[jJ]?/y, xr = /(?:[rRbBuUfF]{1,2})?(?:'''|"""|'|")/y, Sr = /[+\-*/%=<>!&|^~@:]+|->/y, Cr = /\s*\(/y, wr = {
	initialState: () => ({
		mode: "code",
		strings: [],
		frames: [],
		declaring: null
	}),
	token(e, t) {
		return t.mode === "string" ? Tr(e, t) : Dr(e, t);
	}
};
function Tr(e, t) {
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
		if (e.match(n.quote)) return Er(t), "string";
		e.next();
	}
	return n.quote.length === 1 && Er(t), "string";
}
function Er(e) {
	e.strings.pop(), e.mode = "code";
}
function Dr(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = e.peek();
	if (n === "#") return e.skipToEnd(), "comment";
	if (e.match(xr)) {
		let n = e.current(), r = n.search(/['"]/), i = n.slice(0, r).toLowerCase();
		return t.strings.push({
			quote: n.slice(r),
			raw: i.includes("r"),
			formatted: i.includes("f")
		}), t.mode = "string", t.declaring = null, Tr(e, t);
	}
	if (e.match(br)) return t.declaring = null, "number";
	if (n === "@" && e.match(/@[A-Za-z_][\w.]*/y)) return "meta";
	if (e.match(yr)) {
		let n = e.current(), r = t.declaring;
		return t.declaring = null, _r.has(n) ? (t.declaring = n === "def" || n === "class" ? n : null, "keyword") : r === "def" ? "function" : r === "class" ? "type" : n === "self" || n === "cls" ? "variable" : (Cr.lastIndex = e.pos, Cr.test(e.text) ? "function" : vr.has(n) || Lt(n) ? "type" : null);
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
	return e.match(/[()[\],;.]/y) ? "punctuation" : e.match(Sr) ? "operator" : (e.next(), null);
}
var Or = {
	...D(wr),
	keywords: [..._r, ...vr]
}, kr = [
	["json", Bn],
	["css", yn],
	["less", bn],
	["javascript", Rt],
	["typescript", Rt],
	["html", Fn],
	["bash", wt],
	["csharp", en],
	["python", Or]
], Ar = "plain-text", jr = class e {
	tokenizers = new Map(kr);
	listeners = /* @__PURE__ */ new Set();
	constructor() {
		this.tokenizers.set("markdown", rr((e) => this.get(e)));
	}
	static normalize(e) {
		let t = (e ?? "").trim().toLowerCase();
		return t.length === 0 ? Ar : t;
	}
	get(t) {
		return this.tokenizers.get(e.normalize(t)) ?? null;
	}
	register(t, n) {
		let r = e.normalize(t);
		if (r === Ar) throw Error("The plain-text language cannot be redefined.");
		if (typeof n?.tokenizeLine != "function" || n.initialState === void 0) throw Error(`The language '${t}' needs a tokenizer with an initialState and a tokenizeLine.`);
		this.tokenizers.set(r, n);
		for (let e of this.listeners) e(r);
	}
	onRegistered(e) {
		return this.listeners.add(e), () => this.listeners.delete(e);
	}
}, R = new jr(), Mr = "*", Nr = new class {
	sources = /* @__PURE__ */ new Map();
	register(e, t) {
		let n = jr.normalize(e), r = this.sources.get(n);
		r === void 0 ? this.sources.set(n, [t]) : r.push(t);
	}
	sourcesFor(e) {
		let t = this.sources.get(Mr) ?? [], n = this.sources.get(jr.normalize(e)) ?? [];
		return [...t, ...n];
	}
	hasOwnSource(e) {
		return this.sourcesFor(e).length > 0;
	}
}(), Pr = /* @__PURE__ */ new Map();
function Fr(e) {
	let t = Pr.get(e);
	return t === void 0 && (t = fetch(e).then((t) => t.ok ? t.json() : Promise.reject(/* @__PURE__ */ Error(`Failed to load completions: ${e}`))).then(nt).catch(() => ({
		items: [],
		triggers: []
	})), Pr.set(e, t)), t;
}
function Ir(e) {
	return e instanceof InputEvent && e.inputType === "insertText";
}
var Lr = class {
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
		this.root = e.root, this.textarea = e.textarea, this.scroller = e.scroller, this.context = t, this.surface = n, this.editing = r, this.carets = i, this.getLanguage = a, this.anchor = document.createElement("span"), this.anchor.className = me, this.anchor.setAttribute("aria-hidden", "true"), e.content.appendChild(this.anchor);
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
		let t = this.textarea.value, n = this.textarea.selectionStart, r = Ke(t, n), i = r.length > 0 || this.triggers().includes(t.charAt(n - 1));
		if (this.isOpen) {
			if (!i) {
				this.close();
				return;
			}
		} else if (!Ir(e) || !i || this.tokenBlocks(n) || !this.hasExtraSource(this.getLanguage())) return;
		this.lastKnownCaret = n, this.gatherAndShow(r, n);
	}
	openExplicit() {
		this.ensureFileLoaded();
		let e = this.textarea.selectionStart;
		this.tokenBlocks(e) || (this.lastKnownCaret = e, this.gatherAndShow(Ke(this.textarea.value, e), e));
	}
	tokenBlocks(e) {
		let t = this.surface.tokenKindAt(e);
		return t === "comment" || t === "string";
	}
	triggers() {
		return this.loadedFile?.triggers ?? [];
	}
	hasExtraSource(e) {
		return this.sourceUrl !== null && this.sourceUrl.length > 0 || Nr.hasOwnSource(e) ? !0 : (R.get(e)?.keywords?.length ?? 0) > 0;
	}
	ensureFileLoaded() {
		let e = this.root.getAttribute("data-ui-code-completions-source");
		e !== this.sourceUrl && (this.sourceUrl = e, this.loadedFile = null, e !== null && e.length !== 0 && Fr(e).then((t) => {
			this.root.getAttribute("data-ui-code-completions-source") === e && (this.loadedFile = t);
		}));
	}
	async gatherAndShow(e, t) {
		let n = ++this.requestId, r = this.getLanguage(), i = this.buildContext(e, t, r), a = await qe(this.sourcesFor(r), i);
		if (n !== this.requestId || !this.textarea.isConnected || document.activeElement !== this.textarea || this.textarea.selectionStart !== t) return;
		let o = Je(a, e);
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
		this.loadedFile !== null && this.loadedFile.items.length > 0 && t.push(this.loadedFile.items), t.push(...Nr.sourcesFor(e));
		let n = R.get(e)?.keywords;
		return n !== void 0 && n.length > 0 && t.push(n.map((e) => ({
			label: e,
			kind: "keyword"
		}))), t.push(Ze), t;
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
		return e.className = de, e.hidden = !0, e.setAttribute("role", "listbox"), e.id = this.context.dom.ensureId(e, "code-completions"), e.addEventListener("mousedown", (e) => e.preventDefault()), e.addEventListener("click", (e) => this.pointerAccept(e)), e.addEventListener("pointermove", (e) => this.pointerMoved(e)), this.root.append(e), this.list = e, e;
	}
	renderItems() {
		if (this.list !== null) {
			this.list.replaceChildren();
			for (let e = 0; e < this.items.length; e++) {
				let t = this.items[e], n = document.createElement("li");
				n.id = `${this.list.id}-${e}`, n.className = fe, n.setAttribute("role", "option"), t.kind !== void 0 && n.classList.add(`${fe}--${t.kind}`);
				let r = document.createElement("span");
				if (r.className = `${fe}-label`, r.textContent = t.label, n.append(r), t.detail !== void 0) {
					let e = document.createElement("span");
					e.className = `${fe}-detail`, e.textContent = t.detail, n.append(e);
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
			t.classList.toggle(pe, n), t.setAttribute("aria-selected", n ? "true" : "false");
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
		let t = e.closest(`.${fe}`);
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
function Rr(e, t, n) {
	let r = !1, i = (e) => n ? e.toUpperCase() : e.toLowerCase(), a = E(t, (t) => {
		if (S(t)) {
			let n = Me(e, t.head);
			if (n === null) return null;
			let a = i(e.slice(n.from, n.to));
			return a === e.slice(n.from, n.to) ? null : (r = !0, {
				from: n.from,
				to: n.to,
				text: a,
				caret: t.head - n.from
			});
		}
		let n = b(t), a = x(t), o = i(e.slice(n, a));
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
function zr(e, t, n, r) {
	if (!r && t.ranges.every(S)) {
		let r = be(e);
		return E(t, (t) => {
			let i = " ".repeat(n - y(e, r, t.head, n) % n);
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
		let t = b(o), s = x(o), c = e.lastIndexOf("\n", t - 1) + 1, l = e.indexOf("\n", s > t ? s - 1 : s);
		for (l < 0 && (l = e.length); c <= l;) {
			let t = e.indexOf("\n", c);
			if (t < 0 && (t = e.length), c > a) {
				let o = Br(e, c, t, n, r);
				o !== null && i.push(o), a = c;
			}
			c = t + 1;
		}
	}
	return i.length === 0 ? null : {
		edits: i,
		after: w(t.ranges.map((e) => ({
			anchor: T(e.anchor, i),
			head: T(e.head, i)
		})), t.primary)
	};
}
function Br(e, t, n, r, i) {
	if (!i) return n === t ? null : {
		from: t,
		to: t,
		text: " ".repeat(r)
	};
	let a = Vr(e, t, n, r);
	return a === 0 ? null : {
		from: t,
		to: t + a,
		text: ""
	};
}
function Vr(e, t, n, r) {
	if (e[t] === "	") return 1;
	let i = 0;
	for (; i < r && t + i < n && e[t + i] === " ";) i++;
	return i;
}
function Hr(e, t, n, r) {
	let i = e.lastIndexOf("\n", t - 1) + 1, a = e.slice(i, t), o = /^[ \t]*/.exec(a)?.[0] ?? "", s = a.trimEnd(), c = s.charAt(s.length - 1);
	return (c === "{" || c === "[" || c === "(" || c === ":" && r) && (o += " ".repeat(n)), "\n" + o;
}
//#endregion
//#region src/code-editor-editing.ts
var Ur = class {
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
		let t = Rr(this.textarea.value, this.carets.read(), e);
		t !== null && this.surface.apply(t.edits, t.after, "other");
	}
	tab(e) {
		let t = zr(this.textarea.value, this.carets.read(), this.surface.tabSize, e);
		t !== null && this.surface.apply(t.edits, t.after, "other");
	}
	newLine() {
		let e = this.textarea.value, t = this.surface.tabSize, n = this.getLanguage() === "python";
		this.replaceEach((r) => Hr(e, b(r), t, n), "other");
	}
	replaceEach(e, t) {
		let { set: n, pads: r } = this.carets.readPadded(), { edits: i, after: a } = E(n, (t, n) => {
			let i = r === null ? 0 : Math.min(r[n].anchor, r[n].head), a = " ".repeat(i) + e(t, n);
			return {
				from: b(t),
				to: x(t),
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
				e.preventDefault(), this.deleteEach((e) => xe(t, e), "deleting");
				return;
			case "deleteContentForward":
				e.preventDefault(), this.deleteEach((e) => Se(t, e), "deleting");
				return;
			case "deleteWordBackward":
				e.preventDefault(), this.deleteEach((e) => je(t, e), "other");
				return;
			case "deleteWordForward":
				e.preventDefault(), this.deleteEach((e) => Ae(t, e), "other");
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
		let { edits: n, after: r } = E(this.carets.read(), (t) => {
			if (!S(t)) return {
				from: b(t),
				to: x(t),
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
		return e.ranges.length < 2 || e.ranges.every(S) ? null : e.ranges.map((e) => this.textarea.value.slice(b(e), x(e)));
	}
	cut(e) {
		if (this.textarea.readOnly) return;
		let t = this.selectedPieces();
		t !== null && e.clipboardData !== null && (e.preventDefault(), e.clipboardData.setData("text/plain", t.join("\n")), this.copied = t, this.deleteEach((e) => e, "other"));
	}
	paste(e) {
		let t = this.carets.read();
		if (t.ranges.length < 2 || this.textarea.readOnly || e.clipboardData === null) return;
		let n = e.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n"), r = Ue(n, t.ranges.length, this.copied);
		e.preventDefault(), this.replaceEach((e, t) => r?.[t] ?? n, "other");
	}
	acceptCompletion(e) {
		let t = this.textarea.value, { edits: n, after: r } = E(this.carets.read(), (n) => S(n) ? {
			from: Ge(t, n.head),
			to: n.head,
			text: e,
			caret: e.length
		} : null);
		this.surface.apply(n, r, "other");
	}
}, Wr = 5e3, Gr = class {
	done = [];
	undone = [];
	open = !1;
	record(e, t) {
		this.undone.length = 0;
		let n = this.done.at(-1);
		this.open && n !== void 0 && Kr(n, e, t) ? n.changes.push(e) : (this.done.push({
			kind: t,
			changes: [e]
		}), this.done.length > Wr && this.done.shift()), this.open = !0;
	}
	recordFor(e, t) {
		let n = this.done.at(-1);
		if (n === void 0 || !n.changes.includes(t)) {
			this.record(e, "other");
			return;
		}
		this.undone.length = 0, n.changes.push(e), this.open = !1;
	}
	retract(e, t) {
		let n = this.done.at(-1);
		if (n === void 0 || n.changes.length !== 1 || n.changes[0] !== t || t.edits.length !== 1 || e.edits.length !== 1) return !1;
		let r = t.edits[0], i = e.edits[0];
		return i.from !== r.from || i.to !== r.from + r.text.length || i.text !== t.removed[0] ? !1 : (this.done.pop(), this.undone.length = 0, this.open = !1, !0);
	}
	undo(e) {
		let t = this.done.pop();
		if (t === void 0) return null;
		let n = e;
		for (let e = t.changes.length - 1; e >= 0; e--) n = ze(n, qr(t.changes[e]));
		return this.undone.push(t), this.open = !1, {
			text: n,
			selections: t.changes[0].before
		};
	}
	redo(e) {
		let t = this.undone.pop();
		if (t === void 0) return null;
		let n = e;
		for (let e of t.changes) n = ze(n, e.edits);
		return this.done.push(t), this.open = !1, {
			text: n,
			selections: t.changes[t.changes.length - 1].after
		};
	}
	clear() {
		this.done.length = 0, this.undone.length = 0, this.open = !1;
	}
};
function Kr(e, t, n) {
	let r = e.changes[e.changes.length - 1];
	if (n === "other" || n !== e.kind || !Re(r.after, t.before)) return !1;
	if (n !== "typing") return !0;
	let i = r.edits.at(-1)?.text ?? "", a = t.edits[0]?.text ?? "";
	return !(/\s$/.test(i) && /^\S/.test(a));
}
function qr(e) {
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
function Jr(e, t, n) {
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
function Yr(e, t) {
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
function Xr(e, t) {
	let n = [];
	for (let r of Zr(e, t)) n.push({
		from: r.index,
		to: r.index + r[0].length
	});
	return n;
}
function* Zr(e, t) {
	if (t === null || "invalid" in t) return;
	let n = t.pattern;
	for (n.lastIndex = 0;;) {
		let r = n.exec(e);
		if (r === null) return;
		if (r[0].length === 0) {
			n.lastIndex++;
			continue;
		}
		if (t.wholeWord && !Qr(e, r.index, r.index + r[0].length)) {
			n.lastIndex = r.index + 1;
			continue;
		}
		let i = n.lastIndex;
		yield r, n.lastIndex = i;
	}
}
function Qr(e, t, n) {
	return (t === 0 || !ke.test(e.charAt(t - 1))) && (n >= e.length || !ke.test(e.charAt(n)));
}
function $r(e, t) {
	if (e.length === 0) return -1;
	for (let n = 0; n < e.length; n++) if (e[n].from >= t) return n;
	return 0;
}
function ei(e, t) {
	if (e.length === 0) return -1;
	for (let n = e.length - 1; n >= 0; n--) if (e[n].from < t) return n;
	return e.length - 1;
}
function ti(e, t, n, r, i) {
	if (!i || n === null || "invalid" in n) return r;
	let a = new RegExp(n.pattern.source, n.pattern.flags.replace("g", "") + "y");
	a.lastIndex = t.from;
	let o = a.exec(e);
	return o === null ? r : ri(e, o, r);
}
function ni(e, t, n, r) {
	let i = "", a = 0, o = !1;
	for (let s of Zr(e, t)) i += e.slice(a, s.index) + (r ? ri(e, s, n) : n), a = s.index + s[0].length, o = !0;
	return o ? i + e.slice(a) : e;
}
function ri(e, t, n) {
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
var ii = class {
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
			matchCase: ai(this.matchCase),
			wholeWord: ai(this.wholeWord),
			regex: ai(this.regex)
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
		this.query = Yr(this.findField.value, n), this.matches = Xr(this.textarea.value, this.query);
		let i = this.query !== null && "invalid" in this.query;
		this.markInvalid(i);
		let a = e && r !== void 0 ? this.matches.findIndex((e) => e.from === r.from) : -1, o = a >= 0 ? a : $r(this.matches, this.textarea.selectionStart);
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
		let a = t.querySelector(`.${ue}`);
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
		let t = this.current >= 0 ? this.matches[this.current].from : this.textarea.selectionStart, n = e > 0 ? $r(this.matches, t + 1) : ei(this.matches, t);
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
		let e = this.matches[this.current], t = ti(this.textarea.value, e, this.query, this.replaceField.value, this.options.regex);
		this.surface.replaceRange(e.from, e.to, t), this.replaceField.focus({ preventScroll: !0 }), this.goTo($r(this.matches, e.from + t.length), !0);
	}
	replaceEvery() {
		if (this.textarea.readOnly || this.matches.length === 0) return;
		let e = this.textarea.value, t = ni(e, this.query, this.replaceField.value, this.options.regex);
		if (t === e) return;
		let n = Jr(e, t, 0);
		this.surface.replaceRange(n.from, n.to, n.text), this.replaceField.focus({ preventScroll: !0 });
	}
};
function ai(e) {
	return e?.getAttribute("aria-pressed") === "true";
}
//#endregion
//#region src/markdown-format.ts
var oi = [
	"bold",
	"italic",
	"strikethrough",
	"code",
	"link",
	"heading",
	"list"
], si = 6, ci = {
	bold: {
		character: "*",
		length: 2,
		holds: (e) => e >= 2
	},
	italic: {
		character: "*",
		length: 1,
		holds: (e) => e === 1 || e >= 3
	},
	strikethrough: {
		character: "~",
		length: 2,
		holds: (e) => e >= 2
	}
}, z = "`", li = /\s/, ui = /^( {0,3})(#{1,6})(?:[ \t]+|$)/, di = /^([ \t]*)(?:[-*+]|\d{1,9}[.)])(?:[ \t]+\[[ xX]\])?(?:[ \t]+|$)/, fi = /^\[([^[\]\n]*)\]\([^()\s]*\)$/, pi = /^\]\([^()\s]*\)/, mi = /^(?:https?:\/\/|mailto:)\S+$/;
function hi(e, t, n) {
	if (n === "list") {
		let n = Ii(e, t.ranges, di), r = n.every((e) => e.mark !== null);
		return Pi(t, n, (e) => r ? "" : e.mark ?? "- ");
	}
	let r = E(t, (t) => xi(e, t, n));
	return r.edits.length === 0 ? null : r;
}
function gi(e, t, n) {
	let r = Ii(e, t.ranges, ui), i = r.every((e) => yi(e) === n);
	return Pi(t, r, () => i ? "" : "#".repeat(n) + " ");
}
function _i(e, t) {
	let n = t.ranges[t.primary];
	if (n === void 0) return 0;
	let r = new Set(Ii(e, [n], ui).map(yi));
	return r.size === 1 ? [...r][0] : 0;
}
function vi(e) {
	return Array.from({ length: si }, (t, n) => ({
		level: n + 1,
		checked: n + 1 === e
	}));
}
function yi(e) {
	return e.mark === null ? 0 : e.mark.trimEnd().length;
}
function bi(e, t, n) {
	let r = t.ranges[t.primary];
	return r === void 0 ? !1 : n === "heading" || n === "list" ? Ii(e, [r], n === "heading" ? ui : di).every((e) => e.mark !== null) : Oi(e, r, n) !== null;
}
function xi(e, t, n) {
	let r = Oi(e, t, n);
	if (r !== null) return S(t) ? {
		from: r.from,
		to: r.to,
		text: "",
		caret: 0
	} : Si(t, r.from, r.to, r.inner, 0, r.inner.length);
	if (S(t)) return Ci(t.head, n);
	let { from: i, to: a } = Di(e, t);
	if (i === a) return null;
	let o = e.slice(i, a);
	if (n === "link") return Ti(i, a, o);
	let { open: s, close: c } = n === "code" ? Ei(o) : {
		open: wi(n),
		close: wi(n)
	};
	return Si(t, i, a, s + o + c, s.length, s.length + o.length);
}
function Si(e, t, n, r, i, a) {
	let o = e.anchor <= e.head;
	return {
		from: t,
		to: n,
		text: r,
		caret: o ? a : i,
		anchor: o ? i : a
	};
}
function Ci(e, t) {
	if (t === "link") return {
		from: e,
		to: e,
		text: "[]()",
		caret: 1
	};
	let n = t === "code" ? z : wi(t);
	return {
		from: e,
		to: e,
		text: n + n,
		caret: n.length
	};
}
function wi(e) {
	let t = ci[e];
	return t.character.repeat(t.length);
}
function Ti(e, t, n) {
	return mi.test(n) ? {
		from: e,
		to: t,
		text: `[](${n})`,
		caret: 1
	} : {
		from: e,
		to: t,
		text: `[${n}]()`,
		caret: n.length + 3
	};
}
function Ei(e) {
	let t = 0, n = 0;
	for (let r of e) n = r === z ? n + 1 : 0, t = Math.max(t, n);
	let r = z.repeat(t + 1), i = e.startsWith(z) || e.endsWith(z) ? " " : "";
	return {
		open: r + i,
		close: i + r
	};
}
function Di(e, t) {
	let n = b(t), r = x(t);
	for (; n < r && li.test(e[n]);) n++;
	for (; r > n && li.test(e[r - 1]);) r--;
	return {
		from: n,
		to: r
	};
}
function Oi(e, t, n) {
	if (S(t)) return ki(e, t.head, n);
	let { from: r, to: i } = Di(e, t);
	if (r === i) return null;
	switch (n) {
		case "code": return ji(e, r, i);
		case "link": return Ni(e, r, i);
		default: return Ai(e, r, i, ci[n]);
	}
}
function ki(e, t, n) {
	if (n === "link") return e.startsWith("[]()", t - 1) ? {
		from: t - 1,
		to: t + 3,
		inner: ""
	} : null;
	if (n === "code") return B(e, t, z) === 1 && V(e, t, z) === 1 ? {
		from: t - 1,
		to: t + 1,
		inner: ""
	} : null;
	let r = ci[n], i = B(e, t, r.character), a = V(e, t, r.character);
	return r.holds(i) && r.holds(a) ? {
		from: t - r.length,
		to: t + r.length,
		inner: ""
	} : null;
}
function Ai(e, t, n, r) {
	let i = e.slice(t, n), a = V(i, 0, r.character), o = B(i, i.length, r.character);
	return a < i.length && r.holds(a) && r.holds(o) ? {
		from: t,
		to: n,
		inner: i.slice(r.length, i.length - r.length)
	} : r.holds(B(e, t, r.character)) && r.holds(V(e, n, r.character)) ? {
		from: t - r.length,
		to: n + r.length,
		inner: i
	} : null;
}
function ji(e, t, n) {
	let r = e.slice(t, n), i = V(r, 0, z);
	if (i > 0 && i * 2 < r.length && B(r, r.length, z) === i) return {
		from: t,
		to: n,
		inner: Mi(r.slice(i, r.length - i))
	};
	let a = e[t - 1] === " " && e[n] === " " && e[t - 2] === z && e[n + 1] === z, o = a ? t - 1 : t, s = a ? n + 1 : n, c = B(e, o, z);
	return c > 0 && V(e, s, z) === c ? {
		from: o - c,
		to: s + c,
		inner: r
	} : null;
}
function Mi(e) {
	return e.length > 2 && e.startsWith(" ") && e.endsWith(" ") && e.trim().length > 0 ? e.slice(1, -1) : e;
}
function Ni(e, t, n) {
	let r = e.slice(t, n), i = fi.exec(r);
	if (i !== null) return {
		from: t,
		to: n,
		inner: i[1]
	};
	let a = e[t - 1] === "[" ? pi.exec(e.slice(n)) : null;
	return a === null || r.includes("\n") ? null : {
		from: t - 1,
		to: n + a[0].length,
		inner: r
	};
}
function B(e, t, n) {
	let r = 0;
	for (; t - r > 0 && e[t - r - 1] === n;) r++;
	return r;
}
function V(e, t, n) {
	let r = 0;
	for (; t + r < e.length && e[t + r] === n;) r++;
	return r;
}
function Pi(e, t, n) {
	let r = [];
	for (let e of t) {
		let t = e.start + e.indent, i = n(e);
		i !== (e.mark ?? "") && r.push({
			from: t,
			to: t + (e.mark?.length ?? 0),
			text: i
		});
	}
	return r.length === 0 ? null : {
		edits: r,
		after: w(e.ranges.map((e) => {
			let t = e.anchor <= e.head, n = T(b(e), r), i = Fi(x(e), r);
			return S(e) ? {
				anchor: i,
				head: i
			} : t ? {
				anchor: n,
				head: i
			} : {
				anchor: i,
				head: n
			};
		}), e.primary)
	};
}
function Fi(e, t) {
	let n = t.find((t) => t.from === e && t.to === e);
	return T(e, t) + (n?.text.length ?? 0);
}
function Ii(e, t, n) {
	let r = /* @__PURE__ */ new Set();
	for (let n of t) {
		let t = b(n), i = x(n);
		i > t && e[i - 1] === "\n" && i--;
		for (let n = e.lastIndexOf("\n", t - 1) + 1; n <= i && (r.add(n), e.includes("\n", n)); n = e.indexOf("\n", n) + 1);
	}
	let i = [], a = [];
	for (let t of [...r].sort((e, t) => e - t)) {
		let r = e.includes("\n", t) ? e.indexOf("\n", t) : e.length, o = e.slice(t, r), s = n.exec(o), c = s === null ? {
			start: t,
			indent: o.length - o.trimStart().length,
			mark: null
		} : {
			start: t,
			indent: s[1].length,
			mark: s[0].slice(s[1].length)
		};
		i.push(c), o.trim().length > 0 && a.push(c);
	}
	return a.length > 0 ? a : i;
}
//#endregion
//#region src/code-editor-format-bar.ts
var Li = "markdown", Ri = 6, zi = {
	bold: s,
	italic: c,
	strikethrough: l,
	code: u,
	link: d,
	heading: f,
	list: p
}, Bi = {
	bold: "KeyB",
	italic: "KeyI",
	link: "KeyK"
};
function Vi(e) {
	return e.enabled && e.markdown && e.editable;
}
function Hi(e, t) {
	return (t === "mouse" || t === "pen") && e.selected && Vi(e);
}
function Ui(e) {
	return e.selected && Vi(e);
}
function Wi(e) {
	if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return null;
	for (let t of oi) if (t !== "heading" && Bi[t] === e.code) return t;
	return null;
}
function Gi(e) {
	return e.key === "F10" && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
}
var Ki = class {
	root;
	textarea;
	scroller;
	context;
	surface;
	carets;
	getLanguage;
	anchor;
	bar = null;
	handle = null;
	levels = null;
	levelsHandle = null;
	pressing = null;
	applying = !1;
	constructor(e, t, n, r, i) {
		this.root = e.root, this.textarea = e.textarea, this.scroller = e.scroller, this.context = t, this.surface = n, this.carets = r, this.getLanguage = i, this.anchor = document.createElement("span"), this.anchor.className = _e, this.anchor.setAttribute("aria-hidden", "true"), e.content.appendChild(this.anchor);
	}
	get state() {
		let e = this.carets.read(), t = e.ranges[e.primary];
		return {
			enabled: this.root.hasAttribute(r),
			markdown: this.getLanguage() === Li,
			editable: !this.textarea.readOnly && !this.context.states.isInert(this.textarea),
			selected: t !== void 0 && !S(t)
		};
	}
	pointerDown(e) {
		e.button === 0 && (this.pressing = e.pointerType, window.addEventListener("pointerup", () => this.pressEnded(), {
			capture: !0,
			once: !0
		}));
	}
	pressEnded() {
		let e = this.pressing;
		this.pressing = null, setTimeout(() => {
			this.textarea.isConnected && document.activeElement === this.textarea && Hi(this.state, e) && this.open(!1);
		}, 0);
	}
	key(e) {
		if (e.defaultPrevented || e.isComposing) return;
		let t = Gi(e), n = t ? null : Wi(e);
		(t || n !== null) && Vi(this.state) && (e.preventDefault(), n === null ? this.open(!0) : this.apply(n));
	}
	textChanged() {
		this.applying || this.close();
	}
	selectionChanged() {
		this.bar !== null && this.follow();
	}
	settingsChanged() {
		this.bar !== null && !Vi(this.state) && this.close();
	}
	scrolled() {
		if (this.bar === null) return;
		let e = this.anchor.getBoundingClientRect().top, t = this.scroller.getBoundingClientRect();
		(e < t.top - 1 || e >= t.top + this.scroller.clientHeight) && this.close();
	}
	wordsChanged() {
		this.bar !== null && this.writeWords(this.bar);
	}
	follow() {
		if (!Ui(this.state)) {
			this.close();
			return;
		}
		this.place(), this.handle?.reposition(), this.markPressed();
	}
	open(e) {
		if (this.place(), this.bar === null) {
			let e = this.draw();
			this.root.append(e), this.bar = e, this.handle = this.context.popups.open(this.anchor, e, {
				placement: "top-start",
				gap: Ri,
				boundary: this.scroller,
				owner: this.textarea,
				onDismiss: () => this.dismissed()
			});
		} else this.handle?.reposition();
		this.markPressed(), e && this.buttons().find((e) => e.tabIndex === 0)?.focus({ focusVisible: !0 });
	}
	place() {
		let e = this.carets.read(), t = e.ranges[e.primary];
		if (t === void 0) return;
		let n = this.carets.contentCaretRect(b(t)), r = this.carets.contentCaretRect(x(t)) ?? n;
		n !== null && r !== null && (this.anchor.style.left = `${n.left}px`, this.anchor.style.top = `${n.top}px`, this.anchor.style.height = `${Math.max(0, r.bottom - n.top)}px`);
	}
	draw() {
		let e = this.context.names, t = document.createElement("div");
		t.className = he, t.setAttribute("role", "toolbar"), t.setAttribute(e.eventBoundary, ""), t.addEventListener("mousedown", (e) => e.preventDefault()), t.addEventListener("keydown", (e) => this.barKey(e));
		let n = oi.map((t) => {
			let n = document.createElement("button"), r = document.createElement("span");
			n.type = "button", n.className = `${ge} ${e.buttonClass} ${g.ghostButtonClass} ${g.smallButtonClass}`, n.dataset.format = t, r.setAttribute("aria-hidden", "true"), this.context.icons.apply(r, ee[t]), n.append(r);
			let i = t === "heading" ? void 0 : Bi[t]?.slice(3);
			return t === "heading" && (n.setAttribute("aria-haspopup", "menu"), n.setAttribute("aria-expanded", "false")), i !== void 0 && n.setAttribute("aria-keyshortcuts", `Control+${i} Meta+${i}`), n.addEventListener("click", () => this.pressed(t, n)), n;
		});
		return t.append(...n), this.context.roving.applyTabIndex(n, n[0] ?? null), this.writeWords(t), t;
	}
	writeWords(e) {
		let { strings: t } = this.context;
		e.setAttribute("aria-label", t.text("ui.code.format-bar"));
		for (let n of e.querySelectorAll(`:scope > .${ge}`)) n.setAttribute("aria-label", t.text(zi[n.dataset.format]));
	}
	markPressed() {
		let e = this.textarea.value, t = this.carets.read();
		for (let n of this.buttons()) n.setAttribute("aria-pressed", bi(e, t, n.dataset.format) ? "true" : "false");
	}
	barKey(e) {
		if (e.ctrlKey || e.altKey || e.metaKey || !(e.target instanceof HTMLElement) || this.levels?.contains(e.target) === !0) return;
		if (e.key === "ArrowDown" && e.target.dataset.format === "heading") {
			e.preventDefault(), this.openLevels(e.target, !0);
			return;
		}
		let t = this.buttons(), n = this.context.roving.target({
			key: e.key,
			items: t,
			current: e.target,
			axis: "horizontal"
		});
		n !== null && (e.preventDefault(), this.context.roving.applyTabIndex(t, n), n.focus());
	}
	pressed(e, t) {
		if (e === "heading") {
			this.levels === null ? this.openLevels(t, document.activeElement === t) : this.closeLevels();
			return;
		}
		this.apply(e), this.bar !== null && this.follow();
	}
	openLevels(e, t) {
		if (this.bar === null || this.levels !== null) return;
		let { names: n, strings: r, dom: i } = this.context, a = _i(this.textarea.value, this.carets.read()), o = document.createElement("div"), s = [];
		o.className = ve, o.setAttribute("role", "menu"), o.setAttribute("aria-label", r.text(f)), o.addEventListener("keydown", (e) => this.levelsKey(e, s));
		for (let { level: e, checked: t } of vi(a)) {
			let i = document.createElement("button"), a = document.createElement("span");
			i.type = "button", i.className = `${n.menuItemClass} ${n.buttonClass} ${g.ghostButtonClass}`, i.setAttribute("role", "menuitemradio"), i.setAttribute(n.menuItemKind, "check"), i.setAttribute("aria-checked", t ? "true" : "false"), i.classList.toggle(n.menuItemCheckedClass, t), a.textContent = r.format("ui.code.format-heading-level", { level: e }), i.append(a), i.addEventListener("click", () => this.chooseLevel(e)), s.push(i);
		}
		o.append(...s), this.bar.append(o), this.levels = o, e.setAttribute("aria-expanded", "true"), e.setAttribute("aria-controls", i.ensureId(o, "code-heading-levels"));
		let c = s[a - 1] ?? s[0];
		this.context.roving.applyTabIndex(s, c), this.levelsHandle = this.context.popups.open(e, o, {
			placement: "bottom-start",
			surface: this.bar,
			owner: e,
			onDismiss: () => this.levelsClosed()
		}), t && c.focus();
	}
	levelsKey(e, t) {
		if (e.ctrlKey || e.altKey || e.metaKey || !(e.target instanceof HTMLElement)) return;
		let n = this.context.roving.target({
			key: e.key,
			items: t,
			current: e.target,
			axis: "vertical"
		});
		n !== null && (e.preventDefault(), this.context.roving.applyTabIndex(t, n), n.focus());
	}
	chooseLevel(e) {
		let t = gi(this.textarea.value, this.carets.read(), e);
		this.closeLevels(), this.applyResult(t), this.bar !== null && this.follow();
	}
	closeLevels() {
		this.levelsHandle?.close(), this.levelsClosed();
	}
	levelsClosed() {
		this.levels?.remove(), this.levels = null, this.levelsHandle = null, this.buttons().find((e) => e.dataset.format === "heading")?.setAttribute("aria-expanded", "false");
	}
	apply(e) {
		this.applyResult(hi(this.textarea.value, this.carets.read(), e));
	}
	applyResult(e) {
		if (e !== null) {
			this.applying = !0;
			try {
				this.surface.apply(e.edits, e.after, "other");
			} finally {
				this.applying = !1;
			}
		}
	}
	buttons() {
		return this.bar === null ? [] : [...this.bar.querySelectorAll(`:scope > .${ge}`)];
	}
	close() {
		this.bar !== null && (this.bar.contains(document.activeElement) && this.textarea.focus(), this.handle?.close(), this.dismissed());
	}
	dismissed() {
		this.closeLevels(), this.bar?.remove(), this.bar = null, this.handle = null;
	}
};
//#endregion
//#region src/markdown-pictures.ts
function qi(e, t, n) {
	let r = [];
	for (let i of e) i.type.toLowerCase().startsWith("image/") && n(t, i) && r.push(i);
	return r;
}
function Ji(e) {
	if (e === null || !e.types.includes("Files")) return !1;
	for (let t of e.items) if (t.kind === "file" && t.type.toLowerCase().startsWith("image/")) return !0;
	return !1;
}
function Yi(e, t, n) {
	let r = `![${Zi(t(e))}]()`;
	for (let i = 2; n(r); i++) r = `![${Zi(t(`${e} (${i})`))}]()`;
	return r;
}
function Xi(e, t) {
	let n = e.lastIndexOf(".");
	return `![${Zi(n > 0 ? e.slice(0, n) : e)}](${Qi(t)})`;
}
function Zi(e) {
	return e.replace(/[\\[\]]/g, "\\$&").replace(/[\r\n]+/g, " ");
}
function Qi(e) {
	return e.trim().replace(/[\s()<>]/g, (e) => `%${e.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}
function $i(e) {
	return /^\s*data:/i.test(e);
}
//#endregion
//#region src/code-editor-pictures.ts
var ea = "markdown", ta = /* @__PURE__ */ new Map();
function na(e, t) {
	let n = ta.get(e);
	n !== void 0 && (ta.delete(e), $i(t) ? n.owner.remove(n) : n.owner.place(n, t));
}
function ra(e, t) {
	let n = ta.get(e);
	n !== void 0 && (ta.delete(e), t.success ? n.owner.remove(n) : n.owner.fail(n, t.dispatched && t.error != null && t.error.length > 0 ? { text: t.error } : { key: te.fileFailed }));
}
var ia = class {
	root;
	textarea;
	context;
	surface;
	carets;
	getLanguage;
	constructor(e, t, n, r, i) {
		this.root = e.root, this.textarea = e.textarea, this.context = t, this.surface = n, this.carets = r, this.getLanguage = i;
	}
	get takes() {
		return this.root.hasAttribute("data-ui-code-pictures") && this.getLanguage() === ea && !this.textarea.readOnly && !this.context.states.isInert(this.textarea);
	}
	paste(e) {
		let t = e.clipboardData;
		if (t === null || t.files.length === 0 || t.getData("text/plain").trim().length > 0 || !this.takes) return !1;
		let n = this.carets.read(), r = n.ranges[n.primary];
		return this.take([...t.files], b(r), x(r)) ? (e.preventDefault(), !0) : !1;
	}
	dragOver(e) {
		Ji(e.dataTransfer) && this.takes && (e.preventDefault(), e.dataTransfer.dropEffect = "copy", this.root.classList.add(ce));
	}
	dragLeave(e) {
		(!(e.relatedTarget instanceof Node) || !this.root.contains(e.relatedTarget)) && this.root.classList.remove(ce);
	}
	drop(e) {
		if (this.root.classList.remove(ce), !Ji(e.dataTransfer) || !this.takes) return;
		e.preventDefault();
		let t = this.offsetAt(e.clientX, e.clientY);
		this.take([...e.dataTransfer.files], t, t) && this.textarea.focus({ preventScroll: !0 });
	}
	offsetAt(e, t) {
		let n = typeof document.caretPositionFromPoint == "function" ? document.caretPositionFromPoint(e, t) : null;
		return n?.offsetNode === this.textarea ? n.offset : this.textarea.selectionEnd;
	}
	take(e, t, n) {
		let r = qi(e, this.root.getAttribute("data-ui-code-picture-accept") ?? "", this.context.uploads.accepts);
		if (r.length === 0) return !1;
		let i = this.context.uploads.takeWithinSizeLimit(this.root, r, r.length > 1);
		if (i.length === r.length && this.context.validation.mark(this.root, null), i.length === 0) return !0;
		let a = this.textarea.value, o = [];
		for (let e of i) o.push(Yi(e.name, (e) => this.context.strings.format("ui.code.picture-uploading", { name: e }), (e) => o.includes(e) || a.includes(e)));
		let s = o.join("\n"), c = this.surface.apply([{
			from: t,
			to: n,
			text: s
		}], C(t + s.length), "other");
		if (c === null) return !0;
		let l = i.length - 1;
		for (let e = 0; e <= l; e++) {
			let t = {
				owner: this,
				fileName: i[e].name,
				placeholder: o[e],
				anchor: c,
				breakAfter: e < l,
				breakBefore: e > 0 && e === l
			};
			this.upload(i[e], t);
		}
		return !0;
	}
	async upload(e, t) {
		let n;
		try {
			n = (await this.context.uploads.uploadAsync([e])).selectionId;
		} catch {
			this.fail(t, { key: te.fileFailed });
			return;
		}
		if (!this.root.isConnected) return;
		ta.set(n, t);
		let r = { keys: [n, e.name] };
		this.textarea.dispatchEvent(new CustomEvent(m, {
			bubbles: !0,
			detail: r
		}));
	}
	place(e, t) {
		let n = this.textarea.value.indexOf(e.placeholder);
		n < 0 || (this.surface.applyFor(e.anchor, {
			from: n,
			to: n + e.placeholder.length,
			text: Xi(e.fileName, t)
		}), this.settle());
	}
	remove(e) {
		let t = this.textarea.value, n = t.indexOf(e.placeholder);
		if (n < 0) return;
		let r = n + e.placeholder.length;
		e.breakAfter && t[r] === "\n" ? r++ : e.breakBefore && n > 0 && t[n - 1] === "\n" && n--, this.surface.applyFor(e.anchor, {
			from: n,
			to: r,
			text: ""
		}), this.settle();
	}
	fail(e, t) {
		this.remove(e), this.root.isConnected && this.context.validation.mark(this.root, "error", t);
	}
	settle() {
		document.activeElement !== this.textarea && this.textarea.dispatchEvent(new Event("change", { bubbles: !0 }));
	}
}, aa = class {
	root;
	textarea;
	bar;
	lineEnding;
	pickers;
	values;
	properties;
	constructor(e, n, r, a) {
		this.root = e.root, this.textarea = e.textarea, this.bar = e.bar, this.lineEnding = e.lineEnding, this.values = n, this.properties = r, this.pickers = [
			e.tabSize,
			e.encoding,
			e.lineEnding,
			e.language
		].filter((e) => e !== null), e.tabSize?.carrier.addEventListener("change", () => {
			this.root.style.setProperty(i, e.tabSize?.carrier.value ?? "4"), a();
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
}, oa = {}, sa = [], ca = [], la = class {
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
		let t = e.split("\n"), n = this.lines, r = [], i = [], a = fa(t, n), o = t.length - a, s = n.length - a, c = this.tokenizer?.initialState ?? oa, l = -1, u = 0, d = 0, f = 0, p = 0;
		for (; f < t.length;) {
			f === o && p < s && (l < 0 && (l = f, u = 0, d = 0), u += s - p, p = s);
			let e = f < o ? s : n.length;
			if (p < e && n[p].text === t[f] && st(n[p].startState, c)) {
				l >= 0 && (i.push({
					from: l,
					removed: u,
					added: d
				}), l = -1), r.push(n[p]), c = n[p].endState, f++, p++;
				continue;
			}
			l < 0 && (l = f, u = 0, d = 0);
			let [a, m] = p < e && n[p].text === t[f] ? [1, 1] : da(t, f, o, n, p, s);
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
			startState: oa,
			endState: oa,
			tokens: sa,
			marks: ca
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
				marks: ca
			};
		} catch {
			return {
				text: e,
				startState: t,
				endState: t,
				tokens: sa,
				marks: ca
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
			let t = this.lines[e], i = n.get(e) ?? ca;
			pa(t.marks, i) || (t.marks = i, r.push(e));
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
		return t === void 0 ? "" : t.text.length === 0 ? `<span class="${ne}"><br></span>` : `<span class="${ne}">${ma(t.text, t.tokens, t.marks)}</span>`;
	}
}, ua = 8;
function da(e, t, n, r, i, a) {
	for (let o = 1; o <= 16; o++) for (let s = Math.min(o, ua); s >= 0 && o - s <= ua; s--) {
		let c = o - s;
		if (t + s < n && i + c < a && e[t + s] === r[i + c].text) return [s, c];
	}
	return [+(t < n), +(i < a)];
}
function fa(e, t) {
	let n = Math.min(e.length, t.length), r = 0;
	for (; r < n && e[e.length - 1 - r] === t[t.length - 1 - r].text;) r++;
	return r;
}
function pa(e, t) {
	if (e.length !== t.length) return !1;
	for (let n = 0; n < e.length; n++) if (e[n].from !== t[n].from || e[n].to !== t[n].to || e[n].current !== t[n].current) return !1;
	return !0;
}
function ma(e, t, n) {
	if (t.length === 0 && n.length === 0) return H(e);
	let r = /* @__PURE__ */ new Set([0, e.length]);
	for (let e of t) r.add(e.from), r.add(e.to);
	for (let e of n) r.add(e.from), r.add(e.to);
	let i = [...r].sort((e, t) => e - t), a = "", o = 0, s = 0;
	for (let r = 0; r + 1 < i.length; r++) {
		let c = i[r], l = i[r + 1];
		for (; o < t.length && t[o].to <= c;) o++;
		for (; s < n.length && n[s].to <= c;) s++;
		let u = o < t.length && t[o].from <= c ? t[o].kind : null, d = s < n.length && n[s].from <= c ? n[s] : null, f = H(e.slice(c, l));
		if (u === null && d === null) {
			a += f;
			continue;
		}
		a += `<span class="${ha(u, d)}">${f}</span>`;
	}
	return a;
}
function ha(e, t) {
	let n = e === null ? "" : `ui-tk-${e}`;
	return t !== null && (n += (n.length > 0 ? " " : "") + (t.current ? `${le} ${ue}` : le)), n;
}
function H(e) {
	return e.replace(/[&<>"']/g, (e) => ga[e]);
}
var ga = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
}, _a = class {
	root;
	textarea;
	highlight;
	position;
	strings;
	getLanguage;
	selections;
	notifyTextChanged;
	history = new Gr();
	highlighter;
	lastValue;
	pendingBefore = null;
	constructor(e, t, n, r, i) {
		this.root = e.root, this.textarea = e.textarea, this.highlight = e.highlight, this.position = e.position, this.strings = t, this.getLanguage = n, this.selections = r, this.notifyTextChanged = i, this.highlighter = new la(R.get(n())), this.lastValue = e.textarea.value;
	}
	renderAll() {
		this.highlight.replaceChildren(), this.redraw();
	}
	redraw() {
		this.applyChanges(this.highlighter.update(this.textarea.value)), this.updateGutter();
	}
	applyChanges(e) {
		let t = "";
		for (let n of e) for (let e = n.from; e < n.from + n.added; e++) t += `<div class="${_}">${this.highlighter.renderLine(e)}</div>`;
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
		this.root.style.getPropertyValue("--ui-code-gutter-digits") !== e && this.root.style.setProperty(re, e);
	}
	get tabSize() {
		let e = Number.parseInt(getComputedStyle(this.root).getPropertyValue(i), 10);
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
		this.highlighter = new la(R.get(this.getLanguage())), this.renderAll();
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
		let n = Jr(this.lastValue, t, this.textarea.selectionEnd), r = {
			edits: [n],
			removed: [this.lastValue.slice(n.from, n.to)],
			before: this.pendingBefore ?? C(n.from, n.to),
			after: this.selections.read()
		};
		this.history.record(r, va(e)), this.lastValue = t, this.pendingBefore = null, this.redraw(), this.writePosition(), this.notifyTextChanged(!1);
	}
	textPushed() {
		return this.textarea.value !== this.lastValue && (this.history.clear(), this.lastValue = this.textarea.value, this.redraw(), this.writePosition(), this.notifyTextChanged(!0), !0);
	}
	apply(e, t, n) {
		if (this.textarea.readOnly) return null;
		if (this.adoptOutsideValue(), e.length === 0) return this.selections.write(t, !0), this.writePosition(), null;
		let r = this.textarea.value, i = {
			edits: e,
			removed: e.map((e) => r.slice(e.from, e.to)),
			before: this.selections.read(),
			after: t
		};
		return this.history.record(i, n), this.commit(ze(r, e), e.length === 1 ? e[0] : null, t, n === "typing", !0), i;
	}
	applyFor(e, t) {
		if (this.textarea.readOnly) return;
		this.adoptOutsideValue();
		let n = this.textarea.value, r = this.selections.read(), i = {
			ranges: r.ranges.map((e) => ({
				anchor: T(e.anchor, [t]),
				head: T(e.head, [t])
			})),
			primary: r.primary
		}, a = {
			edits: [t],
			removed: [n.slice(t.from, t.to)],
			before: r,
			after: i
		};
		this.history.retract(a, e) || this.history.recordFor(a, e), this.commit(ze(n, [t]), t, i, !1, !1);
	}
	adoptOutsideValue() {
		this.textarea.value !== this.lastValue && (this.history.clear(), this.lastValue = this.textarea.value, this.redraw());
	}
	commit(e, t, n, r, i) {
		t === null ? this.textarea.value = e : this.textarea.setRangeText(t.text, t.from, t.to), this.lastValue = e, this.pendingBefore = null, this.redraw(), this.selections.write(n, i), this.writePosition(), this.notifyTextChanged(!1), this.textarea.dispatchEvent(r ? new InputEvent("input", {
			bubbles: !0,
			inputType: "insertText"
		}) : new Event("input", { bubbles: !0 }));
	}
	replaceRange(e, t, n) {
		this.apply([{
			from: e,
			to: t,
			text: n
		}], C(e + n.length), "other");
	}
	select(e, t) {
		this.selections.write(C(e, t), !1);
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
		t !== null && this.commit(t.text, null, t.selections, !1, !0);
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
function va(e) {
	let t = e instanceof InputEvent ? e.inputType : "";
	return t === "insertText" || t === "insertCompositionText" ? "typing" : t === "deleteContentBackward" || t === "deleteContentForward" ? "deleting" : "other";
}
//#endregion
//#region src/code-editor.ts
var ya = class e {
	root;
	surface;
	carets;
	editing;
	completions;
	pictures;
	formatBar;
	findReplace;
	statusBar;
	readOnlyClass;
	language;
	readOnly;
	constructor(e, n, r) {
		this.root = e, this.language = jr.normalize(e.getAttribute(t)), this.readOnlyClass = n.names.readOnlyClass, this.readOnly = e.classList.contains(this.readOnlyClass);
		let i = n.strings;
		this.surface = new _a({
			root: e,
			textarea: r.textarea,
			highlight: r.highlight,
			position: r.position
		}, i, () => this.language, {
			read: () => this.carets.read(),
			write: (e, t) => this.carets.write(e, t),
			virtualColumns: () => this.carets.primaryPadding
		}, (e) => this.findReplace?.refreshIfOpen(e)), this.surface.renderAll(), this.carets = new We({
			root: e,
			textarea: r.textarea,
			scroller: r.scroller,
			content: r.content
		}, this.surface, n.observeSize), this.editing = new Ur(r.textarea, this.surface, this.carets, () => this.language), this.completions = new Lr({
			root: e,
			textarea: r.textarea,
			scroller: r.scroller,
			content: r.content
		}, n, this.surface, this.editing, this.carets, () => this.language), this.pictures = new ia({
			root: e,
			textarea: r.textarea
		}, n, this.surface, this.carets, () => this.language), this.formatBar = new Ki({
			root: e,
			textarea: r.textarea,
			scroller: r.scroller,
			content: r.content
		}, n, this.surface, this.carets, () => this.language), this.findReplace = r.search === null ? null : new ii({
			textarea: r.textarea,
			scroller: r.scroller,
			...r.search
		}, i, n.names, n.validation, this.surface), this.statusBar = new aa({
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
			this.completions.key(e), this.carets.key(e), this.formatBar.key(e), this.editing.key(e);
		}), a.addEventListener("keyup", () => this.surface.writePosition()), a.addEventListener("click", () => this.surface.writePosition()), a.addEventListener("mousedown", (e) => this.carets.pointerDown(e)), a.addEventListener("pointerdown", (e) => this.formatBar.pointerDown(e)), a.addEventListener("compositionstart", () => this.editing.compositionStart()), a.addEventListener("copy", (e) => this.editing.copy(e)), a.addEventListener("cut", (e) => this.editing.cut(e)), a.addEventListener("paste", (e) => {
			this.pictures.paste(e) || this.editing.paste(e);
		}), a.addEventListener("input", (e) => this.completions.textChanged(e)), a.addEventListener("input", () => this.formatBar.textChanged()), a.addEventListener("blur", () => this.completions.close()), o.addEventListener("scroll", () => this.carets.queueRender(), { passive: !0 }), o.addEventListener("scroll", () => this.completions.scrolled(), { passive: !0 }), o.addEventListener("scroll", () => this.formatBar.scrolled(), { passive: !0 }), e.addEventListener("keydown", (e) => this.rootKey(e)), e.addEventListener("dragenter", (e) => this.pictures.dragOver(e)), e.addEventListener("dragover", (e) => this.pictures.dragOver(e)), e.addEventListener("dragleave", (e) => this.pictures.dragLeave(e)), e.addEventListener("drop", (e) => this.pictures.drop(e));
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
		t.expand?.addEventListener("click", () => e.toggleReplace()), U(r, "data-ui-code-previous", n)?.addEventListener("click", () => e.step(-1)), U(r, "data-ui-code-next", n)?.addEventListener("click", () => e.step(1)), U(r, "data-ui-code-close", n)?.addEventListener("click", () => e.close(!0)), U(r, "data-ui-code-replace-one", n)?.addEventListener("click", () => e.replaceOne()), U(r, "data-ui-code-replace-all", n)?.addEventListener("click", () => e.replaceEvery());
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
			search: ba(n, r.names),
			statusBar: n.querySelector(".ui-code-input__status"),
			position: n.querySelector("[data-ui-code-position]"),
			tabSize: xa(n, "data-ui-code-tab-size", r.names),
			encoding: xa(n, "data-ui-code-encoding", r.names),
			lineEnding: xa(n, "data-ui-code-line-ending", r.names),
			language: xa(n, t, r.names)
		});
	}
	get languageId() {
		return this.language;
	}
	get connected() {
		return this.root.isConnected;
	}
	wordsChanged() {
		this.findReplace?.wordsChanged(), this.formatBar.wordsChanged();
	}
	dispose() {
		this.carets.dispose();
	}
	syncPickers() {
		this.statusBar.syncPickers(), this.carets.queueRender();
	}
	selectionChanged() {
		this.carets.selectionChanged(), this.surface.writePosition(), this.completions.selectionChanged(), this.formatBar.selectionChanged();
	}
	readOnlyChanged() {
		let e = this.root.classList.contains(this.readOnlyClass);
		e !== this.readOnly && (this.readOnly = e, this.statusBar.syncReadOnly(e), e && this.findReplace?.replaceHidden(), this.settingsChanged());
	}
	settingsChanged() {
		let e = jr.normalize(this.root.getAttribute(t));
		this.statusBar.syncPickers(), this.carets.settingsChanged(), this.completions.settingsChanged(), !this.searchEnabled && this.findReplace?.isOpen === !0 && this.findReplace.close(this.findReplace.holdsFocus), this.root.hasAttribute("data-ui-code-status") || this.statusBar.barHidden(), e !== this.language && (this.language = e, this.reload()), this.formatBar.settingsChanged();
	}
	reload() {
		this.completions.close(), this.surface.setLanguage(), this.findReplace?.search(!0, !1);
	}
	refresh(e) {
		if (typeof e == "string" && e.includes("\n")) {
			let t = e.includes("\r\n") ? ye : "lf";
			this.root.setAttribute("data-ui-code-eol", t), this.statusBar.showDetectedEnding(t);
		}
		this.completions.close(), this.formatBar.close(), this.surface.textPushed() && this.carets.collapse();
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
function ba(e, t) {
	let n = e.querySelector(".ui-code-input__search"), r = e.querySelector("[data-ui-code-find] input"), i = e.querySelector("[data-ui-code-replace] input"), a = e.querySelector(".ui-code-input__search-row--replace"), o = e.querySelector("[data-ui-code-count]");
	return n === null || r === null || i === null || a === null || o === null ? null : {
		panel: n,
		findField: r,
		replaceField: i,
		replaceRow: a,
		expand: U(n, "data-ui-code-toggle-replace", t),
		count: o,
		matchCase: U(n, "data-ui-code-match-case", t),
		wholeWord: U(n, "data-ui-code-whole-word", t),
		regex: U(n, "data-ui-code-regex", t)
	};
}
function U(e, t, n) {
	return e.querySelector(`[${t}] > .${n.buttonClass}`);
}
function xa(e, t, n) {
	let r = e.querySelector(`input[${t}]`), i = r?.parentElement?.querySelector(`.${n.selectClass}`) ?? null;
	return r === null || i === null ? null : {
		carrier: r,
		select: i
	};
}
//#endregion
//#region src/code-input-engine.ts
var W = `.${e}`, Sa = "markdown", Ca = /* @__PURE__ */ new Set([
	"TabSize",
	"Encoding",
	"LineEnding",
	"Language"
]);
function wa(e) {
	if (!(e instanceof HTMLTextAreaElement)) return null;
	let t = e.value, n = e.closest(W);
	return n !== null && Ta(n) === "crlf" ? t.replace(/\r?\n/g, "\r\n") : t;
}
function Ta(e) {
	let t = e.querySelector("input[data-ui-code-line-ending]")?.value ?? "";
	return t.length > 0 ? t : e.getAttribute("data-ui-code-eol") ?? "lf";
}
var Ea = class {
	context;
	editors = /* @__PURE__ */ new WeakMap();
	live = /* @__PURE__ */ new Set();
	constructor(e) {
		this.context = e, this.attach(e.root.querySelectorAll(W));
		let i = [
			t,
			n,
			"data-ui-code-multi-caret",
			"data-ui-code-completions",
			"data-ui-code-status",
			r
		];
		e.observeComponents(e.root, W, {
			childList: !0,
			attributeFilter: i
		}, (e) => this.attach(e)), e.observeComponents(e.root, W, {
			attributeFilter: ["class"],
			relevant: (e) => e.target instanceof Element && e.target.matches(W)
		}, (e) => {
			for (let t of e) this.editors.get(t)?.readOnlyChanged();
		}), e.observeComponents(e.root, "*", { childList: !0 }, () => this.prune()), R.onRegistered((e) => {
			for (let t of this.live) t.connected && (t.languageId === e || t.languageId === Sa) && t.reload();
		}), e.strings.onChange(() => {
			for (let e of this.live) e.connected && e.wordsChanged();
		}), e.propertyPatchEngine.addValueChangeHandler((e) => {
			if (!e.local) for (let t of e.components) {
				let n = this.editors.get(t);
				e.propertyName === "Value" ? n?.refresh(e.value) : Ca.has(e.propertyName) && n?.syncPickers();
			}
		}), document.addEventListener("selectionchange", () => {
			let e = document.activeElement, t = e instanceof HTMLTextAreaElement ? e.closest(W) : null;
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
				let e = ya.create(t, this.context);
				e !== null && (this.editors.set(t, e), this.live.add(e));
			} else e.settingsChanged();
		}
	}
}, Da = 2;
function Oa() {
	let e = window.NEStandardUI;
	if (e === void 0 || typeof e.registerEngine != "function") throw Error("NE.Standard.UI.Web.CodeInput needs the framework's client (ui.js) on the page before it.");
	if (e.contractVersion !== Da) throw Error(`NE.Standard.UI.Web.CodeInput was built for plugin contract ${Da}, but the framework's client on the page implements ${String(e.contractVersion ?? "an older one")}; install the package version that matches the framework.`);
	return e;
}
//#endregion
//#region src/markdown-inlines.ts
var G = class {
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
function ka(e) {
	return e.trim().replace(/\s+/g, " ").toLowerCase().toUpperCase();
}
var Aa = /[\n\\`*_~[\]!<&]/g, ja = /^[!-/:-@[-`{-~]$/, Ma = /^\s$/u, Na = /^[\p{P}\p{S}]$/u, Pa = /&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[A-Za-z][A-Za-z\d]{1,31});/y, Fa = /<([A-Za-z][A-Za-z\d+.-]{1,31}:[^<>\u0000-\u0020]*)>/y, Ia = /<([A-Za-z\d.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?)*)>/y, La = /`+/g, Ra = /(?:https?:\/\/|www\.)[^\s<]+/g, za = 32;
function Ba(e, t) {
	let n = new G("root");
	return new Va(e, t).parse(n), Ha(n), n;
}
var Va = class {
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
		t !== null && t.type === "text" && t.literal.endsWith(" ") && (n = t.literal.endsWith("  "), t.literal = t.literal.replace(/ +$/, "")), e.appendChild(new G(n ? "hardbreak" : "softbreak")), this.skipSpaces();
	}
	backslash(e) {
		this.position++;
		let t = this.text.charAt(this.position);
		t === "\n" ? (this.position++, e.appendChild(new G("hardbreak")), this.skipSpaces()) : ja.test(t) ? (this.position++, e.appendChild(new G("text", t))) : e.appendChild(new G("text", "\\"));
	}
	codeSpan(e) {
		let t = this.position;
		for (; this.text.charAt(this.position) === "`";) this.position++;
		let n = this.position - t;
		La.lastIndex = this.position;
		for (let t = La.exec(this.text); t !== null; t = La.exec(this.text)) {
			if (t[0].length !== n) continue;
			let r = this.text.slice(this.position, t.index).replace(/\n/g, " ");
			r.length > 2 && r.startsWith(" ") && r.endsWith(" ") && /[^ ]/.test(r) && (r = r.slice(1, -1)), e.appendChild(new G("code", r)), this.position = t.index + n;
			return;
		}
		e.appendChild(new G("text", this.text.slice(t, this.position)));
	}
	delimiterRun(e) {
		let t = this.position, n = this.text.charAt(t);
		for (; this.text.charAt(this.position) === n;) this.position++;
		let r = this.position - t, i = new G("text", this.text.slice(t, this.position));
		if (e.appendChild(i), n === "~" && r > 2) return;
		let a = t === 0 ? "\n" : this.text.charAt(t - 1), o = this.position >= this.text.length ? "\n" : this.text.charAt(this.position), s = Ma.test(a), c = Ma.test(o), l = Na.test(a), u = Na.test(o), d = !c && (!u || s || l), f = !s && (!l || c || u), p = {
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
		this.text.charAt(this.position + 1) === "[" ? (this.position += 2, this.openBracket(e, "![", !0)) : (this.position++, e.appendChild(new G("text", "!")));
	}
	openBracket(e, t, n) {
		let r = new G("text", t);
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
			e.appendChild(new G("text", "]"));
			return;
		}
		if (!n.active) {
			e.appendChild(new G("text", "]")), this.brackets = n.previousBracket;
			return;
		}
		let r = this.inlineTarget() ?? this.referenceTarget(n, t);
		if (r === null) {
			this.brackets = n.previousBracket, this.position = t, e.appendChild(new G("text", "]"));
			return;
		}
		let i = new G(n.image ? "image" : "link");
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
					let t = K(this.text.slice(this.position + 1, e));
					return this.position = e + 1, t;
				}
			}
			return null;
		}
		let e = this.position, t = 0;
		for (; this.position < this.text.length;) {
			let e = this.text.charAt(this.position);
			if (e === "\\" && ja.test(this.text.charAt(this.position + 1))) {
				this.position += 2;
				continue;
			}
			if (e === "(") {
				if (++t > za) break;
			} else if (e === ")") {
				if (t === 0) break;
				t--;
			} else if (/[\s\u0000-\u001f]/.test(e)) break;
			this.position++;
		}
		return t === 0 ? K(this.text.slice(e, this.position)) : (this.position = e, null);
	}
	linkTitle() {
		let e = this.text.charAt(this.position), t = e === "(" ? ")" : e;
		if (e !== "\"" && e !== "'" && e !== "(") return null;
		for (let n = this.position + 1; n < this.text.length; n++) {
			let r = this.text.charAt(n);
			if (r === "\\") {
				n++;
				continue;
			}
			if (e === "(" && r === "(") return null;
			if (r === t) {
				let e = K(this.text.slice(this.position + 1, n));
				return this.position = n + 1, e;
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
		let r = n === null || n.length > 999 ? void 0 : this.references.get(ka(n));
		return r === void 0 ? (this.position = t, null) : r;
	}
	autolink(e) {
		for (let [t, n] of [[Fa, ""], [Ia, "mailto:"]]) {
			t.lastIndex = this.position;
			let r = t.exec(this.text);
			if (r === null) continue;
			let i = new G("link");
			i.href = n + r[1], i.appendChild(new G("text", r[1])), e.appendChild(i), this.position += r[0].length;
			return;
		}
		this.position++, e.appendChild(new G("text", "<"));
	}
	entity(e) {
		Pa.lastIndex = this.position;
		let t = Pa.exec(this.text);
		if (t === null) {
			this.position++, e.appendChild(new G("text", "&"));
			return;
		}
		this.position += t[0].length, e.appendChild(new G("entity", t[0]));
	}
	plainText(e) {
		Aa.lastIndex = this.position + 1;
		let t = Aa.exec(this.text), n = t === null ? this.text.length : t.index;
		e.appendChild(new G("text", this.text.slice(this.position, n))), this.position = n;
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
				let e = r === "~" ? n.count : n.count >= 2 && o.count >= 2 ? 2 : 1, t = new G(r === "~" ? "strikethrough" : e === 1 ? "emphasis" : "strong");
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
function K(e) {
	return e.replace(/\\([!-/:-@[-`{-~])/g, "$1");
}
function Ha(e) {
	Ua(e);
	for (let t = e.firstChild; t !== null;) {
		let e = t.next;
		t.type === "text" ? Wa(t) : t.type !== "link" && t.type !== "image" && t.firstChild !== null && Ha(t), t = e;
	}
}
function Ua(e) {
	for (let t = e.firstChild; t !== null; t = t.next) for (; t.type === "text" && t.next !== null && t.next.type === "text";) t.literal += t.next.literal, t.next.unlink();
}
function Wa(e) {
	let t = e.literal, n = [], r = 0;
	Ra.lastIndex = 0;
	for (let e = Ra.exec(t); e !== null; e = Ra.exec(t)) {
		if (e.index > 0 && !/[\s(*_~]/.test(t.charAt(e.index - 1))) continue;
		let i = Ga(e[0]);
		if (!/^(?:https?:\/\/|www\.)[^./]/.test(i)) continue;
		e.index > r && n.push(new G("text", t.slice(r, e.index)));
		let a = new G("link");
		a.href = i.startsWith("www.") ? `http://${i}` : i, a.appendChild(new G("text", i)), n.push(a), r = e.index + i.length, Ra.lastIndex = r;
	}
	if (n.length === 0) return;
	r < t.length && n.push(new G("text", t.slice(r)));
	let i = e;
	for (let e of n) i.insertAfter(e), i = e;
	e.unlink();
}
function Ga(e) {
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
var Ka = /^ {0,3}(#{1,6})(?=[ \t]|$)/, q = /^( {0,3})(?:([-*+])|(\d{1,9})([.)]))([ \t]+|$)/, qa = /^ {0,3}(=+|-+)[ \t]*$/, Ja = /^\[([ xX])\](?:[ \t]+|$)/, Ya = /^ {0,3}\[((?:[^\]\\]|\\.){1,999})\]:[ \t]*(<[^>\n]*>|\S+)(?:[ \t]+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^()\\]|\\.)*\)))?[ \t]*$/;
function Xa(e) {
	let t = /* @__PURE__ */ new Map();
	return {
		blocks: Qa(e.replace(/\r\n?/g, "\n").split("\n").map(Za), 1, t, null, 0),
		references: t
	};
}
function Za(e) {
	if (!e.includes("	")) return e;
	let t = "", n = 0;
	for (; n < e.length && (e.charAt(n) === " " || e.charAt(n) === "	"); n++) t += e.charAt(n) === " " ? " " : " ".repeat(4 - t.length % 4);
	return t + e.slice(n);
}
function Qa(e, t, n, r, i) {
	let a = [], o = !1, s = 0;
	for (; s < e.length;) {
		let c = e[s];
		if (X(c)) {
			o = a.length > 0, s++;
			continue;
		}
		o && r !== null && (r.separated = !0), o = !1, s = $a(e, s, t, n, a, i);
	}
	return a;
}
function $a(e, t, n, r, i, a) {
	let o = e[t], s = n + t;
	if (yo(o) >= 4) return eo(e, t, s, i);
	let c = F(o);
	if (c !== null) return to(e, t, s, c, i);
	let l = no(o);
	if (l !== null) return i.push({
		line: s,
		type: "heading",
		level: l.level,
		text: l.text
	}), t + 1;
	if (P.test(o)) return i.push({
		line: s,
		type: "rule"
	}), t + 1;
	let u = a < 64;
	if (u && N.test(o)) return io(e, t, s, r, i, a);
	let d = u ? q.exec(o) : null;
	return d === null ? uo(e, t) ? fo(e, t, s, i) : mo(e, t, s, r, i) : co(e, t, s, d, r, i, a);
}
function eo(e, t, n, r) {
	let i = t;
	for (; i < e.length && (X(e[i]) || yo(e[i]) >= 4);) i++;
	let a = i;
	for (; a > t && X(e[a - 1]);) a--;
	return r.push({
		line: n,
		type: "code",
		info: "",
		text: e.slice(t, a).map((e) => e.slice(Math.min(4, yo(e)))).join("\n")
	}), a;
}
function to(e, t, n, r, i) {
	let a = r.indent, o = r.marker, s = [], c = t + 1;
	for (; c < e.length; c++) {
		if (Wn(e[c], o)) {
			c++;
			break;
		}
		s.push(e[c].slice(Math.min(a, yo(e[c]))));
	}
	return i.push({
		line: n,
		type: "code",
		info: K(r.info.trim()),
		text: s.join("\n")
	}), c;
}
function no(e) {
	let t = Ka.exec(e);
	if (t === null) return null;
	let n = e.length;
	for (; n > t[0].length && ro(e.charAt(n - 1));) n--;
	let r = n;
	for (; r > t[0].length && e.charAt(r - 1) === "#";) r--;
	let i = r < n && ro(e.charAt(r - 1)) ? e.slice(t[0].length, r) : e.slice(t[0].length, n);
	return {
		level: t[1].length,
		text: i.trim()
	};
}
function ro(e) {
	return e === " " || e === "	";
}
function io(e, t, n, r, i, a) {
	let o = [], s = null, c = t;
	for (; c < e.length; c++) {
		let t = e[c], n = N.exec(t);
		if (n !== null) {
			let e = t.slice(n[0].length);
			o.push(e), s = s === !0 && _o(e) ? !0 : null;
			continue;
		}
		if (X(t) || Y(t) || vo(t) || (s ??= ao(o, a + 1), !s)) break;
		o.push(t);
	}
	return i.push({
		line: n,
		type: "quote",
		children: Qa(o, n, r, null, a + 1)
	}), c;
}
function ao(e, t) {
	let n = e.at(-1);
	if (n === void 0 || X(n) || oo(e)) return !1;
	if (t < 64 && N.test(n)) {
		let n = e.length - 1;
		for (; n > 0 && N.test(e[n - 1]);) n--;
		return ao(e.slice(n).map((e) => e.replace(N, "")), t + 1);
	}
	if (so(e) || e.length > 1 && !X(e[e.length - 2]) && qa.test(n)) return !1;
	let r = n;
	for (let e = q.exec(r); e !== null && r.length > 0; e = q.exec(r)) r = r.slice(e[0].length);
	return no(r) === null && !P.test(r) && F(r) === null;
}
function oo(e) {
	let t = null, n = !1;
	for (let r of e) n = !1, t === null ? t = F(r)?.marker ?? null : Wn(r, t) && (t = null, n = !0);
	return t !== null || n;
}
function so(e) {
	for (let t = e.length - 1; t >= 0 && !X(e[t]); t--) {
		if (uo(e, t)) return !0;
		if (Y(e[t])) return !1;
	}
	return !1;
}
function co(e, t, n, r, i, a, o) {
	let s = r[3] !== void 0, c = s ? r[4] : r[2], l = [], u = !0, d = t;
	for (; d < e.length;) {
		let r = q.exec(e[d]);
		if (r === null || P.test(e[d]) || r[3] !== void 0 !== s || (s ? r[4] : r[2]) !== c) break;
		let a = r[1].length + (s ? r[3].length + 1 : 1), f = r[5].length, p = a + (f === 0 || f > 4 ? 1 : f), m = n + (d - t), h = [e[d].slice(Math.min(p, e[d].length))], g = null;
		for (d++; d < e.length;) {
			let t = e[d];
			if (X(t)) {
				h.push(""), g = null, d++;
				continue;
			}
			if (yo(t) >= p) {
				let e = t.slice(p);
				h.push(e), g = g === !0 && _o(e) ? !0 : null, d++;
				continue;
			}
			if (!Y(t) && !q.test(t) && (g ??= ao(h, o + 1))) {
				h.push(t.trimStart()), d++;
				continue;
			}
			break;
		}
		let ee = 0;
		for (; h.length > 1 && X(h[h.length - 1]);) h.pop(), ee++;
		let te = { separated: !1 };
		l.push(lo(h, m, i, o + 1, te)), te.separated && (u = !1);
		let _ = q.exec(e[d] ?? ""), ne = _ !== null && !P.test(e[d]) && _[3] !== void 0 === s && (s ? _[4] : _[2]) === c;
		if (ee > 0) {
			if (ne) u = !1;
			else {
				d -= ee;
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
function lo(e, t, n, r, i) {
	let a = Ja.exec(e[0]), o = null;
	a !== null && e[0].length > a[0].length && (o = a[1] !== " ", e[0] = e[0].slice(a[0].length));
	let s = Qa(e, t, n, i, r);
	return {
		line: t,
		checked: o,
		children: s
	};
}
function uo(e, t) {
	let n = e[t + 1];
	return e[t].includes("|") && n !== void 0 && n.includes("-") && Un.test(n) && J(e[t]).length === J(n).length;
}
function fo(e, t, n, r) {
	let i = J(e[t]), a = J(e[t + 1]).map(po), o = [], s = t + 2;
	for (; s < e.length && !X(e[s]) && !Y(e[s]); s++) {
		let t = J(e[s]);
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
function po(e) {
	let t = e.startsWith(":"), n = e.endsWith(":");
	return t && n ? "center" : n ? "right" : t ? "left" : null;
}
function J(e) {
	let t = e.trim();
	t.startsWith("|") && (t = t.slice(1)), t.endsWith("|") && !t.endsWith("\\|") && (t = t.slice(0, -1));
	let n = [], r = "";
	for (let e = 0; e < t.length; e++) {
		let i = t.charAt(e);
		i === "\\" && t.charAt(e + 1) === "|" ? (r += "|", e++) : i === "|" ? (n.push(r.trim()), r = "") : r += i;
	}
	return n.push(r.trim()), n;
}
function mo(e, t, n, r, i) {
	let a = [e[t].trimStart()], o = t + 1;
	for (; o < e.length; o++) {
		let t = e[o], r = qa.exec(t);
		if (r !== null && !go(a)) return i.push({
			line: n,
			type: "heading",
			level: r[1].startsWith("=") ? 1 : 2,
			text: a.join("\n").trim()
		}), o + 1;
		if (X(t) || Y(t) || vo(t) || uo(e, o)) break;
		a.push(t.trimStart());
	}
	let s = ho(a, r);
	return s.length > 0 && i.push({
		line: n,
		type: "paragraph",
		text: s
	}), o;
}
function ho(e, t) {
	let n = 0;
	for (; n < e.length; n++) {
		let r = Ya.exec(e[n].trimEnd());
		if (r === null) break;
		let i = ka(r[1]), a = r[2].startsWith("<") ? r[2].slice(1, -1) : r[2];
		i.length > 0 && !t.has(i) && t.set(i, {
			href: K(a),
			title: r[3] === void 0 ? "" : K(r[3].slice(1, -1))
		});
	}
	return e.slice(n).join("\n").trimEnd();
}
function go(e) {
	return e.every((e) => Ya.test(e.trimEnd()));
}
function Y(e) {
	return no(e) !== null || P.test(e) || N.test(e) || F(e) !== null;
}
function _o(e) {
	return !X(e) && !Y(e) && !vo(e) && !qa.test(e) && !Un.test(e);
}
function vo(e) {
	let t = q.exec(e);
	return t !== null && t[5].length > 0 && !X(e.slice(t[0].length)) && (t[3] === void 0 || t[3] === "1");
}
function X(e) {
	return e.trim().length === 0;
}
function yo(e) {
	let t = 0;
	for (; e.charAt(t) === " ";) t++;
	return t;
}
//#endregion
//#region src/markdown-render.ts
var Z = a;
function bo(e, t, n, r) {
	let i = Xa(e);
	return xo(i.blocks, {
		references: i.references,
		highlight: t,
		names: n,
		urls: r
	}, !1);
}
function xo(e, t, n) {
	let r = "";
	for (let i of e) r += So(i, t, n);
	return r;
}
function So(e, t, n) {
	let { references: r, highlight: i } = t, a = Co(e.line, t);
	switch (e.type) {
		case "paragraph": {
			let i = Q(Ba(e.text, r), t);
			return n ? i : `<p${a}>${i}</p>`;
		}
		case "heading": return `<h${e.level}${a}>${Q(Ba(e.text, r), t)}</h${e.level}>`;
		case "code": {
			let t = e.info.split(/\s+/, 1)[0], n = t.length > 0 ? i(e.text, t) : null;
			return `<pre class="${Z}__code"${t.length > 0 ? ` data-language="${H(t)}"` : ""}${a}><code>${n ?? H(e.text)}</code></pre>`;
		}
		case "quote": return `<blockquote${a}>${xo(e.children, t, !1)}</blockquote>`;
		case "list": return wo(e.ordered, e.start, e.tight, e.items, t);
		case "table": return To(e.line, e.alignments, e.head, e.rows, t);
		case "rule": return `<hr${a}>`;
	}
}
function Co(e, t) {
	return ` ${t.names.sourceLine}="${e}"`;
}
function wo(e, t, n, r, i) {
	let a = e ? "ol" : "ul", o = `<${a}${e && t !== 1 ? ` start="${t}"` : ""}${r.some((e) => e.checked !== null) ? ` class="${Z}__tasks"` : ""}>`;
	for (let e of r) {
		let t = xo(e.children, i, n);
		if (e.checked === null) {
			o += `<li${Co(e.line, i)}>${t}</li>`;
			continue;
		}
		let r = e.checked ? " checked" : "", a = `${g.checkboxClass} ${g.smallInputClass} ${i.names.readOnlyClass} ${Z}__check`;
		o += `<li class="${Z}__task"${Co(e.line, i)}><span class="${a}"><input class="${g.checkboxInputClass}" type="checkbox" tabindex="-1" aria-readonly="true"${r}><span class="${g.checkboxBoxClass}"></span></span>${t}</li>`;
	}
	return `${o}</${a}>`;
}
function To(e, t, n, r, i) {
	let a = (e, n, r) => {
		let a = t[r];
		return `<${e}${a == null ? "" : ` class="${Z}__cell--${a}"`}>${Q(Ba(n, i.references), i)}</${e}>`;
	}, o = `<div class="${Z}__table"${Co(e, i)}><table>`;
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
function Q(e, t) {
	let n = "";
	for (let r = e.firstChild; r !== null; r = r.next) switch (r.type) {
		case "text":
			n += H(r.literal);
			break;
		case "entity":
			n += r.literal;
			break;
		case "code":
			n += `<code>${H(r.literal)}</code>`;
			break;
		case "emphasis":
			n += `<em>${Q(r, t)}</em>`;
			break;
		case "strong":
			n += `<strong>${Q(r, t)}</strong>`;
			break;
		case "strikethrough":
			n += `<del>${Q(r, t)}</del>`;
			break;
		case "link":
			n += Eo(r, t);
			break;
		case "image":
			n += Do(r, t);
			break;
		case "hardbreak":
			n += "<br>";
			break;
		case "softbreak":
			n += "\n";
			break;
		default: n += Q(r, t);
	}
	return n;
}
function Eo(e, t) {
	let n = Q(e, t), r = e.href.trim();
	if (!t.urls.isSafeLink(r)) return n;
	let i = e.title.length > 0 ? ` title="${H(e.title)}"` : "", a = t.urls.isExternalLink(r) ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "";
	return `<a href="${H(r)}"${i}${a}>${n}</a>`;
}
function Do(e, t) {
	let n = H(Oo(e));
	if (!t.urls.isImageSource(e.href)) return n;
	let r = t.urls.asBrowserReads(e.href), i = e.title.length > 0 ? ` title="${H(e.title)}"` : "";
	return `<img src="${H(r)}" alt="${n}"${i} loading="lazy">`;
}
function Oo(e) {
	let t = "";
	for (let n = e.firstChild; n !== null; n = n.next) n.type === "text" || n.type === "code" || n.type === "entity" ? t += n.literal : n.type === "softbreak" || n.type === "hardbreak" ? t += " " : t += Oo(n);
	return t;
}
//#endregion
//#region src/markdown-display-engine.ts
var ko = `.${a}`, Ao = `.${o}`, jo = class {
	names;
	urls;
	rendered = /* @__PURE__ */ new WeakMap();
	live = /* @__PURE__ */ new Set();
	constructor(e) {
		this.names = e.names, this.urls = e.urls, e.observeComponents(e.root, ko, {
			childList: !0,
			attributeFilter: ["data-ui-markdown-source"]
		}, (e) => this.renderAll(e, !1)), R.onRegistered(() => this.renderAll([...this.live], !0)), this.renderAll(e.root.querySelectorAll(ko), !1);
	}
	renderAll(e, t) {
		for (let e of this.live) e.isConnected || this.live.delete(e);
		for (let n of e) {
			let e = n.getAttribute("data-ui-markdown-source") ?? "", r = n.querySelector(Ao);
			r === null || !t && this.rendered.get(n) === e || (this.rendered.set(n, e), this.live.add(n), r.innerHTML = Mo(e, this.names, this.urls));
		}
	}
};
function Mo(e, t, n) {
	try {
		return bo(e, No, t, n);
	} catch (t) {
		return console.warn("NE.Standard.UI.Web.CodeInput: a Markdown document could not be rendered; its source is shown instead.", t), `<pre class="${a}__code"><code>${H(e)}</code></pre>`;
	}
}
function No(e, t) {
	let n = R.get(Kn(t));
	if (n === null) return null;
	let r = n.initialState;
	try {
		return e.split("\n").map((e) => {
			let t = [];
			return r = n.tokenizeLine(e, r, (e, n, r) => t.push({
				from: e,
				to: n,
				kind: r
			})), ma(e, t, []);
		}).join("\n");
	} catch {
		return null;
	}
}
//#endregion
//#region src/package-api.ts
function Po(e, t) {
	let n = window.NEStandardUICodeInput?.__pendingLanguages ?? [], r = window.NEStandardUICodeInput?.__pendingCompletions ?? [], i = {
		registerLanguage: (n, r, i) => Fo(e, t, {
			id: n,
			tokenizer: r,
			completions: i
		}),
		createTokenizer: D,
		registerCompletions: (e, n) => t.register(e, n),
		__pendingLanguages: [],
		__pendingCompletions: []
	};
	window.NEStandardUICodeInput = i;
	for (let r of n) Fo(e, t, r);
	for (let e of r) t.register(e.languageId, e.source);
	return i;
}
function Fo(e, t, n) {
	e.register(n.id, n.tokenizer), n.completions !== void 0 && t.register(n.id, n.completions);
}
//#endregion
//#region src/code-input.ts
Po(R, Nr);
var $ = Oa();
$.registerEvent("save", {
	settlesValue: !0,
	submitsForm: !0
}), $.registerEvent(m, {
	dynamicParameters: (e) => [...e.domEvent.detail?.keys ?? []],
	completed: (e) => ra(e.domEvent.detail?.keys[0] ?? "", e)
}), $.registerEffect({
	kind: h,
	handler: (e) => na(String(e.effect.selection ?? ""), String(e.effect.address ?? ""))
}), $.registerValueReader({
	kind: "code",
	read: (e) => wa(e)
}), $.registerEngine((e) => {
	new Ea(e), new jo(e);
});
//#endregion
