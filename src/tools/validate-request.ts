import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

// Known snake_case → camelCase field mappings
const SNAKE_TO_CAMEL: Record<string, string> = {
  payment_method: "paymentMethod",
  reference_id: "referenceId",
  merchant_order_reference: "merchantOrderReference",
  callback_url: "callbackUrl",
  delay_to_auto_cancel: "delayToAutoCancel",
  document_type: "documentType",
  first_name: "firstName",
  last_name: "lastName",
  authorization_type: "authorizationType",
  funding_source: "fundingSource",
  payment_flow: "paymentFlow",
  order_url: "orderUrl",
  return_url: "returnUrl",
  cancel_url: "cancelUrl",
  transaction_refund_id: "transactionRefundId",
};

function checkSnakeCaseKeys(
  obj: Record<string, unknown>,
  prefix: string,
  errors: string[]
): void {
  for (const key of Object.keys(obj)) {
    const camel = SNAKE_TO_CAMEL[key];
    const label = prefix ? `${prefix}.${key}` : key;
    if (camel) {
      errors.push(`Unknown field "${label}" — did you mean "${camel}"?`);
    }
    // Recurse into plain objects (not arrays)
    const val = obj[key];
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      checkSnakeCaseKeys(val as Record<string, unknown>, label, errors);
    }
    // Recurse into arrays of objects
    if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (item !== null && typeof item === "object" && !Array.isArray(item)) {
          checkSnakeCaseKeys(item as Record<string, unknown>, `${label}[${i}]`, errors);
        }
      });
    }
  }
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

  // 1. Snake_case key detection (runs first so we catch casing issues before "missing field" errors)
  checkSnakeCaseKeys(body, "", errors);

  // 2. Required top-level fields
  const required = ["merchantOrderReference", "referenceId", "amount", "shopper", "items", "paymentMethod"];
  for (const field of required) {
    if (!(field in body)) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  // 3. Nested structure validation — amount must be an object
  if ("amount" in body) {
    const rawAmount = body.amount;
    if (typeof rawAmount === "number") {
      errors.push(
        `"amount" must be an object { value: number, currency: "BRL" }, not a bare number. Got: ${rawAmount}`
      );
    } else if (rawAmount === null || typeof rawAmount !== "object" || Array.isArray(rawAmount)) {
      errors.push('"amount" must be an object with "value" and "currency"');
    } else {
      const amount = rawAmount as Record<string, unknown>;
      if (typeof amount.value !== "number" || amount.value <= 0) {
        errors.push("amount.value must be a positive number (e.g. 50.00 for R$50.00)");
      }
      if (amount.currency !== "BRL") {
        errors.push('amount.currency must be "BRL"');
      }
      // Centavos warning
      if (typeof amount.value === "number" && amount.value > 10000 && Number.isInteger(amount.value)) {
        warnings.push(
          `amount.value is ${amount.value} — this is R$${amount.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. ` +
          `If you meant R$${(amount.value / 100).toFixed(2)}, use ${(amount.value / 100).toFixed(2)} instead. ` +
          `NuPay uses reais (decimal), NOT centavos.`
        );
      }
    }
  }

  // 4. paymentMethod must be an object
  if ("paymentMethod" in body) {
    const rawPm = body.paymentMethod;
    if (rawPm === null || typeof rawPm !== "object" || Array.isArray(rawPm)) {
      errors.push('"paymentMethod" must be an object with at least { type: "nupay" }');
    } else {
      const pm = rawPm as Record<string, unknown>;
      // Enum: type
      if (pm.type !== "nupay") {
        errors.push('paymentMethod.type must be "nupay"');
      }
      // Enum: authorizationType
      const authType = pm.authorizationType as string | undefined;
      if (authType && !["manually_authorized", "pre_authorized"].includes(authType)) {
        errors.push('paymentMethod.authorizationType must be "manually_authorized" or "pre_authorized"');
      }
      // Enum: fundingSource (validate if present; required when pre_authorized)
      if (authType === "pre_authorized") {
        if (!pm.fundingSource) {
          errors.push('paymentMethod.fundingSource is required for pre_authorized (one of: "credit", "debit", "credit_with_additional_limit")');
        } else if (!["credit", "debit", "credit_with_additional_limit"].includes(pm.fundingSource as string)) {
          errors.push('paymentMethod.fundingSource must be "credit", "debit", or "credit_with_additional_limit"');
        }
      } else if (pm.fundingSource && !["credit", "debit", "credit_with_additional_limit"].includes(pm.fundingSource as string)) {
        errors.push('paymentMethod.fundingSource must be "credit", "debit", or "credit_with_additional_limit"');
      }
    }
  }

  // 5. shopper must be an object
  if ("shopper" in body) {
    const rawShopper = body.shopper;
    if (rawShopper === null || typeof rawShopper !== "object" || Array.isArray(rawShopper)) {
      errors.push('"shopper" must be an object');
    } else {
      const shopper = rawShopper as Record<string, unknown>;
      const shopperRequired = ["firstName", "lastName", "document", "documentType", "email"];
      for (const field of shopperRequired) {
        if (!shopper[field]) {
          errors.push(`Missing required field: shopper.${field}`);
        }
      }
      // Enum: documentType
      if (shopper.documentType && shopper.documentType !== "CPF") {
        errors.push('shopper.documentType must be "CPF"');
      }
    }
  }

  // 6. items must be an array of objects
  if ("items" in body) {
    const rawItems = body.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      errors.push("items must be a non-empty array");
    } else {
      rawItems.forEach((item, i) => {
        if (item === null || typeof item !== "object" || Array.isArray(item)) {
          errors.push(`items[${i}] must be an object`);
        } else {
          const it = item as Record<string, unknown>;
          for (const field of ["id", "value", "quantity", "description"]) {
            if (!(field in it)) {
              errors.push(`Missing required field: items[${i}].${field}`);
            }
          }
        }
      });
    }
  }

  // 7. paymentFlow must be an object (if present)
  if ("paymentFlow" in body) {
    const rawPf = body.paymentFlow;
    if (rawPf === null || typeof rawPf !== "object" || Array.isArray(rawPf)) {
      errors.push('"paymentFlow" must be an object');
    } else {
      const pf = rawPf as Record<string, unknown>;
      for (const urlField of ["returnUrl", "cancelUrl"]) {
        if (urlField in pf && typeof pf[urlField] === "string" && !(pf[urlField] as string).startsWith("https://")) {
          errors.push(`paymentFlow.${urlField} must start with "https://"`);
        }
      }
    }
  }

  // 8. delayToAutoCancel validation
  if ("delayToAutoCancel" in body) {
    const delay = body.delayToAutoCancel as number;
    if (typeof delay !== "number" || delay < 1) {
      errors.push("delayToAutoCancel must be an integer >= 1 (minutes)");
    }
  }

  // 9. URL validations
  const urlFields = ["callbackUrl", "orderUrl"];
  for (const field of urlFields) {
    if (field in body && typeof body[field] === "string" && !(body[field] as string).startsWith("https://")) {
      errors.push(`${field} must start with "https://"`);
    }
  }

  // 10. Warnings
  if (!("callbackUrl" in body)) {
    warnings.push("callbackUrl is missing — you won't receive webhook notifications for this payment. Consider adding one.");
  }

  return { errors, warnings };
}

function validateCreateRefund(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Snake_case detection
  checkSnakeCaseKeys(body, "", errors);

  if (!body.transactionRefundId || typeof body.transactionRefundId !== "string") {
    errors.push("Missing or invalid required field: transactionRefundId (must be a non-empty string, unique per refund)");
  }

  const rawAmount = body.amount;
  if (!rawAmount) {
    errors.push("Missing required field: amount");
  } else if (typeof rawAmount === "number") {
    errors.push(
      `"amount" must be an object { value: number, currency: "BRL" }, not a bare number. Got: ${rawAmount}`
    );
  } else if (rawAmount === null || typeof rawAmount !== "object" || Array.isArray(rawAmount)) {
    errors.push('"amount" must be an object with "value" and "currency"');
  } else {
    const amount = rawAmount as Record<string, unknown>;
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
