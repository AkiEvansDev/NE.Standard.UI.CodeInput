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

    /// <summary>
    /// A picture pasted or dropped into a Markdown field has reached the server: the command reads it by its selection, keeps it
    /// where the application keeps files, and answers with an <see cref="InsertPictureEffect"/>.
    /// </summary>
    public const string PictureUpload = "picture-upload";
}

/// <summary>
/// Argument keys for the code field's own events, read by a command by position.
/// </summary>
public static class CodeInputArguments
{
    /// <summary>The upload a picture landed in, read back with <c>IUIUploadService.GetSelectionAsync</c> and named again by the answer's <see cref="InsertPictureEffect"/>.</summary>
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
    /// Takes pictures pasted or dropped into the field while it holds Markdown: each is uploaded through the framework's own upload
    /// with a placeholder in the text meanwhile, and <paramref name="command"/> runs with its selection and file name (see
    /// <see cref="CodeInputArguments"/>). The application keeps the file and answers with an <see cref="InsertPictureEffect"/>
    /// carrying its address, which takes the placeholder's place; a failed answer takes the placeholder out and says why on the
    /// field's validation line.
    /// </summary>
    /// <remarks>Without it a paste is text alone; <c>Accept</c> and <c>MaxFileSize</c> say which pictures the field takes.</remarks>
    public static T OnPictureUpload<T>(this T input, string command)
        where T : CodeInputComponent<T>, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(input);

        return input.On(
            CodeInputEvents.PictureUpload,
            command,
            CodeInputArguments.Selection("selection"),
            CodeInputArguments.FileName("fileName"));
    }

    /// <inheritdoc cref="OnPictureUpload{T}(T, string)"/>
    public static T OnPictureUpload<T>(this T input, string command, params KeyValuePair<string, UIActionArgument>[] arguments)
        where T : CodeInputComponent<T>, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(input);
        return input.On(CodeInputEvents.PictureUpload, command, arguments);
    }
}
