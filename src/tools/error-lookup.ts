import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface ErrorInfo {
  code: string;
  context: string;
  cause: string;
  fix: string;
}

const ERROR_DATABASE: ErrorInfo[] = [
  // Payment status codes
  { code: "CANCELLED_BY_INSTITUTION", context: "Payment status", cause: "Nubank cancelled the payment — may be due to risk assessment, customer account restrictions, or internal policies", fix: "Display error to customer, suggest retry. If persistent, contact NuPay support with x-transaction-id." },
  { code: "CANCELLED_BY_USER", context: "Payment status", cause: "Customer actively cancelled the payment in the Nubank app", fix: "Show cancellation confirmation. Offer to restart checkout if customer wants to try again." },
  { code: "CANCELLED_BY_TIMEOUT", context: "Payment status", cause: "Customer did not approve within the delayToAutoCancel window (default: 30 minutes)", fix: "Show timeout message. Consider increasing delayToAutoCancel if customers need more time. Offer retry." },
  { code: "CANCELLED_BY_SELLER", context: "Payment status", cause: "Merchant called POST /v1/checkouts/payments/{pspReferenceId}/cancel", fix: "This is merchant-initiated. Confirm cancellation to customer." },
  { code: "SYSTEM_ERROR", context: "Payment status", cause: "NuPay internal error during payment processing", fix: "Log x-transaction-id. Retry with the same referenceId (idempotent). If persistent, escalate to NuPay support." },

  // Refund error types
  { code: "INSUFFICIENT_FUNDS", context: "Refund error (type)", cause: "Merchant's NuPay account balance is too low to process the refund", fix: "Implement automatic retry every 3-4 hours with a NEW transactionRefundId each attempt. Balance recovers as new transactions settle." },
  { code: "FULLY_REFUNDED", context: "Refund error (HTTP 400)", cause: "The total payment amount has already been refunded — no remaining value to refund", fix: "No action needed. The refund is already complete." },
  { code: "MAX_NUMBER_REACHED", context: "Refund error (type)", cause: "Maximum number of refund requests per payment order has been reached", fix: "Cannot create more refunds for this payment. Contact NuPay support if this limit is incorrect." },
  { code: "UNKNOWN", context: "Refund error (type)", cause: "Unknown error during refund execution", fix: "Retry the refund with a new transactionRefundId. Log x-transaction-id for support." },
  { code: "SYSTEM", context: "Refund error (type)", cause: "Internal system error during refund processing", fix: "Retry the refund with a new transactionRefundId. Safe to retry." },
  { code: "PAYMENT_METHOD", context: "Refund error (type)", cause: "Error in the payment transaction during refund — may include BCB error codes for Pix refunds", fix: "Check error.code for BCB-specific codes (AB03, AC03, etc.). Contact NuPay support with x-transaction-id." },
  { code: "OPERATION", context: "Refund error (type)", cause: "Inconsistency in refund data — value or period may be incorrect", fix: "Verify the refund amount does not exceed the original payment. Check the payment is in COMPLETED status and has been settled." },

  // BCB/Pix refund error codes
  { code: "AB03", context: "BCB Pix refund error", cause: "Timeout in SPI (Sistema de Pagamentos Instantâneos) — timing error in the Pix network", fix: "Retry the refund. This is a transient infrastructure issue." },
  { code: "AB09", context: "BCB Pix refund error", cause: "Transaction interrupted due to error at the receiving PSP", fix: "Retry the refund. If persistent, escalate to NuPay support." },
  { code: "AC03", context: "BCB Pix refund error", cause: "Account number does not exist or is invalid at the receiving PSP", fix: "The customer's receiving account may have been closed. Contact NuPay support." },
  { code: "AC06", context: "BCB Pix refund error", cause: "The receiving account is blocked", fix: "Customer's account is blocked. Contact NuPay support for alternative resolution." },
  { code: "AC07", context: "BCB Pix refund error", cause: "The receiving account has been closed", fix: "Customer's account no longer exists. Contact NuPay support for alternative resolution." },
  { code: "AM02", context: "BCB Pix refund error", cause: "Refund amount exceeds the limit for the receiving account type", fix: "Check if the refund amount is correct. May need to split into smaller amounts." },
  { code: "AM09", context: "BCB Pix refund error", cause: "Refund amount exceeds the original payment amount", fix: "Verify the refund amount. Total refunds cannot exceed the original payment value." },
  { code: "DS04", context: "BCB Pix refund error", cause: "Refund rejected by the receiving PSP", fix: "Contact NuPay support with x-transaction-id for investigation." },
  { code: "ED05", context: "BCB Pix refund error", cause: "Error processing the payment at infrastructure level", fix: "Retry the refund. If persistent, escalate to NuPay support." },

  // HTTP status codes
  { code: "400", context: "HTTP status", cause: "Bad request — invalid or missing fields in the request body", fix: "Use the validate_request tool to check your request body. Common issues: missing required fields, wrong enums, amount as centavos instead of reais." },
  { code: "401", context: "HTTP status", cause: "Unauthorized — invalid or missing X-Merchant-Key / X-Merchant-Token headers, or invalid Bearer token for tokenized flow", fix: "Verify credentials from NuPay Painel → Credenciais. For tokenized: check access_token is fresh (5 min TTL)." },
  { code: "404", context: "HTTP status", cause: "Not found — the pspReferenceId or refundId does not exist", fix: "Verify the ID is correct. Check you're using the right environment (sandbox vs production)." },
  { code: "423", context: "HTTP status", cause: "Locked — concurrent operation in progress on the same resource", fix: "Retry after a short delay (1-2 seconds). This is a transient lock." },
  { code: "429", context: "HTTP status", cause: "Too many requests — rate limit exceeded", fix: "Implement exponential backoff: 1s → 2s → 4s. Respect Retry-After header if present. Max 3 retries." },
  { code: "500", context: "HTTP status", cause: "NuPay internal server error", fix: "Retry with exponential backoff. Log x-transaction-id. If persistent, escalate to NuPay support." },
];

export function lookupError(code: string): string {
  const query = code.toUpperCase().trim();

  // Exact match
  const exact = ERROR_DATABASE.filter(e => e.code.toUpperCase() === query);
  if (exact.length > 0) {
    return formatErrors(exact);
  }

  // Partial/fuzzy match
  const partial = ERROR_DATABASE.filter(e =>
    e.code.toUpperCase().includes(query) ||
    e.cause.toUpperCase().includes(query) ||
    e.context.toUpperCase().includes(query)
  );

  if (partial.length > 0) {
    return `# Search results for "${code}"\n\n` + formatErrors(partial);
  }

  return `No error found matching "${code}".\n\nSupported lookups:\n- Payment status codes: CANCELLED_BY_INSTITUTION, CANCELLED_BY_USER, CANCELLED_BY_TIMEOUT, SYSTEM_ERROR\n- Refund errors: INSUFFICIENT_FUNDS, FULLY_REFUNDED, MAX_NUMBER_REACHED\n- BCB Pix codes: AB03, AB09, AC03, AC06, AC07, AM02, AM09, DS04, ED05\n- HTTP status codes: 400, 401, 404, 423, 429, 500`;
}

function formatErrors(errors: ErrorInfo[]): string {
  return errors.map(e => `## ${e.code}\n\n**Context:** ${e.context}\n\n**Cause:** ${e.cause}\n\n**Fix:** ${e.fix}`).join("\n\n---\n\n");
}

export function registerErrorLookupTool(server: McpServer): void {
  server.tool(
    "lookup_error",
    "Look up a NuPay error code and get its cause, fix, and context. Supports payment status codes (CANCELLED_BY_USER, SYSTEM_ERROR), refund errors (INSUFFICIENT_FUNDS), BCB Pix codes (AB03), and HTTP status codes (400, 429, 500).",
    {
      code: z.string().describe('Error code to look up (e.g., "CANCELLED_BY_INSTITUTION", "AB03", "429", "INSUFFICIENT_FUNDS")'),
    },
    async ({ code }) => ({
      content: [{ type: "text" as const, text: lookupError(code) }],
    })
  );
}
