import { describe, it, expect } from "vitest";
import { getCodeExample } from "../code-examples.js";

describe("getCodeExample", () => {
  it("returns Node.js create_payment example", () => {
    const result = getCodeExample("nodejs", "create_payment", "2fa");
    expect(result).toContain("fetch");
    expect(result).toContain("x-transaction-id");
    expect(result).toContain("manually_authorized");
    expect(result).toContain("X-Merchant-Key");
  });

  it("returns tokenized variant for create_payment", () => {
    const result = getCodeExample("nodejs", "create_payment", "tokenized");
    expect(result).toContain("pre_authorized");
    expect(result).toContain("Bearer");
    expect(result).toContain("fundingSource");
  });

  it("returns Python webhook handler", () => {
    const result = getCodeExample("python", "webhook_handler", "2fa");
    expect(result).toContain("flask");
    expect(result).toContain("poll");
  });

  it("returns cURL for create_refund", () => {
    const result = getCodeExample("curl", "create_refund", "2fa");
    expect(result).toContain("transactionRefundId");
    expect(result).toContain("sandbox-api.spinpay.com.br");
  });

  it("returns Java check_status", () => {
    const result = getCodeExample("java", "check_status", "2fa");
    expect(result).toContain("HttpClient");
    expect(result).toContain("x-transaction-id");
  });

  it("returns cURL webhook simulation commands", () => {
    const result = getCodeExample("curl", "webhook_handler", "2fa");
    expect(result).toContain("localhost");
    expect(result).toContain("pspReferenceId");
    expect(result).toContain("refunds");
  });

  it("returns error for unsupported language", () => {
    const result = getCodeExample("rust", "create_payment", "2fa");
    expect(result).toContain("Unsupported language");
  });

  it("returns error for unknown operation", () => {
    const result = getCodeExample("nodejs", "delete_payment", "2fa");
    expect(result).toContain("No example found");
  });

  it("returns Node.js full_integration with all routes", () => {
    const result = getCodeExample("nodejs", "full_integration", "2fa");
    expect(result).toContain("express");
    expect(result).toContain("/api/payments");
    expect(result).toContain("/webhooks/nupay");
    expect(result).toContain("x-transaction-id");
    expect(result).toContain("nupayRequest");
    expect(result).toContain("refunds");
    expect(result).toContain("cancel");
  });

  it("returns Python full_integration with Flask app", () => {
    const result = getCodeExample("python", "full_integration", "2fa");
    expect(result).toContain("Flask");
    expect(result).toContain("/api/payments");
    expect(result).toContain("/webhooks/nupay");
    expect(result).toContain("nupay_request");
  });

  it("returns Java full_integration with Spring Boot", () => {
    const result = getCodeExample("java", "full_integration", "2fa");
    expect(result).toContain("@RestController");
    expect(result).toContain("/api/payments");
    expect(result).toContain("/webhooks/nupay");
    expect(result).toContain("nupayRequest");
  });

  it("webhook handler includes cross-reference to check_status", () => {
    const result = getCodeExample("nodejs", "webhook_handler", "2fa");
    expect(result).toContain("get_code_example");
    expect(result).toContain("check_status");
  });
});
