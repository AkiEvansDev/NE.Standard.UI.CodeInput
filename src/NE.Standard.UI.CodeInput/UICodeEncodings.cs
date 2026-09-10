using System.Collections.Generic;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The encodings the code field's status bar offers, by id — what an application writes the text out as. The field itself holds
/// text; the choice reaches the controller through <c>Encoding</c> and means nothing to the browser.
/// </summary>
/// <remarks>
/// An id is the bar's own word, not a .NET encoding name: turning one into bytes is the application's, since only it knows whether
/// a BOM is wanted and what to do when the text will not fit the code page. <c>Encoding.GetEncoding</c> answers the two UTF-16 ids
/// and <c>utf-8</c>; the single-byte ones need <c>CodePagesEncodingProvider.Instance</c> registered first, and
/// <c>utf-8-bom</c> is UTF-8 written with a preamble, which no encoding name of its own carries.
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

    /// <summary>Every encoding the status bar lists, with the name it is listed under.</summary>
    public static IReadOnlyList<KeyValuePair<string, string>> All { get; } =
    [
        new(Utf8, "UTF-8"),
        new(Utf8Bom, "UTF-8 with BOM"),
        new(Utf16LittleEndian, "UTF-16 LE"),
        new(Utf16BigEndian, "UTF-16 BE"),
        new(Windows1251, "Windows-1251"),
        new(Windows1252, "Windows-1252"),
        new(Latin1, "ISO 8859-1")
    ];
}
