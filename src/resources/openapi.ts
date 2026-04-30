import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(__dirname, "../../knowledge/nupay_openapi.json");
const specContent = readFileSync(specPath, "utf-8");

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
          text: specContent,
          mimeType: "application/json",
        },
      ],
    })
  );
}
