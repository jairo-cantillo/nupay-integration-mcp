import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const patternsPath = resolve(__dirname, "../../knowledge/patterns.md");
const patternsContent = readFileSync(patternsPath, "utf-8");

export function registerPatternsResource(server: McpServer): void {
  server.resource(
    "patterns",
    "nupay://guides/patterns",
    {
      description:
        "Cross-cutting NuPay integration patterns — webhook handling (notifications don't include status, must poll), polling fallback strategy, idempotency via referenceId, amount format (centavos), x-transaction-id logging, error codes, refund rules, and environment URLs.",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: "nupay://guides/patterns",
          text: patternsContent,
          mimeType: "text/markdown",
        },
      ],
    })
  );
}
