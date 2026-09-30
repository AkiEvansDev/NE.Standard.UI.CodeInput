using System;

namespace DemoApp.CodeInput;

public sealed class CodeInputAppStartup : UIStartupBase
{
    protected override void ConfigureApplication(UIApplicationBuilder application)
    {
        ArgumentNullException.ThrowIfNull(application);

        _ = application.AddLocalizationSource(CodeInputDemoWords.Build());

        // The framework's and its packages' own words in the demo's other languages, as they ship.
        _ = application.AddFrameworkWords("zh-Hans");

        // Only a string starting "code-demo." is a key: every other string on a translatable property is content, so the
        // missing-word report in Development names only words the demo has not translated.
        _ = application.ConfigureLocalization(options => options.KeyPrefixes.Add(CodeInputDemoWords.KeyPrefix));

        _ = application.Route<EditorView, CodeInputController>(CodeInputDemoView.EditorRoute);
        _ = application.Route<MarkdownView, MarkdownController>(CodeInputDemoView.MarkdownRoute);
    }
}
