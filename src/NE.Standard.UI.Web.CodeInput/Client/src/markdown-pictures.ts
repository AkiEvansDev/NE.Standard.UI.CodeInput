// What a picture pasted or dropped into a Markdown text is written as: the placeholder it stands under while it uploads, and the
// image it becomes once the application has answered with its address.

/** The pictures among what was pasted or dropped that the field's `Accept` takes, judged by the framework's own rule. */
export function pictureFiles(files: Iterable<File>, accept: string, accepts: (accept: string, file: File) => boolean): File[] {
    const pictures: File[] = [];

    // A picture first, whatever `Accept` lets through: the text can only show one.
    for (const file of files) {
        if (file.type.toLowerCase().startsWith("image/") && accepts(accept, file))
            pictures.push(file);
    }

    return pictures;
}

/** Whether a drag carries a picture; a drag shows each file's type and never its name, so `Accept` waits for the drop. */
export function carriesPicture(transfer: DataTransfer | null): boolean {
    if (transfer === null || !transfer.types.includes("Files"))
        return false;

    for (const item of transfer.items) {
        if (item.kind === "file" && item.type.toLowerCase().startsWith("image/"))
            return true;
    }

    return false;
}

/**
 * The placeholder a picture stands under, `![words]()`: its words name the file, numbered where `taken` — the text and the
 * placeholders already made — holds the same, so every upload finds its own however the text moves meanwhile.
 */
export function placeholderText(name: string, words: (name: string) => string, taken: (placeholder: string) => boolean): string {
    let placeholder = `![${escapeWords(words(name))}]()`;

    for (let number = 2; taken(placeholder); number++)
        placeholder = `![${escapeWords(words(`${name} (${number})`))}]()`;

    return placeholder;
}

/** The image a placeholder becomes: described by the file's name without its extension, as a screenshot is "image". */
export function pictureText(fileName: string, address: string): string {
    const dot = fileName.lastIndexOf(".");
    const words = dot > 0 ? fileName.slice(0, dot) : fileName;

    return `![${escapeWords(words)}](${escapeAddress(address)})`;
}

/** Brackets and backslashes kept as words, so a file's name can never close the description early. */
function escapeWords(words: string): string {
    return words.replace(/[\\[\]]/g, "\\$&").replace(/[\r\n]+/g, " ");
}

/** What would end the destination early or split it — a space, a bracket, a break — written as the browser reads it anyway. */
function escapeAddress(address: string): string {
    return address.trim().replace(/[\s()<>]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}

/** Whether an address puts the picture itself into the text, which the field never does: the application keeps it. */
export function isDataAddress(address: string): boolean {
    return /^\s*data:/i.test(address);
}
