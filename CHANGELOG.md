# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `codeinput/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.CodeInput/releases.

## 1.9.0

- The code input's placeholder takes the fields' placeholder ink, `--ui-text-placeholder`: in the muted ink it read as a value.
- **Breaking:** a Markdown display draws a picture only from a `data:image` address, the framework's content route
  (`/_ne/content/`) on the page's own site, or under a source added with `MarkdownDisplayComponent.AddImageSource` — an origin,
  an address with a path or a path of this site; from anywhere else it shows the picture's words. A picture is fetched as the
  reader, so a document another user wrote could call any address — a tracker, or a route of this site. An application whose
  pictures come from anywhere else — a CDN, a route of its own, an `IUIContentAddressResolver` of its own — adds that address
  with `AddImageSource`.
