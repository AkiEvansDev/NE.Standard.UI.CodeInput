using System;
using System.Collections.Generic;

namespace DemoApp.CodeInput;

/// <summary>
/// The demo's words in its two languages, its own under <see cref="KeyPrefix"/>; the framework's and the code field's are the tables
/// they ship, so the missing-word report in Development names only a real gap (DemoWordsCoverageTests). The samples and the
/// languages', encodings' and line endings' names stay as written.
/// </summary>
internal static class CodeInputDemoWords
{
    /// <summary>What every key of the demo starts with; every other string is content (<c>KeyPrefixes</c>).</summary>
    public const string KeyPrefix = "code-demo.";

    private static readonly Dictionary<string, string> English = new(StringComparer.Ordinal)
    {
        ["code-demo.editor.title"] = "Editor",
        ["code-demo.editor.description"] = "A field from NE.Standard.UI.CodeInput. Tab indents, Enter keeps the indentation, Ctrl+F finds and Ctrl+H replaces, Ctrl+U/Ctrl+Shift+U change case, and Ctrl+Space opens completions (a JSON file adds a few .NET names, in every language).",
        ["code-demo.editor.line-numbers"] = "Line numbers",
        ["code-demo.editor.wrap-lines"] = "Wrap lines",
        ["code-demo.editor.read-only"] = "Read-only",
        ["code-demo.editor.search"] = "Search",
        ["code-demo.editor.multi-caret"] = "Multi-caret",
        ["code-demo.editor.status-bar"] = "Status bar",
        ["code-demo.editor.completions"] = "Completions",
        ["code-demo.editor.appearance"] = "Appearance: {appearance}",
        ["code-demo.editor.reset-sample"] = "Reset sample",
        ["code-demo.editor.snippet"] = "Snippet",
        ["code-demo.editor.placeholder"] = "Type some code…",
        ["code-demo.editor.status"] = "On the server: {lines}, {characters}, {encoding}, {ending}.",
        ["code-demo.editor.lines.one"] = "{count} line",
        ["code-demo.editor.lines.other"] = "{count} lines",
        ["code-demo.editor.characters.one"] = "{count} character",
        ["code-demo.editor.characters.other"] = "{count} characters",
        ["code-demo.editor.saved"] = "Saved at {time} — {status}",

        ["code-demo.appearance.ghost"] = "Ghost",
        ["code-demo.appearance.filled"] = "Filled",
        ["code-demo.appearance.tonal"] = "Tonal",
        ["code-demo.appearance.outline"] = "Outline",
        ["code-demo.appearance.underline"] = "Underline",

        ["code-demo.markdown.title"] = "Markdown",
        ["code-demo.markdown.description"] = "A code field in Markdown and a MarkdownDisplay bound to the same text; neither knows about the other. Paste or drop a picture into the text: it uploads, and the page answers with where it keeps it. Select words with the mouse: the bar over them makes them bold, italic, struck through, code or a link, or their lines a heading or a list, and takes it off again; Ctrl+B, Ctrl+I and Ctrl+K do the same, and Alt+F10 takes the keyboard to the bar.",
        ["code-demo.markdown.document"] = "Document",
        ["code-demo.markdown.no-picture"] = "Only a PNG, JPEG, GIF or WebP picture can be added.",

        ["code-demo.code"] = "Code",
        ["code-demo.copy"] = "Copy"
    };

    // Chinese has one plural form, so a plural key has only its ".other".
    private static readonly Dictionary<string, string> Chinese = new(StringComparer.Ordinal)
    {
        ["code-demo.editor.title"] = "编辑器",
        ["code-demo.editor.description"] = "来自 NE.Standard.UI.CodeInput 的字段。Tab 缩进，Enter 保持缩进，Ctrl+F 查找，Ctrl+H 替换，Ctrl+U/Ctrl+Shift+U 转换大小写，Ctrl+Space 打开补全（一个 JSON 文件在每种语言中添加几个 .NET 名称）。",
        ["code-demo.editor.line-numbers"] = "行号",
        ["code-demo.editor.wrap-lines"] = "自动换行",
        ["code-demo.editor.read-only"] = "只读",
        ["code-demo.editor.search"] = "搜索",
        ["code-demo.editor.multi-caret"] = "多光标",
        ["code-demo.editor.status-bar"] = "状态栏",
        ["code-demo.editor.completions"] = "自动补全",
        ["code-demo.editor.appearance"] = "外观：{appearance}",
        ["code-demo.editor.reset-sample"] = "重置示例",
        ["code-demo.editor.snippet"] = "代码片段",
        ["code-demo.editor.placeholder"] = "输入一些代码…",
        ["code-demo.editor.status"] = "服务器上：{lines}，{characters}，{encoding}，{ending}。",
        ["code-demo.editor.lines.other"] = "{count} 行",
        ["code-demo.editor.characters.other"] = "{count} 个字符",
        ["code-demo.editor.saved"] = "{time} 已保存 — {status}",

        ["code-demo.appearance.ghost"] = "幽灵",
        ["code-demo.appearance.filled"] = "填充",
        ["code-demo.appearance.tonal"] = "色调",
        ["code-demo.appearance.outline"] = "描边",
        ["code-demo.appearance.underline"] = "下划线",

        ["code-demo.markdown.title"] = "Markdown",
        ["code-demo.markdown.description"] = "一个 Markdown 代码字段和一个绑定到同一文本的 MarkdownDisplay；两者互不知晓。将图片粘贴或拖放到文本中：它会上传，页面会回复保存它的地址。用鼠标选中文字：上方的格式栏可将其设为粗体、斜体、删除线、代码或链接，或把所在行设为标题或列表，再按一次即可取消；Ctrl+B、Ctrl+I 和 Ctrl+K 效果相同，Alt+F10 可用键盘进入格式栏。",
        ["code-demo.markdown.document"] = "文档",
        ["code-demo.markdown.no-picture"] = "只能添加 PNG、JPEG、GIF 或 WebP 图片。",

        ["code-demo.code"] = "代码",
        ["code-demo.copy"] = "复制"
    };

    public static IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> Build()
        => new Dictionary<string, IReadOnlyDictionary<string, string>>(StringComparer.Ordinal)
        {
            ["en"] = English,
            ["zh-Hans"] = Chinese
        };
}
