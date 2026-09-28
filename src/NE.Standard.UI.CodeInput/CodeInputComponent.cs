using System;
using System.Collections.Generic;
using System.Globalization;
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
public abstract partial class CodeInputComponent<T> : FieldInputComponentBase<T, string?>, IPlaceholderInputComponent, IRegionContainerComponent
    where T : CodeInputComponent<T>, IUIComponentDefinition
{
    private readonly Dictionary<string, IVisualComponent> _regions;

    protected CodeInputComponent(string? id = null) : base(id)
    {
        // An editor is read, not filled in: no box until it is focused, and no lift under the pointer either (the stylesheet's part).
        Appearance = UIInputAppearance.Ghost;

        _regions = CreateParts();
    }

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
            [UICodeInputRegions.LineEnding] = StatusPicker(UICodeInputStrings.LineEnding, [Option(UICodeLineEndings.Lf, "LF"), Option(UICodeLineEndings.CrLf, "CRLF")]),
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

    private static OptionItem Option(string id, string title)
        => new() { Id = id, Title = title };

    private static List<OptionItem> Options(IReadOnlyList<KeyValuePair<string, string>> named)
    {
        List<OptionItem> options = new(named.Count);

        foreach (KeyValuePair<string, string> entry in named)
            options.Add(Option(entry.Key, entry.Value));

        return options;
    }

    // Sized to its word, not a field, so it sits inline in the status bar; the popup opens from the right edge since bar items are right-aligned.
    private static SelectComponent StatusPicker(string tooltip, IEnumerable<OptionItem> options)
        => new SelectComponent()
            .SetAppearance(UIInputAppearance.Ghost)
            .SetSize(UIInputSize.Small)
            .SetShowChevron(false)
            .SetPopupPlacement(UIPopupPlacement.TopEnd)
            .SetMinWidth(UILayoutLength.Absolute(0))
            .SetOptions(options)
            .SetTooltip(tooltip);

    private static TextInputComponent SearchField(string placeholder)
        => new TextInputComponent().SetSize(UIInputSize.Small).SetPlaceholder(placeholder);

    private static ButtonComponent SearchButton(string icon, string tooltip)
        => new ButtonComponent()
            .SetType(UIButtonType.Ghost)
            .SetSize(UIButtonSize.Small)
            .SetIcon(icon)
            .SetTooltip(tooltip);

    // Drawn as a mark ("Aa", ".*"), so the words that explain it on hover are its name to a screen reader too.
    private static ButtonComponent SearchSwitch(string title, string tooltip)
        => new ButtonComponent()
            .SetType(UIButtonType.Ghost)
            .SetSize(UIButtonSize.Small)
            .SetTitle(title)
            .SetTooltip(tooltip)
            .SetAccessibleName(tooltip)
            .SetPressed(false);

    /// <inheritdoc/>
    [Translatable]
    [UIComponentProperty(Contract = typeof(IPlaceholderInputComponent), DefaultValue = null)]
    public string? Placeholder { get; set; }

    /// <summary>
    /// Gets or sets the highlighting language, by id — one of <see cref="UICodeLanguages"/> or a registered package id. Two-way: the
    /// status bar picker writes it back.
    /// </summary>
    [UIComponentProperty(
        BindingCapabilities = UIBindingCapabilities.SourceToTarget | UIBindingCapabilities.TargetToSource,
        DefaultBindingMode = UIBindingMode.TwoWay,
        DefaultValue = UICodeLanguages.PlainText)]
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
    /// Gets or sets whether the field supports multiple carets — Ctrl+Alt+click adds one, Shift+Alt+. and Shift+Alt+; extend the
    /// selection, and Shift+Alt+arrows select a column.
    /// </summary>
    [UIComponentProperty(DefaultValue = true)]
    public bool? MultiCaret { get; set; }

    /// <summary>
    /// Gets or sets whether the field offers completions (Ctrl+Space, or while typing). Words come from
    /// <see cref="CompletionsSource"/>, script registrations, the language's keywords and the document; the field ships none of its own.
    /// </summary>
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
    [UIComponentProperty(
        BindingCapabilities = UIBindingCapabilities.SourceToTarget | UIBindingCapabilities.TargetToSource,
        DefaultBindingMode = UIBindingMode.TwoWay,
        DefaultValue = 4,
        GenerateSetter = false)]
    public int? TabSize { get; set; }

    /// <summary>
    /// Gets or sets whether the status bar is drawn, showing the caret position, tab size, encoding, line ending and language, each
    /// a picker where there is a choice.
    /// </summary>
    [UIComponentProperty(DefaultValue = true)]
    public bool? StatusBar { get; set; }

    /// <summary>
    /// Gets or sets the encoding the application writes the text out as — one of <see cref="UICodeEncodings"/>. The field only holds
    /// text; the browser ignores this value, and the status bar offers the choice.
    /// </summary>
    [UIComponentProperty(
        BindingCapabilities = UIBindingCapabilities.SourceToTarget | UIBindingCapabilities.TargetToSource,
        DefaultBindingMode = UIBindingMode.TwoWay,
        DefaultValue = UICodeEncodings.Utf8)]
    public string? Encoding { get; set; }

    /// <summary>
    /// Gets or sets the line break the value is written with — <see cref="UICodeLineEndings"/>. Unset, the field keeps the value's
    /// own line break; a choice converts the text on the next commit.
    /// </summary>
    [UIComponentProperty(
        BindingCapabilities = UIBindingCapabilities.SourceToTarget | UIBindingCapabilities.TargetToSource,
        DefaultBindingMode = UIBindingMode.TwoWay,
        DefaultValue = null)]
    public string? LineEnding { get; set; }

    /// <summary>
    /// Gets or sets the number of visible text rows the field starts at.
    /// </summary>
    [UIComponentProperty(DefaultValue = 12, GenerateSetter = false)]
    public int? Rows { get; set; }

    /// <summary>
    /// Gets or sets how long after the viewer stops typing the value is committed, in milliseconds; unset, it
    /// commits on blur.
    /// </summary>
    [UIComponentProperty(DefaultValue = null, GenerateSetter = false)]
    public int? DebounceMilliseconds { get; set; }

    /// <summary>
    /// Sets how many spaces a tab stop is, from one to eight.
    /// </summary>
    public T SetTabSize(int tabSize)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(tabSize, 1);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(tabSize, 8);

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
    /// Commits the value as the viewer types, this long after they pause.
    /// </summary>
    public T SetDebounceMilliseconds(int debounceMilliseconds)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(debounceMilliseconds);

        DebounceMilliseconds = debounceMilliseconds;
        return Self;
    }

    /// <summary>
    /// Wraps long lines at the field's edge.
    /// </summary>
    public T SetWrapLines()
        => SetWrapLines(true);
}

/// <summary>
/// A code editor: a monospaced multi-line field with syntax highlighting, line numbers, and find and replace in the browser.
/// </summary>
public sealed class CodeInputComponent(string? id = null) : CodeInputComponent<CodeInputComponent>(id), IUIComponentDefinition
{
    /// <summary>
    /// Gets the component type key used to identify this component in the compiled graph.
    /// </summary>
    public static string ComponentTypeKey => "codeinput.input.code";
}
