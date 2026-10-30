import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    build: {
        emptyOutDir: true,
        outDir: "dist",
        modulePreload: false,
        cssCodeSplit: false,
        rolldownOptions: {
            input: resolve(import.meta.dirname, "src/code-input.ts"),
            output: {
                entryFileNames: "ui-code-input.js",
                assetFileNames: "ui-code-input[extname]"
            }
        }
    }
});
