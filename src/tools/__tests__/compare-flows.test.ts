import { describe, it, expect } from "vitest";
import { compareFlows } from "../compare-flows.js";

describe("compareFlows", () => {
  const result = compareFlows();

  it("includes both flow names", () => {
    expect(result).toContain("2FA");
    expect(result).toContain("Tokenized");
  });

  it("includes comparison table", () => {
    expect(result).toContain("manually_authorized");
    expect(result).toContain("pre_authorized");
  });

  it("includes decision guide", () => {
    expect(result).toContain("Decision Guide");
    expect(result).toContain("subscription");
    expect(result).toContain("e-commerce");
  });

  it("mentions both flows can be used together", () => {
    expect(result).toContain("Yes");
    expect(result).toContain("same merchant");
  });

  it("includes quick start references", () => {
    expect(result).toContain("get_quickstart");
    expect(result).toContain("plan_integration");
  });
});
