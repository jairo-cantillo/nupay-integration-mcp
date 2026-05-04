import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateRequest(requestJson: string, operation: string): string {
  // 1. Try to parse JSON
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(requestJson);
  } catch (e) {
    return "# Validation Failed\n\n**Error:** Invalid JSON — " + (e as Error).message;
  }

  const op = operation.toLowerCase();
  if (op === "create_payment") {
    return formatResult(validateCreatePayment(body));
  } else if (op === "create_refund") {
    return formatResult(validateCreateRefund(body));
  } else {
    return `Unsupported operation "${operation}". Supported: "create_payment", "create_refund".`;
  }
}

function validateCreatePayment(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required top-level fields
  const required = ["merchantOrderReference", "referenceId", "amount", "shopper", "items", "paymentMethod"];
  for (const field of required) {
    if (!(field in body)) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  // Amount validation
  const amount = body.amount as Record<string, unknown> | undefined;
  if (amount) {
    if (typeof amount.value !== "number" || amount.value <= 0) {
      errors.push("amount.value must be a positive number (e.g. 50.00 for R$50.00)");
    }
    if (amount.currency !== "BRL") {
      errors.push('amount.currency must be "BRL"');
    }
    // Centavos warning: if value > 10000 and is a round integer, likely a mistake
    if (typeof amount.value === "number" && amount.value > 10000 && Number.isInteger(amount.value)) {
      warnings.push(
        `amount.value is ${amount.value} — this is R$${amount.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. ` +
        `If you meant R$${(amount.value / 100).toFixed(2)}, use ${(amount.value / 100).toFixed(2)} instead. ` +
        `NuPay uses reais (decimal), NOT centavos.`
      );
    }
  }

  // Payment method validation
  const pm = body.paymentMethod as Record<string, unknown> | undefined;
  if (pm) {
    if (pm.type !== "nupay") {
      errors.push('paymentMethod.type must be "nupay"');
    }
    const authType = pm.authorizationType as string;
    if (authType && !["manually_authorized", "pre_authorized"].includes(authType)) {
      errors.push('paymentMethod.authorizationType must be "manually_authorized" or "pre_authorized"');
    }
    if (authType === "pre_authorized") {
      if (!pm.fundingSource) {
        errors.push('paymentMethod.fundingSource is required for pre_authorized (one of: "credit", "debit", "credit_with_additional_limit")');
      } else if (!["credit", "debit", "credit_with_additional_limit"].includes(pm.fundingSource as string)) {
        errors.push('paymentMethod.fundingSource must be "credit", "debit", or "credit_with_additional_limit"');
      }
    }
  }

  // Shopper validation
  const shopper = body.shopper as Record<string, unknown> | undefined;
  if (shopper) {
    const shopperRequired = ["firstName", "lastName", "document", "documentType", "email"];
    for (const field of shopperRequired) {
      if (!shopper[field]) {
        errors.push(`Missing required field: shopper.${field}`);
      }
    }
    if (shopper.documentType && shopper.documentType !== "CPF") {
      errors.push('shopper.documentType must be "CPF"');
    }
  }

  // Items validation
  const items = body.items as unknown[] | undefined;
  if (items) {
    if (!Array.isArray(items) || items.length === 0) {
      errors.push("items must be a non-empty array");
    } else {
      items.forEach((item, i) => {
        const it = item as Record<string, unknown>;
        for (const field of ["id", "value", "quantity", "description"]) {
          if (!(field in it)) {
            errors.push(`Missing required field: items[${i}].${field}`);
          }
        }
      });
    }
  }

  // delayToAutoCancel validation
  if ("delayToAutoCancel" in body) {
    const delay = body.delayToAutoCancel as number;
    if (typeof delay !== "number" || delay < 1) {
      errors.push("delayToAutoCancel must be an integer >= 1 (minutes)");
    }
  }

  // URL validations
  const urlFields = ["callbackUrl", "orderUrl"];
  for (const field of urlFields) {
    if (field in body && typeof body[field] === "string" && !(body[field] as string).startsWith("https://")) {
      errors.push(`${field} must start with "https://"`);
    }
  }

  // Check paymentFlow URLs
  const pf = body.paymentFlow as Record<string, unknown> | undefined;
  if (pf) {
    for (const urlField of ["returnUrl", "cancelUrl"]) {
      if (urlField in pf && typeof pf[urlField] === "string" && !(pf[urlField] as string).startsWith("https://")) {
        errors.push(`paymentFlow.${urlField} must start with "https://"`);
      }
    }
  }

  // Warnings
  if (!("callbackUrl" in body)) {
    warnings.push("callbackUrl is missing — you won't receive webhook notifications for this payment. Consider adding one.");
  }

  return { errors, warnings };
}

function validateCreateRefund(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!body.transactionRefundId || typeof body.transactionRefundId !== "string") {
    errors.push("Missing or invalid required field: transactionRefundId (must be a non-empty string, unique per refund)");
  }

  const amount = body.amount as Record<string, unknown> | undefined;
  if (!amount) {
    errors.push("Missing required field: amount");
  } else {
    if (typeof amount.value !== "number" || amount.value <= 0) {
      errors.push("amount.value must be a positive number");
    }
    if (amount.currency !== "BRL") {
      errors.push('amount.currency must be "BRL"');
    }
  }

  return { errors, warnings };
}

function formatResult(result: ValidationResult): string {
  if (result.errors.length === 0 && result.warnings.length === 0) {
    return "# Validation Passed ✓\n\nRequest body is valid and ready to send to the NuPay API.";
  }

  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push("# Validation Failed\n\n## Errors (must fix)\n" + result.errors.map((e) => `- ❌ ${e}`).join("\n"));
  }

  if (result.warnings.length > 0) {
    const header = result.errors.length === 0 ? "# Validation Passed with Warnings\n\n" : "\n\n";
    parts.push(header + "## Warnings\n" + result.warnings.map((w) => `- ⚠️ ${w}`).join("\n"));
  }

  return parts.join("");
}

export function registerValidateRequestTool(server: McpServer): void {
  server.tool(
    "validate_request",
    "Validate a NuPay API request body before sending it. Checks required fields, value types, enums, and common mistakes. Returns errors (blocking) and warnings (non-blocking).",
    {
      request_json: z.string().describe("The JSON request body to validate (as a string)"),
      operation: z.string().describe('API operation: "create_payment" or "create_refund"'),
    },
    async ({ request_json, operation }) => ({
      content: [{ type: "text" as const, text: validateRequest(request_json, operation) }],
    })
  );
}
