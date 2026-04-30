import { describe, it, expect } from "vitest";
import { lookupEndpoint } from "../lookup-endpoint.js";

describe("lookupEndpoint", () => {
  it("returns full endpoint spec for exact path match", () => {
    const result = lookupEndpoint("post", "/v1/checkouts/payments");
    expect(result).toContain("NuPayCheckoutCreationRequest");
    expect(result).toContain("200");
    expect(result).toContain("400");
  });

  it("matches partial path", () => {
    const result = lookupEndpoint("get", "status");
    expect(result).toContain("/v1/checkouts/payments/{pspReferenceId}/status");
  });

  it("returns not-found message for unknown endpoint", () => {
    const result = lookupEndpoint("delete", "/v1/nonexistent");
    expect(result).toContain("No endpoint found");
  });

  it("lists all endpoints when path is empty", () => {
    const result = lookupEndpoint("", "");
    expect(result).toContain("/v1/checkouts/payments");
    expect(result).toContain("/v1/recipients");
  });
});
