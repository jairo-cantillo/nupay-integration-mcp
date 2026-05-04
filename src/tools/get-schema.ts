import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { openapiSpec } from "../knowledge.js";

const spec = JSON.parse(openapiSpec);
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

const MAX_FUZZY_RESULTS = 3;

// Primary schemas (Request/Response) are more likely what users want
const PRIMARY_SUFFIXES = ["request", "response"];

/** Score a match: higher = better. 0 = no match. */
function matchScore(query: string, schemaName: string): number {
  const q = query.toLowerCase().replace(/[_\-\s]+/g, "");
  const n = schemaName.toLowerCase().replace(/[_\-\s]+/g, "");
  const isPrimary = PRIMARY_SUFFIXES.some((s) => n.endsWith(s));
  const primaryBonus = isPrimary ? 25 : 0;

  // Exact match (case-insensitive, normalized)
  if (n === q) return 100;
  // Prefix match
  if (n.startsWith(q)) return 80 + primaryBonus;
  // Substring match
  if (n.includes(q)) return 60 + primaryBonus;
  // Query words all present in name (e.g. "checkout creation" → NuPayCheckoutCreationRequest)
  const words = query.toLowerCase().split(/[_\-\s]+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => n.includes(w))) return 40 + primaryBonus;
  return 0;
}

export function getSchema(name: string): string {
  if (!name) {
    const names = Object.keys(schemas);
    return `# Available NuPay API Schemas (${names.length})\n\n${names.map((n) => `- ${n}`).join("\n")}`;
  }

  // Exact match by original name
  if (schemas[name]) {
    const resolved = resolveRefs(schemas[name], spec);
    return `# Schema: ${name}\n\n\`\`\`json\n${JSON.stringify(resolved, null, 2)}\n\`\`\``;
  }

  // Scored fuzzy matching, limited to top results
  const scored = Object.keys(schemas)
    .map((n) => ({ name: n, score: matchScore(name, n) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_FUZZY_RESULTS);

  if (scored.length === 0) {
    return `No schema found matching "${name}". Use get_schema with an empty name to list all available schemas.`;
  }

  return scored
    .map((m) => {
      const resolved = resolveRefs(schemas[m.name], spec);
      return `# Schema: ${m.name}\n\n\`\`\`json\n${JSON.stringify(resolved, null, 2)}\n\`\`\``;
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
