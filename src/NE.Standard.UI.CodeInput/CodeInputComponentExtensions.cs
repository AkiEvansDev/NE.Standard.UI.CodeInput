using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Interaction;
using NE.Standard.UI.Authoring.Components;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The events a code field raises beyond an input's own.
/// </summary>
public static class CodeInputEvents
{
    /// <summary>Ctrl+S in the field: the value is committed first, then this is raised.</summary>
    public const string Save = "save";
}

public static class CodeInputComponentExtensions
{
    /// <summary>
    /// Runs <paramref name="command"/> on Ctrl+S, after the value has reached the server.
    /// </summary>
    public static T OnSave<T>(this T input, string command)
        where T : CodeInputComponent<T>, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(input);
        return input.On(CodeInputEvents.Save, command);
    }

    /// <inheritdoc cref="OnSave{T}(T, string)"/>
    public static T OnSave<T>(this T input, string command, params KeyValuePair<string, UIActionArgument>[] arguments)
        where T : CodeInputComponent<T>, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(input);
        return input.On(CodeInputEvents.Save, command, arguments);
    }
}
