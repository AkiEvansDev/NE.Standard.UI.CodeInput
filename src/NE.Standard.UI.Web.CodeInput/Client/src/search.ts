// Find and replace over the text alone: what the panel asks, answered as ranges the editor then marks, selects and rewrites.

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
} | {
    /** The query could not be read as a pattern. */
    readonly invalid: true;
} | null;

/** The query as a global pattern, or null for an empty one; a regex the browser refuses comes back as invalid rather than thrown. */
export function compileQuery(query: string, options: SearchOptions): SearchQuery {
    if (query.length === 0)
        return null;

    let source = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (options.wholeWord)
        source = `\\b(?:${source})\\b`;

    try {
        return { pattern: new RegExp(source, options.matchCase ? "gm" : "gim") };
    }
    catch {
        return { invalid: true };
    }
}

export function findMatches(text: string, query: SearchQuery): SearchMatch[] {
    if (query === null || "invalid" in query)
        return [];

    const matches: SearchMatch[] = [];
    const pattern = query.pattern;

    pattern.lastIndex = 0;

    for (;;) {
        const found = pattern.exec(text);

        if (found === null)
            break;

        // An empty match would never move on; step past it rather than spin.
        if (found[0].length === 0) {
            pattern.lastIndex++;
            continue;
        }

        matches.push({ from: found.index, to: found.index + found[0].length });
    }

    return matches;
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

/** What one match becomes: the replacement with its `$1` groups filled for a regex query, or the literal text otherwise. */
export function expandReplacement(text: string, match: SearchMatch, query: SearchQuery, replacement: string, regex: boolean): string {
    if (!regex || query === null || "invalid" in query)
        return replacement;

    const pattern = new RegExp(query.pattern.source, query.pattern.flags.replace("g", ""));

    return text.slice(match.from, match.to).replace(pattern, replacement);
}

/** The whole text with every match replaced. */
export function replaceAll(text: string, query: SearchQuery, replacement: string, regex: boolean): string {
    if (query === null || "invalid" in query)
        return text;

    query.pattern.lastIndex = 0;

    return regex ? text.replace(query.pattern, replacement) : text.replace(query.pattern, () => replacement);
}
