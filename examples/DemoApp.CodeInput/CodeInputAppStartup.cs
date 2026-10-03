using System;
using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.CodeInput;

public sealed class CodeInputAppStartup : UIStartupBase
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        // The Markdown page's pictures are the one content this demo serves, so its store is the application's provider.
        _ = services.AddSingleton<MarkdownPictures>();
        _ = services.AddSingleton<IUIContentProvider>(static provider => provider.GetRequiredService<MarkdownPictures>());
    }

    protected override void ConfigureApplication(UIApplicationBuilder application)
    {
        ArgumentNullException.ThrowIfNull(application);

        _ = application.AddLocalizationSource(CodeInputDemoWords.Build());

        // The framework's and its packages' own words in the demo's other languages, as they ship.
        _ = application.AddFrameworkWords("zh-Hans");

        // Only a string starting "code-demo." is a key: every other string on a translatable property is content, so the
        // missing-word report in Development names only words the demo has not translated.
        _ = application.ConfigureLocalization(options => options.KeyPrefixes.Add(CodeInputDemoWords.KeyPrefix));

        // The focus ring in the brand's ink, as on every demo: the framework's default purple read 2.3:1 on the dark page.
        _ = application.ConfigureTheme(theme => theme
            .ConfigureLightPalette(static palette => palette with { FocusRing = palette.PrimaryInk })
            .ConfigureDarkPalette(static palette => palette with { FocusRing = palette.PrimaryInk }));

        _ = application.Route<EditorView, CodeInputController>(CodeInputDemoView.EditorRoute);
        _ = application.Route<MarkdownView, MarkdownController>(CodeInputDemoView.MarkdownRoute);
    }
}
