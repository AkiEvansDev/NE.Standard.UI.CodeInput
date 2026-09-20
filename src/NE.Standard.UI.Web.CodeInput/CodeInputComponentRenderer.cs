using System;
using System.Globalization;
using NE.Standard.UI.Abstractions.Binding.Properties;
using NE.Standard.UI.Authoring.BuiltIns;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.CodeInput;
using NE.Standard.UI.Components.BuiltIns.Actions;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.CodeInput;

/// <summary>
/// Renders the code field: a highlighted layer with a transparent <c>&lt;textarea&gt;</c> laid over it so the browser's own
/// typing and selection do the work, a find/replace panel, and a status bar of two-way pickers.
/// </summary>
public sealed class CodeInputComponentRenderer : TextContentRendererBase
{
    public const string LanguageAttribute = "data-ui-code-language";
    public const string LineNumbersAttribute = "data-ui-code-line-numbers";
    public const string WrapLinesAttribute = "data-ui-code-wrap";
    public const string SearchAttribute = "data-ui-code-search";
    public const string MultiCaretAttribute = "data-ui-code-multi-caret";
    public const string CompletionsAttribute = "data-ui-code-completions";
    public const string CompletionsSourceAttribute = "data-ui-code-completions-source";
    public const string StatusBarAttribute = "data-ui-code-status";
    public const string DetectedLineEndingAttribute = "data-ui-code-eol";
    public const string TabSizeVariable = "--ui-code-tab-size";
    public const string RowsVariable = "--ui-code-rows";
    /// <summary>The value kind the textarea is read by: the chosen line ending put back into the text the browser normalized.</summary>
    public const string ValueKind = "code";

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
    /// The flags and the row count the engine and stylesheet read off the root; the status bar's two-way settings live on their
    /// own elements and reach the root from there.
    /// </summary>
    private static void RenderEditorSettings(WebRenderContext context, IHtmlElementBuilder root)
    {
        RenderFlagAttribute(context, root, CodeInputComponent.LineNumbersProperty, LineNumbersAttribute);
        RenderFlagAttribute(context, root, CodeInputComponent.WrapLinesProperty, WrapLinesAttribute);
        RenderFlagAttribute(context, root, CodeInputComponent.SearchProperty, SearchAttribute);
        RenderFlagAttribute(context, root, CodeInputComponent.MultiCaretProperty, MultiCaretAttribute);
        RenderFlagAttribute(context, root, CodeInputComponent.CompletionsProperty, CompletionsAttribute);
        RenderFlagAttribute(context, root, CodeInputComponent.StatusBarProperty, StatusBarAttribute);

        // The URL a completion list loads its words from, lazily and only once it is needed; unset, the list still offers the
        // language's keywords and the document's own words.
        _ = RenderProperty<string?>(context, root, CodeInputComponent.CompletionsSourceProperty, static (target, value) =>
        {
            if (!string.IsNullOrWhiteSpace(value))
                _ = target.Attribute(CompletionsSourceAttribute, value.Trim());
        }, [WebDomOperation.Attribute(CompletionsSourceAttribute)]);

        // Which line break the value came with, for the status bar to show when nothing was chosen — the browser normalizes every
        // break to LF, so the client can't tell otherwise.
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
                // What a scroll group scrolls, and the lines it keeps a Markdown display level with.
                _ = scroller.Attribute(WebAttributes.ScrollViewport);

                _ = scroller.Element("div", content =>
                {
                    _ = content.Class($"{ClassName}__content");

                    // The highlighted text; the client fills it and keeps it in step with the textarea.
                    _ = content.Element("pre", highlight =>
                    {
                        _ = highlight.Class($"{ClassName}__highlight");
                        _ = highlight.Attribute("aria-hidden", "true");
                        _ = highlight.Attribute(WebAttributes.ScrollLines);
                    });

                    _ = content.Element("textarea", textarea => RenderTextarea(context, textarea));
                });
            });

            RenderSearchPanel(context, field);
            RenderStatusBar(context, root, field);
        });
    }

    /// <summary>
    /// The line under the text: the caret's place the engine writes, and four pickers (tab size, encoding, line ending, language),
    /// each a select paired with a hidden input carrying the two-way setting.
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

            RenderStatusPicker(context, status, "data-ui-code-tab-size", UICodeInputRegions.TabSize, carrier =>
                // The root's variable is what the stylesheet and the Tab key read.
                _ = RenderProperty<int?>(context, carrier, CodeInputComponent.TabSizeProperty, (target, value) =>
                {
                    var size = (value is int chosen and > 0 ? chosen : 4).ToString(CultureInfo.InvariantCulture);

                    _ = target.Attribute("value", size);
                    _ = root.Style(TabSizeVariable, size);
                }, [WebDomOperation.Property("value"), WebDomOperation.Style(TabSizeVariable, target: "root")]));

            RenderStatusPicker(context, status, "data-ui-code-encoding", UICodeInputRegions.Encoding, carrier =>
                _ = RenderProperty<string?>(context, carrier, CodeInputComponent.EncodingProperty, static (target, value) =>
                    _ = target.Attribute("value", string.IsNullOrWhiteSpace(value) ? UICodeEncodings.Utf8 : value)
                , [WebDomOperation.Property("value")]));

            // Unset is the empty value, which a null push also lands on: the engine then shows the ending the text came with.
            RenderStatusPicker(context, status, "data-ui-code-line-ending", UICodeInputRegions.LineEnding, carrier =>
                _ = RenderProperty<string?>(context, carrier, CodeInputComponent.LineEndingProperty, static (target, value) =>
                    _ = target.Attribute("value", value ?? string.Empty)
                , [WebDomOperation.Property("value")]));

            // The id as the author wrote it; the client looks it up case-insensitively and falls back to plain text for one it does not know.
            RenderStatusPicker(context, status, "data-ui-code-language", UICodeInputRegions.Language, carrier =>
                _ = RenderProperty<string?>(context, carrier, CodeInputComponent.LanguageProperty, (target, value) =>
                {
                    var language = string.IsNullOrWhiteSpace(value) ? UICodeLanguages.PlainText : value.Trim();

                    _ = target.Attribute("value", language);
                    _ = root.Attribute(LanguageAttribute, language);
                }, [WebDomOperation.Property("value"), WebDomOperation.Attribute(LanguageAttribute, target: "root")]));
        });
    }

    /// <summary>One picker: the hidden input carrying the setting, and the framework's select that shows and offers it.</summary>
    private void RenderStatusPicker(WebRenderContext context, IHtmlElementBuilder status, string attribute, string region, Action<IHtmlElementBuilder> renderCarrier)
        => _ = status.Element("span", picker =>
        {
            _ = picker.Class($"{ClassName}__status-picker");

            _ = picker.Element("input", carrier =>
            {
                _ = carrier.Attribute("type", "hidden");
                _ = carrier.Attribute(attribute);
                renderCarrier(carrier);
            });

            // The engine writes the select's value from the carrier, and its placeholder with the line ending the text came with.
            RenderRegion(context, picker, region, IInputComponent.ValueProperty, IPlaceholderInputComponent.PlaceholderProperty);
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

    /// <summary>
    /// The find and replace panel, hidden until the client opens it: a find row, a replace row its chevron folds out, and a row of
    /// switches and the match count. Every part is a framework component in a region the engine finds by attribute.
    /// </summary>
    private void RenderSearchPanel(WebRenderContext context, IHtmlElementBuilder field)
    {
        _ = field.Element("div", panel =>
        {
            _ = panel.Class($"{ClassName}__search");
            _ = panel.Attribute("hidden");

            _ = panel.Element("div", row =>
            {
                _ = row.Class($"{ClassName}__search-row");

                // The chevron before the find field folds the replace row out, as Visual Studio's does.
                RenderSearchPart(context, row, "data-ui-code-toggle-replace", UICodeInputRegions.ToggleReplace);
                RenderSearchPart(context, row, "data-ui-code-find", UICodeInputRegions.Find);

                // Left and right, not up and down: the reader steps through the matches the way the text runs.
                RenderSearchPart(context, row, "data-ui-code-previous", UICodeInputRegions.Previous);
                RenderSearchPart(context, row, "data-ui-code-next", UICodeInputRegions.Next);
                RenderSearchPart(context, row, "data-ui-code-close", UICodeInputRegions.Close);
            });

            _ = panel.Element("div", row =>
            {
                _ = row.Class($"{ClassName}__search-row");
                _ = row.Class($"{ClassName}__search-row--replace");
                _ = row.Attribute("hidden");

                RenderSearchPart(context, row, "data-ui-code-replace", UICodeInputRegions.Replace);
                RenderSearchPart(context, row, "data-ui-code-replace-one", UICodeInputRegions.ReplaceOne);
                RenderSearchPart(context, row, "data-ui-code-replace-all", UICodeInputRegions.ReplaceAll);
            });

            _ = panel.Element("div", row =>
            {
                _ = row.Class($"{ClassName}__search-row");
                _ = row.Class($"{ClassName}__search-row--options");

                RenderSearchPart(context, row, "data-ui-code-match-case", UICodeInputRegions.MatchCase, ButtonComponent.PressedProperty);
                RenderSearchPart(context, row, "data-ui-code-whole-word", UICodeInputRegions.WholeWord, ButtonComponent.PressedProperty);
                RenderSearchPart(context, row, "data-ui-code-regex", UICodeInputRegions.Regex, ButtonComponent.PressedProperty);

                // Under the field, not beside it — the match count is the panel's widest text, and putting it in the find row would
                // widen every row.
                _ = row.Element("span", count =>
                {
                    _ = count.Class($"{ClassName}__search-count");
                    _ = count.Attribute("data-ui-code-count");
                    _ = count.Attribute("aria-live", "polite");
                });
            });
        });
    }

    private void RenderSearchPart(WebRenderContext context, IHtmlElementBuilder row, string attribute, string region, params UIProperty[] exposed)
        => _ = row.Element("span", part =>
        {
            _ = part.Class($"{ClassName}__search-part");
            _ = part.Attribute(attribute);
            RenderRegion(context, part, region, exposed);
        });
}
