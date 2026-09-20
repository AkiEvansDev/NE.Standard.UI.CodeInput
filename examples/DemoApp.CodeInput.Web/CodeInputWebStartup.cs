using System;
using Microsoft.Extensions.DependencyInjection;
using NE.Standard.UI.Web.CodeInput;
using NE.Standard.UI.Web.Icons.Material;
using NE.Standard.UI.Web.Renderers.DI;
using NE.Standard.UI.Web.Startup;

namespace DemoApp.CodeInput.Web;

internal sealed class CodeInputWebStartup : WebStartupBase<CodeInputAppStartup>
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddStandardRenderers();
        _ = services.AddCodeInput();
        // Only the two glyphs the theme switcher wears: registering a whole Material style costs megabytes.
        _ = services.AddMaterialWebIcons(MaterialIconStyle.Outlined, CodeInputDemoView.LightIcon, CodeInputDemoView.DarkIcon);
    }
}
