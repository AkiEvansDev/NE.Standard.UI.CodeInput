using DemoApp.CodeInput;
using DemoApp.CodeInput.Web;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Logging;
using NE.Standard.UI.Web.Hosting;
using NE.Standard.UI.Web.Startup;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

#if DEBUG
builder.Logging.SetMinimumLevel(LogLevel.Debug);
#else
builder.Logging.SetMinimumLevel(LogLevel.Warning);
#endif

WebStartupBuilder.Configure<CodeInputWebStartup, CodeInputAppStartup>(builder.Services);

WebApplication app = builder.Build();

// UseRouting() by hand, after the static files: the framework's catch-all route matches every path, so routing
// added at the front of the pipeline would keep the completions sample under wwwroot from being served.
app.UseStaticFiles();
app.UseRouting();

await app.MapStandardUIWebAsync().ConfigureAwait(false);

await app.RunAsync().ConfigureAwait(false);
