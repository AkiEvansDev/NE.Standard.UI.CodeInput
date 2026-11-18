using System;
using DemoApp.CodeInput.Web;
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
        => CodeInputWebServices.Register(services);
}
