import type { Tool } from "../types.ts";
import { safePath } from "./safePath.ts";
import { globMatcher, toRel, walk } from "./walk.ts";

const MAX_RESULTS = 200;

export async function find(args: Record<string, unknown>, root = process.cwd()): Promise<string> {
  const matches = globMatcher(String(args.pattern));
  const start = safePath(typeof args.path === "string" ? args.path : ".", root);

  const found: string[] = [];
  let more = false;
  for await (const file of walk(start)) {
    const rel = toRel(root, file);
    if (!matches(rel)) continue;
    if (found.length >= MAX_RESULTS) {
      more = true;
      break;
    }
    found.push(rel);
  }
  if (found.length === 0) return `No files match ${args.pattern}`;
  return more ? `${found.join("\n")}\n[truncated: showing first ${MAX_RESULTS} matches]` : found.join("\n");
}

export const findTool: Tool = {
  name: "find",
  description:
    "Find files by name pattern (glob such as *.ts or src/**/*.ts). Skips node_modules and .git. Returns paths relative to the project root.",
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Glob pattern. Without a / it matches the file name only." },
      path: { type: "string", description: "Directory to search in (default: .)" },
    },
    required: ["pattern"],
  },
  async execute(args) {
    return find(args);
  },
};
