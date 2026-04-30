import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(__dirname, "../../knowledge/nupay_openapi.json");
const spec = JSON.parse(readFileSync(specPath, "utf-8"));

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
      const ref = record["$ref"] as string;
      const schemaName = ref.split("/").pop() ?? ref;
      const resolved = resolveRef(ref, root);
      const resolvedObj = resolveRefs(resolved, root, depth + 1);
      // Inject _schemaName so the component name is preserved in the output
      if (resolvedObj && typeof resolvedObj === "object" && !Array.isArray(resolvedObj)) {
        return { _schemaName: schemaName, ...(resolvedObj as Record<string, unknown>) };
      }
      return resolvedObj;
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      result[key] = resolveRefs(value, root, depth + 1);
    }
    return result;
  }
  return obj;
}

export function lookupEndpoint(method: string, path: string): string {
  const paths = spec.paths as Record<string, Record<string, unknown>>;

  if (!method && !path) {
    const endpoints: string[] = [];
    for (const [p, methods] of Object.entries(paths)) {
      for (const m of Object.keys(methods)) {
        if (["get", "post", "put", "delete", "patch"].includes(m)) {
          const op = methods[m] as Record<string, unknown>;
          const summary = (op.summary as string) || (op.description as string) || "";
          endpoints.push(`${m.toUpperCase()} ${p} — ${summary}`.trim());
        }
      }
    }
    return `# Available NuPay API Endpoints\n\n${endpoints.map((e) => `- ${e}`).join("\n")}`;
  }

  const methodLower = method.toLowerCase();
  const matches: Array<{ path: string; method: string; spec: unknown }> = [];

  for (const [p, methods] of Object.entries(paths)) {
    for (const [m, opSpec] of Object.entries(methods)) {
      if (!["get", "post", "put", "delete", "patch"].includes(m)) continue;
      const methodMatch = !methodLower || m === methodLower;
      const pathMatch = !path || p.includes(path) || p.toLowerCase().includes(path.toLowerCase());
      if (methodMatch && pathMatch) {
        matches.push({ path: p, method: m.toUpperCase(), spec: resolveRefs(opSpec, spec) });
      }
    }
  }

  if (matches.length === 0) {
    return `No endpoint found matching method="${method}" path="${path}". Use lookup_endpoint with empty parameters to list all available endpoints.`;
  }

  return matches
    .map((m) => `# ${m.method} ${m.path}\n\n\`\`\`json\n${JSON.stringify(m.spec, null, 2)}\n\`\`\``)
    .join("\n\n---\n\n");
}

export function registerLookupEndpointTool(server: McpServer): void {
  server.tool(
    "lookup_endpoint",
    "Look up a NuPay API endpoint by HTTP method and path. Returns the full endpoint specification with resolved schemas, request/response examples, and error codes. Use empty strings to list all endpoints.",
    {
      method: z.string().describe("HTTP method (get, post, etc.) or empty string to match all methods"),
      path: z
        .string()
        .describe(
          "Full or partial URL path (e.g., '/v1/checkouts/payments' or 'refunds'). Empty string lists all endpoints."
        ),
    },
    async ({ method, path }) => ({
      content: [{ type: "text" as const, text: lookupEndpoint(method, path) }],
    })
  );
}
