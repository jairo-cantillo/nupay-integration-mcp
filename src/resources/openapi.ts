import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openapiSpec } from "../knowledge.js";

export function registerOpenapiResource(server: McpServer): void {
  server.resource(
    "openapi-spec",
    "nupay://api/openapi-spec",
    {
      description:
        "NuPay OpenAPI 3.0.3 specification — 18 endpoints, 71 schemas. Full API reference with request/response examples and error codes.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "nupay://api/openapi-spec",
          text: openapiSpec,
          mimeType: "application/json",
        },
      ],
    })
  );
}
