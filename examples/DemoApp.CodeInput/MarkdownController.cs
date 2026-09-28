namespace DemoApp.CodeInput;

/// <summary>
/// The document the Markdown page edits and shows.
/// </summary>
internal sealed partial class MarkdownController : UIControllerBase
{
    [RecursiveMember]
    public partial string Document { get; set; } = Sample;

    /// <summary>An incident report that uses every construction the display renders, so one look shows them all.</summary>
    public const string Sample = """
        # Incident report: slow API in Europe West

        **Resolved** at 09:47 UTC. From 09:12 the two *API servers* in Europe West answered slowly; the status page at
        https://status.orvane.example moved from ~~investigating~~ to monitoring by 09:30.

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
