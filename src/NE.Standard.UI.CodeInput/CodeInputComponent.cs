using System;
using System.Collections.Generic;
using System.Globalization;
using NE.Standard.UI.Abstractions.Binding.Properties;
using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.BuiltIns;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.BuiltIns.Actions;
using NE.Standard.UI.Components.BuiltIns.Inputs;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Components.Foundation.Inputs;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Primitives.Binding;
using NE.Standard.UI.Primitives.Constants;
using NE.Standard.UI.Primitives.Styling;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// A code editor: a monospaced multi-line field with syntax highlighting, line numbers, and find and replace in the browser.
/// </summary>
/// <remarks>
/// Its <c>Accept</c> and <c>MaxFileSize</c> weigh the pictures a paste or a drop takes — unset, any picture — and only a field with an
/// <c>OnImageUpload</c> command takes one.
/// </remarks>
[UIComponentPropertyBlock(typeof(IBorderedComponent))]
[UIComponentPropertyBlock(typeof(IFieldInputComponent))]
[UIComponentPropertyBlock(typeof(IPlaceholderInputComponent))]
[UIComponentPropertyBlock(typeof(IDebounceInputComponent))]
[UIComponentPropertyBlock(typeof(IFileAcceptComponent))]
[UIComponentPropertyBlock(typeof(ITextLengthComponent))]
[UIComponentPropertyDefault(nameof(IFieldInputComponent.Appearance), nameof(DefaultAppearance))]
public abstract partial class CodeInputComponent<T>(string? id = null) : InputComponentBase<T, string?>(id), IBorderedComponent, IFieldInputComponent, IPlaceholderInputComponent, IRegionContainerComponent, IDebounceInputComponent, IFileAcceptComponent, ITextLengthComponent, IFormSubmittingComponent, ICaretFieldComponent, IClientWriteCheckComponent
    where T : CodeInputComponent<T>, IUIComponentDefinition
{
    // An editor is read, not filled in: no box, focused or under the pointer (the stylesheet's part).
    private const UIInputAppearance DefaultAppearance = UIInputAppearance.Ghost;

    private readonly Dictionary<string, IVisualComponent> _regions = CreateParts();
    private readonly List<UIMarkdownMarkStyle> _markStyles = [];
    private readonly List<UIMarkdownSpanStyle> _spanStyles = [];
    private readonly List<UICodeCompletion> _completionItems = [];
    private readonly List<string> _completionTriggers = [];

    /// <summary>
    /// Gets the framework's own components the field shows — the find panel's fields, buttons and switches, the status bar's pickers —
    /// by the names <see cref="UICodeInputRegions"/> gives them.
    /// </summary>
    public IReadOnlyDictionary<string, IVisualComponent> Regions => _regions;

    /// <inheritdoc/>
    public bool HasRegions => true;

    private static Dictionary<string, IVisualComponent> CreateParts()
    {
        List<OptionItem> tabSizes = [];

        for (var size = 1; size <= UICodeInputStrings.MaxTabSize; size++)
            tabSizes.Add(Option(size.ToString(CultureInfo.InvariantCulture), UICodeInputStrings.Spaces(size)));

        return new Dictionary<string, IVisualComponent>(StringComparer.Ordinal)
        {
            [UICodeInputRegions.TabSize] = StatusPicker(UICodeInputStrings.Indentation, tabSizes),
            [UICodeInputRegions.Encoding] = StatusPicker(UICodeInputStrings.Encoding, Options(UICodeEncodings.All)),
            [UICodeInputRegions.LineEnding] = LineEndingPicker(),
            [UICodeInputRegions.Language] = StatusPicker(UICodeInputStrings.Language, Options(UICodeLanguages.All)),
            [UICodeInputRegions.Find] = SearchField(UICodeInputStrings.Find),
            [UICodeInputRegions.Replace] = SearchField(UICodeInputStrings.Replace),
            [UICodeInputRegions.ToggleReplace] = SearchButton(UIGlyphs.ChevronRight, UICodeInputStrings.ToggleReplace),
            [UICodeInputRegions.Previous] = SearchButton(UIGlyphs.ChevronLeft, UICodeInputStrings.Previous),
            [UICodeInputRegions.Next] = SearchButton(UIGlyphs.ChevronRight, UICodeInputStrings.Next),
            [UICodeInputRegions.Close] = SearchButton(UIGlyphs.Close, UICodeInputStrings.Close),
            [UICodeInputRegions.ReplaceOne] = SearchButton(UIGlyphs.Replace, UICodeInputStrings.ReplaceOne),
            [UICodeInputRegions.ReplaceAll] = SearchButton(UIGlyphs.ReplaceAll, UICodeInputStrings.ReplaceAll),
            [UICodeInputRegions.MatchCase] = SearchSwitch("Aa", UICodeInputStrings.MatchCase),
            [UICodeInputRegions.WholeWord] = SearchSwitch("ab", UICodeInputStrings.WholeWord),
            [UICodeInputRegions.Regex] = SearchSwitch(".*", UICodeInputStrings.Regex)
        };
    }

    private static OptionItem Option(string id, string title, bool content = false)
        => new() { Id = id, Title = title, IsContent = content };

    // A listed name (`UTF-8`, `C#`) is content, prefixes or not; only the package's own words are looked up.
    private static List<OptionItem> Options(IReadOnlyList<KeyValuePair<string, string>> named)
    {
        List<OptionItem> options = [with(named.Count)];

        foreach (KeyValuePair<string, string> entry in named)
            options.Add(Option(entry.Key, entry.Value, content: !UICodeInputStrings.IsWord(entry.Value)));

        return options;
    }

    // `LF` and `CRLF` are names, and so is the placeholder the engine writes with the ending the text came with.
    private static SelectComponent LineEndingPicker()
        => StatusPicker(UICodeInputStrings.LineEnding, [Option(UICodeLineEndings.Lf, "LF", content: true), Option(UICodeLineEndings.CrLf, "CRLF", content: true)])
            .AsContent(IPlaceholderInputComponent.PlaceholderProperty);

    // Sized to its word, not a field, so it sits inline in the status bar; the popup opens from the right edge since bar items are right-aligned.
    // A combobox takes no name from its tooltip: the tooltip's word is its name to a screen reader too, as a search switch's.
    private static SelectComponent StatusPicker(string tooltip, IEnumerable<OptionItem> options)
        => new SelectComponent()
            .SetAppearance(UIInputAppearance.Ghost)
            .SetSize(UISize.Small)
            .SetShowChevron(false)
            .SetPopupPlacement(UIPopupPlacement.TopEnd)
            .SetMinWidth(UILayoutLength.Absolute(0))
            .SetOptions(options)
            .SetTooltip(tooltip)
            .SetAccessibleName(tooltip);

    // Filled: the find panel frames its fields, with no extra rule under them.
    private static TextInputComponent SearchField(string placeholder)
        => new TextInputComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Filled).SetPlaceholder(placeholder);

    private static ButtonComponent SearchButton(string icon, string tooltip)
        => new ButtonComponent()
            .SetVariant(UIButtonVariant.Ghost)
            .SetSize(UISize.Small)
            .SetIcon(icon)
            .SetTooltip(tooltip);

    // Its mark ("Aa", ".*") is content; the tooltip's word is its name to a screen reader too.
    private static ButtonComponent SearchSwitch(string title, string tooltip)
        => new ButtonComponent()
            .SetVariant(UIButtonVariant.Ghost)
            .SetSize(UISize.Small)
            .SetTitle(title)
            .AsContent(ITextBaseComponent.TitleProperty)
            .SetTooltip(tooltip)
            .SetAccessibleName(tooltip)
            .SetPressed(false);

    /// <summary>
    /// Gets or sets the highlighting language, by id — one of <see cref="UICodeLanguages"/> or a registered package id. Two-way: the
    /// status bar picker writes it back.
    /// </summary>
    [UIComponentProperty(BindingCapabilities = UIBindingCapabilities.SourceToTarget | UIBindingCapabilities.TargetToSource, DefaultBindingMode = UIBindingMode.TwoWay, DefaultValue = UICodeLanguages.PlainText)]
    public string? Language { get; set; }

    /// <summary>
    /// Gets or sets whether a line number stands beside every line.
    /// </summary>
    [UIComponentProperty(DefaultValue = true)]
    public bool? LineNumbers { get; set; }

    /// <summary>
    /// Gets or sets whether a long line wraps at the field's edge instead of scrolling sideways.
    /// </summary>
    [UIComponentProperty(DefaultValue = false)]
    public bool? WrapLines { get; set; }

    /// <summary>
    /// Gets or sets whether the field offers find and replace (Ctrl+F, Ctrl+H).
    /// </summary>
    [UIComponentProperty(DefaultValue = true)]
    public bool? Search { get; set; }

    /// <summary>
    /// Gets or sets whether the field takes more than one caret; the keys are the package README's, under "Several carets".
    /// </summary>
    [UIComponentProperty(DefaultValue = true)]
    public bool? MultiCaret { get; set; }

    /// <summary>
    /// Gets or sets whether the field offers completions (Ctrl+Space, or while typing).
    /// </summary>
    /// <remarks>
    /// Words come from <see cref="CompletionItems"/>, <see cref="CompletionsSource"/>, script registrations, the language's keywords
    /// and the document; the field ships none of its own.
    /// </remarks>
    [UIComponentProperty(DefaultValue = true)]
    public bool? Completions { get; set; }

    /// <summary>
    /// Gets or sets the URL of a JSON file listing the completion items and their trigger characters, loaded once and cached for the
    /// page. See the package README for the JSON shape.
    /// </summary>
    [UIComponentProperty(DefaultValue = null)]
    public string? CompletionsSource { get; set; }

    /// <summary>
    /// Gets the inline completion items offered by the field, added by <see cref="AddCompletion(UICodeCompletion)"/> or
    /// <see cref="SetCompletionItems"/>.
    /// </summary>
    /// <remarks>Render-time only: the items are sent with the field and merged with <see cref="CompletionsSource"/> on the client.</remarks>
    [UIComponentProperty(IsBindable = false, GenerateSetter = false, DefaultValue = null)]
    public IReadOnlyList<UICodeCompletion> CompletionItems => _completionItems;

    /// <summary>
    /// Gets the characters or prefixes (such as <c>"."</c> or <c>"{{"</c>) that open the completion list as soon as they are typed,
    /// set by <see cref="SetCompletionTriggers(IEnumerable{string})"/>.
    /// </summary>
    /// <remarks>Render-time only, as <see cref="CompletionItems"/>.</remarks>
    [UIComponentProperty(IsBindable = false, GenerateSetter = false, DefaultValue = null)]
    public IReadOnlyList<string> CompletionTriggers => _completionTriggers;

    /// <summary>
    /// Gets the styles Markdown's own runs are drawn in when the field highlights Markdown, set by <see cref="SetMarkStyle"/>.
    /// </summary>
    /// <remarks>Render-time only: the styles are how the field is built.</remarks>
    [UIComponentProperty(IsBindable = false, GenerateSetter = false, DefaultValue = null)]
    public IReadOnlyList<UIMarkdownMarkStyle> MarkStyles => _markStyles;

    /// <summary>
    /// Gets the author's own runs and their styles, added by <see cref="AddSpanStyle(string, string?, UIMarkdownTextStyle)"/> or
    /// <see cref="AddTokenStyle"/>.
    /// </summary>
    /// <remarks>Render-time only, as <see cref="MarkStyles"/>.</remarks>
    [UIComponentProperty(IsBindable = false, GenerateSetter = false, DefaultValue = null)]
    public IReadOnlyList<UIMarkdownSpanStyle> SpanStyles => _spanStyles;

    /// <summary>
    /// Gets or sets how many spaces a tab stop is, and what the Tab key inserts. Two-way: the status bar's picker writes the choice back.
    /// </summary>
    [UIComponentProperty(BindingCapabilities = UIBindingCapabilities.SourceToTarget | UIBindingCapabilities.TargetToSource, DefaultBindingMode = UIBindingMode.TwoWay, DefaultValue = 4, GenerateSetter = false)]
    public int? TabSize { get; set; }

    /// <summary>
    /// Gets or sets whether the status bar is drawn, showing the caret position, tab size, encoding, line ending and language, each
    /// a picker where there is a choice.
    /// </summary>
    [UIComponentProperty(DefaultValue = true)]
    public bool? StatusBar { get; set; }

    /// <summary>
    /// Gets or sets whether a Markdown field offers its format bar — bold, italic, strikethrough, code, a link, a heading, a list —
    /// over a selection the mouse makes, and the keys that do the same (Ctrl+B, Ctrl+I, Ctrl+K, Alt+F10 to the bar).
    /// </summary>
    /// <remarks>Only a Markdown field that takes edits has one: another language, a read-only or a disabled field never shows it.</remarks>
    [UIComponentProperty(DefaultValue = true)]
    public bool? FormatBar { get; set; }

    /// <summary>
    /// Gets or sets the encoding the application writes the text out as — one of <see cref="UICodeEncodings"/>.
    /// </summary>
    /// <remarks>The field only holds text: the browser ignores this value, and the status bar offers the choice.</remarks>
    [UIComponentProperty(BindingCapabilities = UIBindingCapabilities.SourceToTarget | UIBindingCapabilities.TargetToSource, DefaultBindingMode = UIBindingMode.TwoWay, DefaultValue = UICodeEncodings.Utf8)]
    public string? Encoding { get; set; }

    /// <summary>
    /// Gets or sets the line break the value is written with — <see cref="UICodeLineEndings"/>. Unset, the field keeps the value's
    /// own line break; a choice converts the text on the next commit.
    /// </summary>
    [UIComponentProperty(BindingCapabilities = UIBindingCapabilities.SourceToTarget | UIBindingCapabilities.TargetToSource, DefaultBindingMode = UIBindingMode.TwoWay, DefaultValue = null)]
    public string? LineEnding { get; set; }

    /// <summary>
    /// Gets or sets the number of visible text rows the field starts at.
    /// </summary>
    [UIComponentProperty(DefaultValue = 12, GenerateSetter = false)]
    public int? Rows { get; set; }

    /// <inheritdoc/>
    /// <remarks>
    /// What the status bar offers: a tab stop of one to <see cref="UICodeInputStrings.MaxTabSize"/> spaces, a listed encoding and
    /// language, LF or CRLF (or none, the value's own). Render-time only.
    /// </remarks>
    [UIComponentProperty(Contract = typeof(IClientWriteCheckComponent), IsBindable = false, GenerateSetter = false, DefaultValue = null)]
    public UIClientWriteCheck? ClientWriteCheck => CodeInputWriteCheck.Instance;

    /// <summary>
    /// Sets how many spaces a tab stop is, from one to <see cref="UICodeInputStrings.MaxTabSize"/>.
    /// </summary>
    public T SetTabSize(int tabSize)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(tabSize, 1);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(tabSize, UICodeInputStrings.MaxTabSize);

        TabSize = tabSize;
        return Self;
    }

    /// <summary>
    /// Sets the number of visible text rows the field starts at.
    /// </summary>
    public T SetRows(int rows)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(rows);

        Rows = rows;
        return Self;
    }

    /// <summary>
    /// Wraps long lines at the field's edge.
    /// </summary>
    public T SetWrapLines()
        => SetWrapLines(true);

    /// <summary>
    /// Draws one of Markdown's own runs — <c>**strong**</c>, <c>*emphasis*</c>, … — in a style; a mark styled again takes the new one.
    /// </summary>
    public T SetMarkStyle(UIMarkdownMark mark, UIMarkdownTextStyle style)
    {
        ArgumentNullException.ThrowIfNull(style);

        if (!Enum.IsDefined(mark))
            throw new ArgumentOutOfRangeException(nameof(mark), mark, "Not a run Markdown marks.");

        style.Validate();
        _ = _markStyles.RemoveAll(existing => existing.Mark == mark);
        _markStyles.Add(new UIMarkdownMarkStyle { Mark = mark, Style = style });
        return Self;
    }

    /// <summary>
    /// Draws the words from <paramref name="open"/> to the next <paramref name="close"/> on a line in a style, the marks included —
    /// <c>AddSpanStyle("\"", "\"", style)</c> for quoted speech, or an empty <paramref name="close"/> for a standalone token.
    /// An opening mark with a closing mark that is never reached on the line styles nothing.
    /// </summary>
    public T AddSpanStyle(string open, string? close, UIMarkdownTextStyle style)
        => AddSpanStyle(new UIMarkdownSpanStyle { Open = open, Close = close ?? string.Empty, Style = style });

    /// <summary>
    /// Adds an author's own run as it stands; one opening mark opens one run only.
    /// </summary>
    public T AddSpanStyle(UIMarkdownSpanStyle span)
    {
        ArgumentNullException.ThrowIfNull(span);
        ArgumentException.ThrowIfNullOrWhiteSpace(span.Open);
        ArgumentNullException.ThrowIfNull(span.Close);

        if (span.Close.Length > 0 && string.IsNullOrWhiteSpace(span.Close))
            throw new ArgumentException("A closing mark cannot be whitespace.", nameof(span));

        ArgumentNullException.ThrowIfNull(span.Style);

        span.Style.Validate();

        for (var i = 0; i < _spanStyles.Count; i++)
        {
            if (string.Equals(_spanStyles[i].Open, span.Open, StringComparison.Ordinal))
                throw new InvalidOperationException($"Code input '{Id}' already has a run opened by '{span.Open}'.");
        }

        _spanStyles.Add(span);
        return Self;
    }

    /// <summary>
    /// Draws every occurrence of <paramref name="literal"/> outside code in <paramref name="style"/> — a standalone marker such as
    /// <c>&lt;START&gt;</c>.
    /// </summary>
    public T AddTokenStyle(string literal, UIMarkdownTextStyle style)
        => AddSpanStyle(new UIMarkdownSpanStyle { Open = literal, Close = string.Empty, Style = style });

    /// <summary>
    /// Adds an inline completion item offered by the field.
    /// </summary>
    public T AddCompletion(string label, string? insertText = null, string? detail = null, string? kind = null)
        => AddCompletion(new UICodeCompletion(label, insertText, detail, kind));

    /// <summary>
    /// Adds an inline completion item offered by the field.
    /// </summary>
    public T AddCompletion(UICodeCompletion completion)
    {
        ArgumentNullException.ThrowIfNull(completion);
        ArgumentException.ThrowIfNullOrWhiteSpace(completion.Label);

        _completionItems.Add(completion);
        return Self;
    }

    /// <summary>
    /// Replaces the field's inline completion items with <paramref name="items"/>.
    /// </summary>
    public T SetCompletionItems(IEnumerable<UICodeCompletion> items)
    {
        ArgumentNullException.ThrowIfNull(items);

        _completionItems.Clear();

        foreach (UICodeCompletion item in items)
            _ = AddCompletion(item);

        return Self;
    }

    /// <summary>
    /// Sets the characters or prefixes (such as <c>"."</c> or <c>"{{"</c>) that open the completion list as soon as they are typed.
    /// </summary>
    public T SetCompletionTriggers(params string[] triggers)
        => SetCompletionTriggers((IEnumerable<string>)triggers);

    /// <summary>
    /// Sets the characters or prefixes (such as <c>"."</c> or <c>"{{"</c>) that open the completion list as soon as they are typed.
    /// </summary>
    public T SetCompletionTriggers(IEnumerable<string> triggers)
    {
        ArgumentNullException.ThrowIfNull(triggers);

        _completionTriggers.Clear();

        foreach (var trigger in triggers)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(trigger);

            if (!_completionTriggers.Contains(trigger))
                _completionTriggers.Add(trigger);
        }

        return Self;
    }

    /// <summary>Its save submits its form, so an <c>OnSubmit</c> value goes before the command (<c>code-input.ts</c> registers it so).</summary>
    public bool SubmitsForm(string eventName)
        => eventName == CodeInputEvents.Save;

    /// <summary>A multi-line field keeps its caption on top whatever <c>TitlePlacement</c> asks, as its renderer draws it.</summary>
    public override UISize? CaptionRowBox(UIResponsiveTier tier)
        => InputCaptionRow.Box(this, tier, honoursInside: false);
}

/// <summary>
/// A code editor: a monospaced multi-line field with syntax highlighting, line numbers, and find and replace in the browser.
/// </summary>
public sealed class CodeInputComponent(string? id = null) : CodeInputComponent<CodeInputComponent>(id), IUIComponentDefinition
{
    /// <inheritdoc/>
    public static string ComponentTypeKey => "codeinput.input.code";
}

/// <summary>The status bar's offer, which the page's writes to a code field's settings are held to.</summary>
internal sealed class CodeInputWriteCheck : UIClientWriteCheck
{
    public static CodeInputWriteCheck Instance { get; } = new();

    /// <inheritdoc/>
    public override bool Accepts(UIProperty property, object? value)
    {
        if (property == CodeInputComponent.TabSizeProperty)
            return value is int and >= 1 and <= UICodeInputStrings.MaxTabSize;

        if (property == CodeInputComponent.EncodingProperty)
            return value is string encoding && IsListed(UICodeEncodings.All, encoding);

        // Unset is a line ending's own choice: the value keeps the line break it came with.
        if (property == CodeInputComponent.LineEndingProperty)
            return value is null or UICodeLineEndings.Lf or UICodeLineEndings.CrLf;

        // Every language the registry lists, shipped or registered, as the status bar lists them.
        if (property == CodeInputComponent.LanguageProperty)
            return value is string language && IsListed(UICodeLanguages.All, language);

        return true;
    }

    private static bool IsListed(IReadOnlyList<KeyValuePair<string, string>> listed, string id)
    {
        foreach (KeyValuePair<string, string> entry in listed)
        {
            if (string.Equals(entry.Key, id, StringComparison.Ordinal))
                return true;
        }

        return false;
    }
}
