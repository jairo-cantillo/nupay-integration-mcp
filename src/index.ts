#!/usr/bin/env node

const VERSION = "0.5.0";
const KNOWLEDGE_DATE = "2026-04-30";

if (process.argv.includes("--version") || process.argv.includes("-v")) {
  console.log(`@nupay/integration-mcp v${VERSION} (knowledge: ${KNOWLEDGE_DATE})`);
  process.exit(0);
}

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
import { registerCodeExampleTool } from "./tools/code-examples.js";
import { registerQuickstartTool } from "./tools/quickstart.js";
import { registerValidateRequestTool } from "./tools/validate-request.js";
import { registerHelpTool } from "./tools/help.js";
import { registerStart2faPrompt } from "./prompts/start-2fa.js";
import { registerStartTokenizedPrompt } from "./prompts/start-tokenized.js";

const server = new McpServer(
  {
    name: "nupay-integration-mcp",
    version: "0.5.0",
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
registerCodeExampleTool(server);
registerQuickstartTool(server);
registerValidateRequestTool(server);
registerHelpTool(server);

// Prompts
registerStart2faPrompt(server);
registerStartTokenizedPrompt(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

export { server };
