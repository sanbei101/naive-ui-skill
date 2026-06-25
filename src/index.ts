import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/mini";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REFERENCES_DIR = path.resolve(__dirname, "../references");

const server = new McpServer({
  name: "naive-ui-docs-mcp",
  version: "1.0.0",
});

server.registerTool(
  "get_component_doc",
  {
    description: "获取特定 Naive UI 组件的官方最新 API 规范与代码示例",
    inputSchema: {
      component: z.string(),
    },
  },
  async (args) => {
    const { component } = args;

    const apiPath = path.join(REFERENCES_DIR, component, "api.md");
    const demoPath = path.join(REFERENCES_DIR, component, "demo.md");

    const [apiResult, demoResult] = await Promise.allSettled([
      fs.readFile(apiPath, "utf-8"),
      fs.readFile(demoPath, "utf-8"),
    ]);

    const apiContent =
      apiResult.status === "fulfilled" ? apiResult.value : "(暂无该组件的 API 详细规范)";
    const demoContent =
      demoResult.status === "fulfilled" ? demoResult.value : "(暂无该组件的代码示例)";

    if (apiResult.status === "rejected" && demoResult.status === "rejected") {
      return {
        content: [{ type: "text", text: `未找到组件 [${component}] 的任何文档。` }],
        isError: true,
      };
    }

    const combinedMarkdown = [
      `# 📦 组件文档: ${component}`,
      `## 📜 1. API 规范 (Props, Slots, Events)`,
      apiContent,
      `## 💻 2. 代码示例 (Demos & Usage)`,
      demoContent,
    ].join("\n\n");

    return {
      content: [{ type: "text", text: combinedMarkdown }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP Server 异常崩溃:", err);
  process.exit(1);
});
