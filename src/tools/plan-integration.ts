import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const TOKENIZED_KEYWORDS = [
  "subscription", "recurring", "automatic", "token", "pre-auth", "preauth",
  "pre_authorized", "charge without", "save card", "saved payment", "repeat",
  "monthly", "weekly", "annual", "billing cycle", "auto-charge", "autocharge",
  "ciba", "oauth", "jwk",
];

function detectFlow(useCase: string): "2fa" | "tokenized" {
  const lower = useCase.toLowerCase();
  for (const keyword of TOKENIZED_KEYWORDS) {
    if (lower.includes(keyword)) return "tokenized";
  }
  return "2fa";
}

const PLAN_2FA = `# Integration Plan: NuPay 2FA (Manual Authorization) Flow

## Recommended Flow: 2FA (manually_authorized)
This is the standard checkout flow where the customer approves each payment in the Nubank app. Best for one-time purchases, e-commerce checkout, and any scenario where per-transaction approval is acceptable.

## Integration Steps

### 1. Obtain Credentials
- Get \`X-Merchant-Key\` and \`X-Merchant-Token\` from NuPay Painel → Sandbox → Credenciais tab
- No \`client_id\` or JWK setup needed for 2FA flow

### 2. Set Up Webhook Endpoint
- Expose an HTTPS endpoint to receive payment notifications
- **Critical:** Notifications do NOT contain the payment status — you must poll after receiving one
- Also handle refund notifications at \`{callbackUrl}/refunds\`
- Implement polling fallback (every 15-60 min) for missed notifications

### 3. (Optional) Check Payment Conditions
- \`POST /v2/checkouts/payment-conditions\` with \`{ amount, document }\`
- Tells you if NuPay is available for this customer/amount
- If 400 "Payment options not available" → hide NuPay from checkout

### 4. Create Payment
- \`POST /v1/checkouts/payments\` with headers \`X-Merchant-Key\`, \`X-Merchant-Token\`
- Set \`paymentMethod.authorizationType: "manually_authorized"\`
- Set \`delayToAutoCancel\` (minutes before auto-cancel if unpaid)
- Set \`paymentFlow.returnUrl\` (redirect after success) and \`paymentFlow.cancelUrl\` (redirect after cancel)
- Response includes \`paymentUrl\` — redirect customer there

### 5. Handle Customer Redirect
- **Mobile:** \`paymentUrl\` deep-links to Nubank app
- **Desktop:** Show NuPay hosted page via iframe or redirect using \`paymentUrl\`
- Customer approves in Nubank app → redirected to \`returnUrl\`
- Customer cancels → redirected to \`cancelUrl\`

### 6. Poll Payment Status
- \`GET /v1/checkouts/payments/{pspReferenceId}/status\`
- Handle statuses: COMPLETED, CANCELLED (check code for reason), ERROR

### 7. Implement Refunds
- \`POST /v1/checkouts/payments/{pspReferenceId}/refunds\` with \`transactionRefundId\` (UUID) and \`amount\`
- Refunds are irreversible once initiated
- Handle INSUFFICIENT_FUNDS error

### 8. Cancel Unpaid Orders (Optional)
- \`POST /v1/checkouts/payments/{pspReferenceId}/cancel\`
- Only works when status is \`WAITING_PAYMENT_METHOD\`

### 9. Add Logging
- Log \`x-transaction-id\` response header on EVERY API call
- Store associated with payment record for support troubleshooting

## Endpoints Needed
| Method | Path | Purpose |
|---|---|---|
| POST | /v2/checkouts/payment-conditions | Check availability (optional) |
| POST | /v1/checkouts/payments | Create payment |
| GET | /v1/checkouts/payments/{pspReferenceId}/status | Poll status |
| POST | /v1/checkouts/payments/{pspReferenceId}/cancel | Cancel unpaid |
| POST | /v1/checkouts/payments/{pspReferenceId}/refunds | Create refund |
| GET | /v1/checkouts/payments/{pspReferenceId}/refunds/{refundId} | Check refund status |

## Common Pitfalls
- Reading status from webhook notification (it's not there — always poll)
- Amount as decimal (must be integer centavos: R$100.00 = 10000)
- Forgetting x-transaction-id logging (you'll need it for support)
- Not implementing polling fallback (webhooks can fail)
- Trying to cancel a COMPLETED payment (use refund instead)

## Sandbox Testing
Use the \`get_sandbox_test_scenarios\` tool with flow="2fa" for complete test amount ranges.
`;

const PLAN_TOKENIZED = `# Integration Plan: NuPay Tokenized (Pre-Authorized) Flow

## Recommended Flow: Tokenized (pre_authorized)
This flow lets you charge customers without per-transaction approval. Best for subscriptions, recurring billing, and any scenario where the customer authorizes once.

## Integration Steps

### 1. Obtain Credentials
- Get \`X-Merchant-Key\` and \`X-Merchant-Token\` from NuPay Painel → Sandbox → Credenciais tab
- **Also needed:** Request a \`client_id\` from NuPay integrations team

### 2. Generate JWK Key Pair
- Generate EC P-256 key pair with \`alg: ES256\`, \`use: sig\`
- Compute \`kid\` as SHA-256 of the public key
- Remove private key (\`d\` property) from public JWK before sharing
- Store complete JWK (with \`d\`) securely server-side
- Submit public JWK + registration form to NuPay → receive \`client_id\` by email

### 3. Set Up Webhook Endpoint
- Same as 2FA: HTTPS endpoint, notifications don't contain status, poll after receiving
- Handle both payment and refund notifications
- Implement polling fallback (15-60 min)

### 4. Implement Customer Authorization
Choose based on channel:

**OAuth2 (App-to-App / Mobile Web):**
- Generate \`code_verifier\` (43-128 random chars) and \`code_challenge\` = BASE64URL(SHA256(code_verifier))
- Generate signed JWT (ES256) with \`iss: client_id\`, \`aud: auth_url\`
- Build authorization URL → redirect customer
- Receive \`code\` at \`redirect_uri\` (valid 10 min)
- Exchange code for \`refresh_token\` (valid 5 years)

**CIBA (Web Desktop):**
- Generate signed JWT (same as OAuth2)
- \`POST /v1/backchannel/authentication\` with customer's CPF
- Customer receives push notification in Nubank app
- NuPay calls your callback with \`access_token\` + \`refresh_token\`
- Verify callback using \`client_notification_token\` in Authorization header

### 5. Token Lifecycle
- Use \`refresh_token\` to get \`access_token\` per purchase: \`POST /v1/token\` with \`grant_type=refresh_token\`
- \`access_token\` valid 5 minutes, invalidated when new one requested
- \`refresh_token\` valid 5 years, renews on each use
- If \`refresh_token\` expires → request new customer authorization

### 6. Query Payment Conditions
- \`POST /v2/checkouts/payment-conditions\` with \`Authorization: Bearer {access_token}\`
- **Mandatory before every charge** to check available payment methods
- For installments with additional limit (parcelado com juros): must display interest%, interestAmount, iof, cet, installmentPlanAdditionalLimit, totalAmount per BCB IN83

### 7. Create Payment
- \`POST /v1/checkouts/payments\` with \`X-Merchant-Key\`, \`X-Merchant-Token\`, \`Authorization: Bearer {access_token}\`
- Set \`paymentMethod.authorizationType: "pre_authorized"\`
- Set \`paymentMethod.fundingSource\`: "debit", "credit", or "credit_with_additional_limit"
- Set \`installments\` (1 for à vista)
- Payment transitions to final status immediately — poll after creation

### 8. Poll, Refund, Log
- Same as 2FA flow: poll status, create refunds with \`transactionRefundId\`, log \`x-transaction-id\`

### 9. Handle Token Cancellation
- Customer can revoke authorization via merchant UI
- Discard \`refresh_token\` after cancellation
- Next purchase requires new authorization flow

## Endpoints Needed
| Method | Path | Purpose |
|---|---|---|
| GET | /v1/authorize | Generate authorization URL (OAuth2) |
| POST | /v1/backchannel/authentication | Start CIBA authorization |
| POST | /v1/backchannel/authentication/complete | Validate OTP (CIBA) |
| POST | /v1/token | Exchange code or refresh token |
| POST | /v2/checkouts/payment-conditions | Check available methods |
| POST | /v1/checkouts/payments | Create payment |
| GET | /v1/checkouts/payments/{pspReferenceId}/status | Poll status |
| POST | /v1/checkouts/payments/{pspReferenceId}/refunds | Create refund |
| GET | /v1/checkouts/payments/{pspReferenceId}/refunds/{refundId} | Check refund |

## Common Pitfalls
- All 2FA pitfalls apply (webhook, centavos, logging, polling)
- Not refreshing access_token before payment creation (5 min TTL)
- Reusing expired code (valid only 10 minutes)
- Sharing private JWK key (d property) — only share public key
- Skipping payment conditions check before charging
- Not displaying BCB IN83 required fields for installments with additional limit

## Sandbox Testing
Use the \`get_sandbox_test_scenarios\` tool with flow="tokenized" for complete test amount ranges.
Test CPFs: \`58188896454\` (approve), \`31457612500\` (reject).
`;

export function planIntegration(useCase: string): string {
  const flow = detectFlow(useCase);
  return flow === "tokenized" ? PLAN_TOKENIZED : PLAN_2FA;
}

export function registerPlanIntegrationTool(server: McpServer): void {
  server.tool(
    "plan_integration",
    "Generate a step-by-step NuPay integration plan based on the merchant's use case. Automatically routes to the correct flow (2FA for standard checkout, Tokenized for recurring/subscriptions). Returns ordered steps, endpoints needed, common pitfalls, and sandbox testing guidance.",
    {
      use_case: z.string().describe("Description of the merchant's integration need (e.g., 'one-time e-commerce checkout', 'recurring subscription billing', 'charge customers monthly without approval')"),
    },
    async ({ use_case }) => ({
      content: [{ type: "text" as const, text: planIntegration(use_case) }],
    })
  );
}
