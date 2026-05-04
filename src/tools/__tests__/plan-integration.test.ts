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

  it("appends Node.js framework notes when language provided", () => {
    const result = planIntegration("checkout", "Node.js/Express");
    expect(result).toContain("Framework Notes");
    expect(result).toContain("native `fetch`");
    expect(result).toContain("crypto.randomUUID()");
  });

  it("appends Python framework notes", () => {
    const result = planIntegration("checkout", "Python/Django");
    expect(result).toContain("requests");
    expect(result).toContain("uuid.uuid4()");
  });

  it("appends desktop platform notes", () => {
    const result = planIntegration("checkout", undefined, "desktop");
    expect(result).toContain("Platform Notes");
    expect(result).toContain("iframe");
  });

  it("appends both platform notes", () => {
    const result = planIntegration("checkout", undefined, "both");
    expect(result).toContain("Desktop");
    expect(result).toContain("Mobile");
    expect(result).toContain("deep link");
  });

  it("works with all parameters combined", () => {
    const result = planIntegration("e-commerce checkout", "Java/Spring Boot", "mobile");
    expect(result).toContain("2FA");
    expect(result).toContain("Framework Notes");
    expect(result).toContain("HttpClient");
    expect(result).toContain("Platform Notes");
    expect(result).toContain("Intent");
  });
});
