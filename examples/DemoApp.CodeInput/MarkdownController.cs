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
    [RecursiveMember]
    public partial string Document { get; set; } = Sample;

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

        **Resolved** at 09:47 UTC. From 09:12 the two *API servers* in Europe West answered slowly; the status page at
        https://status.orvane.example moved from ~~investigating~~ to monitoring by 09:30.

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

        ## Notes and figures

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
}
