import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/mini";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REFERENCES_DIR = path.resolve(__dirname, "..", "references");

interface Example {
  title: string;
  description: string;
  code: string;
}

/**
 * 获取所有组件目录名
 */
function getComponentNames(): string[] {
  if (!fs.existsSync(REFERENCES_DIR)) return [];
  return fs
    .readdirSync(REFERENCES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_"))
    .filter((e) => fs.existsSync(path.join(REFERENCES_DIR, e.name, "api.md")))
    .map((e) => e.name)
    .sort();
}

/**
 * 解析 demo.md,按二级标题分组提取示例
 */
function parseDemoMd(content: string): Example[] {
  const examples: Example[] = [];
  const lines = content.split("\n");

  let currentTitle = "";
  let currentDescription = "";
  let currentCode = "";
  let inCodeBlock = false;
  let metFirstH2 = false;

  function flush() {
    if (currentTitle) {
      examples.push({
        title: currentTitle,
        description: currentDescription.trim(),
        code: currentCode.trim(),
      });
    }
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        continue;
      }
      inCodeBlock = true;
      continue;
    }

    if (inCodeBlock) {
      currentCode += line + "\n";
      continue;
    }

    if (line.startsWith("## ")) {
      flush();
      currentTitle = line.replace(/^##\s*/, "").trim();
      currentDescription = "";
      currentCode = "";
      metFirstH2 = true;
      continue;
    }

    if (line.startsWith("# ")) continue;

    if (metFirstH2 && currentTitle) {
      currentDescription += line + "\n";
    }
  }

  flush();
  return examples;
}

// ─── MCP 服务器 ───────────────────────────────────────────
const server = new McpServer({
  name: "naive-ui-docs",
  version: "1.0.0",
});

// Tool: 列出所有组件
server.registerTool(
  "list_components",
  {
    description: "列出 Naive UI 的所有组件名称",
  },
  async () => {
    const names = getComponentNames();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ total: names.length, components: names }, null, 2),
        },
      ],
    };
  },
);

// Tool: 列出组件的所有示例
server.registerTool(
  "list_examples",
  {
    description: "列出指定组件的所有示例,按二级标题分组返回标题、说明和代码",
    inputSchema: {
      component: z.string().check(z.describe("组件名称:如 button,input,select")),
    },
  },
  async ({ component }) => {
    const demoPath = path.join(REFERENCES_DIR, component, "demo.md");
    const apiPath = path.join(REFERENCES_DIR, component, "api.md");

    if (!fs.existsSync(apiPath)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `错误:组件 "${component}" 不存在`,
          },
        ],
        isError: true,
      };
    }

    if (!fs.existsSync(demoPath)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `错误:组件 "${component}" 没有 demo.md 文件`,
          },
        ],
        isError: true,
      };
    }

    const content = fs.readFileSync(demoPath, "utf-8");
    const examples = parseDemoMd(content);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ component, total: examples.length, examples }, null, 2),
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
