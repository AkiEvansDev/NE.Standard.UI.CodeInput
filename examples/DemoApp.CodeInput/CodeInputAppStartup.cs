using System;
using NE.Standard.UI.Application;
using NE.Standard.UI.Startup;

namespace DemoApp.CodeInput;

internal sealed class CodeInputAppStartup : UIStartupBase
{
    protected override void ConfigureApplication(UIApplicationBuilder application)
    {
        ArgumentNullException.ThrowIfNull(application);

        _ = application.Route<CodeInputView, CodeInputController>("/");
    }
}
