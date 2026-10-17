using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.CodeInput;

/// <summary>
/// The document the Markdown page edits and shows.
/// </summary>
internal sealed partial class MarkdownController : UIControllerBase
{
    // Slow enough to select words in the rendering while the reply is still arriving.
    private static readonly TimeSpan WordDelay = TimeSpan.FromMilliseconds(150);

    [RecursiveMember]
    public partial string Document { get; set; } = Sample;

    /// <summary>Whether a reply may be streamed: off while one is arriving.</summary>
    [RecursiveMember]
    public partial bool CanStream { get; set; } = true;

    /// <summary>Whether the rendering draws a single line break as one, as the handover note is written.</summary>
    [RecursiveMember]
    public partial bool LineBreaks { get; set; } = true;

    /// <summary>
    /// Appends a follow-up to the document a word at a time, as a model's reply arrives: the display redraws the paragraph that grows
    /// and keeps what the reader selected above it. A job the runtime owns, so a page that reloads meanwhile finds it still writing.
    /// </summary>
    [UICommand]
    public void StreamReply()
    {
        if (!CanStream)
            return;

        CanStream = false;
        Context.Runtime.Start(StreamAsync);
    }

    private async Task StreamAsync(CancellationToken cancellationToken)
    {
        try
        {
            foreach (var word in Words(Reply))
            {
                await Task.Delay(WordDelay, cancellationToken).ConfigureAwait(false);
                _ = await Context.Runtime.InvokeAsync(() => Document += word, cancellationToken).ConfigureAwait(false);
            }
        }
        finally
        {
            // A reply that failed half-way may be streamed again; not once the page is going, where no one is left to press it.
            if (!cancellationToken.IsCancellationRequested)
                _ = await Context.Runtime.InvokeAsync(() => CanStream = true, CancellationToken.None).ConfigureAwait(false);
        }
    }

    /// <summary>The text cut after each space and line break, as a model's tokens arrive.</summary>
    private static IEnumerable<string> Words(string text)
    {
        var start = 0;

        for (var i = 0; i < text.Length; i++)
        {
            if (text[i] is not (' ' or '\n'))
                continue;

            yield return text[start..(i + 1)];
            start = i + 1;
        }

        if (start < text.Length)
            yield return text[start..];
    }

    /// <summary>
    /// A picture pasted or dropped into the document has reached the server: kept in the demo's own store, and its address is the
    /// answer that takes the placeholder's place. Where an application keeps it is its own business; the field keeps nothing.
    /// </summary>
    [UICommand]
    public async Task<UICommandResult> AddPictureAsync(string selection, CancellationToken cancellationToken)
    {
        UIUploadSelection chosen = await Context.Uploads.GetSelectionAsync(Context.Handle, selection, cancellationToken).ConfigureAwait(false);

        if (chosen.SingleFile is not UIUploadFile file)
            return UICommandResult.Fail("code-demo.markdown.no-picture");

        UIUploadedFile opened = await Context.Uploads.OpenAsync(Context.Handle, file.FileId, cancellationToken: cancellationToken).ConfigureAwait(false);

        await using (opened.ConfigureAwait(false))
        {
            using MemoryStream bytes = new();

            await opened.Content.CopyToAsync(bytes, cancellationToken).ConfigureAwait(false);

            // The bytes decide what the file is, not its name: anything but PNG, JPEG, GIF or WebP is refused, in the page's words.
            return Context.Services.GetRequiredService<MarkdownPictures>().Keep(bytes.ToArray()) is string address
                ? UICommandResult.Ok([new InsertPictureEffect(selection, address)])
                : UICommandResult.Fail("code-demo.markdown.no-picture");
        }
    }

    /// <summary>An incident report that uses every construction the display renders, so one look shows them all.</summary>
    public const string Sample = """
        # Incident report: slow API in Europe West

        **Resolved** at 09:47 UTC. From 09:12 the two *API servers* in Europe West answered slowly; the status page at https://status.orvane.example moved from ~~investigating~~ to monitoring by 09:30.

        | | |
        |:--|:--|
        | **Duration** | 35 minutes |
        | **Impact** | One request in five slower than 2 s |
        | **Owner** | Platform team |

        ## Timeline

        1. 09:12 — the latency alert fires
        2. 09:18 — the on-call engineer finds
           - `db-eu-west-1` at 98% disk
           - the query cache refusing writes
        3. 09:47 — old backups moved off the disk

        - [x] Move the backups to object storage
        - [x] Alert at 80% disk, not 95%
        - [ ] Add a second database server

        ## What changed

        ```csharp
        new DiskHealthCheck(metrics)
            .WarnAt(0.80);
        ```

        ```less
        @warning: #d97706;

        .status--degraded {
          background: fade(@warning, 85%);
        }
        ```

        ## Handover

        Disk at 61%, the cache writing again.
        Backups go to object storage from tonight.
        Next on call: Mira, from 18:00.

        ## Notes and figures

        The on-call engineer wrote: "the cache refused writes, so the backups went first" — a quote this display draws in a style of its own, as it does **strong** words.

        > A report is shown as it was written: <b>raw HTML</b> stays text,
        > and a [javascript: link](javascript:alert(1)) is only its words.

        | Server | Disk before | Disk after |
        |:-------|:-----------:|-----------:|
        | `db-eu-west-1` | 98% | 61% |
        | `api-eu-west-1` | 44% | 44% |

        ---

        See the [runbook][runbook] for the rest.

        [runbook]: https://docs.orvane.example/runbooks/disk "The disk runbook"
        """;

    /// <summary>The follow-up the stream button writes at the end of the document, a quote and strong words among it.</summary>
    private const string Reply = """


        ## Follow-up

        Asked what to watch next, the on-call engineer answered: "disk first, then the cache, and the backups never on the same volume again". **The second database server** is planned for next week, and the alert at 80% disk has fired once since, on a test volume, as it should.
        """;
}
