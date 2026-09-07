import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    build: {
        emptyOutDir: true,
        outDir: "dist",
        lib: {
            entry: resolve(__dirname, "src/code-input.ts"),
            formats: ["es"],
            fileName: () => "ui-code-input.js",
            cssFileName: "ui-code-input"
        }
    }
});
