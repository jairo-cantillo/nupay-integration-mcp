#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

export { server };
