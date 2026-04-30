import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerStartTokenizedPrompt(server: McpServer): void {
  server.prompt(
    "start_tokenized_integration",
    "Start a NuPay Tokenized (pre-authorized) payment integration. Guides through OAuth2 or CIBA authorization setup for recurring charges and subscriptions.",
    {
      language: z.string().describe("Programming language and framework (e.g., 'Python/Django', 'Node.js/Express', 'Java/Spring Boot')"),
      channel: z.string().describe("Authorization channel: 'app' for OAuth2 (mobile/app-to-app), 'web' for CIBA (desktop push notification)"),
      use_case: z.string().describe("Use case: 'subscription' for recurring billing, 'on_demand' for charge-when-needed"),
      needs_installments: z.string().describe("Whether installments are needed: 'yes' or 'no'"),
    },
    ({ language, channel, use_case, needs_installments }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `I need to integrate NuPay Tokenized (pre-authorized) payments into my ${language} application.

Authorization channel: ${channel === "app" ? "OAuth2 (app-to-app)" : "CIBA (web desktop push notification)"}
Use case: ${use_case === "subscription" ? "Recurring subscription billing" : "On-demand charges (charge when needed)"}
Installments needed: ${needs_installments}

Please help me build a production-grade integration. Use the NuPay MCP tools to:

1. First, call \`plan_integration\` with my use case to get the step-by-step plan
2. Use \`lookup_endpoint\` to get the exact API specs for each endpoint I need
3. Use \`get_schema\` to get the request/response schemas for code generation
4. Use \`get_sandbox_test_scenarios\` with flow="tokenized" to build my test suite

Read the \`nupay://guides/tokenized\` resource for the complete integration guide.
Read the \`nupay://guides/patterns\` resource for cross-cutting patterns.

Requirements for the generated code:
- Generate EC P-256 JWK key pair (ES256) with proper kid generation
- Implement ${channel === "app" ? "OAuth2 with PKCE (code_verifier/code_challenge)" : "CIBA push notification flow with callback verification"}
- Manage token lifecycle: refresh_token (5yr), access_token (5min), handle invalidation
- Query payment conditions before every charge
- Set paymentMethod.authorizationType to "pre_authorized"
- Set appropriate fundingSource (debit/credit/credit_with_additional_limit)
${needs_installments === "yes" ? "- Display BCB IN83 required fields: interest%, interestAmount, iof, cet, installmentPlanAdditionalLimit, totalAmount" : ""}
- Log x-transaction-id from every API response
- Handle all error codes and cancellation codes
- Implement webhook receiver with polling fallback
- Use amount in centavos (integer), currency BRL
- Use referenceId for payment idempotency, transactionRefundId for refund idempotency
- Handle token cancellation/revocation

Generate the complete implementation with sandbox test coverage using test CPFs (58188896454 approve, 31457612500 reject).`,
          },
        },
      ],
    })
  );
}
