import { describe, it, expect } from "vitest";
import { planIntegration } from "../plan-integration.js";

describe("planIntegration", () => {
  it("routes to 2FA for simple checkout", () => {
    const result = planIntegration("one-time checkout on my website");
    expect(result).toContain("2FA");
    expect(result).toContain("manually_authorized");
    expect(result).toContain("paymentUrl");
  });

  it("routes to tokenized for subscription", () => {
    const result = planIntegration("recurring subscription billing");
    expect(result).toContain("Tokenized");
    expect(result).toContain("pre_authorized");
    expect(result).toContain("OAuth2");
  });

  it("routes to tokenized for recurring", () => {
    const result = planIntegration("charge customers monthly without them approving each time");
    expect(result).toContain("Tokenized");
  });

  it("includes webhook setup in all plans", () => {
    const result = planIntegration("basic payment integration");
    expect(result).toContain("webhook");
    expect(result).toContain("x-transaction-id");
  });
});
