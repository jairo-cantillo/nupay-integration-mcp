import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const guidePath = resolve(__dirname, "../../knowledge/guide-2fa.md");
const guideContent = readFileSync(guidePath, "utf-8");

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
          text: guideContent,
          mimeType: "text/markdown",
        },
      ],
    })
  );
}
