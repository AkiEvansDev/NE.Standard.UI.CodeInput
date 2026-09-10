using System;
using NE.Standard.UI.Authoring.BuiltIns;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.Foundation.Inputs;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Primitives.Binding;
using NE.Standard.UI.Primitives.Styling;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// A code editor: a monospaced multi-line field with syntax highlighting, line numbers, and find and replace in the browser.
/// </summary>
public abstract partial class CodeInputComponent<T> : FieldInputComponentBase<T, string?>, IPlaceholderInputComponent
    where T : CodeInputComponent<T>, IUIComponentDefinition
{
    protected CodeInputComponent(string? id = null) : base(id)
    {
        // An editor is read, not filled in: no box until it is focused, and no lift under the pointer either (the stylesheet's part).
        Appearance = UIInputAppearance.Ghost;
    }

    /// <inheritdoc/>
    [Translatable]
    [UIComponentProperty(Contract = typeof(IPlaceholderInputComponent), DefaultValue = null)]
    public string? Placeholder { get; set; }

    /// <summary>
    /// Gets or sets the language the text is highlighted as, by id — one of <see cref="UICodeLanguages"/>, or one a package registered.
    /// Two-way: the status bar's language picker writes the choice back.
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
    /// Gets or sets how many spaces a tab stop is, and what the Tab key inserts. Two-way: the status bar's picker writes the choice back.
    /// </summary>
    [UIComponentProperty(
        BindingCapabilities = UIBindingCapabilities.SourceToTarget | UIBindingCapabilities.TargetToSource,
        DefaultBindingMode = UIBindingMode.TwoWay,
        DefaultValue = 4,
        GenerateSetter = false)]
    public int? TabSize { get; set; }

    /// <summary>
    /// Gets or sets whether the status bar under the text is drawn: the caret's line and column, the tab size, the encoding, the line
    /// ending and the language, each a picker where there is a choice.
    /// </summary>
    [UIComponentProperty(DefaultValue = true)]
    public bool? StatusBar { get; set; }

    /// <summary>
    /// Gets or sets the encoding the application writes the text out as — one of <see cref="UICodeEncodings"/>. The field holds text
    /// and the browser reads none of this; the status bar offers the choice and the controller receives it.
    /// </summary>
    [UIComponentProperty(
        BindingCapabilities = UIBindingCapabilities.SourceToTarget | UIBindingCapabilities.TargetToSource,
        DefaultBindingMode = UIBindingMode.TwoWay,
        DefaultValue = UICodeEncodings.Utf8)]
    public string? Encoding { get; set; }

    /// <summary>
    /// Gets or sets the line break the value is written with — <see cref="UICodeLineEndings"/>. Unset, the field keeps whatever the
    /// value came with, which is what the status bar shows; a choice converts the text on the next commit.
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
