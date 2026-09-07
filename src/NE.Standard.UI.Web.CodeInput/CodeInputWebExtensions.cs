using System;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NE.Standard.UI.Shell.Localization;
using NE.Standard.UI.Web.Abstractions.Assets;
using NE.Standard.UI.Web.Abstractions.Rendering;

namespace NE.Standard.UI.Web.CodeInput;

public static class CodeInputWebExtensions
{
    private const string AssemblyName = "NE.Standard.UI.Web.CodeInput";

    /// <summary>
    /// Renders the code field: its renderer, the words its panel writes, and the script and stylesheet the package embeds.
    /// Calling it twice registers nothing more.
    /// </summary>
    public static IServiceCollection AddCodeInput(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        if (services.Any(static descriptor => descriptor.ImplementationType == typeof(CodeInputComponentRenderer)))
            return services;

        services.TryAddEnumerable(ServiceDescriptor.Singleton<IWebComponentRenderer, CodeInputComponentRenderer>());
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IUIStringsSource, CodeInputStrings>());

        // After the framework's own (order 0): the script registers with the runtime the framework's module created.
        _ = services.AddSingleton(new WebAssetDescriptor
        {
            Key = "ui-code-input.css",
            Kind = UIWebAssetKind.Css,
            SourceKind = UIWebAssetSourceKind.EmbeddedResource,
            Source = $"{AssemblyName}.Client.dist.ui-code-input.css",
            ResourceAssemblyName = AssemblyName,
            PublicPath = "/css/ui-code-input.css",
            Order = 100
        });

        _ = services.AddSingleton(new WebAssetDescriptor
        {
            Key = "ui-code-input.js",
            Kind = UIWebAssetKind.JavaScript,
            SourceKind = UIWebAssetSourceKind.EmbeddedResource,
            Source = $"{AssemblyName}.Client.dist.ui-code-input.js",
            ResourceAssemblyName = AssemblyName,
            PublicPath = "/js/ui-code-input.js",
            Order = 100
        });

        return services;
    }
}
