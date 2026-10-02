using System;
using NE.Standard.UI.Abstractions.Effects;

namespace NE.Standard.UI.CodeInput;

/// <summary>
/// The answer to a code field's <see cref="CodeInputEvents.PictureUpload"/>: the address the application kept the picture at, which
/// takes the place of the placeholder the upload left in the text, as <c>![name](address)</c>.
/// </summary>
/// <remarks>
/// The upload's selection names the placeholder, wherever the reader's edits have moved it meanwhile; one the reader took out is not
/// put back. A <c>data:</c> address is refused: the picture is the application's to keep, and the text names where it is.
/// </remarks>
public sealed class InsertPictureEffect : ClientEffect
{
    /// <summary>The kind this package's picture effect travels under.</summary>
    public const string EffectKind = "codeinput.insert-picture";

    /// <summary>
    /// Puts the picture kept at <paramref name="address"/> where the upload <paramref name="selection"/> left its placeholder.
    /// </summary>
    public InsertPictureEffect(string selection, string address)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(selection);
        ArgumentException.ThrowIfNullOrWhiteSpace(address);

        if (address.TrimStart().StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("A picture's address names where the application keeps it; a data: address would put the picture itself into the text.", nameof(address));

        Selection = selection;
        Address = address.Trim();
    }

    /// <inheritdoc/>
    public override string Kind => EffectKind;

    /// <summary>
    /// Gets the upload the picture arrived in, as <see cref="CodeInputArguments.Selection"/> handed it to the command.
    /// </summary>
    public string Selection { get; }

    /// <summary>
    /// Gets the address the picture is shown from.
    /// </summary>
    public string Address { get; }
}
