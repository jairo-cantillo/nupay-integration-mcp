import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const guidePath = resolve(__dirname, "../../knowledge/guide-tokenized.md");
const guideContent = readFileSync(guidePath, "utf-8");

export function registerGuideTokenizedResource(server: McpServer): void {
  server.resource(
    "guide-tokenized",
    "nupay://guides/tokenized",
    {
      description:
        "NuPay Tokenized (pre-authorized) integration guide — 10-step walkthrough for recurring/subscription payments. Covers JWK key generation, OAuth2 (app-to-app) and CIBA (web desktop) authorization flows, token lifecycle management, payment conditions with BCB IN83 installment compliance, and SFTP conciliation.",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: "nupay://guides/tokenized",
          text: guideContent,
          mimeType: "text/markdown",
        },
      ],
    })
  );
}
