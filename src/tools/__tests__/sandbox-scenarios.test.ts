import { describe, it, expect } from "vitest";
import { getSandboxScenarios } from "../sandbox-scenarios.js";

describe("getSandboxScenarios", () => {
  it("returns 2FA test scenarios", () => {
    const result = getSandboxScenarios("2fa");
    expect(result).toContain("R$0.01");
    expect(result).toContain("SYSTEM_ERROR");
    expect(result).toContain("Cancelled by Nubank");
    expect(result).toContain("Cancelled by customer");
    expect(result).toContain("Cancelled by timeout");
  });

  it("returns tokenized test scenarios with CPFs", () => {
    const result = getSandboxScenarios("tokenized");
    expect(result).toContain("58188896454");
    expect(result).toContain("31457612500");
    expect(result).toContain("credit_with_additional_limit");
  });

  it("includes sandbox URLs", () => {
    const result = getSandboxScenarios("2fa");
    expect(result).toContain("sandbox-api.spinpay.com.br");
  });
});
