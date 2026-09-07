using System;
using Microsoft.Extensions.DependencyInjection;
using NE.Standard.UI.Web.CodeInput;
using NE.Standard.UI.Web.Renderers.DI;
using NE.Standard.UI.Web.Startup;

namespace DemoApp.CodeInput;

internal sealed class CodeInputWebStartup : WebStartupBase<CodeInputAppStartup>
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddStandardRenderers();
        _ = services.AddCodeInput();
    }
}
