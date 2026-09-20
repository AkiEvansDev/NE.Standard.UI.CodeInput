using NE.Standard.UI.Controllers;
using NE.Standard.UI.Primitives.Annotations;

namespace DemoApp.CodeInput;

/// <summary>
/// The document the Markdown page edits and shows.
/// </summary>
internal sealed partial class MarkdownController : UIControllerBase
{
    [RecursiveMember]
    public partial string Document { get; set; } = Sample;

    /// <summary>Every construction the display renders, so one look shows them all.</summary>
    public const string Sample = """
        # NE.Standard.UI.CodeInput

        A **code field** and a *Markdown display*, in one package. The display renders `CommonMark` with GitHub's
        additions: tables, task lists, ~~strikethrough~~ and bare links such as https://github.com/AkiEvansDev.

        ## Lists

        1. Install the packages
        2. Register the renderers
           - `AddStandardRenderers()`
           - `AddCodeInput()`
        3. Place the components

        - [x] Highlighting for CSS, LESS and Markdown
        - [x] A display of its own
        - [ ] Something still to do

        ## Code

        ```csharp
        new MarkdownDisplayComponent()
            .BindText(nameof(Controller.Readme));
        ```

        ```less
        @accent: #4f8cff;

        .button:hover {
          background: fade(@accent, 85%);
        }
        ```

        ## Quotes and tables

        > A document is shown as it was written: <b>raw HTML</b> stays text,
        > and a [javascript: link](javascript:alert(1)) is only its words.

        | Language | Id | Fence |
        |:---------|:--:|------:|
        | C# | `csharp` | `cs` |
        | Markdown | `markdown` | `md` |

        ---

        See the [README][readme] for the rest.

        [readme]: https://github.com/AkiEvansDev/NE.Standard "The repository"
        """;
}
