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

### 3. Check Payment Conditions (Mandatory)
- \`POST /v2/checkouts/payment-conditions\` with \`{ amount, document }\`
- **Mandatory before creating a payment** — checks if NuPay is available for this customer/amount
- **\`document\` (CPF) is required** in the 2FA flow — the API uses it to identify the customer's Nubank account
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

### 6. Poll Payment Status (Source of Truth)
- \`GET /v1/checkouts/payments/{pspReferenceId}/status\`
- **Polling is the only reliable way to know the real status of a payment** — webhooks are just a trigger signal
- Implement two layers: **reactive** (poll after every webhook) + **proactive fallback** (poll every 15-60 min for pending payments)
- Handle statuses: COMPLETED → confirm order, CANCELLED (check \`code\` for reason) → cancel order, ERROR → alert for review
- Stop polling when payment reaches a final status (\`COMPLETED\`, \`CANCELLED\`, or \`ERROR\`)

### 7. Implement Refunds
- \`POST /v1/checkouts/payments/{pspReferenceId}/refunds\` with \`transactionRefundId\` (UUID) and \`amount\`
- Refunds are irreversible once initiated
- **INSUFFICIENT_FUNDS:** returns HTTP 200 with \`status: "ERROR"\` — implement automatic retry every 3-4 hours with a **new \`transactionRefundId\`** each attempt (the old one is consumed even on failure)
- Track pending refunds and retry attempts associated with the original \`pspReferenceId\`
- Stop retrying when refund reaches \`REFUNDED\` or a non-retriable error

### 8. Cancel Unpaid Orders (Optional)
- \`POST /v1/checkouts/payments/{pspReferenceId}/cancel\`
- Only works when status is \`WAITING_PAYMENT_METHOD\`

### 9. Add Logging
- Log \`x-transaction-id\` response header on EVERY API call
- Store associated with payment record for support troubleshooting

### 10. Register Recipients (Beneficiário Final)
- **Required by Banco Central** (Circular BCB 3.978/2020) to identify final payment beneficiaries
- \`POST /v1/recipients\` to register each beneficiary with name, document (CPF/CNPJ), bank account
- Add \`recipients\` array to payment creation with \`referenceId\` and \`amount\` per beneficiary — max 10 per payment
- Sending an existing \`referenceId\` performs an **upsert** (soft delete + new record)
- If you believe this does not apply to your business model, contact the **NuPay B2B team** for confirmation before removing from scope

## Pre-Integration Questions
Before starting, answer these to tailor the integration:
1. **Checkout environment:** web browser, native app (iOS/Android), or hybrid?
2. **How checkout is rendered:** system browser, webview, or in-app browser? (webviews break Universal Links)
3. **Webhook infrastructure:** do you have an exposed HTTPS endpoint? Do you use a queue (SQS, RabbitMQ)?
4. **Customer CPF availability:** is the customer's CPF available at checkout time? (mandatory for payment-conditions)
5. **Existing PSP:** do you already use another payment gateway? NuPay status lifecycle must map to your current flow
6. **ERP/platform:** SAP, TOTVS, Shopify, VTEX, custom? (affects \`merchantOrderReference\` reconciliation)

## Endpoints Needed
| Method | Path | Purpose |
|---|---|---|
| POST | /v2/checkouts/payment-conditions | Check availability (mandatory) |
| POST | /v1/checkouts/payments | Create payment |
| GET | /v1/checkouts/payments/{pspReferenceId}/status | Poll status |
| POST | /v1/checkouts/payments/{pspReferenceId}/cancel | Cancel unpaid |
| POST | /v1/checkouts/payments/{pspReferenceId}/refunds | Create refund |
| GET | /v1/checkouts/payments/{pspReferenceId}/refunds/{refundId} | Check refund status |
| POST | /v1/recipients | Register final beneficiary (mandatory by default) |
| GET | /v1/recipients/{referenceId} | Check beneficiary registration |

## Common Pitfalls
- Reading status from webhook notification (it's not there — always poll)
- Amount as centavos (must be reais as decimal: R$100.00 = \`100.00\`, NOT \`10000\`)
- Forgetting x-transaction-id logging (you'll need it for support)
- Not implementing polling fallback (webhooks can fail)
- Trying to cancel a COMPLETED payment (use refund instead)
- Not implementing retry with exponential backoff for 429/5xx errors
- Using \`items[].discount\` field for discounts (it is not used or validated by NuPay — for 2FA discounts, contact the integrations team)

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
- \`POST /v1/backchannel/authentication\` with \`login_hint\` = customer's CPF (**mandatory, no alternative identifier accepted**)
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
- Payment transitions to final status faster than 2FA (no manual customer approval), but **status is still asynchronous** — polling via \`GET /v1/checkouts/payments/{pspReferenceId}/status\` is mandatory

### 8. Poll, Refund, Log
- Same as 2FA flow: poll status, create refunds with \`transactionRefundId\`, log \`x-transaction-id\`

### 9. Handle Token Cancellation
- Customer can revoke authorization via merchant UI
- Discard \`refresh_token\` after cancellation
- Next purchase requires new authorization flow

### 10. Register Recipients (Beneficiário Final)
- **Required by Banco Central** (Circular BCB 3.978/2020) to identify final payment beneficiaries
- \`POST /v1/recipients\` to register each beneficiary with name, document (CPF/CNPJ), bank account
- Add \`recipients\` array to payment creation with \`referenceId\` and \`amount\` per beneficiary — max 10 per payment
- If you believe this does not apply, contact the **NuPay B2B team** for confirmation before removing from scope

## Pre-Integration Questions
Before starting, answer these to tailor the integration:
1. **Authorization method:** OAuth2 (mobile/app-to-app) or CIBA (web desktop push notification)?
2. **Multiple subscriptions per customer?** If yes, request multiple tokens feature from NuPay integrations team
3. **Checkout environment:** web browser, native app (iOS/Android), or hybrid?
4. **Webhook infrastructure:** do you have an exposed HTTPS endpoint? Do you use a queue (SQS, RabbitMQ)?
5. **Existing PSP:** do you already use another payment gateway? NuPay status lifecycle must map to your current flow
6. **Funding source preference:** will you offer fallback between debit/credit? (requires integrations team authorization + customer disclaimer)

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
| POST | /v1/recipients | Register final beneficiary (mandatory by default) |
| GET | /v1/recipients/{referenceId} | Check beneficiary registration |

## Common Pitfalls
- All 2FA pitfalls apply (webhook, amount format, logging, polling)
- Not refreshing access_token before payment creation (5 min TTL)
- Reusing expired code (valid only 10 minutes)
- Sharing private JWK key (d property) — only share public key
- Skipping payment conditions check before charging
- Not displaying BCB IN83 required fields for installments with additional limit
- Implementing funding source fallback without integrations team authorization and customer disclaimer
- Applying funding source fallback on annual subscription plans (prohibited)
- Expecting multiple tokens per customer to work by default (requires NuPay integrations team activation — new auth invalidates previous tokens otherwise)

## Sandbox Testing
Use the \`get_sandbox_test_scenarios\` tool with flow="tokenized" for complete test amount ranges.
Test CPFs: \`58188896454\` (approve), \`31457612500\` (reject).
`;

const FRAMEWORK_NOTES: Record<string, string> = {
  node: `## Framework Notes — Node.js

- Use native \`fetch\` (Node 18+) — no need for axios
- Store \`x-transaction-id\` in request context or middleware for tracing
- Use \`crypto.randomUUID()\` for generating \`referenceId\` and \`transactionRefundId\`
- For webhook handler: use \`express.json()\` middleware, respond 200 immediately, then poll async
- Use \`get_code_example\` tool with language="nodejs" for ready-to-use snippets`,

  python: `## Framework Notes — Python

- Use \`requests\` library for API calls
- Store \`x-transaction-id\` via \`logging\` context or structlog
- Use \`uuid.uuid4()\` for generating \`referenceId\` and \`transactionRefundId\`
- For webhook handler: Flask (\`@app.route\`) or FastAPI (\`@app.post\`) — respond 200 immediately, poll async
- Use \`get_code_example\` tool with language="python" for ready-to-use snippets`,

  java: `## Framework Notes — Java

- Use \`java.net.http.HttpClient\` (Java 11+) — no external dependencies needed
- Store \`x-transaction-id\` in MDC (Mapped Diagnostic Context) for structured logging
- Use \`UUID.randomUUID().toString()\` for generating \`referenceId\` and \`transactionRefundId\`
- For webhook handler: Spring Boot \`@RestController\` — respond 200, process async via \`@Async\` or message queue
- Use \`get_code_example\` tool with language="java" for ready-to-use snippets`,
};

const PLATFORM_NOTES: Record<string, string> = {
  desktop: `## Platform Notes — Desktop

- Use \`paymentUrl\` from payment creation response to redirect the customer
- Two options: **full page redirect** (simpler) or **iframe embed** (better UX, keeps customer on your site)
- For iframe: listen for \`postMessage\` events from the NuPay hosted page for completion/cancellation
- Customer approves payment in Nubank app → redirected to \`returnUrl\`
- Customer cancels → redirected to \`cancelUrl\``,

  mobile: `## Platform Notes — Mobile

- \`paymentUrl\` is already a Universal Link — the OS intercepts it and opens the Nubank app
- **Android:** Use App Links / \`Intent\` with the paymentUrl as the URI
- **iOS:** Universal Links work automatically in the system browser
- If Nubank app is not installed, the URL falls back to the Nubank web page
- After approval/cancellation, customer returns to your app via \`returnUrl\`/\`cancelUrl\`

### Universal Link Troubleshooting
If the Nubank app does not open:
1. **Webview?** Universal Links do NOT work in webviews (WKWebView, Chrome Custom Tabs) — open in system browser instead
2. **Programmatic redirect?** iOS requires the redirect to come from a direct user tap, not \`window.location.href\` or a 302 — trigger payment creation + redirect inside a click event handler
3. **iOS dismissed banner?** If the user previously tapped "Open in Safari", iOS remembers and won't offer the app again for that domain — user must long-press the link and choose "Open in App"
4. **Android missing path?** Verify the \`paymentUrl\` path is covered in the app's \`assetlinks.json\``,
};

function getFrameworkNotes(language: string): string {
  const l = language.toLowerCase();
  if (l.includes("node") || l.includes("express") || l.includes("fastify") || l.includes("javascript") || l.includes("typescript")) return FRAMEWORK_NOTES.node;
  if (l.includes("python") || l.includes("django") || l.includes("flask") || l.includes("fastapi")) return FRAMEWORK_NOTES.python;
  if (l.includes("java") || l.includes("spring") || l.includes("kotlin")) return FRAMEWORK_NOTES.java;
  return "";
}

function getPlatformNotes(platform: string): string {
  const p = platform.toLowerCase();
  if (p === "both") return PLATFORM_NOTES.desktop + "\n\n" + PLATFORM_NOTES.mobile;
  if (p === "desktop" || p === "web") return PLATFORM_NOTES.desktop;
  if (p === "mobile" || p === "app") return PLATFORM_NOTES.mobile;
  return "";
}

export function planIntegration(useCase: string, language?: string, platform?: string): string {
  const flow = detectFlow(useCase);
  let plan = flow === "tokenized" ? PLAN_TOKENIZED : PLAN_2FA;

  if (language) {
    const notes = getFrameworkNotes(language);
    if (notes) plan += "\n" + notes;
  }

  if (platform) {
    const notes = getPlatformNotes(platform);
    if (notes) plan += "\n\n" + notes;
  }

  return plan;
}

export function registerPlanIntegrationTool(server: McpServer): void {
  server.tool(
    "plan_integration",
    "Generate a step-by-step NuPay integration plan based on the merchant's use case. Automatically routes to the correct flow (2FA for standard checkout, Tokenized for recurring/subscriptions). Optionally accepts language and platform for framework-specific guidance. Returns ordered steps, endpoints needed, common pitfalls, and sandbox testing guidance.",
    {
      use_case: z.string().describe("Description of the merchant's integration need (e.g., 'one-time e-commerce checkout', 'recurring subscription billing', 'charge customers monthly without approval')"),
      language: z.string().optional().describe("Programming language and framework (e.g., 'Node.js/Express', 'Python/Django', 'Java/Spring Boot'). Adds framework-specific notes to the plan."),
      platform: z.string().optional().describe("Target platform: 'desktop', 'mobile', or 'both'. Adds platform-specific guidance for handling paymentUrl."),
    },
    async ({ use_case, language, platform }) => ({
      content: [{ type: "text" as const, text: planIntegration(use_case, language, platform) }],
    })
  );
}
