using System;
using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.CodeInput.Desktop;

internal sealed class CodeInputDesktopStartup : DesktopStartupBase<CodeInputAppStartup>
{
    protected override void ConfigureHost(DesktopHostOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        options.WindowTitle = "NE.Standard — CodeInput";
        options.InitialWidth = 1400;
        options.InitialHeight = 880;
    }

    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddStandardRenderers();
        _ = services.AddCodeInput();
        _ = services.AddMaterialWebIcons(MaterialIconStyle.Outlined, [CodeInputDemoView.LightIcon, CodeInputDemoView.DarkIcon, CodeInputDemoView.CodeIcon, CodeInputDemoView.CopyIcon, .. CodeInputDemoView.PageIcons]);
    }
}
