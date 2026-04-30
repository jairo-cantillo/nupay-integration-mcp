#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerOpenapiResource } from "./resources/openapi.js";
import { registerGuide2faResource } from "./resources/guide-2fa.js";
import { registerGuideTokenizedResource } from "./resources/guide-tokenized.js";
import { registerPatternsResource } from "./resources/patterns.js";
import { registerGetSchemaTool } from "./tools/get-schema.js";
import { registerPlanIntegrationTool } from "./tools/plan-integration.js";
import { registerLookupEndpointTool } from "./tools/lookup-endpoint.js";
import { registerSandboxScenariosTool } from "./tools/sandbox-scenarios.js";

const server = new McpServer(
  {
    name: "nupay-integration-mcp",
    version: "0.1.0",
  },
  {
    instructions:
      "NuPay payment API integration assistant. Provides API reference, integration guides for 2FA and Tokenized payment flows, and sandbox test scenarios. Use the tools and resources to help merchants build production-grade NuPay integrations.",
  }
);

// Resources
registerOpenapiResource(server);
registerGuide2faResource(server);
registerGuideTokenizedResource(server);
registerPatternsResource(server);

// Tools
registerGetSchemaTool(server);
registerLookupEndpointTool(server);
registerPlanIntegrationTool(server);
registerSandboxScenariosTool(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

export { server };
