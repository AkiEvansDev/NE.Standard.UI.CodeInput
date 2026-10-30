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
        List<OptionItem> options = new(named.Count);

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
    /// Words come from <see cref="CompletionsSource"/>, script registrations, the language's keywords and the document; the field
    /// ships none of its own.
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
