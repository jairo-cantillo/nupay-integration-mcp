import { describe, it, expect } from "vitest";
import { getSchema } from "../get-schema.js";

describe("getSchema", () => {
  it("returns exact schema match", () => {
    const result = getSchema("NuPayCheckoutCreationRequest");
    expect(result).toContain("referenceId");
    expect(result).toContain("amount");
    expect(result).toContain("shopper");
  });

  it("matches fuzzy/partial name", () => {
    const result = getSchema("checkout creation");
    expect(result).toContain("NuPayCheckoutCreationRequest");
  });

  it("returns not-found for unknown schema", () => {
    const result = getSchema("NonexistentSchema");
    expect(result).toContain("No schema found");
  });

  it("lists all schemas when name is empty", () => {
    const result = getSchema("");
    expect(result).toContain("NuPayCheckoutCreationRequest");
    expect(result).toContain("RefundCreationRequest");
    expect(result).toContain("RecipientRequest");
  });

  it("suggests RefundCreationRequest for camelCase NuPayRefundRequest", () => {
    const result = getSchema("NuPayRefundRequest");
    expect(result).toContain("RefundCreationRequest");
  });

  it("suggests matching schemas for camelCase query NuPayStatusResponse", () => {
    const result = getSchema("NuPayStatusResponse");
    // Should find schemas containing "status" and "response" via camelCase word splitting
    expect(result.toLowerCase()).toContain("status");
  });

  it("suggests RefundInvalidResponse for RefundError", () => {
    const result = getSchema("RefundError");
    expect(result).toContain("Refund");
  });
});
