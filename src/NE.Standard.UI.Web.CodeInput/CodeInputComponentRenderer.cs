using System;
using System.Collections.Generic;
using System.Globalization;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.CodeInput;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.CodeInput;

/// <summary>
/// The code field under the same header/field/message shell as the text area: a highlighted layer with a transparent
/// <c>&lt;textarea&gt;</c> laid over it, so the browser's own editing, undo and selection do the work, a find and
/// replace panel the client wires up, and a status bar under the text whose pickers carry the two-way settings.
/// </summary>
public sealed class CodeInputComponentRenderer : TextContentRendererBase
{
    public const string LanguageAttribute = "data-ui-code-language";
    public const string LineNumbersAttribute = "data-ui-code-line-numbers";
    public const string WrapLinesAttribute = "data-ui-code-wrap";
    public const string SearchAttribute = "data-ui-code-search";
    public const string StatusBarAttribute = "data-ui-code-status";
    public const string DetectedLineEndingAttribute = "data-ui-code-eol";
    public const string TabSizeVariable = "--ui-code-tab-size";
    public const string RowsVariable = "--ui-code-rows";
    /// <summary>The value kind the textarea is read by: the chosen line ending put back into the text the browser normalized.</summary>
    public const string ValueKind = "code";

    private static readonly int[] TabSizes = [2, 4, 8];

    public override string ComponentTypeKey => CodeInputComponent.ComponentTypeKey;

    protected override string ClassName => "ui-code-input";

    protected override void RenderComponent(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        RenderTooltip(context, root);

        RenderInputAppearance(context, root);
        RenderEditorSettings(context, root);
        RenderInputHeader(context, root);
        RenderField(context, root);
        RenderValidationMessage(context, root);
    }

    /// <summary>
    /// What the engine and the stylesheet read off the root: the flags and the row count as a variable. The language and the tab
    /// size are the status bar's pickers' — two-way values live on the element that writes them — and reach the root from there.
    /// </summary>
    private static void RenderEditorSettings(WebRenderContext context, IHtmlElementBuilder root)
    {
        RenderFlagAttribute(context, root, CodeInputComponent.LineNumbersProperty, LineNumbersAttribute);
        RenderFlagAttribute(context, root, CodeInputComponent.WrapLinesProperty, WrapLinesAttribute);
        RenderFlagAttribute(context, root, CodeInputComponent.SearchProperty, SearchAttribute);
        RenderFlagAttribute(context, root, CodeInputComponent.StatusBarProperty, StatusBarAttribute);

        // Which line break the value came with, for the status bar to show while nothing was chosen: the browser's field holds every
        // break as LF, so the client cannot tell afterwards.
        _ = root.Attribute(DetectedLineEndingAttribute, DetectLineEnding(context));

        _ = RenderProperty<int?>(context, root, CodeInputComponent.RowsProperty, static (target, value) =>
        {
            if (value is int rows and > 0)
                _ = target.Style(RowsVariable, rows.ToString(CultureInfo.InvariantCulture));
        }, [WebDomOperation.Style(RowsVariable)]);
    }

    /// <summary>The line break the value came with, by looking: the browser normalizes every break to LF, so only the render can tell.</summary>
    private static string DetectLineEnding(WebRenderContext context)
    {
        _ = ResolveRenderValue(context, IInputComponent.ValueProperty, out string? text, out _);

        return text?.Contains("\r\n", StringComparison.Ordinal) == true ? UICodeLineEndings.CrLf : UICodeLineEndings.Lf;
    }

    private void RenderField(WebRenderContext context, IHtmlElementBuilder root)
    {
        _ = root.Element("div", field =>
        {
            _ = field.Class($"{ClassName}__field");
            _ = field.Class(FieldBoxClassName);

            BorderStyleRenderer.RenderBorderStyle(context, field);

            _ = field.Element("div", scroller =>
            {
                _ = scroller.Class($"{ClassName}__scroller");

                _ = scroller.Element("div", content =>
                {
                    _ = content.Class($"{ClassName}__content");

                    // The highlighted text; the client fills it and keeps it in step with the textarea.
                    _ = content.Element("pre", highlight =>
                    {
                        _ = highlight.Class($"{ClassName}__highlight");
                        _ = highlight.Attribute("aria-hidden", "true");
                    });

                    _ = content.Element("textarea", textarea => RenderTextarea(context, textarea));
                });
            });

            RenderSearchPanel(context, field);
            RenderStatusBar(context, root, field);
        });
    }

    /// <summary>
    /// The line under the text: the caret's place, which the engine writes, and four pickers — the tab size, the encoding, the line
    /// ending, the language — each the element its two-way value lives on, so a choice travels the ordinary value path.
    /// </summary>
    private void RenderStatusBar(WebRenderContext context, IHtmlElementBuilder root, IHtmlElementBuilder field)
    {
        _ = field.Element("div", status =>
        {
            _ = status.Class($"{ClassName}__status");

            _ = status.Element("span", position =>
            {
                _ = position.Class($"{ClassName}__status-position");
                _ = position.Attribute("data-ui-code-position");
                _ = position.Text(context.Translate(CodeInputStrings.Position).Replace("{line}", "1", StringComparison.Ordinal).Replace("{column}", "1", StringComparison.Ordinal));
            });

            _ = ResolveRenderValue(context, CodeInputComponent.TabSizeProperty, out int? tabSize, out _);

            var currentTabSize = tabSize is int size and > 0 ? size : 4;

            RenderStatusPicker(context, status, "data-ui-code-tab-size", CodeInputStrings.Indentation, SpacesCaption(context, currentTabSize), select =>
            {
                var current = currentTabSize;
                List<int> sizes = [.. TabSizes];

                if (!sizes.Contains(current))
                    sizes.Add(current);

                sizes.Sort();

                foreach (var stop in sizes)
                    RenderOption(select, stop.ToString(CultureInfo.InvariantCulture), SpacesCaption(context, stop), stop == current);

                // The picker carries the value (its option is marked above); the root's variable is what the stylesheet and the Tab key read.
                _ = RenderProperty<int?>(context, select, CodeInputComponent.TabSizeProperty, (_, value) =>
                {
                    if (value is int chosen and > 0)
                        _ = root.Style(TabSizeVariable, chosen.ToString(CultureInfo.InvariantCulture));
                }, [WebDomOperation.Property("value"), WebDomOperation.Style(TabSizeVariable, target: "root")]);
            });

            _ = ResolveRenderValue(context, CodeInputComponent.EncodingProperty, out string? chosenEncoding, out _);

            var encodingId = string.IsNullOrWhiteSpace(chosenEncoding) ? UICodeEncodings.Utf8 : chosenEncoding;
            var encodingName = encodingId;

            foreach (KeyValuePair<string, string> encoding in UICodeEncodings.All)
            {
                if (string.Equals(encoding.Key, encodingId, StringComparison.OrdinalIgnoreCase))
                    encodingName = encoding.Value;
            }

            RenderStatusPicker(context, status, "data-ui-code-encoding", CodeInputStrings.Encoding, encodingName, select =>
            {
                foreach (KeyValuePair<string, string> encoding in UICodeEncodings.All)
                    RenderOption(select, encoding.Key, encoding.Value, string.Equals(encoding.Key, encodingId, StringComparison.OrdinalIgnoreCase));

                _ = RenderProperty<string?>(context, select, CodeInputComponent.EncodingProperty, static (_, _) => { }, [WebDomOperation.Property("value")]);
            });

            _ = ResolveRenderValue(context, CodeInputComponent.LineEndingProperty, out string? chosenLineEnding, out _);

            var detected = DetectLineEnding(context);
            var lineEndingCaption = string.Equals(string.IsNullOrWhiteSpace(chosenLineEnding) ? detected : chosenLineEnding, UICodeLineEndings.CrLf, StringComparison.OrdinalIgnoreCase) ? "CRLF" : "LF";

            RenderStatusPicker(context, status, "data-ui-code-line-ending", CodeInputStrings.LineEnding, lineEndingCaption, select =>
            {
                // Unset (the empty value, which a null push also lands on) is a hidden option whose word is the ending the text came
                // with — the engine keeps that word current — so the picker is never blank; a choice is one of the two real ones.
                _ = select.Element("option", option =>
                {
                    _ = option.Attribute("value", string.Empty);
                    _ = option.Attribute("hidden");
                    _ = option.Attribute("data-ui-code-eol-detected");

                    if (string.IsNullOrWhiteSpace(chosenLineEnding))
                        _ = option.Attribute("selected");

                    _ = option.Text(detected == UICodeLineEndings.CrLf ? "CRLF" : "LF");
                });

                RenderOption(select, UICodeLineEndings.Lf, "LF", string.Equals(chosenLineEnding, UICodeLineEndings.Lf, StringComparison.OrdinalIgnoreCase));
                RenderOption(select, UICodeLineEndings.CrLf, "CRLF", string.Equals(chosenLineEnding, UICodeLineEndings.CrLf, StringComparison.OrdinalIgnoreCase));

                _ = RenderProperty<string?>(context, select, CodeInputComponent.LineEndingProperty, static (_, _) => { }, [WebDomOperation.Property("value")]);
            });

            _ = ResolveRenderValue(context, CodeInputComponent.LanguageProperty, out string? language, out _);

            var currentLanguage = string.IsNullOrWhiteSpace(language) ? UICodeLanguages.PlainText : language.Trim();

            RenderStatusPicker(context, status, "data-ui-code-language", CodeInputStrings.Language, UICodeLanguages.DisplayName(currentLanguage), select =>
            {
                var current = currentLanguage;
                var listed = false;

                foreach (KeyValuePair<string, string> known in UICodeLanguages.All)
                {
                    var own = string.Equals(known.Key, current, StringComparison.OrdinalIgnoreCase);

                    listed |= own;
                    RenderOption(select, known.Key, known.Value, own);
                }

                // A package's language the page names: listed by its id until the client asks the registry for the rest.
                if (!listed)
                    RenderOption(select, current, current, true);

                // The id as the author wrote it; the client looks it up case-insensitively and falls back to plain text for one it does not know.
                _ = RenderProperty<string?>(context, select, CodeInputComponent.LanguageProperty, (_, value) =>
                    _ = root.Attribute(LanguageAttribute, string.IsNullOrWhiteSpace(value) ? UICodeLanguages.PlainText : value.Trim())
                , [WebDomOperation.Property("value"), WebDomOperation.Attribute(LanguageAttribute, target: "root")]);
            });
        });
    }

    private static string SpacesCaption(WebRenderContext context, int size)
        => context.Translate(CodeInputStrings.Spaces).Replace("{size}", size.ToString(CultureInfo.InvariantCulture), StringComparison.Ordinal);

    /// <summary>
    /// A picker: the hidden select that carries the two-way value and lists the choices, and the button that shows the current one and
    /// opens the engine's own list over it — a native list takes no theme, and read as a stranger in the bar.
    /// </summary>
    private void RenderStatusPicker(WebRenderContext context, IHtmlElementBuilder status, string attribute, string wordKey, string caption, Action<IHtmlElementBuilder> renderOptions)
    {
        _ = status.Element("span", picker =>
        {
            var word = context.Translate(wordKey);

            _ = picker.Class($"{ClassName}__status-picker");

            _ = picker.Element("select", select =>
            {
                _ = select.Attribute(attribute);
                _ = select.Attribute("hidden");
                _ = select.Attribute("aria-hidden", "true");
                _ = select.Attribute("tabindex", "-1");

                renderOptions(select);
            });

            _ = picker.Element("button", button =>
            {
                _ = button.Class($"{ClassName}__status-button");
                _ = button.Attribute("type", "button");
                _ = button.Attribute("title", word);
                _ = button.Attribute("aria-label", word);
                _ = button.Attribute("aria-haspopup", "listbox");
                _ = button.Attribute("aria-expanded", "false");
                _ = button.Text(caption);
            });
        });
    }

    private static void RenderOption(IHtmlElementBuilder select, string value, string caption, bool selected)
        => _ = select.Element("option", option =>
        {
            _ = option.Attribute("value", value);

            if (selected)
                _ = option.Attribute("selected");

            _ = option.Text(caption);
        });

    private void RenderTextarea(WebRenderContext context, IHtmlElementBuilder textarea)
    {
        _ = textarea.Class($"{ClassName}__text");
        // Read by the package's own reader, which puts the chosen line ending back into the text the browser holds as LF.
        _ = textarea.Attribute(WebAttributes.ValueKind, ValueKind);
        _ = textarea.Attribute("spellcheck", "false");
        _ = textarea.Attribute("autocomplete", "off");
        _ = textarea.Attribute("autocapitalize", "off");
        _ = textarea.Attribute("autocorrect", "off");

        // Read by DebouncedCommitEngine on every keystroke, so a bound value is in force at once.
        _ = RenderProperty<int?>(context, textarea, CodeInputComponent.DebounceMillisecondsProperty, static (target, value) =>
        {
            if (value is int milliseconds and >= 0)
                _ = target.Attribute(WebAttributes.InputDebounce, milliseconds.ToString(CultureInfo.InvariantCulture));
        }, [WebDomOperation.Attribute(WebAttributes.InputDebounce)]);

        NativeInputRendererBase.RenderPlaceholder(context, textarea);
        NativeInputRendererBase.RenderFormId(context, textarea);
        NativeInputRendererBase.RenderFieldName(context, textarea);
        NativeInputRendererBase.RenderIsReadOnly(context, textarea);

        _ = RenderProperty<string?>(context, textarea, IInputComponent.ValueProperty, static (target, value) =>
        {
            if (!string.IsNullOrEmpty(value))
                _ = target.Text(value);
        }, [WebDomOperation.Property("value")]);
    }

    /// <summary>The find and replace panel, rendered with its words translated and hidden until the client opens it.</summary>
    private void RenderSearchPanel(WebRenderContext context, IHtmlElementBuilder field)
    {
        _ = field.Element("div", panel =>
        {
            _ = panel.Class($"{ClassName}__search");
            _ = panel.Attribute("hidden");

            _ = panel.Element("div", row =>
            {
                _ = row.Class($"{ClassName}__search-row");

                RenderSearchField(context, row, "data-ui-code-find", CodeInputStrings.Find);
                RenderSearchToggle(context, row, "data-ui-code-match-case", CodeInputStrings.MatchCase, "Aa");
                RenderSearchToggle(context, row, "data-ui-code-whole-word", CodeInputStrings.WholeWord, "ab");
                RenderSearchToggle(context, row, "data-ui-code-regex", CodeInputStrings.Regex, ".*");

                _ = row.Element("span", count =>
                {
                    _ = count.Class($"{ClassName}__search-count");
                    _ = count.Attribute("data-ui-code-count");
                    _ = count.Attribute("aria-live", "polite");
                });

                RenderSearchGlyphButton(context, row, "previous", CodeInputStrings.Previous);
                RenderSearchGlyphButton(context, row, "next", CodeInputStrings.Next);
                RenderSearchGlyphButton(context, row, "close", CodeInputStrings.Close);
            });

            _ = panel.Element("div", row =>
            {
                _ = row.Class($"{ClassName}__search-row");
                _ = row.Class($"{ClassName}__search-row--replace");

                RenderSearchField(context, row, "data-ui-code-replace", CodeInputStrings.Replace);
                RenderSearchAction(context, row, "data-ui-code-replace-one", CodeInputStrings.ReplaceOne);
                RenderSearchAction(context, row, "data-ui-code-replace-all", CodeInputStrings.ReplaceAll);
            });
        });
    }

    private void RenderSearchField(WebRenderContext context, IHtmlElementBuilder row, string attribute, string wordKey)
    {
        _ = row.Element("input", input =>
        {
            var word = context.Translate(wordKey);

            _ = input.Class($"{ClassName}__search-field");
            _ = input.Attribute("type", "text");
            _ = input.Attribute("placeholder", word);
            _ = input.Attribute("aria-label", word);
            _ = input.Attribute("autocomplete", "off");
            _ = input.Attribute("spellcheck", "false");
            _ = input.Attribute(attribute);
        });
    }

    private void RenderSearchToggle(WebRenderContext context, IHtmlElementBuilder row, string attribute, string wordKey, string caption)
    {
        _ = row.Element("button", button =>
        {
            var word = context.Translate(wordKey);

            _ = button.Class($"{ClassName}__search-toggle");
            _ = button.Attribute("type", "button");
            _ = button.Attribute("aria-pressed", "false");
            _ = button.Attribute("title", word);
            _ = button.Attribute("aria-label", word);
            _ = button.Attribute(attribute);
            _ = button.Text(caption);
        });
    }

    private void RenderSearchGlyphButton(WebRenderContext context, IHtmlElementBuilder row, string name, string wordKey)
    {
        _ = row.Element("button", button =>
        {
            var word = context.Translate(wordKey);

            _ = button.Class($"{ClassName}__search-button");
            _ = button.Class($"{ClassName}__search-button--{name}");
            _ = button.Attribute("type", "button");
            _ = button.Attribute("title", word);
            _ = button.Attribute("aria-label", word);
            _ = button.Attribute($"data-ui-code-{name}");
        });
    }

    private void RenderSearchAction(WebRenderContext context, IHtmlElementBuilder row, string attribute, string wordKey)
    {
        _ = row.Element("button", button =>
        {
            _ = button.Class($"{ClassName}__search-action");
            _ = button.Attribute("type", "button");
            _ = button.Attribute(attribute);
            _ = button.Text(context.Translate(wordKey));
        });
    }
}
