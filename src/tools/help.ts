import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const HELP_TEXT = `# NuPay Integration MCP — Getting Started

Welcome! This MCP gives your AI coding assistant deep knowledge of the NuPay payment API so you can go from zero to a working sandbox integration in a single session.

Below is everything available to you, what each tool does, and the recommended order to use them.

---

## Tools

### get_quickstart
**Your first 60 seconds.** Returns a single ready-to-run cURL command that creates a test payment in the NuPay sandbox. Replace two credential placeholders, paste it in your terminal, and see a real API response. Use this to verify your sandbox credentials work before writing any code.

### plan_integration
**Your integration roadmap.** Describe your use case (e.g., "e-commerce checkout", "recurring subscription") and optionally provide your language (e.g., "Node.js/Express") and platform ("desktop", "mobile", or "both"). Returns a step-by-step integration plan with every endpoint you need, common pitfalls that cause support tickets, framework-specific tips, platform-specific guidance for handling paymentUrl redirects, and pre-integration questions to answer before you start coding.

### get_code_example
**Copy-paste code for any operation.** Supports Node.js, Python, Java, and cURL across 7 operations: \`create_payment\`, \`check_status\`, \`create_refund\`, \`cancel_payment\`, \`webhook_handler\`, \`payment_conditions\`, and \`full_integration\`. The \`full_integration\` operation returns a complete single-file app (Express, Flask, or Spring Boot) with all routes wired together — create payment, webhook receiver, status polling, refund, and cancel.

### validate_request
**Pre-flight check before you hit the API.** Paste your payment or refund JSON and it checks required fields, value types, enums, URL formats, and common mistakes. Catches issues like missing \`merchantOrderReference\`, wrong currency, \`fundingSource\` required for tokenized, HTTP instead of HTTPS URLs, and — critically — warns you if your amount looks like centavos instead of reais (the #1 integration mistake).

### get_sandbox_test_scenarios
**Your test plan.** Returns sandbox test amount ranges with expected outcomes (COMPLETED, ERROR, CANCELLED variants), recommended test sequences, and test CPFs for the tokenized flow. Tells you exactly which amounts trigger which statuses so you can build comprehensive test coverage.

### lookup_endpoint
**API reference on demand.** Look up any NuPay endpoint by HTTP method and path (e.g., \`"post"\`, \`"refunds"\`). Returns the full endpoint specification with resolved schemas, request/response examples, and every error code. Use empty strings to list all 18 endpoints.

### get_schema
**Schema deep-dive.** Look up any request or response schema by name or fuzzy match (e.g., \`"checkout creation"\` finds \`NuPayCheckoutCreationRequest\`). Returns the complete schema with all nested references resolved — no chasing \`$ref\` pointers across pages of docs. If no match is found, suggests the closest alternatives.

### lookup_error
**Error code reference.** Got a \`CANCELLED_BY_INSTITUTION\`, \`AB03\`, \`INSUFFICIENT_FUNDS\`, or HTTP 429? Pass the code and get back the cause, fix, and context. Supports NuPay payment status codes, refund error types, BCB Pix codes, and HTTP status codes. Also supports fuzzy search (e.g., \`"CANCELLED"\` finds all cancellation codes).

### compare_flows
**2FA vs Tokenized — side by side.** Returns a structured comparison of both payment flows across 17 dimensions: customer experience, auth setup, credentials, regulatory requirements, installments, and more. Includes a decision guide mapping use cases to recommended flows and confirms both flows can coexist on the same merchant account.

---

## Resources

| Resource | What it contains |
|---|---|
| \`nupay://api/openapi-spec\` | Full OpenAPI 3.0.3 spec (18 endpoints, 71 schemas) |
| \`nupay://guides/2fa\` | Complete 2FA (manual authorization) integration guide |
| \`nupay://guides/tokenized\` | Complete Tokenized (pre-authorized/subscription) integration guide |
| \`nupay://guides/patterns\` | Cross-cutting patterns: webhooks, polling, retries, amount format, CPF requirements, funding source fallback, token lifecycle, recipients, discount handling |

---

## Recommended Sequence

Here's the path from zero to production-ready integration:

### Phase 1 — Prove it works (5 minutes)
1. **\`get_quickstart("2fa")\`** — get a cURL, replace credentials, run it, see \`WAITING_PAYMENT_METHOD\`

### Phase 2 — Plan the integration (10 minutes)
2. **\`plan_integration("your use case", "your language", "your platform")\`** — get the full roadmap with pre-integration questions, step-by-step guide, endpoints table, and pitfalls

### Phase 3 — Build it (1-2 hours)
3. **\`get_code_example("your language", "full_integration")\`** — get a complete working app as your starting point
4. **\`get_code_example("your language", "create_payment")\`** — adapt the payment creation to your order model
5. **\`get_code_example("your language", "webhook_handler")\`** — add webhook receiver with polling
6. **\`get_code_example("your language", "create_refund")\`** — add refund capability
7. **\`lookup_endpoint\`** / **\`get_schema\`** — reference specific API details as you build

### Phase 4 — Validate and test (30 minutes)
8. **\`validate_request(your_json, "create_payment")\`** — validate your request bodies before sending
9. **\`get_sandbox_test_scenarios("2fa")\`** — build your test suite with all amount ranges and edge cases

### Phase 5 — Go to production
10. Replace sandbox URLs with production URLs (see patterns resource)
11. Swap sandbox credentials for production credentials from NuPay Painel
12. Verify webhook endpoint is reachable from NuPay's servers
13. Confirm IP allowlisting is configured for production credentials
`;

export function getHelp(): string {
  return HELP_TEXT;
}

export function registerHelpTool(server: McpServer): void {
  server.tool(
    "get_help",
    "Get a complete guide to all available NuPay MCP tools, what each one does, and the recommended sequence for integrating NuPay from scratch. Start here if you're new to the NuPay integration MCP.",
    {},
    async () => ({
      content: [{ type: "text" as const, text: getHelp() }],
    })
  );
}
