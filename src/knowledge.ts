import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the package root: works from both src/ (dev) and dist/ (built)
const thisDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(thisDir, thisDir.endsWith("dist") ? ".." : "..");
const knowledgeDir = resolve(packageRoot, "knowledge");

function readKnowledge(filename: string): string {
  return readFileSync(resolve(knowledgeDir, filename), "utf-8");
}

export const openapiSpec = readKnowledge("nupay_openapi.json");
export const guide2fa = readKnowledge("guide-2fa.md");
export const guideTokenized = readKnowledge("guide-tokenized.md");
export const patterns = readKnowledge("patterns.md");
