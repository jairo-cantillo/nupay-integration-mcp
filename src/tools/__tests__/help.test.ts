import { describe, it, expect } from "vitest";
import { getHelp } from "../help.js";

describe("getHelp", () => {
  const result = getHelp();

  it("lists all tools with descriptions", () => {
    expect(result).toContain("get_quickstart");
    expect(result).toContain("plan_integration");
    expect(result).toContain("get_code_example");
    expect(result).toContain("validate_request");
    expect(result).toContain("get_sandbox_test_scenarios");
    expect(result).toContain("lookup_endpoint");
    expect(result).toContain("get_schema");
  });

  it("lists all resources", () => {
    expect(result).toContain("nupay://api/openapi-spec");
    expect(result).toContain("nupay://guides/2fa");
    expect(result).toContain("nupay://guides/tokenized");
    expect(result).toContain("nupay://guides/patterns");
  });

  it("includes the recommended sequence with phases", () => {
    expect(result).toContain("Phase 1");
    expect(result).toContain("Phase 2");
    expect(result).toContain("Phase 3");
    expect(result).toContain("Phase 4");
    expect(result).toContain("Phase 5");
  });

  it("includes production go-live guidance", () => {
    expect(result).toContain("production");
    expect(result).toContain("IP allowlisting");
  });
});
