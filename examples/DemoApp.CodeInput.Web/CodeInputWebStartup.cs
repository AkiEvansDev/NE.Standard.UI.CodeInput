using System;
using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.CodeInput.Web;

internal sealed class CodeInputWebStartup : WebStartupBase<CodeInputAppStartup>
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddStandardRenderers();
        _ = services.AddCodeInput();
        // Only the glyphs the shell wears: registering a whole Material style costs megabytes.
        _ = services.AddMaterialWebIcons(MaterialIconStyle.Outlined, CodeInputDemoView.LightIcon, CodeInputDemoView.DarkIcon, CodeInputDemoView.CodeIcon, CodeInputDemoView.CopyIcon);
    }
}
