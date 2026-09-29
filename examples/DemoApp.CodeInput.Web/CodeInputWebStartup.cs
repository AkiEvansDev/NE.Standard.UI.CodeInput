using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.CodeInput.Web;

internal sealed class CodeInputWebStartup : WebStartupBase<CodeInputAppStartup>
{
    protected override void ConfigureServices(IServiceCollection services)
        => CodeInputWebServices.Register(services);
}
