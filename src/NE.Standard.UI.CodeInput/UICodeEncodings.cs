using System;
using System.Collections.Generic;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The encodings the code field's status bar offers, by id — what an application writes the text out as.
/// </summary>
/// <remarks>
/// An id is the status bar's own word, not a .NET encoding name — turning one into bytes is the application's job.
/// <c>Encoding.GetEncoding</c> resolves most ids; single-byte ones need <c>CodePagesEncodingProvider.Instance</c> registered, and
/// <c>utf-8-bom</c> has no encoding name of its own.
/// </remarks>
public static class UICodeEncodings
{
    public const string Utf8 = "utf-8";
    public const string Utf8Bom = "utf-8-bom";
    public const string Utf16LittleEndian = "utf-16le";
    public const string Utf16BigEndian = "utf-16be";
    public const string Windows1251 = "windows-1251";
    public const string Windows1252 = "windows-1252";
    public const string Latin1 = "iso-8859-1";

    /// <summary>Every encoding the status bar lists, with its name — or a word's key (UTF-8 with BOM's).</summary>
    public static IReadOnlyList<KeyValuePair<string, string>> All { get; } =
    [
        new(Utf8, "UTF-8"),
        new(Utf8Bom, UICodeInputStrings.Utf8Bom),
        new(Utf16LittleEndian, "UTF-16 LE"),
        new(Utf16BigEndian, "UTF-16 BE"),
        new(Windows1251, "Windows-1251"),
        new(Windows1252, "Windows-1252"),
        new(Latin1, "ISO 8859-1")
    ];

    /// <summary>The name an encoding is listed under, as <see cref="All"/> gives it; an id the package does not ship is its own name.</summary>
    public static string DisplayName(string id)
    {
        foreach (KeyValuePair<string, string> encoding in All)
        {
            if (string.Equals(encoding.Key, id, StringComparison.OrdinalIgnoreCase))
                return encoding.Value;
        }

        return id;
    }
}
