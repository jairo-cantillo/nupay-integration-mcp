# NuPay Integration Patterns

Cross-cutting patterns that apply to both 2FA and Tokenized payment flows.

## Authentication

All API requests require two headers:
- `X-Merchant-Key`: Merchant API key from NuPay Painel
- `X-Merchant-Token`: Merchant API token from NuPay Painel

Tokenized flow additionally requires `Authorization: Bearer {access_token}` for payment creation and payment conditions queries.

Production credentials have IP allowlisting — requests from unauthorized IPs will be rejected.

## Webhook Notifications

### Critical Rule
Notification callbacks do NOT include the new payment/refund status. The notification is a signal to poll the status endpoint.

### Payment Notifications
- Endpoint: `POST {callbackUrl}` (configured per payment)
- Payload: `{ referenceId, pspReferenceId, timestamp, paymentMethodType }`
- On receipt: call `GET /v1/checkouts/payments/{pspReferenceId}/status` to get current status

### Refund Notifications
- Endpoint: `POST {callbackUrl}/refunds`
- Payload: `{ referenceId, pspReferenceId, refundId, transactionRefundId, timestamp, paymentMethodType }`
- On receipt: call `GET /v1/checkouts/payments/{pspReferenceId}/refunds/{refundId}` to get current status

### Polling Fallback
Notifications can fail. Implement a polling fallback:
- Minimum interval: 15 minutes
- Maximum interval: 1 hour
- Poll `GET /v1/checkouts/payments/{pspReferenceId}/status` for pending payments

## Idempotency

- **Payments:** Use `referenceId` (merchant-generated unique ID) to prevent duplicate payment creation
- **Refunds:** Use `transactionRefundId` (merchant-generated UUID) to prevent duplicate refund creation

## Amount Format

- All monetary values are in **reais** (decimal number, e.g. `110.01` for R$110.01)
- Do NOT use centavos — the API expects the real value as a float
- Currency must be `BRL`
- Field: `amount.value` (number, format double), `amount.currency` (string, "BRL")

## Debug Logging

Every NuPay API response includes the header `x-transaction-id`. You MUST:
1. Log this value for every API call
2. Store it associated with the payment/refund
3. Provide it to NuPay support when troubleshooting

## Error Handling

### Payment Cancellation Codes
| Code | Meaning | Action |
|---|---|---|
| `CANCELLED_BY_INSTITUTION` | Nubank cancelled the payment | Display error, suggest retry |
| `CANCELLED_BY_USER` | Customer cancelled in Nubank app | Display cancellation message |
| `CANCELLED_BY_TIMEOUT` | `delayToAutoCancel` expired (2FA only) | Display timeout, offer retry |
| `CANCELLED_BY_SELLER` | Merchant cancelled via cancel endpoint | Confirm cancellation to user |
| `SYSTEM_ERROR` | NuPay internal error | Log `x-transaction-id`, retry or escalate |

### Refund Errors
| Error | HTTP | Meaning | Action |
|---|---|---|---|
| `FULLY_REFUNDED` | 400 | Payment already fully refunded | No action needed |
| `INSUFFICIENT_FUNDS` | 200 (status ERROR) | Merchant has no balance for refund | Check merchant balance, retry later |

## Refund Rules

- Refunds are **irreversible** once initiated — no cancellation possible
- Both partial and total refunds are supported
- Merchant must have available balance to process refunds
- NuPay does not extend credit for refunds
- Each refund gets its own `refundId` and lifecycle

## Rate Limits & Retry Strategy

The NuPay API returns `429 Too Many Requests` when rate limits are exceeded.

**Recommended retry strategy:**
- Use exponential backoff: 1s → 2s → 4s → 8s → max 30s
- Respect the `Retry-After` header when present
- Maximum 3 retries for transient errors (429, 500, 502, 503, 504)
- Do NOT retry 400/401/422 errors — fix the request instead
- Log `x-transaction-id` for every failed attempt

**Per-endpoint guidance:**
- Payment creation (`POST /v1/checkouts/payments`): safe to retry if you use `referenceId` for idempotency
- Refund creation (`POST /v1/checkouts/payments/{id}/refunds`): safe to retry with same `transactionRefundId`
- Status polling (`GET .../status`): safe to retry (read-only)
- Token exchange (`POST /v1/token`): retry with backoff, but beware of concurrent refresh invalidating tokens

## Recipients (Final Beneficiary)

For **marketplace** merchants transacting on behalf of sellers, BCB Circular 3.978/2020 requires identifying the final beneficiary of each payment.

- Register beneficiaries: `POST /v1/recipients` with legal name, document (CPF/CNPJ), and bank account
- Reference in payments: add `recipients` array to payment creation with `referenceId` and `amount` per beneficiary
- Query: `GET /v1/recipients/{referenceId}` to check registration status
- Maximum 10 recipients per payment
- This field is optional and non-blocking — payments succeed even if recipients aren't registered yet, but compliance requires it

## Refund Retry Strategy

When a refund fails with `INSUFFICIENT_FUNDS` (HTTP 200, `status: "ERROR"`):

- **Use a NEW `transactionRefundId`** for each retry attempt — the previous ID is consumed even on failure. Reusing it returns 400 "already requested".
- Implement automatic retry every **3-4 hours** — this avoids customer friction while waiting for the merchant balance to recover from new transactions
- Track pending refunds and their retry attempts associated with the original `pspReferenceId`
- Stop retrying when refund reaches `REFUNDED` or a non-retriable error (`FULLY_REFUNDED`, `MAX_NUMBER_REACHED`, account closed)
- For non-retriable errors, escalate to NuPay support with the `x-transaction-id`

## CPF Requirements by Flow

| Flow | Where CPF is needed | How it's provided |
|---|---|---|
| 2FA | `document` field in `POST /v2/checkouts/payment-conditions` (mandatory) | In the request body |
| 2FA | `shopper.document` in `POST /v1/checkouts/payments` | In the request body |
| Tokenized (CIBA) | `login_hint` in `POST /v1/backchannel/authentication` (mandatory, no alternative) | In the request body |
| Tokenized | Not needed in payment-conditions or payment creation | Carried by the `access_token` |

**Important:** In the 2FA flow, the API uses the customer's CPF to identify their Nubank account. Omitting it will result in an error. In the tokenized flow, identity is bound to the `access_token`.

## Funding Source Fallback (Tokenized Subscriptions)

Subscription merchants may want to alternate between `debit` and `credit` based on `payment-conditions` response. This is allowed **only if**:

1. Merchant implements a **disclaimer at checkout start** — customer must be informed the charge may use a different funding source
2. Merchant **prioritizes the customer's saved preference** — if preferred method is available, always use it
3. Merchant has **authorization from the NuPay integrations team** — there is a rule based on average ticket that must be validated

**Restrictions:**
- **Annual plans (planos anuais): fallback is prohibited** — the higher average ticket disqualifies them
- Never charge in a non-preferred method when the preferred is available
- Never apply fallback silently without prior customer consent

## Multiple Tokens per Customer (Tokenized)

By default, generating a new authorization for the same customer **invalidates the previous token**.

- If your use case requires multiple active tokens per customer (e.g., multiple subscription plans), contact the **NuPay integrations team to request activation** of the multiple tokens feature
- **Debugging tip:** If a recurring charge fails with an invalid/expired token that should still be valid, check if a new `refresh_token` was recently generated for the same customer — the old one was likely invalidated
- Once the multiple tokens feature is enabled, each token remains valid independently

## Shared Tokens

Shared tokens (e.g., tokens shared across merchants in the same group or holding) are not covered in the current documentation. If your use case requires shared tokens, contact the **NuPay integrations team** directly for guidance.

## Discount Handling

The `items[].discount` field in the payment creation schema is **not used or validated** by NuPay. Do not rely on it for discount logic.

- **Tokenized flow:** Apply discounts via `POST /v2/checkouts/payment-conditions` using the `paymentMethods` array with different amounts per funding source
- **2FA flow:** No self-serve discount mechanism exists — contact the **NuPay integrations team** for guidance

## Environment URLs

| Environment | API Base | Auth Base |
|---|---|---|
| Sandbox | `https://sandbox-api.spinpay.com.br` | `https://sandbox-authentication.spinpay.com.br` |
| Production | `https://api.spinpay.com.br` | `https://authentication.spinpay.com.br` |

Always develop and test against Sandbox first. Switch to Production URLs only after sandbox validation is complete.
