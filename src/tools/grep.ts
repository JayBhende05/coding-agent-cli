import { readFile, stat } from "node:fs/promises";

import type { Tool } from "../types.ts";
import { safePath } from "./safePath.ts";
import { truncateHead } from "./truncate.ts";
import { globMatcher, toRel, walk } from "./walk.ts";

const MAX_MATCHES = 100;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_LINE_CHARS = 300;

export async function grep(args: Record<string, unknown>, root = process.cwd()): Promise<string> {
  let regex: RegExp;
  try {
    regex = new RegExp(String(args.pattern));
  } catch (e) {
    return `Invalid regex: ${e instanceof Error ? e.message : e}`;
  }
  const start = safePath(typeof args.path === "string" ? args.path : ".", root);
  const matchesGlob = typeof args.glob === "string" ? globMatcher(args.glob) : () => true;

  const results: string[] = [];
  let more = false;
  search: for await (const file of walk(start)) {
    const rel = toRel(root, file);
    if (!matchesGlob(rel)) continue;
    if ((await stat(file)).size > MAX_FILE_BYTES) continue;
    const text = await readFile(file, "utf8");
    if (text.slice(0, 8000).includes("\0")) continue; // binary file

    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!regex.test(lines[i])) continue;
      if (results.length >= MAX_MATCHES) {
        more = true;
        break search;
      }
      results.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, MAX_LINE_CHARS)}`);
    }
  }
  if (results.length === 0) return `No matches for ${args.pattern}`;
  const out = results.join("\n");
  return truncateHead(more ? `${out}\n[truncated: showing first ${MAX_MATCHES} matches]` : out);
}

export const grepTool: Tool = {
  name: "grep",
  description:
    "Search file contents with a regular expression. Skips node_modules, .git and binary files. Returns file:line: text.",
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Regular expression to search for" },
      path: { type: "string", description: "File or directory to search in (default: .)" },
      glob: { type: "string", description: "Only search files matching this glob, e.g. *.ts" },
    },
    required: ["pattern"],
  },
  async execute(args) {
    return grep(args);
  },
};
