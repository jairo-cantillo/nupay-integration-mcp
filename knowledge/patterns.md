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

- All monetary values are in **centavos** (integer)
- Example: R$100.00 = `10000`
- Currency must be `BRL`
- Field: `amount.value` (integer), `amount.currency` (string, "BRL")

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

## Environment URLs

| Environment | API Base | Auth Base |
|---|---|---|
| Sandbox | `https://sandbox-api.spinpay.com.br` | `https://sandbox-authentication.spinpay.com.br` |
| Production | `https://api.spinpay.com.br` | `https://authentication.spinpay.com.br` |

Always develop and test against Sandbox first. Switch to Production URLs only after sandbox validation is complete.
