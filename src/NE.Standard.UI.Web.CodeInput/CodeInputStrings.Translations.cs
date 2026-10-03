using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using System.Globalization;
using NE.Standard.UI.CodeInput;

namespace NE.Standard.UI.Web.CodeInput;

public sealed partial class CodeInputStrings
{
    /// <inheritdoc/>
    public IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> Translations { get; } = new Dictionary<string, IReadOnlyDictionary<string, string>>(StringComparer.Ordinal)
    {
        ["ru"] = WithSpaces(new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [UICodeInputStrings.Find] = "Найти",
            [UICodeInputStrings.Replace] = "Заменить",
            [UICodeInputStrings.ReplaceOne] = "Заменить",
            [UICodeInputStrings.ReplaceAll] = "Заменить все",
            [UICodeInputStrings.ToggleReplace] = "Показать или скрыть замену",
            [UICodeInputStrings.Previous] = "Предыдущее совпадение",
            [UICodeInputStrings.Next] = "Следующее совпадение",
            [UICodeInputStrings.Close] = "Закрыть",
            [UICodeInputStrings.MatchCase] = "Учитывать регистр",
            [UICodeInputStrings.WholeWord] = "Слово целиком",
            [UICodeInputStrings.Regex] = "Регулярное выражение",
            [UICodeInputStrings.Indentation] = "Отступ",
            [UICodeInputStrings.Encoding] = "Кодировка",
            [UICodeInputStrings.LineEnding] = "Конец строки",
            [UICodeInputStrings.Language] = "Язык",
            [UICodeInputStrings.PlainText] = "Обычный текст",
            [UICodeInputStrings.Utf8Bom] = "UTF-8 с BOM",
            [Matches] = "{current} из {total}",
            [NoMatches] = "Нет совпадений",
            [InvalidPattern] = "Недопустимый шаблон",
            [Position] = "Стр. {line}, стлб. {column}",
            [Suggestions] = "Предложения",
            [PictureUploading] = "Загрузка {name}…",
            [FormatBar] = "Форматирование",
            [FormatBold] = "Полужирный",
            [FormatItalic] = "Курсив",
            [FormatStrikethrough] = "Зачёркнутый",
            [FormatCode] = "Код",
            [FormatLink] = "Ссылка",
            [FormatHeading] = "Заголовок",
            [FormatList] = "Маркированный список",
            [FormatHeadingLevel] = "Заголовок {level}"
        }, "Пробелы: ", ""),
        ["zh-Hans"] = WithSpaces(new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [UICodeInputStrings.Find] = "查找",
            [UICodeInputStrings.Replace] = "替换",
            [UICodeInputStrings.ReplaceOne] = "替换",
            [UICodeInputStrings.ReplaceAll] = "全部替换",
            [UICodeInputStrings.ToggleReplace] = "切换替换",
            [UICodeInputStrings.Previous] = "上一个匹配",
            [UICodeInputStrings.Next] = "下一个匹配",
            [UICodeInputStrings.Close] = "关闭",
            [UICodeInputStrings.MatchCase] = "区分大小写",
            [UICodeInputStrings.WholeWord] = "全字匹配",
            [UICodeInputStrings.Regex] = "正则表达式",
            [UICodeInputStrings.Indentation] = "缩进",
            [UICodeInputStrings.Encoding] = "编码",
            [UICodeInputStrings.LineEnding] = "行尾",
            [UICodeInputStrings.Language] = "语言",
            [UICodeInputStrings.PlainText] = "纯文本",
            [UICodeInputStrings.Utf8Bom] = "UTF-8（带 BOM）",
            [Matches] = "第 {current} 个，共 {total} 个",
            [NoMatches] = "无匹配",
            [InvalidPattern] = "无效的模式",
            [Position] = "行 {line}，列 {column}",
            [Suggestions] = "建议",
            [PictureUploading] = "正在上传 {name}…",
            [FormatBar] = "格式",
            [FormatBold] = "粗体",
            [FormatItalic] = "斜体",
            [FormatStrikethrough] = "删除线",
            [FormatCode] = "代码",
            [FormatLink] = "链接",
            [FormatHeading] = "标题",
            [FormatList] = "项目符号列表",
            [FormatHeadingLevel] = "{level} 级标题"
        }, "", " 个空格")
    }.ToFrozenDictionary(StringComparer.Ordinal);

    /// <summary>A table with its tab stops' words, "Spaces: 4", each written between the language's two halves.</summary>
    private static FrozenDictionary<string, string> WithSpaces(Dictionary<string, string> words, string before, string after)
    {
        for (var size = 1; size <= UICodeInputStrings.MaxTabSize; size++)
            words[UICodeInputStrings.Spaces(size)] = string.Concat(before, size.ToString(CultureInfo.InvariantCulture), after);

        return words.ToFrozenDictionary(StringComparer.Ordinal);
    }
}
