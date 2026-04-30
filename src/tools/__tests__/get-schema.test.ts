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
});
