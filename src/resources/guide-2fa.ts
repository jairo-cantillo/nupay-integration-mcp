import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { guide2fa } from "../knowledge.js";

export function registerGuide2faResource(server: McpServer): void {
  server.resource(
    "guide-2fa",
    "nupay://guides/2fa",
    {
      description:
        "NuPay 2FA (manual authorization) integration guide — 9-step walkthrough for desktop and mobile checkout. Covers payment creation with paymentUrl redirect, webhook setup, polling, refunds, cancellation, and sandbox test scenarios.",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: "nupay://guides/2fa",
          text: guide2fa,
          mimeType: "text/markdown",
        },
      ],
    })
  );
}
