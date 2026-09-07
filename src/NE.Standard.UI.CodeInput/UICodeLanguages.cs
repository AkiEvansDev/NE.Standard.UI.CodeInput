namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The languages the code field highlights out of the box, by id. A language is a string so that a package can add one: it ships
/// a script that registers its tokenizer with the editor under an id of its own, and an application names that id here.
/// </summary>
public static class UICodeLanguages
{
    /// <summary>No highlighting: a monospaced field with line numbers.</summary>
    public const string PlainText = "plain-text";
    public const string Json = "json";
    public const string Css = "css";
    public const string Less = "less";
    public const string JavaScript = "javascript";
    public const string TypeScript = "typescript";
    public const string Html = "html";
    public const string Bash = "bash";
    public const string CSharp = "csharp";
    public const string Python = "python";
}
