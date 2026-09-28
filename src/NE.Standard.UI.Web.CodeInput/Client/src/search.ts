// Find and replace over the text alone: what the panel asks, answered as ranges the editor then marks, selects and rewrites.

import { WordCharacter } from "./motion.ts";

export type SearchOptions = {
    readonly matchCase: boolean;
    readonly wholeWord: boolean;
    readonly regex: boolean;
};

export type SearchMatch = {
    readonly from: number;
    readonly to: number;
};

export type SearchQuery = {
    readonly pattern: RegExp;
    /** A match counts only where no word character stands on either side of it. */
    readonly wholeWord: boolean;
} | {
    /** The query could not be read as a pattern. */
    readonly invalid: true;
} | null;

/** The query as a global pattern, or null for an empty one; a regex the browser refuses comes back as invalid rather than thrown. */
export function compileQuery(query: string, options: SearchOptions): SearchQuery {
    if (query.length === 0)
        return null;

    const source = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    try {
        return { pattern: new RegExp(source, options.matchCase ? "gm" : "gim"), wholeWord: options.wholeWord };
    }
    catch {
        return { invalid: true };
    }
}

export function findMatches(text: string, query: SearchQuery): SearchMatch[] {
    const matches: SearchMatch[] = [];

    for (const found of execAll(text, query))
        matches.push({ from: found.index, to: found.index + found[0].length });

    return matches;
}

/** Every match the query takes, in order: an empty one is stepped past, and a whole-word query drops one standing inside a word. */
function* execAll(text: string, query: SearchQuery): Generator<RegExpExecArray> {
    if (query === null || "invalid" in query)
        return;

    const pattern = query.pattern;

    pattern.lastIndex = 0;

    for (;;) {
        const found = pattern.exec(text);

        if (found === null)
            return;

        // An empty match would never move on; step past it rather than spin.
        if (found[0].length === 0) {
            pattern.lastIndex++;
            continue;
        }

        if (query.wholeWord && !standsAlone(text, found.index, found.index + found[0].length)) {
            // A shorter match may still start one character on, inside what this one covered.
            pattern.lastIndex = found.index + 1;
            continue;
        }

        const next = pattern.lastIndex;

        yield found;

        // The consumer may have run the pattern itself; the walk resumes where this match left it.
        pattern.lastIndex = next;
    }
}

// The editor's own word rather than `\b`, which knows only ASCII: a Cyrillic or accented word would have no boundary at all.
function standsAlone(text: string, from: number, to: number): boolean {
    return (from === 0 || !WordCharacter.test(text.charAt(from - 1))) && (to >= text.length || !WordCharacter.test(text.charAt(to)));
}

/** The match at or after a position, wrapping to the first; -1 when there is none. */
export function nextMatchFrom(matches: readonly SearchMatch[], position: number): number {
    if (matches.length === 0)
        return -1;

    for (let i = 0; i < matches.length; i++) {
        if (matches[i].from >= position)
            return i;
    }

    return 0;
}

/** The match before a position, wrapping to the last; -1 when there is none. */
export function previousMatchFrom(matches: readonly SearchMatch[], position: number): number {
    if (matches.length === 0)
        return -1;

    for (let i = matches.length - 1; i >= 0; i--) {
        if (matches[i].from < position)
            return i;
    }

    return matches.length - 1;
}

/**
 * What one match becomes: the replacement with its `$1` groups filled for a regex query, or the literal text otherwise. The pattern
 * runs again at the match's place in the whole text, so a lookaround and `` $` ``/`$'` see what Replace all sees.
 */
export function expandReplacement(text: string, match: SearchMatch, query: SearchQuery, replacement: string, regex: boolean): string {
    if (!regex || query === null || "invalid" in query)
        return replacement;

    const sticky = new RegExp(query.pattern.source, query.pattern.flags.replace("g", "") + "y");

    sticky.lastIndex = match.from;

    const found = sticky.exec(text);

    return found === null ? replacement : substitute(text, found, replacement);
}

/** The whole text with every match replaced — the same matches the panel counts, a whole-word query's included. */
export function replaceAll(text: string, query: SearchQuery, replacement: string, regex: boolean): string {
    let result = "";
    let last = 0;
    let replaced = false;

    for (const found of execAll(text, query)) {
        result += text.slice(last, found.index) + (regex ? substitute(text, found, replacement) : replacement);
        last = found.index + found[0].length;
        replaced = true;
    }

    return replaced ? result + text.slice(last) : text;
}

/** A replacement's `$` patterns filled from one match, as `String.prototype.replace` fills them: `$$`, `$&`, `` $` ``, `$'`, `$n`, `$<name>`. */
function substitute(text: string, found: RegExpExecArray, replacement: string): string {
    const groups = found.length - 1;
    let result = "";

    for (let i = 0; i < replacement.length; i++) {
        const character = replacement.charAt(i);
        const next = replacement.charAt(i + 1);

        if (character !== "$" || i + 1 >= replacement.length) {
            result += character;
            continue;
        }

        if (next === "$") {
            result += "$";
            i++;
        }
        else if (next === "&") {
            result += found[0];
            i++;
        }
        else if (next === "`") {
            result += text.slice(0, found.index);
            i++;
        }
        else if (next === "'") {
            result += text.slice(found.index + found[0].length);
            i++;
        }
        else if (next === "<" && found.groups !== undefined) {
            const close = replacement.indexOf(">", i + 2);

            if (close < 0) {
                result += character;
                continue;
            }

            result += found.groups[replacement.slice(i + 2, close)] ?? "";
            i = close;
        }
        else if (next >= "0" && next <= "9") {
            // Two digits when they name a group, else one; `$0` and a group past the last are written as they stand.
            const two = Number.parseInt(replacement.slice(i + 1, i + 3), 10);
            const one = Number.parseInt(next, 10);

            if (replacement.length > i + 2 && /\d/.test(replacement.charAt(i + 2)) && two >= 1 && two <= groups) {
                result += found[two] ?? "";
                i += 2;
            }
            else if (one >= 1 && one <= groups) {
                result += found[one] ?? "";
                i++;
            }
            else
                result += character;
        }
        else
            result += character;
    }

    return result;
}
