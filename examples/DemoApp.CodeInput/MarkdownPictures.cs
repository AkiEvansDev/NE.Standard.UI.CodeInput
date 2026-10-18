using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;

namespace DemoApp.CodeInput;

/// <summary>
/// The pictures pasted or dropped into the Markdown page, kept in memory and served through the framework's content endpoint. A
/// picture's key is the hash of its bytes, so its address never changes what it shows; the oldest goes once the store is full.
/// </summary>
public sealed class MarkdownPictures(IUIContentAddressResolver addresses) : IUIContentProvider
{
    /// <summary>What every key this store answers starts with.</summary>
    public const string KeyPrefix = "markdown/";

    /// <summary>The largest picture the page takes: the field refuses a larger one before it is sent.</summary>
    public const long MaxBytes = 2 * 1024 * 1024;

    // A demo's memory, shared by every visitor: a few dozen pictures, not a gallery.
    private const int MostPictures = 64;

    private readonly Lock _gate = new();
    private readonly Dictionary<string, Picture> _pictures = new(StringComparer.Ordinal);
    private readonly Queue<string> _order = new();

    /// <summary>
    /// Keeps a picture and answers the address it is shown from, or null for bytes that are no picture this store serves.
    /// </summary>
    public string? Keep(byte[] bytes)
    {
        ArgumentNullException.ThrowIfNull(bytes);

        if (bytes.LongLength > MaxBytes || Sniff(bytes) is not string contentType)
            return null;

        var key = KeyPrefix + Convert.ToHexStringLower(SHA256.HashData(bytes))[..16];

        lock (_gate)
        {
            if (_pictures.TryAdd(key, new Picture(bytes, contentType)))
            {
                _order.Enqueue(key);

                if (_order.Count > MostPictures)
                    _ = _pictures.Remove(_order.Dequeue());
            }
        }

        return addresses.AddressOf(key);
    }

    /// <inheritdoc/>
    public Task<UIContent?> ResolveAsync(UIContentRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        Picture? picture;

        lock (_gate)
            _ = _pictures.TryGetValue(request.Key, out picture);

        return Task.FromResult(picture is null ? null : new UIContent
        {
            Content = new MemoryStream(picture.Bytes, writable: false),
            ContentType = picture.ContentType,
            Immutable = true
        });
    }

    /// <summary>
    /// What a picture is, read off its first bytes (<see cref="UIPictureTypes.Sniff"/>): PNG, JPEG, GIF or WebP, and nothing else — a
    /// BMP is no picture this page keeps.
    /// </summary>
    public static string? Sniff(ReadOnlySpan<byte> bytes)
        => UIPictureTypes.Sniff(bytes) is { } type && type != "image/bmp" ? type : null;

    private sealed record Picture(byte[] Bytes, string ContentType);
}
