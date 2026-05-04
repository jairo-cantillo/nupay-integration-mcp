# @nupay/integration-mcp

MCP server that gives AI coding assistants deep knowledge of the NuPay payment API. Helps merchants go from zero to a working sandbox integration in a single session.

## What it provides

| Type | Name | Description |
|---|---|---|
| **Tool** | `lookup_endpoint` | Look up any NuPay API endpoint by method/path. Returns full spec with resolved schemas. |
| **Tool** | `get_schema` | Look up any request/response schema by name. Supports fuzzy matching. |
| **Tool** | `plan_integration` | Generate a step-by-step integration plan. Auto-detects 2FA vs Tokenized. Accepts optional language/platform for framework-specific guidance. |
| **Tool** | `get_sandbox_test_scenarios` | Get sandbox test amount ranges, CPFs, and recommended test sequences. |
| **Tool** | `get_code_example` | Get ready-to-use code for any API operation. Supports Node.js, Python, Java, and cURL. |
| **Tool** | `get_quickstart` | Get a single copy-paste cURL command to create your first sandbox payment in 60 seconds. |
| **Tool** | `validate_request` | Validate your request JSON before sending it. Catches missing fields, wrong types, and common mistakes. |
| **Resource** | `nupay://api/openapi-spec` | Full OpenAPI 3.0.3 specification (18 endpoints, 71 schemas). |
| **Resource** | `nupay://guides/2fa` | Complete 2FA (manual authorization) integration guide. |
| **Resource** | `nupay://guides/tokenized` | Complete Tokenized (pre-authorized) integration guide. |
| **Resource** | `nupay://guides/patterns` | Cross-cutting patterns: webhooks, polling, error handling, amount format. |
| **Prompt** | `start_2fa_integration` | Interactive starter for 2FA checkout integration. |
| **Prompt** | `start_tokenized_integration` | Interactive starter for Tokenized/subscription integration. |

## Quick start

### Claude Code

Add to your project's `.claude/settings.json`:

```json
{
  "mcpServers": {
    "nupay-integration": {
      "command": "npx",
      "args": ["-y", "@nupay/integration-mcp"]
    }
  }
}
```

Or run locally from a cloned repo:

```json
{
  "mcpServers": {
    "nupay-integration": {
      "command": "node",
      "args": ["/path/to/nupay-integration-mcp/dist/index.js"]
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings (Settings > MCP Servers):

```json
{
  "nupay-integration": {
    "command": "npx",
    "args": ["-y", "@nupay/integration-mcp"]
  }
}
```

### VS Code / Copilot

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "nupay-integration": {
      "command": "npx",
      "args": ["-y", "@nupay/integration-mcp"]
    }
  }
}
```

## Usage examples

Once configured, ask your AI assistant:

- *"Help me integrate NuPay 2FA payments into my Node.js Express app"*
- *"What does the payment creation endpoint expect?"*
- *"Show me the refund request schema"*
- *"Plan a NuPay integration for recurring subscription billing"*
- *"What test amounts should I use in the sandbox?"*
- *"Give me the Node.js code for creating a payment"*
- *"Give me a quickstart cURL to test my sandbox credentials"*
- *"Validate this payment JSON before I send it"*

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for distribution
npm run build
```

## How it works

All knowledge is **bundled at build time** — no external API calls, no network dependencies. The server runs locally via stdio transport and provides structured access to:

- The complete NuPay OpenAPI specification
- Tactical integration guides for both payment flows
- Common pitfalls and cross-cutting patterns
- Sandbox test scenarios with amount ranges and test CPFs

## Knowledge version

- **API spec:** NuPay OpenAPI 3.0.3 (18 endpoints, 71 schemas)
- **Guides:** 2FA desktop/mobile + Tokenized app/web
- **Last updated:** 2026-04-30

## License

Proprietary — NuPay for Business
