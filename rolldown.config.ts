import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/index.ts",
  output: {
    file: "dist/index.js",
    format: "esm",
    banner: "#!/usr/bin/env node",
  },
  external: ["path", "fs/promises", "url", "@modelcontextprotocol/sdk", "zod"],
});
