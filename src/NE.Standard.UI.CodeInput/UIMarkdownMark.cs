namespace NE.Standard.UI.CodeInput;

/// <summary>
/// A run Markdown itself marks, which a display may draw in a style of its own.
/// </summary>
public enum UIMarkdownMark
{
    /// <summary>Strong emphasis: <c>**words**</c> or <c>__words__</c>.</summary>
    Strong,

    /// <summary>Emphasis: <c>*words*</c> or <c>_words_</c>.</summary>
    Emphasis,

    /// <summary>Struck-through words: <c>~~words~~</c>.</summary>
    Strikethrough,

    /// <summary>Inline code: <c>`code`</c>.</summary>
    Code,

    /// <summary>A link's words.</summary>
    Link,
}
