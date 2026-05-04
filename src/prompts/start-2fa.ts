import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerStart2faPrompt(server: McpServer): void {
  server.prompt(
    "start_2fa_integration",
    "Start a NuPay 2FA (manual authorization) payment integration. Guides through the complete setup for standard checkout where customers approve each payment in the Nubank app.",
    {
      language: z.string().describe("Programming language and framework (e.g., 'Python/Django', 'Node.js/Express', 'Java/Spring Boot')"),
      platform: z.string().describe("Target platform: 'desktop', 'mobile', or 'both'"),
      has_webhook_endpoint: z.string().describe("Whether merchant already has a webhook endpoint: 'yes' or 'no'"),
    },
    ({ language, platform, has_webhook_endpoint }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `I need to integrate NuPay 2FA (manual authorization) payments into my ${language} application.

Target platform: ${platform}
Existing webhook endpoint: ${has_webhook_endpoint}

Please help me build a production-grade integration. Use the NuPay MCP tools to:

1. First, call \`plan_integration\` with my use case to get the step-by-step plan
2. Use \`lookup_endpoint\` to get the exact API specs for each endpoint I need
3. Use \`get_schema\` to get the request/response schemas for code generation
4. Use \`get_sandbox_test_scenarios\` with flow="2fa" to build my test suite

Read the \`nupay://guides/2fa\` resource for the complete integration guide.
Read the \`nupay://guides/patterns\` resource for cross-cutting patterns (webhook handling, error codes, amount format, logging).

Requirements for the generated code:
- Log \`x-transaction-id\` from every API response
- Handle all cancellation codes (CANCELLED_BY_INSTITUTION, CANCELLED_BY_USER, CANCELLED_BY_TIMEOUT, CANCELLED_BY_SELLER, SYSTEM_ERROR)
- Implement webhook receiver that polls status after notification (notifications don't contain the status)
- Implement polling fallback (15-60 min interval)
- Use amount as reais decimal (e.g. 110.01 for R$110.01), currency BRL — NOT centavos
- Use referenceId for idempotency
${has_webhook_endpoint === "no" ? "- Create the webhook endpoint from scratch" : "- Integrate with my existing webhook endpoint"}
${platform === "desktop" || platform === "both" ? "- Handle desktop flow with paymentUrl (iframe or redirect)" : ""}
${platform === "mobile" || platform === "both" ? "- Handle mobile deep link flow with paymentUrl" : ""}

Generate the complete implementation with sandbox test coverage.`,
          },
        },
      ],
    })
  );
}
