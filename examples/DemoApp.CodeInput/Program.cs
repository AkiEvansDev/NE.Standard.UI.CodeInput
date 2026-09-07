using DemoApp.CodeInput;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Logging;
using NE.Standard.UI.Web.Hosting;
using NE.Standard.UI.Web.Startup;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Warning);

WebStartupBuilder.Configure<CodeInputWebStartup, CodeInputAppStartup>(builder.Services);

WebApplication app = builder.Build();

await app.MapStandardUIWebAsync().ConfigureAwait(false);

await app.RunAsync().ConfigureAwait(false);
