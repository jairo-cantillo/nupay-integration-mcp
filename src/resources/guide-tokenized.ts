import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { guideTokenized } from "../knowledge.js";

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
          text: guideTokenized,
          mimeType: "text/markdown",
        },
      ],
    })
  );
}
