import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function getQuickstart(flow: string): string {
  if (flow === "tokenized") {
    return `# NuPay Tokenized Quickstart

Tokenized payments require OAuth2 or CIBA authorization before you can charge. You'll need to complete the authorization flow first to get an \`access_token\`.

## Prerequisites

You need an \`access_token\` before you can charge. To get one:

1. Run \`plan_integration\` with use_case="subscription" to see the full authorization setup
2. Run \`get_code_example\` with language="nodejs" (or your language) and operation="create_payment" with flow="tokenized" for the auth code
3. Use test CPF \`58188896454\` (auto-approves) or \`31457612500\` (auto-rejects) in sandbox
4. Exchange the authorization code for tokens via \`POST /v1/token\`
5. Replace \`YOUR_ACCESS_TOKEN\` below with the \`access_token\` you received

## Run this cURL to create a test payment in sandbox:

\`\`\`bash
curl -X POST 'https://sandbox-api.spinpay.com.br/v1/checkouts/payments' \\
  -H 'X-Merchant-Key: YOUR_MERCHANT_KEY' \\
  -H 'X-Merchant-Token: YOUR_MERCHANT_TOKEN' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "referenceId": "quickstart-test-001",
    "merchantOrderReference": "QS-001",
    "amount": { "value": 50.00, "currency": "BRL" },
    "paymentMethod": {
      "type": "nupay",
      "authorizationType": "pre_authorized",
      "fundingSource": "credit"
    },
    "installments": 1,
    "shopper": {
      "firstName": "Test",
      "lastName": "User",
      "document": "12345678900",
      "documentType": "CPF",
      "email": "test@example.com"
    },
    "items": [{ "id": "ITEM-1", "description": "Test Product", "value": 50.00, "quantity": 1 }],
    "paymentFlow": {
      "returnUrl": "https://example.com/success",
      "cancelUrl": "https://example.com/cancel"
    },
    "callbackUrl": "https://example.com/webhooks/nupay",
    "delayToAutoCancel": 30
  }'
\`\`\`

## Expected Response

\`\`\`json
{
  "pspReferenceId": "...",
  "referenceId": "quickstart-test-001",
  "status": "WAITING_PAYMENT_METHOD",
  "paymentUrl": "https://nuapp.nubank.com.br/..."
}
\`\`\`

## Setup

- Replace \`YOUR_MERCHANT_KEY\` and \`YOUR_MERCHANT_TOKEN\` with credentials from NuPay Painel → Sandbox → Credenciais tab
- Replace \`YOUR_ACCESS_TOKEN\` with the token obtained from the authorization flow
- The \`referenceId\` must be unique per payment — change it for each test

## Next Steps

- Check payment status: \`GET /v1/checkouts/payments/{pspReferenceId}/status\`
- Use \`get_code_example\` tool for language-specific implementations
- Use \`plan_integration\` tool for the complete integration checklist
- Use \`get_sandbox_test_scenarios\` for all test amount ranges

Test CPFs: \`58188896454\` (approve authorization), \`31457612500\` (reject authorization)`;
  }

  // Default: 2FA flow
  return `# NuPay 2FA Quickstart — Your First Sandbox Payment

Run this cURL to create a test payment in sandbox:

\`\`\`bash
curl -X POST 'https://sandbox-api.spinpay.com.br/v1/checkouts/payments' \\
  -H 'X-Merchant-Key: YOUR_MERCHANT_KEY' \\
  -H 'X-Merchant-Token: YOUR_MERCHANT_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "referenceId": "quickstart-test-001",
    "merchantOrderReference": "QS-001",
    "amount": { "value": 50.00, "currency": "BRL" },
    "paymentMethod": { "type": "nupay", "authorizationType": "manually_authorized" },
    "shopper": {
      "firstName": "Test",
      "lastName": "User",
      "document": "12345678900",
      "documentType": "CPF",
      "email": "test@example.com"
    },
    "items": [{ "id": "ITEM-1", "description": "Test Product", "value": 50.00, "quantity": 1 }],
    "paymentFlow": {
      "returnUrl": "https://example.com/success",
      "cancelUrl": "https://example.com/cancel"
    },
    "callbackUrl": "https://example.com/webhooks/nupay",
    "delayToAutoCancel": 30
  }'
\`\`\`

## Expected Response

\`\`\`json
{
  "pspReferenceId": "...",
  "referenceId": "quickstart-test-001",
  "status": "WAITING_PAYMENT_METHOD",
  "paymentUrl": "https://nuapp.nubank.com.br/..."
}
\`\`\`

## Setup

- Replace \`YOUR_MERCHANT_KEY\` and \`YOUR_MERCHANT_TOKEN\` with credentials from NuPay Painel → Sandbox → Credenciais tab
- The \`referenceId\` must be unique per payment — change it for each test

## Next Steps

- Check payment status: \`GET /v1/checkouts/payments/{pspReferenceId}/status\`
- Use \`get_code_example\` tool for language-specific implementations
- Use \`plan_integration\` tool for the complete integration checklist
- Use \`get_sandbox_test_scenarios\` for all test amount ranges`;
}

export function registerQuickstartTool(server: McpServer): void {
  server.tool(
    "get_quickstart",
    "Get a single ready-to-run cURL command that creates a NuPay payment in sandbox. Replace YOUR_MERCHANT_KEY and YOUR_MERCHANT_TOKEN with your credentials from NuPay Painel → Sandbox → Credenciais. Fastest way to verify your setup works.",
    {
      flow: z.string().optional().describe('Payment flow: "2fa" (default) or "tokenized"'),
    },
    async ({ flow }) => ({
      content: [{ type: "text" as const, text: getQuickstart(flow ?? "2fa") }],
    })
  );
}
