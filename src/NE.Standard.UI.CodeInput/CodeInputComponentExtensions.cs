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
    /// <summary>Ctrl+S in the field: the value is committed first, then this is raised; named apart from any other package's save.</summary>
    public const string Save = "code-save";

    /// <summary>
    /// A picture pasted or dropped into a Markdown field has reached the server: the command reads it by its selection, keeps it
    /// where the application keeps files, and answers with an <see cref="InsertImageEffect"/>.
    /// </summary>
    public const string ImageUpload = "code-image-upload";
}

/// <summary>
/// Argument keys for the code field's own events, read by a command by position.
/// </summary>
public static class CodeInputArguments
{
    /// <summary>The upload a picture landed in, read back with <c>IUIUploadService.GetSelectionAsync</c> and named again by the answer's <see cref="InsertImageEffect"/>.</summary>
    public static KeyValuePair<string, UIActionArgument> Selection(string name)
        => UIAction.ArgEventKey(name, 0);

    /// <summary>The name the picture's file was pasted or dropped under.</summary>
    public static KeyValuePair<string, UIActionArgument> FileName(string name)
        => UIAction.ArgEventKey(name, 1);
}

/// <summary>
/// The code field's own events, bound fluently.
/// </summary>
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

    /// <summary>
    /// Runs <paramref name="command"/> on Ctrl+S with literal argument values — which document a field of several saves — after the
    /// value has reached the server, as with every form.
    /// </summary>
    public static T OnSaveLiteral<T>(this T input, string command, params KeyValuePair<string, object?>[] arguments)
        where T : CodeInputComponent<T>, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(input);
        return input.OnLiteral(CodeInputEvents.Save, command, arguments);
    }

    /// <summary>Registers the command run when an image is pasted or dropped into a Markdown field.</summary>
    /// <remarks>
    /// Each picture uploads with a placeholder in the text while <paramref name="command"/> receives its selection and file name (see
    /// <see cref="CodeInputArguments"/>) and answers with an <see cref="InsertImageEffect"/>; a failed answer removes the placeholder
    /// and sets the validation message. Without it a paste is text alone; <c>Accept</c> and <c>MaxFileSize</c> bound accepted files.
    /// </remarks>
    public static T OnImageUpload<T>(this T input, string command)
        where T : CodeInputComponent<T>, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(input);

        return input.On(CodeInputEvents.ImageUpload, command, UIAction.Offered(CodeInputArguments.Selection("selection")), UIAction.Offered(CodeInputArguments.FileName("fileName")));
    }

    /// <inheritdoc cref="OnImageUpload{T}(T, string)"/>
    public static T OnImageUpload<T>(this T input, string command, params KeyValuePair<string, UIActionArgument>[] arguments)
        where T : CodeInputComponent<T>, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(input);
        return input.On(CodeInputEvents.ImageUpload, command, arguments);
    }
}
