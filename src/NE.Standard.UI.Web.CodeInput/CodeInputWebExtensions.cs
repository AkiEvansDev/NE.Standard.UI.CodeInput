using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NE.Standard.UI.Shell.Localization;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.CodeInput;

public static class CodeInputWebExtensions
{
    private const string AssemblyName = "NE.Standard.UI.Web.CodeInput";

    /// <summary>
    /// Renders the code field and the Markdown display: their renderers, the words the field's panel writes, and the script and
    /// stylesheet the package embeds. Calling it twice registers nothing more.
    /// </summary>
    public static IServiceCollection AddCodeInput(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.TryAddEnumerable(ServiceDescriptor.Singleton<IWebComponentRenderer, CodeInputComponentRenderer>());
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IWebComponentRenderer, MarkdownDisplayComponentRenderer>());
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IUIStringsSource, CodeInputStrings>());

        return services.AddPackageClient(AssemblyName, "ui-code-input");
    }
}
