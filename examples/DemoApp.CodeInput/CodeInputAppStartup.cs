using System;

namespace DemoApp.CodeInput;

public sealed class CodeInputAppStartup : UIStartupBase
{
    protected override void ConfigureApplication(UIApplicationBuilder application)
    {
        ArgumentNullException.ThrowIfNull(application);

        _ = application.Route<EditorView, CodeInputController>(CodeInputDemoView.EditorRoute);
        _ = application.Route<MarkdownView, MarkdownController>(CodeInputDemoView.MarkdownRoute);
    }
}
