import { describe, it, expect } from "vitest";
import { lookupError } from "../error-lookup.js";

describe("lookupError", () => {
  it("finds payment status codes", () => {
    const result = lookupError("CANCELLED_BY_INSTITUTION");
    expect(result).toContain("risk assessment");
    expect(result).toContain("x-transaction-id");
  });

  it("finds refund error types", () => {
    const result = lookupError("INSUFFICIENT_FUNDS");
    expect(result).toContain("3-4 hours");
    expect(result).toContain("transactionRefundId");
  });

  it("finds BCB Pix codes", () => {
    const result = lookupError("AB03");
    expect(result).toContain("SPI");
    expect(result).toContain("Retry");
  });

  it("finds HTTP status codes", () => {
    const result = lookupError("429");
    expect(result).toContain("rate limit");
    expect(result).toContain("backoff");
  });

  it("handles case-insensitive lookup", () => {
    const result = lookupError("cancelled_by_user");
    expect(result).toContain("cancelled the payment");
  });

  it("returns helpful message for unknown codes", () => {
    const result = lookupError("UNKNOWN_CODE_XYZ");
    expect(result).toContain("No error found");
    expect(result).toContain("CANCELLED_BY_INSTITUTION");
  });

  it("supports partial/fuzzy search", () => {
    const result = lookupError("CANCELLED");
    expect(result).toContain("CANCELLED_BY_INSTITUTION");
    expect(result).toContain("CANCELLED_BY_USER");
  });
});
