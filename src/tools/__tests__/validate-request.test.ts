import { describe, it, expect } from "vitest";
import { validateRequest } from "../validate-request.js";

describe("validateRequest", () => {
  const validPayment = JSON.stringify({
    merchantOrderReference: "ORDER-001",
    referenceId: "ref-001",
    amount: { value: 50.00, currency: "BRL" },
    paymentMethod: { type: "nupay", authorizationType: "manually_authorized" },
    shopper: {
      firstName: "Test",
      lastName: "User",
      document: "12345678900",
      documentType: "CPF",
      email: "test@example.com",
    },
    items: [{ id: "1", description: "Test", value: 50.0, quantity: 1 }],
    callbackUrl: "https://example.com/webhook",
  });

  it("validates a correct payment request", () => {
    const result = validateRequest(validPayment, "create_payment");
    expect(result).toContain("Passed");
  });

  it("catches missing required fields", () => {
    const result = validateRequest("{}", "create_payment");
    expect(result).toContain("merchantOrderReference");
    expect(result).toContain("referenceId");
    expect(result).toContain("amount");
    expect(result).toContain("shopper");
    expect(result).toContain("items");
    expect(result).toContain("paymentMethod");
  });

  it("catches invalid amount currency", () => {
    const body = JSON.parse(validPayment);
    body.amount.currency = "USD";
    const result = validateRequest(JSON.stringify(body), "create_payment");
    expect(result).toContain('must be "BRL"');
  });

  it("warns about likely centavos mistake", () => {
    const body = JSON.parse(validPayment);
    body.amount.value = 50000;
    const result = validateRequest(JSON.stringify(body), "create_payment");
    expect(result).toContain("centavos");
  });

  it("warns about missing callbackUrl", () => {
    const body = JSON.parse(validPayment);
    delete body.callbackUrl;
    const result = validateRequest(JSON.stringify(body), "create_payment");
    expect(result).toContain("callbackUrl");
    expect(result).toContain("webhook");
  });

  it("catches invalid JSON", () => {
    const result = validateRequest("not json{", "create_payment");
    expect(result).toContain("Invalid JSON");
  });

  it("catches pre_authorized without fundingSource", () => {
    const body = JSON.parse(validPayment);
    body.paymentMethod.authorizationType = "pre_authorized";
    const result = validateRequest(JSON.stringify(body), "create_payment");
    expect(result).toContain("fundingSource");
  });

  it("validates a correct refund request", () => {
    const refund = JSON.stringify({
      transactionRefundId: "refund-001",
      amount: { value: 25.00, currency: "BRL" },
    });
    const result = validateRequest(refund, "create_refund");
    expect(result).toContain("Passed");
  });

  it("catches missing refund fields", () => {
    const result = validateRequest("{}", "create_refund");
    expect(result).toContain("transactionRefundId");
    expect(result).toContain("amount");
  });

  it("catches HTTP URLs", () => {
    const body = JSON.parse(validPayment);
    body.callbackUrl = "http://example.com/webhook";
    const result = validateRequest(JSON.stringify(body), "create_payment");
    expect(result).toContain("https://");
  });

  it("rejects unsupported operation", () => {
    const result = validateRequest("{}", "delete_payment");
    expect(result).toContain("Unsupported operation");
  });

  it("catches snake_case field names and suggests camelCase", () => {
    const body = JSON.stringify({
      reference_id: "ref-1",
      merchant_order_reference: "MOR-1",
      amount: { value: 50.00, currency: "BRL" },
      payment_method: { type: "nupay", authorizationType: "manually_authorized" },
      shopper: { firstName: "Test", lastName: "User", document: "123", documentType: "CPF", email: "t@t.com" },
      items: [{ id: "1", description: "Test", value: 50, quantity: 1 }],
      callbackUrl: "https://example.com/hook",
    });
    const result = validateRequest(body, "create_payment");
    expect(result).toContain("paymentMethod");
    expect(result).toContain("referenceId");
  });

  it("catches bare number amount instead of object", () => {
    const body = JSON.stringify({
      merchantOrderReference: "MOR-1",
      referenceId: "ref-1",
      amount: 100,
      paymentMethod: { type: "nupay", authorizationType: "manually_authorized" },
      shopper: { firstName: "Test", lastName: "User", document: "123", documentType: "CPF", email: "t@t.com" },
      items: [{ id: "1", description: "Test", value: 50, quantity: 1 }],
    });
    const result = validateRequest(body, "create_payment");
    expect(result).toContain("must be an object");
  });

  it("catches invalid enum values", () => {
    const body = JSON.stringify({
      merchantOrderReference: "MOR-1",
      referenceId: "ref-1",
      amount: { value: 50.00, currency: "BRL" },
      paymentMethod: { type: "PIX", authorizationType: "auto" },
      shopper: { firstName: "Test", lastName: "User", document: "123", documentType: "RG", email: "t@t.com" },
      items: [{ id: "1", description: "Test", value: 50, quantity: 1 }],
    });
    const result = validateRequest(body, "create_payment");
    expect(result).toContain('"nupay"');
    expect(result).toContain("manually_authorized");
    expect(result).toContain('"CPF"');
  });
});
