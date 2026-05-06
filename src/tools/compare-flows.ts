import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const COMPARISON = `# NuPay Payment Flows — 2FA vs Tokenized

## Side-by-Side Comparison

| Dimension | 2FA (Manual Authorization) | Tokenized (Pre-Authorized) |
|---|---|---|
| **Customer experience** | Customer approves each payment in the Nubank app | Customer authorizes once, charges are automatic |
| **Best for** | One-time purchases, e-commerce checkout | Subscriptions, recurring billing, on-demand charges |
| **Auth setup complexity** | None — just API key + token | JWK key pair + client_id + OAuth2 or CIBA flow |
| **Credentials needed** | X-Merchant-Key, X-Merchant-Token | Same + client_id + JWK + access_token (Bearer) |
| **Payment creation** | Same endpoint, authorizationType: "manually_authorized" | Same endpoint + authorizationType: "pre_authorized" + fundingSource + Bearer token |
| **Customer redirect** | Yes — paymentUrl opens Nubank app or hosted page | No — payment is processed server-to-server |
| **Status resolution** | Async — customer must approve, then poll | Async — faster (no manual step), still must poll |
| **Payment conditions** | Mandatory — requires CPF in request body | Mandatory — uses access_token (no CPF needed) |
| **Installments** | Not supported in standard 2FA | Supported — set installments field, check IN83 compliance |
| **Funding source control** | No — customer chooses in Nubank app | Yes — merchant sets fundingSource (debit/credit/credit_with_additional_limit) |
| **Webhook behavior** | Notification is a signal, does NOT contain status — must poll | Same — must poll after notification |
| **Refunds** | Same endpoint, same behavior | Same endpoint, same behavior |
| **Recipients (BCB)** | Required by default | Required by default |
| **Regulatory extras** | Recipients (Circular BCB 3.978/2020) | Recipients + BCB IN83 installment disclosure (interest%, IOF, CET) |
| **Token lifecycle** | N/A | refresh_token (5yr), access_token (5min), must refresh per charge |
| **Sandbox test CPFs** | Not needed | 58188896454 (approve), 31457612500 (reject) |

## Can I use both flows?

**Yes.** The same merchant account can offer both 2FA and Tokenized flows for different use cases. Common pattern:
- **2FA** for one-time e-commerce checkout (guest purchases)
- **Tokenized** for subscription billing or saved payment methods

Both flows use the same \`POST /v1/checkouts/payments\` endpoint — the \`authorizationType\` field determines which flow is used.

## Decision Guide

| Your use case | Recommended flow |
|---|---|
| Standard e-commerce checkout | 2FA |
| Guest checkout (no account required) | 2FA |
| Monthly subscription | Tokenized |
| Annual subscription | Tokenized (no funding source fallback) |
| On-demand charges (ride-hailing, delivery) | Tokenized |
| Marketplace with seller payouts | Either + Recipients API |
| Both one-time and recurring | Both — 2FA for one-time, Tokenized for recurring |

## Quick start for each flow

- **2FA:** \`get_quickstart("2fa")\` → copy-paste cURL in 60 seconds
- **Tokenized:** \`plan_integration("recurring subscription")\` → follow the 10-step guide
- **Detailed plan:** \`plan_integration("your use case", "your language", "your platform")\`
`;

export function compareFlows(): string {
  return COMPARISON;
}

export function registerCompareFlowsTool(server: McpServer): void {
  server.tool(
    "compare_flows",
    "Compare NuPay 2FA (manual authorization) and Tokenized (pre-authorized) payment flows side by side. Shows differences in setup, customer experience, credentials, regulatory requirements, and a decision guide for choosing the right flow.",
    {},
    async () => ({
      content: [{ type: "text" as const, text: compareFlows() }],
    })
  );
}
