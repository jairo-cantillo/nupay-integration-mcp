import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { patterns } from "../knowledge.js";

export function registerPatternsResource(server: McpServer): void {
  server.resource(
    "patterns",
    "nupay://guides/patterns",
    {
      description:
        "Cross-cutting NuPay integration patterns — webhook handling (notifications don't include status, must poll), polling fallback strategy, idempotency via referenceId, amount format (reais decimal), x-transaction-id logging, error codes, refund rules, and environment URLs.",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: "nupay://guides/patterns",
          text: patterns,
          mimeType: "text/markdown",
        },
      ],
    })
  );
}
