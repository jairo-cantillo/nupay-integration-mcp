import { describe, it, expect } from "vitest";
import { getQuickstart } from "../quickstart.js";

describe("getQuickstart", () => {
  it("returns 2FA quickstart with cURL", () => {
    const result = getQuickstart("2fa");
    expect(result).toContain("sandbox-api.spinpay.com.br");
    expect(result).toContain("YOUR_MERCHANT_KEY");
    expect(result).toContain("manually_authorized");
    expect(result).toContain("WAITING_PAYMENT_METHOD");
    expect(result).toContain("quickstart-test-001");
  });

  it("returns tokenized quickstart with Bearer token", () => {
    const result = getQuickstart("tokenized");
    expect(result).toContain("Bearer");
    expect(result).toContain("pre_authorized");
    expect(result).toContain("fundingSource");
    expect(result).toContain("58188896454");
  });

  it("defaults to 2FA", () => {
    const result = getQuickstart("anything");
    expect(result).toContain("manually_authorized");
  });
});
