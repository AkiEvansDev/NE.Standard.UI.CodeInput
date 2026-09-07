using System;
using System.Globalization;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.CodeInput;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.CodeInput;

/// <summary>
/// The code field under the same header/field/message shell as the text area: a highlighted layer with a transparent
/// <c>&lt;textarea&gt;</c> laid over it, so the browser's own editing, undo and selection do the work, and a find and
/// replace panel the client wires up.
/// </summary>
public sealed class CodeInputComponentRenderer : TextContentRendererBase
{
    public const string LanguageAttribute = "data-ui-code-language";
    public const string LineNumbersAttribute = "data-ui-code-line-numbers";
    public const string WrapLinesAttribute = "data-ui-code-wrap";
    public const string SearchAttribute = "data-ui-code-search";
    public const string TabSizeVariable = "--ui-code-tab-size";
    public const string RowsVariable = "--ui-code-rows";

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

    /// <summary>What the engine and the stylesheet read off the root: the language, the flags, and the two sizes as variables.</summary>
    private static void RenderEditorSettings(WebRenderContext context, IHtmlElementBuilder root)
    {
        // The id as the author wrote it; the client looks it up case-insensitively and falls back to plain text for one it does not know.
        _ = RenderProperty<string?>(context, root, CodeInputComponent.LanguageProperty, static (target, value)
            => _ = target.Attribute(LanguageAttribute, string.IsNullOrWhiteSpace(value) ? UICodeLanguages.PlainText : value.Trim())
        , [WebDomOperation.Attribute(LanguageAttribute)]);

        RenderFlagAttribute(context, root, CodeInputComponent.LineNumbersProperty, LineNumbersAttribute);
        RenderFlagAttribute(context, root, CodeInputComponent.WrapLinesProperty, WrapLinesAttribute);
        RenderFlagAttribute(context, root, CodeInputComponent.SearchProperty, SearchAttribute);

        _ = RenderProperty<int?>(context, root, CodeInputComponent.TabSizeProperty, static (target, value) =>
        {
            if (value is int tabSize and > 0)
                _ = target.Style(TabSizeVariable, tabSize.ToString(CultureInfo.InvariantCulture));
        }, [WebDomOperation.Style(TabSizeVariable)]);

        _ = RenderProperty<int?>(context, root, CodeInputComponent.RowsProperty, static (target, value) =>
        {
            if (value is int rows and > 0)
                _ = target.Style(RowsVariable, rows.ToString(CultureInfo.InvariantCulture));
        }, [WebDomOperation.Style(RowsVariable)]);
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
        });
    }

    private void RenderTextarea(WebRenderContext context, IHtmlElementBuilder textarea)
    {
        _ = textarea.Class($"{ClassName}__text");
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
