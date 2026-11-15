using System;

namespace DemoApp.CodeInput.Desktop;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
        => DesktopStartupBuilder.Run<CodeInputDesktopStartup, CodeInputAppStartup>(args);
}
