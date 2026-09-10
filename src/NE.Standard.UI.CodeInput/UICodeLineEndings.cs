namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The line break the code field's value is written with. A browser's text field holds every line break as LF, so the field
/// puts the chosen one back into the value it sends; unset, the field keeps whatever the value came with.
/// </summary>
public static class UICodeLineEndings
{
    public const string Lf = "lf";
    public const string CrLf = "crlf";
}
