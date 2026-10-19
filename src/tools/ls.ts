import { readdir } from "node:fs/promises";

import type { Tool } from "../types.ts";
import { safePath } from "./safePath.ts";

const MAX_ENTRIES = 500;

export async function ls(args: Record<string, unknown>, root = process.cwd()): Promise<string> {
  const dir = safePath(typeof args.path === "string" ? args.path : ".", root);
  const entries = await readdir(dir, { withFileTypes: true });
  const names = entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name)).sort();
  if (names.length === 0) return "(empty directory)";
  if (names.length <= MAX_ENTRIES) return names.join("\n");
  return `${names.slice(0, MAX_ENTRIES).join("\n")}\n[truncated: showing ${MAX_ENTRIES} of ${names.length} entries]`;
}

export const lsTool: Tool = {
  name: "ls",
  description: "List the files and folders in a directory inside the project. Folders end with /.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Directory to list, relative to the current folder (default: .)" },
    },
  },
  async execute(args) {
    return ls(args);
  },
};
