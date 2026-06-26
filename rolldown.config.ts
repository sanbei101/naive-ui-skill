import { defineConfig } from "rolldown";
import { bundleAnalyzerPlugin } from "rolldown/experimental";

export default defineConfig({
  platform: "node",
  input: "src/index.ts",
  output: {
    file: "dist/index.js",
    format: "esm",
    minify: true,
    banner: "#!/usr/bin/env node",
  },
  plugins: [
    bundleAnalyzerPlugin({
      format: "md",
    }),
  ],
});
