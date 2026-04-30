import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(__dirname, "../../knowledge/nupay_openapi.json");
const spec = JSON.parse(readFileSync(specPath, "utf-8"));
const schemas = (spec.components?.schemas ?? {}) as Record<string, unknown>;

function resolveRef(ref: string, root: Record<string, unknown>): unknown {
  const parts = ref.replace("#/", "").split("/");
  let current: unknown = root;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return { $ref: ref, _unresolved: true };
    }
  }
  return current;
}

function resolveRefs(obj: unknown, root: Record<string, unknown>, depth = 0): unknown {
  if (depth > 10) return obj;
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => resolveRefs(item, root, depth + 1));
  if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    if ("$ref" in record && typeof record["$ref"] === "string") {
      const resolved = resolveRef(record["$ref"], root);
      return resolveRefs(resolved, root, depth + 1);
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      result[key] = resolveRefs(value, root, depth + 1);
    }
    return result;
  }
  return obj;
}

function fuzzyMatch(query: string, schemaName: string): boolean {
  const queryLower = query.toLowerCase().replace(/[_\-\s]+/g, "");
  const nameLower = schemaName.toLowerCase().replace(/[_\-\s]+/g, "");
  return nameLower.includes(queryLower) || queryLower.split("").every((char) => nameLower.includes(char));
}

export function getSchema(name: string): string {
  if (!name) {
    const names = Object.keys(schemas);
    return `# Available NuPay API Schemas (${names.length})\n\n${names.map((n) => `- ${n}`).join("\n")}`;
  }

  if (schemas[name]) {
    const resolved = resolveRefs(schemas[name], spec);
    return `# Schema: ${name}\n\n\`\`\`json\n${JSON.stringify(resolved, null, 2)}\n\`\`\``;
  }

  const matches = Object.keys(schemas).filter((n) => fuzzyMatch(name, n));
  if (matches.length === 0) {
    return `No schema found matching "${name}". Use get_schema with an empty name to list all available schemas.`;
  }

  return matches
    .map((n) => {
      const resolved = resolveRefs(schemas[n], spec);
      return `# Schema: ${n}\n\n\`\`\`json\n${JSON.stringify(resolved, null, 2)}\n\`\`\``;
    })
    .join("\n\n---\n\n");
}

export function registerGetSchemaTool(server: McpServer): void {
  server.tool(
    "get_schema",
    "Look up a NuPay API schema by name. Returns the full schema definition with all nested references resolved, including field types, required markers, descriptions, and enum values. Supports fuzzy matching. Use empty string to list all schemas.",
    {
      name: z.string().describe("Schema name (e.g., 'NuPayCheckoutCreationRequest') or partial/fuzzy match (e.g., 'checkout creation'). Empty string lists all schemas."),
    },
    async ({ name }) => ({
      content: [{ type: "text" as const, text: getSchema(name) }],
    })
  );
}
