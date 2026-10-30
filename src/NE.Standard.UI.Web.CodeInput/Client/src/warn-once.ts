// A degrade the reader never sees — a line left plain, a provider's words left out, a file not loaded — said once in the console
// per what failed, so a broken package is found without a warning for every line it fails on.

const warnedObjects = new WeakSet<object>();
const warnedNames = new Set<string>();

/** Says `message` with the error once per `subject`: a tokenizer, a provider, a URL. */
export function warnOnce(subject: object | string, message: string, error: unknown): void {
    if (typeof subject === "string") {
        if (warnedNames.has(subject))
            return;

        warnedNames.add(subject);
    }
    else {
        if (warnedObjects.has(subject))
            return;

        warnedObjects.add(subject);
    }

    console.warn(`NE.Standard.UI.Web.CodeInput: ${message}`, error);
}
