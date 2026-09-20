namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The line break the code field's value is written with. A browser field holds line breaks as LF internally; unset, the field
/// keeps whatever line break the value came with.
/// </summary>
public static class UICodeLineEndings
{
    public const string Lf = "lf";
    public const string CrLf = "crlf";
}
