//#region src/tokenizer.ts
var e = class {
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
function t(t) {
	return {
		initialState: t.initialState(),
		tokenizeLine(i, a, o) {
			let s = r(a);
			return n(new e(i), s, t, o), s;
		}
	};
}
function n(e, t, n, r) {
	for (; !e.eol();) {
		e.start = e.pos;
		let i = n.token(e, t);
		e.pos === e.start && e.pos++, i !== null && r(e.start, e.pos, i);
	}
}
function r(e) {
	if (Array.isArray(e)) return e.map(r);
	if (typeof e == "object" && e) {
		let t = {};
		for (let [n, i] of Object.entries(e)) t[n] = r(i);
		return t;
	}
	return e;
}
function i(e, t) {
	if (e === t) return !0;
	if (Array.isArray(e) || Array.isArray(t)) {
		if (!Array.isArray(e) || !Array.isArray(t) || e.length !== t.length) return !1;
		for (let n = 0; n < e.length; n++) if (!i(e[n], t[n])) return !1;
		return !0;
	}
	if (e !== null && t !== null && typeof e == "object" && typeof t == "object") {
		let n = e, r = t, a = Object.keys(n);
		if (a.length !== Object.keys(r).length) return !1;
		for (let e of a) if (!i(n[e], r[e])) return !1;
		return !0;
	}
	return !1;
}
function a(e) {
	return new Set(e.split(/\s+/).filter((e) => e.length > 0));
}
function o(e, t, n = !0) {
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
//#region src/highlighter.ts
var s = {}, c = [], l = [], u = class {
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
		let t = e.split("\n"), n = this.lines, r = n.length, a = t.length, o = Math.min(r, a), c = 0;
		for (; c < o && n[c].text === t[c];) c++;
		let l = 0;
		for (; l < o - c && n[r - 1 - l].text === t[a - 1 - l];) l++;
		let u = n.slice(0, c), d = c === 0 ? this.tokenizer?.initialState ?? s : n[c - 1].endState, f = c;
		for (; f < a;) {
			let e = f - (a - r);
			if (f >= a - l && e >= 0 && e < r && i(n[e].startState, d)) {
				for (let e = f; e < a; e++) u.push(n[e - (a - r)]);
				break;
			}
			let o = this.tokenize(t[f], d);
			u.push(o), d = o.endState, f++;
		}
		this.lines = u, this.rebuildStarts();
		let p = f - c;
		return {
			from: c,
			removed: p - (a - r),
			added: p
		};
	}
	tokenize(e, t) {
		if (this.tokenizer === null) return {
			text: e,
			startState: s,
			endState: s,
			tokens: c,
			marks: l
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
			marks: l
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
			let t = this.lines[e], i = n.get(e) ?? l;
			d(t.marks, i) || (t.marks = i, r.push(e));
		}
		return r;
	}
	renderLine(e) {
		let t = this.lines[e];
		return t === void 0 ? "" : t.text.length === 0 ? "<span class=\"ui-code-input__code\"><br></span>" : `<span class="ui-code-input__code">${f(t.text, t.tokens, t.marks)}</span>`;
	}
};
function d(e, t) {
	if (e.length !== t.length) return !1;
	for (let n = 0; n < e.length; n++) if (e[n].from !== t[n].from || e[n].to !== t[n].to || e[n].current !== t[n].current) return !1;
	return !0;
}
function f(e, t, n) {
	if (t.length === 0 && n.length === 0) return m(e);
	let r = /* @__PURE__ */ new Set([0, e.length]);
	for (let e of t) r.add(e.from), r.add(e.to);
	for (let e of n) r.add(e.from), r.add(e.to);
	let i = [...r].sort((e, t) => e - t), a = "", o = 0, s = 0;
	for (let r = 0; r + 1 < i.length; r++) {
		let c = i[r], l = i[r + 1];
		for (; o < t.length && t[o].to <= c;) o++;
		for (; s < n.length && n[s].to <= c;) s++;
		let u = o < t.length && t[o].from <= c ? t[o].kind : null, d = s < n.length && n[s].from <= c ? n[s] : null, f = m(e.slice(c, l));
		if (u === null && d === null) {
			a += f;
			continue;
		}
		a += `<span class="${p(u, d)}">${f}</span>`;
	}
	return a;
}
function p(e, t) {
	let n = e === null ? "" : `ui-tk-${e}`;
	return t !== null && (n += (n.length > 0 ? " " : "") + (t.current ? "ui-code-match ui-code-match--current" : "ui-code-match")), n;
}
function m(e) {
	return e.replace(/[&<>]/g, (e) => e === "&" ? "&amp;" : e === "<" ? "&lt;" : "&gt;");
}
//#endregion
//#region src/indent.ts
function ee(e, t, n, r, i) {
	let a = e.lastIndexOf("\n", t - 1) + 1;
	if (!i && t === n) {
		let e = " ".repeat(r - (t - a) % r);
		return {
			from: t,
			to: n,
			text: e,
			selectionStart: t + e.length,
			selectionEnd: t + e.length
		};
	}
	let o = e.indexOf("\n", n > t ? n - 1 : n);
	o < 0 && (o = e.length);
	let s = [], c = [], l = a;
	for (let t of e.slice(a, o).split("\n")) {
		let e = i ? te(t, r) : 0, n = i || t.length === 0 ? 0 : r;
		s.push({
			start: l,
			length: t.length,
			removed: e,
			inserted: n
		}), c.push(i ? t.slice(e) : " ".repeat(n) + t), l += t.length + 1;
	}
	return s.every((e) => e.removed === 0 && e.inserted === 0) ? null : {
		from: a,
		to: o,
		text: c.join("\n"),
		selectionStart: h(t, s),
		selectionEnd: h(n, s)
	};
}
function te(e, t) {
	return e.startsWith("	") ? 1 : Math.min(t, /^ */.exec(e)[0].length);
}
function h(e, t) {
	let n = 0;
	for (let r of t) {
		if (e === r.start) return r.start + n;
		if (e <= r.start + r.length) return r.start + n + Math.max(0, e - r.start - r.removed) + r.inserted;
		n += r.inserted - r.removed;
	}
	return e + n;
}
//#endregion
//#region src/languages/bash.ts
var ne = a("\n    if then else elif fi for while until do done case esac in function select time return exit local export declare readonly\n    unset shift source break continue eval exec set trap\n"), re = a("if then else elif while until do time exec ! [ [["), g = /[A-Za-z_][\w]*/y, ie = /--?[A-Za-z][\w-]*/y, ae = /\$(?:[A-Za-z_]\w*|\d|[@*#?$!-])/y, oe = /[A-Za-z_]\w*(?=\+?=)/y, se = /<<-?\s*(?:'([^']+)'|"([^"]+)"|\\?([A-Za-z_]\w*))/y, ce = /\d?>>?|\d?>&\d?|<|\|\||&&|\||;;|;|&/y, le = {
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
			case "single": return _(e, t);
			case "heredoc": return ue(e, t);
			default: return de(e, t);
		}
	}
};
function _(e, t) {
	let n = e.indexOf("'");
	return e.skipTo(n < 0 ? -1 : n + 1), n >= 0 && (t.mode = "code"), "string";
}
function ue(e, t) {
	let n = t.heredocIndented ? e.text.replace(/^\t+/, "") : e.text;
	return e.skipToEnd(), n === t.heredoc ? (t.mode = "code", t.heredoc = "", t.command = !0, "keyword") : "string";
}
function de(e, t) {
	let n = t.frames[t.frames.length - 1];
	return n === "\"" ? fe(e, t) : n === "${" ? y(e, t) : pe(e, t);
}
function fe(e, t) {
	if (e.match("\"")) return t.frames.pop(), "string";
	if (e.match("\\")) return e.next(), "escape";
	let n = v(e, t);
	if (n !== null) return n;
	for (e.next(); !e.eol();) {
		let t = e.peek();
		if (t === "\"" || t === "\\" || t === "$" || t === "`") break;
		e.next();
	}
	return "string";
}
function v(e, t) {
	return e.match("$(") ? (t.frames.push("$("), t.command = !0, "punctuation") : e.match("${") ? (t.frames.push("${"), y(e, t)) : e.match("`") ? (t.frames[t.frames.length - 1] === "`" ? t.frames.pop() : (t.frames.push("`"), t.command = !0), "punctuation") : e.match(ae) ? "variable" : null;
}
function y(e, t) {
	for (; !e.eol();) {
		let n = e.peek();
		if (n === "}") {
			e.next(), t.frames.pop();
			break;
		}
		if (n === "$" && (e.peek(1) === "(" || e.peek(1) === "{")) {
			if (e.pos > e.start) break;
			return v(e, t) ?? "variable";
		}
		e.next();
	}
	return "variable";
}
function pe(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = e.peek(), r = e.pos === 0 || /\s/.test(e.text.charAt(e.pos - 1));
	if (n === "#" && r) return e.skipToEnd(), "comment";
	if (n === "'") return e.next(), t.mode = "single", t.command = !1, _(e, t);
	if (n === "\"") return e.next(), t.frames.push("\""), t.command = !1, "string";
	if (e.match("((")) return t.arithmetic = !0, t.command = !1, "punctuation";
	if (t.arithmetic && e.match("))")) return t.arithmetic = !1, t.command = !0, "punctuation";
	if (t.arithmetic) return e.match(/\d+/y) ? "number" : e.match(g) ? "variable" : e.match(/[-+*/%=<>!&|^~?:,]+/y) ? "operator" : (e.next(), null);
	if (e.match(se)) {
		let n = e.current();
		return t.heredocPending = n.replace(/^<<-?\s*/, "").replace(/^\\/, "").replace(/^['"]|['"]$/g, ""), t.heredocIndented = n.startsWith("<<-"), "keyword";
	}
	let i = t.frames[t.frames.length - 1];
	if (n === ")" && i === "$(") return e.next(), t.frames.pop(), t.command = !1, "punctuation";
	let a = v(e, t);
	if (a !== null) return t.command = !1, a;
	if (e.match("\\")) return e.next(), "escape";
	if (e.match("=")) return "operator";
	if (e.match(ce)) {
		let n = e.current();
		return t.command = n === "|" || n === "||" || n === "&&" || n === ";" || n === "&" || n === ";;", "operator";
	}
	if (e.match(/[(){}]/y)) return t.command = !0, "punctuation";
	if (e.match(ie)) return t.command = !1, "attribute";
	if (t.command && e.match(oe)) return "variable";
	if (e.match(g)) {
		let n = e.current();
		return t.command && ne.has(n) ? (t.command = re.has(n), "keyword") : t.command ? (t.command = !1, "function") : null;
	}
	return e.match(/\d+(?=\s|$)/y) ? "number" : e.match(/\[\[?|\]\]?|!/y) ? (t.command = !0, "keyword") : (e.next(), null);
}
var me = t(le), he = a("\n    break case catch class const continue debugger default delete do else enum export extends finally for function if import in\n    instanceof new return super switch this throw try typeof var void while with yield let static async await of get set\n    abstract any as asserts boolean constructor declare implements interface is keyof module namespace never number object\n    private protected public readonly require string symbol type unique unknown from global override satisfies bigint\n    infer out accessor\n"), ge = a("true false null undefined NaN Infinity"), _e = a("return typeof case in of instanceof new delete void throw yield await else do"), b = /[A-Za-z_$][\w$]*/y, ve = /0[xX][\da-fA-F_]+n?|0[bB][01_]+n?|0[oO][0-7_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?/y, ye = /[+\-*/%=<>!&|^~?:]+/y, x = /\s*\(/y, S = {
	initialState: () => ({
		mode: "code",
		frames: [],
		regexAllowed: !0
	}),
	token(e, t) {
		switch (t.mode) {
			case "comment": return C(e, t);
			case "template": return w(e, t);
			default: return be(e, t);
		}
	}
};
function C(e, t) {
	let n = e.indexOf("*/");
	return e.skipTo(n < 0 ? -1 : n + 2), t.mode = n < 0 ? "comment" : "code", "comment";
}
function w(e, t) {
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
function be(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = e.peek();
	if (e.match("//")) return e.skipToEnd(), "comment";
	if (e.match("/*")) return t.mode = "comment", C(e, t);
	if (n === "\"" || n === "'") return e.next(), o(e, n), t.regexAllowed = !1, "string";
	if (n === "`") return e.next(), t.mode = "template", w(e, t);
	if (e.match(ve)) return t.regexAllowed = !1, "number";
	if (n === "@") return e.next(), e.match(b), "meta";
	if (e.match(b)) {
		let n = e.current();
		return he.has(n) ? (t.regexAllowed = _e.has(n), "keyword") : (t.regexAllowed = !1, ge.has(n) ? "keyword" : (x.lastIndex = e.pos, x.test(e.text) ? "function" : T(n) ? "type" : null));
	}
	if (n === "/" && t.regexAllowed && xe(e)) return t.regexAllowed = !1, "regex";
	if (e.match(ye)) return t.regexAllowed = !0, "operator";
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
function xe(e) {
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
function T(e) {
	let t = e.charAt(0);
	return t >= "A" && t <= "Z";
}
var E = t(S), Se = a("\n    abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum\n    event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace\n    new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc\n    static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while\n    add alias and ascending async await by descending dynamic equals from get global group init into join let managed nameof nint\n    not notnull nuint on or orderby partial record remove required scoped select set unmanaged value var when where with yield file\n"), Ce = /@?[A-Za-z_][\w]*/y, we = /0[xX][\da-fA-F_]+[uUlL]*|0[bB][01_]+[uUlL]*|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[fFdDmMuUlL]*/y, Te = /'(?:\\.|[^'\\])'/y, Ee = /[+\-*/%=<>!&|^~?:]+/y, D = /\s*[(<]/y, De = /#[a-z]+/y, Oe = a("new class struct interface enum record is as"), ke = {
	initialState: () => ({
		mode: "code",
		rawQuotes: 0,
		frames: [],
		verbatims: [],
		afterNew: !1
	}),
	token(e, t) {
		switch (t.mode) {
			case "comment": return O(e, t);
			case "verbatim": return k(e, t);
			case "raw": return A(e, t);
			case "interpolated": return Ae(e, t);
			default: return je(e, t);
		}
	}
};
function O(e, t) {
	let n = e.indexOf("*/");
	return e.skipTo(n < 0 ? -1 : n + 2), t.mode = n < 0 ? "comment" : "code", "comment";
}
function k(e, t) {
	for (; !e.eol();) if (!e.match("\"\"") && e.next() === "\"") {
		t.mode = "code";
		break;
	}
	return "string";
}
function A(e, t) {
	let n = "\"".repeat(t.rawQuotes), r = e.indexOf(n);
	return e.skipTo(r < 0 ? -1 : r + n.length), r >= 0 && (t.mode = "code"), "string";
}
function Ae(e, t) {
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
		if (e.next(), r === "\"") return j(t), "string";
	}
	return n || j(t), "string";
}
function j(e) {
	e.verbatims.pop(), e.mode = "code";
}
function je(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = e.peek();
	if (e.match("//")) return e.skipToEnd(), "comment";
	if (e.match("/*")) return t.mode = "comment", O(e, t);
	if (n === "#" && e.text.slice(0, e.pos).trim() === "" && e.match(De)) return e.skipToEnd(), "meta";
	if (e.match(/\$@"|@\$"/y)) return t.verbatims.push(!0), t.mode = "interpolated", "string";
	if (e.match(/\$+"""/y)) return t.rawQuotes = 3, t.mode = "raw", "string";
	if (e.match("$\"")) return t.verbatims.push(!1), t.mode = "interpolated", "string";
	if (e.match("@\"")) return t.mode = "verbatim", k(e, t);
	if (e.match(/"""+/y)) return t.rawQuotes = e.current().length, t.mode = "raw", A(e, t);
	if (n === "\"") return e.next(), o(e, "\""), "string";
	if (e.match(Te)) return "string";
	if (e.match(we)) return t.afterNew = !1, "number";
	if (e.match(Ce)) {
		let n = e.current();
		if (n.charAt(0) !== "@" && Se.has(n)) return t.afterNew = Oe.has(n), "keyword";
		let r = t.afterNew;
		return t.afterNew = !1, T(n.charAt(0) === "@" ? n.slice(1) : n) ? (D.lastIndex = e.pos, !r && D.test(e.text) && e.text.charAt(D.lastIndex - 1) === "(" ? "function" : "type") : (D.lastIndex = e.pos, D.test(e.text) && e.text.charAt(D.lastIndex - 1) === "(" ? "function" : null);
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
	return e.match(/[()[\],;.]/y) ? "punctuation" : e.match(Ee) ? "operator" : (e.next(), null);
}
var Me = t(ke), M = /-?[A-Za-z_][\w-]*/y, N = /\s*:/y, P = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?:%|[a-zA-Z]+)?/y, Ne = /#[\da-fA-F]{3,8}\b/y, Pe = /-?[A-Za-z_][\w-]*\(/y;
function Fe(e) {
	M.lastIndex = e.pos;
	let t = M.exec(e.text);
	if (t === null || (N.lastIndex = e.pos + t[0].length, !N.test(e.text))) return !1;
	for (let t = N.lastIndex; t < e.end; t++) {
		let n = e.text.charAt(t);
		if (n === ";" || n === "}") return !0;
		if (n === "{") return !1;
	}
	return !0;
}
function F(e) {
	return {
		initialState: () => ({
			context: "selector",
			depth: 0,
			comment: !1,
			afterProperty: !1
		}),
		token(t, n) {
			if (n.comment) {
				let e = t.indexOf("*/");
				return t.skipTo(e < 0 ? -1 : e + 2), n.comment = !(e >= 0), "comment";
			}
			if (t.eatWhile(/\s/)) return null;
			if (t.match("/*")) {
				let e = t.indexOf("*/");
				return t.skipTo(e < 0 ? -1 : e + 2), n.comment = e < 0, "comment";
			}
			if (e && t.match("//")) return t.skipToEnd(), "comment";
			let r = t.peek();
			if (r === "\"" || r === "'") return t.next(), o(t, r), "string";
			if (r === "{") return t.next(), n.depth++, n.context = "block", n.afterProperty = !1, "punctuation";
			if (r === "}") return t.next(), n.depth = Math.max(0, n.depth - 1), n.context = n.depth > 0 ? "block" : "selector", n.afterProperty = !1, "punctuation";
			if (r === ";") return t.next(), n.context = n.depth > 0 ? "block" : "selector", n.afterProperty = !1, "punctuation";
			if (r === ":" && n.afterProperty) return t.next(), n.context = "value", n.afterProperty = !1, "punctuation";
			switch (n.context) {
				case "value": return Ie(t, e);
				case "block": return Fe(t) ? (t.match(M), n.afterProperty = !0, "property") : (n.context = "selector", I(t, e));
				default: return I(t, e);
			}
		}
	};
}
function I(e, t) {
	let n = e.peek();
	return n === "@" ? (e.next(), e.eatWhile(/[\w-]/), t && e.match(/\s*[:(]/y, !1) ? "variable" : "keyword") : n === "." || n === "#" ? (e.next(), e.eatWhile(/[\w-]/), "attribute") : n === ":" ? (e.next(), e.eat(":"), e.eatWhile(/[\w-]/), "keyword") : n === "&" || n === "*" ? (e.next(), "keyword") : n === "[" ? (e.next(), e.eatWhile(/[\w-]/), "attribute") : e.match(/[=~|^$*]?=/y) ? "operator" : n === "\"" || n === "'" ? (e.next(), o(e, n), "string") : e.match(/[>+~,()\]]/y) ? "punctuation" : e.match(M) ? "tag" : e.match(P) ? "number" : (e.next(), null);
}
function Ie(e, t) {
	let n = e.peek();
	if (n === "!") return e.next(), e.eatWhile(/[\w-]/), "keyword";
	if (n === "@" && t) return e.next(), e.eatWhile(/[\w-]/), "variable";
	if (n === "~" && t && (e.peek(1) === "\"" || e.peek(1) === "'")) return e.next(), o(e, e.next()), "string";
	if (e.match(Ne)) return "number";
	if (e.match(/url\(/y)) {
		let t = e.indexOf(")");
		return e.skipTo(t < 0 ? -1 : t + 1), "string";
	}
	return e.match(Pe, !1) ? (e.match(M), "function") : e.match(P) ? "number" : e.match(M) ? null : e.match(/[,()]/y) ? "punctuation" : e.match(/[+\-*/=<>]/y) ? "operator" : (e.next(), null);
}
var Le = t(F(!1)), Re = t(F(!0)), ze = /<\/?[A-Za-z][\w:-]*/y, Be = /[^\s"'<>/=]+/y, Ve = /[^\s"'<>`=]+/y, He = /&(?:#\d+|#x[\da-fA-F]+|[A-Za-z]\w*);/y, L = F(!1), Ue = {
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
			case "comment": return R(e, t);
			case "tag": return Ge(e, t);
			case "attribute-value": return Ke(e, t);
			case "script": return z(e, t, "script");
			case "style": return z(e, t, "style");
			default: return We(e, t);
		}
	}
};
function R(e, t) {
	let n = e.indexOf("-->");
	return e.skipTo(n < 0 ? -1 : n + 3), t.mode = n < 0 ? "comment" : "text", "comment";
}
function We(e, t) {
	if (e.match("<!--")) return t.mode = "comment", R(e, t);
	if (e.match("<!")) {
		let t = e.indexOf(">");
		return e.skipTo(t < 0 ? -1 : t + 1), "meta";
	}
	if (e.match(ze)) {
		let n = e.current();
		return t.closing = n.startsWith("</"), t.tag = n.slice(t.closing ? 2 : 1).toLowerCase(), t.mode = "tag", "tag";
	}
	if (e.match(He)) return "escape";
	for (e.next(); !e.eol() && e.peek() !== "<" && e.peek() !== "&";) e.next();
	return null;
}
function Ge(e, t) {
	if (e.eatWhile(/\s/)) return null;
	if (e.match("/>")) return t.mode = "text", "punctuation";
	if (e.match(">")) return !t.closing && t.tag === "script" ? (t.mode = "script", t.inner = S.initialState()) : !t.closing && t.tag === "style" ? (t.mode = "style", t.inner = L.initialState()) : t.mode = "text", "punctuation";
	if (e.match("=")) return "operator";
	let n = e.peek();
	return n === "\"" || n === "'" ? (e.next(), o(e, n, !1) || (t.mode = "attribute-value", t.quote = n), "string") : e.match(Be) ? e.text.slice(0, e.start).trimEnd().endsWith("=") ? "string" : "attribute" : e.match(Ve) ? "string" : (e.next(), null);
}
function Ke(e, t) {
	return o(e, t.quote, !1) && (t.mode = "tag"), "string";
}
function z(t, n, r) {
	let i = `</${r}`;
	(t.pos === 0 || n.closingAt === null) && (n.closingAt = Ye(t, r === "script" ? qe : Je));
	let a = n.closingAt;
	if (a === t.pos) return t.skipTo(a + i.length), n.mode = "tag", n.tag = r, n.closing = !0, n.inner = null, n.closingAt = null, "tag";
	let o = a < 0 ? t.end : a, s = new e(t.text, t.pos, o);
	s.start = t.pos;
	let c = r === "script" ? S.token(s, n.inner) : L.token(s, n.inner);
	return t.pos = s.pos > s.start ? s.pos : s.start + 1, c;
}
var qe = /<\/script/gi, Je = /<\/style/gi;
function Ye(e, t) {
	t.lastIndex = e.pos;
	let n = t.exec(e.text);
	return n === null || n.index + n[0].length > e.end ? -1 : n.index;
}
var Xe = t(Ue), Ze = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y, Qe = /(?:true|false|null)\b/y, B = /\s*:/y;
function $e(e) {
	return B.lastIndex = e.pos, B.test(e.text);
}
var et = t({
	initialState: () => ({}),
	token(e) {
		return e.eatWhile(/\s/) ? null : e.peek() === "\"" ? (e.next(), o(e, "\""), $e(e) ? "property" : "string") : e.match(Ze) ? "number" : e.match(Qe) ? "keyword" : e.match(/[{}[\]:,]/y) ? "punctuation" : (e.next(), "invalid");
	}
}), tt = a("\n    False None True and as assert async await break class continue def del elif else except finally for from global if import in\n    is lambda nonlocal not or pass raise return try while with yield match case\n"), nt = a("\n    print len range int str float list dict set tuple bool type isinstance issubclass enumerate zip map filter sorted reversed min\n    max sum abs any all open super object iter next getattr setattr hasattr callable format repr round divmod pow input id hash\n    vars dir globals locals Exception ValueError TypeError KeyError IndexError RuntimeError StopIteration AttributeError\n"), rt = /[A-Za-z_]\w*/y, it = /0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[jJ]?/y, at = /(?:[rRbBuUfF]{1,2})?(?:'''|"""|'|")/y, ot = /[+\-*/%=<>!&|^~@:]+|->/y, V = /\s*\(/y, st = {
	initialState: () => ({
		mode: "code",
		strings: [],
		frames: [],
		declaring: null
	}),
	token(e, t) {
		return t.mode === "string" ? H(e, t) : ct(e, t);
	}
};
function H(e, t) {
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
		if (e.match(n.quote)) return U(t), "string";
		e.next();
	}
	return n.quote.length === 1 && U(t), "string";
}
function U(e) {
	e.strings.pop(), e.mode = "code";
}
function ct(e, t) {
	if (e.eatWhile(/\s/)) return null;
	let n = e.peek();
	if (n === "#") return e.skipToEnd(), "comment";
	if (e.match(at)) {
		let n = e.current(), r = n.search(/['"]/), i = n.slice(0, r).toLowerCase();
		return t.strings.push({
			quote: n.slice(r),
			raw: i.includes("r"),
			formatted: i.includes("f")
		}), t.mode = "string", t.declaring = null, H(e, t);
	}
	if (e.match(it)) return t.declaring = null, "number";
	if (n === "@" && e.match(/@[A-Za-z_][\w.]*/y)) return "meta";
	if (e.match(rt)) {
		let n = e.current(), r = t.declaring;
		return t.declaring = null, tt.has(n) ? (t.declaring = n === "def" || n === "class" ? n : null, "keyword") : r === "def" ? "function" : r === "class" ? "type" : n === "self" || n === "cls" ? "variable" : (V.lastIndex = e.pos, V.test(e.text) ? "function" : nt.has(n) || T(n) ? "type" : null);
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
	return e.match(/[()[\],;.]/y) ? "punctuation" : e.match(ot) ? "operator" : (e.next(), null);
}
var lt = t(st), ut = [
	["json", et],
	["css", Le],
	["less", Re],
	["javascript", E],
	["typescript", E],
	["html", Xe],
	["bash", me],
	["csharp", Me],
	["python", lt]
], dt = "plain-text", W = class e {
	tokenizers = new Map(ut);
	listeners = /* @__PURE__ */ new Set();
	static normalize(e) {
		let t = (e ?? "").trim().toLowerCase();
		return t.length === 0 ? dt : t;
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
}, G = new W();
//#endregion
//#region src/search.ts
function ft(e, t) {
	if (e.length === 0) return null;
	let n = t.regex ? e : e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	t.wholeWord && (n = `\\b(?:${n})\\b`);
	try {
		return { pattern: new RegExp(n, t.matchCase ? "gm" : "gim") };
	} catch {
		return { invalid: !0 };
	}
}
function pt(e, t) {
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
function K(e, t) {
	if (e.length === 0) return -1;
	for (let n = 0; n < e.length; n++) if (e[n].from >= t) return n;
	return 0;
}
function mt(e, t) {
	if (e.length === 0) return -1;
	for (let n = e.length - 1; n >= 0; n--) if (e[n].from < t) return n;
	return e.length - 1;
}
function ht(e, t, n, r, i) {
	if (!i || n === null || "invalid" in n) return r;
	let a = new RegExp(n.pattern.source, n.pattern.flags.replace("g", ""));
	return e.slice(t.from, t.to).replace(a, r);
}
function gt(e, t, n, r) {
	return t === null || "invalid" in t ? e : (t.pattern.lastIndex = 0, r ? e.replace(t.pattern, n) : e.replace(t.pattern, () => n));
}
//#endregion
//#region src/code-input-engine.ts
var q = ".ui-code-input", J = "data-ui-code-language", _t = "data-ui-code-search", Y = "data-ui-code-eol", X = "crlf", Z = "--ui-code-tab-size", vt = "--ui-code-gutter-digits", yt = "ui-code-input--invalid-pattern", bt = "ui-code-input__line";
function xt(e) {
	if (!(e instanceof HTMLTextAreaElement)) return null;
	let t = e.value, n = e.closest(q);
	return n !== null && St(n) === X ? t.replace(/\r?\n/g, "\r\n") : t;
}
function St(e) {
	let t = e.querySelector("select[data-ui-code-line-ending]")?.value ?? "";
	return t.length > 0 ? t : e.getAttribute(Y) ?? "lf";
}
function Ct(e) {
	let t = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new Set(), r = (r) => {
		for (let i of r) {
			let r = t.get(i);
			if (r === void 0) {
				let r = Ot.create(i, e.strings);
				r !== null && (t.set(i, r), n.add(r));
			} else r.settingsChanged();
		}
	};
	r(e.root.querySelectorAll(q)), e.observeComponents(e.root, q, {
		childList: !0,
		attributeFilter: [J]
	}, r), G.onRegistered((e) => {
		for (let t of n) {
			if (!t.connected) {
				n.delete(t);
				continue;
			}
			t.listLanguages(), t.languageId === e && t.reload();
		}
	}), e.propertyPatchEngine.addValueChangeHandler((e) => {
		if (!e.local) for (let n of e.components) {
			let r = t.get(n);
			e.propertyName === "Value" ? r?.refresh(e.value) : Dt.has(e.propertyName) && r?.syncPickers();
		}
	}), document.addEventListener("selectionchange", () => {
		let e = document.activeElement, n = e instanceof HTMLTextAreaElement ? e.closest(q) : null;
		n !== null && t.get(n)?.writePosition();
	});
}
var wt = "ui-code-input__status-picker", Tt = "ui-code-input__status-button", Et = "ui-code-input__status-menu", Q = "ui-code-input__status-option", Dt = /* @__PURE__ */ new Set([
	"TabSize",
	"Encoding",
	"LineEnding",
	"Language"
]), Ot = class e {
	root;
	strings;
	textarea;
	scroller;
	highlight;
	panel;
	findField;
	replaceField;
	count;
	position;
	tabSizePicker;
	lineEndingPicker;
	languagePicker;
	pickers = [];
	openMenu = null;
	highlighter;
	language;
	matches = [];
	current = -1;
	query = null;
	constructor(e, t, n) {
		this.root = e, this.strings = t, this.textarea = n.textarea, this.scroller = n.scroller, this.highlight = n.highlight, this.panel = n.panel, this.findField = n.findField, this.replaceField = n.replaceField, this.count = n.count, this.position = n.position, this.tabSizePicker = n.tabSizePicker, this.lineEndingPicker = n.lineEndingPicker, this.languagePicker = n.languagePicker;
		let { textarea: r, panel: i, findField: a, replaceField: o } = n;
		this.language = W.normalize(e.getAttribute(J)), this.highlighter = new u(G.get(this.language)), this.renderAll(), this.wireStatusBar(), r.addEventListener("input", () => this.textChanged(!1)), r.addEventListener("keydown", (e) => this.textareaKey(e)), r.addEventListener("keyup", () => this.writePosition()), r.addEventListener("click", () => this.writePosition()), e.addEventListener("keydown", (e) => this.rootKey(e)), a.addEventListener("input", () => this.search(!1, !0)), a.addEventListener("keydown", (e) => this.findFieldKey(e)), o.addEventListener("keydown", (e) => this.replaceFieldKey(e));
		for (let e of i.querySelectorAll("[aria-pressed]")) e.addEventListener("click", () => this.toggleOption(e));
		this.button("data-ui-code-previous")?.addEventListener("click", () => this.step(-1)), this.button("data-ui-code-next")?.addEventListener("click", () => this.step(1)), this.button("data-ui-code-close")?.addEventListener("click", () => this.close()), this.button("data-ui-code-replace-one")?.addEventListener("click", () => this.replaceOne()), this.button("data-ui-code-replace-all")?.addEventListener("click", () => this.replaceEvery());
	}
	static create(t, n) {
		let r = t.querySelector("textarea.ui-code-input__text"), i = t.querySelector(".ui-code-input__scroller"), a = t.querySelector(".ui-code-input__highlight"), o = t.querySelector(".ui-code-input__search"), s = t.querySelector("input[data-ui-code-find]"), c = t.querySelector("input[data-ui-code-replace]"), l = t.querySelector("[data-ui-code-count]");
		return r === null || i === null || a === null || o === null || s === null || c === null || l === null ? null : new e(t, n, {
			textarea: r,
			scroller: i,
			highlight: a,
			panel: o,
			findField: s,
			replaceField: c,
			count: l,
			position: t.querySelector("[data-ui-code-position]"),
			tabSizePicker: t.querySelector("select[data-ui-code-tab-size]"),
			lineEndingPicker: t.querySelector("select[data-ui-code-line-ending]"),
			languagePicker: t.querySelector("select[data-ui-code-language]")
		});
	}
	wireStatusBar() {
		this.writePosition(), this.tabSizePicker?.addEventListener("change", () => {
			this.root.style.setProperty(Z, this.tabSizePicker?.value ?? "4");
		}), this.lineEndingPicker?.addEventListener("change", () => {
			this.textarea.dispatchEvent(new Event("change", { bubbles: !0 }));
		}), this.languagePicker?.addEventListener("change", () => {
			this.root.setAttribute(J, this.languagePicker?.value ?? ""), this.settingsChanged();
		}), this.listLanguages();
		for (let e of this.root.querySelectorAll(`.${wt}`)) {
			let t = e.querySelector("select"), n = e.querySelector(`button.${Tt}`);
			if (t === null || n === null) continue;
			let r = {
				select: t,
				button: n
			};
			this.pickers.push(r), t.addEventListener("change", () => this.syncPickers()), n.addEventListener("click", () => this.togglePickerMenu(r)), n.addEventListener("keydown", (e) => this.pickerButtonKey(r, e));
		}
		this.syncPickers();
	}
	syncPickers() {
		for (let e of this.pickers) {
			let t = e.select.options[e.select.selectedIndex];
			t !== void 0 && e.button.textContent !== t.textContent && (e.button.textContent = t.textContent);
		}
	}
	pickerButtonKey(e, t) {
		(t.key === "ArrowDown" || t.key === "ArrowUp" || t.key === "Enter" || t.key === " ") && (t.preventDefault(), this.openMenu?.picker !== e && this.openPickerMenu(e));
	}
	togglePickerMenu(e) {
		this.openMenu?.picker === e ? this.openMenu.close() : this.openPickerMenu(e);
	}
	openPickerMenu(e) {
		if (this.openMenu?.close(), this.textarea.readOnly) return;
		let t = document.createElement("div");
		t.className = Et, t.setAttribute("role", "listbox");
		let n = [...e.select.options].filter((e) => !e.hidden), r = 0;
		n.forEach((n, i) => {
			let a = document.createElement("button");
			a.type = "button", a.className = Q, a.setAttribute("role", "option"), a.setAttribute("aria-selected", n.selected ? "true" : "false"), a.textContent = n.textContent, a.addEventListener("click", () => {
				e.select.value = n.value, e.select.dispatchEvent(new Event("change", { bubbles: !0 })), this.syncPickers(), c(), e.button.focus({ preventScroll: !0 });
			}), t.append(a), n.selected && (r = i);
		});
		let i = [...t.querySelectorAll(`.${Q}`)], a = (t) => {
			t.key === "Escape" ? (t.preventDefault(), c(), e.button.focus({ preventScroll: !0 })) : t.key === "ArrowDown" || t.key === "ArrowUp" ? (t.preventDefault(), r = (r + (t.key === "ArrowDown" ? 1 : i.length - 1)) % i.length, i[r]?.focus({ preventScroll: !0 })) : t.key === "Tab" && c();
		}, o = (n) => {
			n.composedPath().includes(t) || n.composedPath().includes(e.button) || c();
		}, s = (e) => {
			e.composedPath().includes(t) || c();
		}, c = () => {
			t.remove(), e.button.setAttribute("aria-expanded", "false"), document.removeEventListener("pointerdown", o, !0), window.removeEventListener("resize", c), window.removeEventListener("scroll", s, !0), this.openMenu = null;
		};
		t.addEventListener("keydown", a), document.addEventListener("pointerdown", o, !0), window.addEventListener("resize", c), window.addEventListener("scroll", s, !0), this.root.append(t), e.button.setAttribute("aria-expanded", "true"), this.openMenu = {
			picker: e,
			menu: t,
			close: c
		};
		let l = e.button.getBoundingClientRect(), u = t.getBoundingClientRect();
		t.style.left = `${Math.max(4, l.right - u.width)}px`, l.top >= u.height + 8 ? t.style.bottom = `${window.innerHeight - l.top + 4}px` : t.style.top = `${l.bottom + 4}px`, i[r]?.focus({ preventScroll: !0 });
	}
	listLanguages() {
		let e = this.languagePicker;
		if (e === null) return;
		let t = new Set([...e.options].map((e) => W.normalize(e.value)));
		for (let n of G.ids()) {
			if (t.has(n)) continue;
			let r = document.createElement("option");
			r.value = n, r.textContent = n, e.append(r);
		}
	}
	writePosition() {
		if (this.position === null) return;
		let e = this.textarea.value, t = this.textarea.selectionEnd, n = e.lastIndexOf("\n", t - 1) + 1, r = this.highlighter.lineAt(n) + 1, i = this.strings.format("ui.code.position", {
			line: r,
			column: t - n + 1
		});
		this.position.textContent !== i && (this.position.textContent = i);
	}
	button(e) {
		return this.panel.querySelector(`button[${e}]`);
	}
	get languageId() {
		return this.language;
	}
	get connected() {
		return this.root.isConnected;
	}
	settingsChanged() {
		let e = W.normalize(this.root.getAttribute(J));
		this.syncPickers(), e !== this.language && (this.language = e, this.reload());
	}
	reload() {
		this.highlighter = new u(G.get(this.language)), this.renderAll(), this.search(!0, !1);
	}
	refresh(e) {
		if (typeof e == "string" && /\n/.test(e)) {
			let t = e.includes("\r\n") ? X : "lf";
			this.root.setAttribute(Y, t);
			let n = this.lineEndingPicker?.querySelector("option[data-ui-code-eol-detected]");
			n != null && (n.textContent = t === X ? "CRLF" : "LF"), this.syncPickers();
		}
		this.textChanged(!0), this.writePosition();
	}
	renderAll() {
		this.highlight.replaceChildren(), this.applyChange(this.highlighter.update(this.textarea.value)), this.updateGutter();
	}
	textChanged(e) {
		this.applyChange(this.highlighter.update(this.textarea.value)), this.updateGutter(), this.writePosition(), this.panel.hidden || this.search(!0, e);
	}
	applyChange(e) {
		if (e.removed === 0 && e.added === 0) return;
		let t = "";
		for (let n = e.from; n < e.from + e.added; n++) t += `<div class="${bt}">${this.highlighter.renderLine(n)}</div>`;
		if (this.highlight.childElementCount === 0) {
			this.highlight.innerHTML = t;
			return;
		}
		let n = document.createElement("template");
		n.innerHTML = t;
		let r = this.highlight.children[e.from] ?? null;
		for (let t = 0; t < e.removed; t++) this.highlight.children[e.from]?.remove();
		this.highlight.insertBefore(n.content, r !== null && r.isConnected ? r : this.highlight.children[e.from] ?? null);
	}
	renderLines(e) {
		for (let t of e) {
			let e = this.highlight.children[t];
			e !== void 0 && (e.innerHTML = this.highlighter.renderLine(t));
		}
	}
	updateGutter() {
		let e = String(Math.max(2, String(this.highlighter.lineCount).length));
		this.root.style.getPropertyValue(vt) !== e && this.root.style.setProperty(vt, e);
	}
	get tabSize() {
		let e = Number.parseInt(getComputedStyle(this.root).getPropertyValue(Z), 10);
		return Number.isFinite(e) && e > 0 ? e : 4;
	}
	get searchEnabled() {
		return this.root.hasAttribute(_t);
	}
	textareaKey(e) {
		e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || this.textarea.readOnly || (e.key === "Tab" ? (e.preventDefault(), this.tab(e.shiftKey)) : e.key === "Enter" && !e.shiftKey && (e.preventDefault(), this.newLine()));
	}
	rootKey(e) {
		if (e.defaultPrevented || e.isComposing) return;
		let t = e.ctrlKey || e.metaKey;
		t && !e.altKey && e.code === "KeyF" && this.searchEnabled ? (e.preventDefault(), this.open(!1)) : t && !e.altKey && e.code === "KeyH" && this.searchEnabled ? (e.preventDefault(), this.open(!0)) : t && !e.altKey && e.code === "KeyS" ? (e.preventDefault(), this.save()) : e.key === "Escape" && !this.panel.hidden ? (e.preventDefault(), this.close()) : e.code === "F3" && !this.panel.hidden && (e.preventDefault(), this.step(e.shiftKey ? -1 : 1));
	}
	findFieldKey(e) {
		e.key === "Enter" && !e.isComposing && (e.preventDefault(), this.step(e.shiftKey ? -1 : 1));
	}
	replaceFieldKey(e) {
		e.key === "Enter" && !e.isComposing && (e.preventDefault(), e.ctrlKey || e.metaKey ? this.replaceEvery() : this.replaceOne());
	}
	save() {
		this.textarea.readOnly || (this.textarea.dispatchEvent(new Event("change", { bubbles: !0 })), this.textarea.dispatchEvent(new Event("save", { bubbles: !0 })));
	}
	insertText(e) {
		if (this.textarea.focus({ preventScroll: !0 }), !document.execCommand("insertText", !1, e)) {
			let t = this.textarea.selectionStart, n = this.textarea.selectionEnd;
			this.textarea.setRangeText(e, t, n, "end"), this.textarea.dispatchEvent(new Event("input", { bubbles: !0 }));
		}
	}
	tab(e) {
		let t = ee(this.textarea.value, this.textarea.selectionStart, this.textarea.selectionEnd, this.tabSize, e);
		t !== null && (this.textarea.setSelectionRange(t.from, t.to), this.insertText(t.text), this.textarea.setSelectionRange(t.selectionStart, t.selectionEnd));
	}
	newLine() {
		let e = this.textarea.value, t = this.textarea.selectionStart, n = e.lastIndexOf("\n", t - 1) + 1, r = e.slice(n, t), i = /^[ \t]*/.exec(r)?.[0] ?? "", a = r.trimEnd(), o = a.charAt(a.length - 1);
		(o === "{" || o === "[" || o === "(" || o === ":" && this.language === "python") && (i += " ".repeat(this.tabSize)), this.insertText("\n" + i);
	}
	get options() {
		return {
			matchCase: this.pressed("data-ui-code-match-case"),
			wholeWord: this.pressed("data-ui-code-whole-word"),
			regex: this.pressed("data-ui-code-regex")
		};
	}
	pressed(e) {
		return this.button(e)?.getAttribute("aria-pressed") === "true";
	}
	toggleOption(e) {
		e.setAttribute("aria-pressed", e.getAttribute("aria-pressed") === "true" ? "false" : "true"), this.search(!1, !0);
	}
	open(e) {
		let t = this.textarea.value.slice(this.textarea.selectionStart, this.textarea.selectionEnd);
		this.panel.hidden = !1, t.length > 0 && !t.includes("\n") && (this.findField.value = t), this.search(!1, !0);
		let n = e && !this.textarea.readOnly ? this.replaceField : this.findField;
		n.focus({ preventScroll: !0 }), n.select();
	}
	close() {
		this.panel.hidden = !0, this.matches = [], this.current = -1, this.renderLines(this.highlighter.setMatches([], -1)), this.root.classList.remove(yt), this.textarea.focus({ preventScroll: !0 });
	}
	search(e, t) {
		let n = this.options, r = this.current >= 0 ? this.matches[this.current] : void 0;
		this.query = ft(this.findField.value, n), this.matches = pt(this.textarea.value, this.query), this.root.classList.toggle(yt, this.query !== null && "invalid" in this.query);
		let i = e && r !== void 0 ? this.matches.findIndex((e) => e.from === r.from) : -1, a = i >= 0 ? i : K(this.matches, this.textarea.selectionStart);
		this.goTo(a, t);
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
		let t = this.current >= 0 ? this.matches[this.current].from : this.textarea.selectionStart, n = e > 0 ? K(this.matches, t + 1) : mt(this.matches, t);
		this.goTo(n, !0);
	}
	goTo(e, t) {
		if (this.current = e, this.renderLines(this.highlighter.setMatches(this.matches, e)), this.writeCount(), e < 0) return;
		let n = this.matches[e];
		this.textarea.setSelectionRange(n.from, n.to), t && this.reveal(n);
	}
	writeCount() {
		let e;
		e = this.query !== null && "invalid" in this.query ? this.strings.text("ui.code.invalid-pattern") : this.query === null ? "" : this.matches.length === 0 ? this.strings.text("ui.code.no-matches") : this.strings.format("ui.code.matches", {
			current: this.current + 1,
			total: this.matches.length
		}), this.count.textContent !== e && (this.count.textContent = e);
	}
	reveal(e) {
		let t = this.highlight.children[this.highlighter.lineAt(e.from)];
		if (t === void 0) return;
		let n = this.scroller, r = t.offsetTop, i = r + t.offsetHeight;
		(r < n.scrollTop || i > n.scrollTop + n.clientHeight) && (n.scrollTop = Math.max(0, r - n.clientHeight / 2));
		let a = t.querySelector(".ui-code-match--current");
		if (a === null) return;
		let o = a.offsetLeft, s = o + a.offsetWidth;
		(o < n.scrollLeft || s > n.scrollLeft + n.clientWidth) && (n.scrollLeft = Math.max(0, o - n.clientWidth / 2));
	}
	replaceOne() {
		if (this.textarea.readOnly) return;
		if (this.current < 0) {
			this.search(!1, !0);
			return;
		}
		let e = this.matches[this.current], t = ht(this.textarea.value, e, this.query, this.replaceField.value, this.options.regex);
		this.textarea.setSelectionRange(e.from, e.to), this.insertText(t), this.replaceField.focus({ preventScroll: !0 }), this.goTo(this.matches.length === 0 ? -1 : Math.min(this.current < 0 ? 0 : this.current, this.matches.length - 1), !0);
	}
	replaceEvery() {
		if (this.textarea.readOnly || this.matches.length === 0) return;
		let e = this.textarea.value, t = gt(e, this.query, this.replaceField.value, this.options.regex);
		t !== e && (this.textarea.setSelectionRange(0, e.length), this.insertText(t), this.replaceField.focus({ preventScroll: !0 }));
	}
};
//#endregion
//#region src/framework-api.ts
function kt() {
	let e = window.NEStandardUI;
	if (e === void 0 || typeof e.registerEngine != "function") throw Error("NE.Standard.UI.Web.CodeInput needs the framework's client (ui.js) on the page before it.");
	return e;
}
//#endregion
//#region src/package-api.ts
function At(e) {
	let n = window.NEStandardUICodeInput?.__pendingLanguages ?? [], r = {
		registerLanguage: (t, n) => e.register(t, n),
		createTokenizer: t,
		__pendingLanguages: []
	};
	window.NEStandardUICodeInput = r;
	for (let t of n) e.register(t.id, t.tokenizer);
	return r;
}
//#endregion
//#region src/code-input.ts
At(G);
var $ = kt();
$.registerEvent("save", { settlesValue: !0 }), $.registerValueReader({
	kind: "code",
	read: (e) => xt(e)
}), $.registerEngine(Ct);
//#endregion
