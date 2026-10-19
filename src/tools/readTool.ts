import { readFile } from "node:fs/promises";

import { Tool } from "../types.ts";
import { safePath } from "./safePath.ts";
import { truncateHead } from "./truncate.ts";

export async function read(args: Record<string, unknown>, root = process.cwd()): Promise<string> {
  const text = await readFile(safePath(String(args.path), root), "utf8");
  if (typeof args.offset !== "number" && typeof args.limit !== "number") return truncateHead(text);

  // offset is a 1-based line number
  const start = Math.max(1, typeof args.offset === "number" ? args.offset : 1);
  const lines = text.split("\n");
  const end = typeof args.limit === "number" ? start - 1 + args.limit : lines.length;
  return truncateHead(lines.slice(start - 1, end).join("\n"));
}

export const readTool: Tool = {
  name: "read",
  description:
    "Read a text file inside the project and return its contents. Long files are truncated; use offset and limit to read a section.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file, relative to the current folder",
      },
      offset: { type: "number", description: "Line number to start from (1-based)" },
      limit: { type: "number", description: "Maximum number of lines to return" },
    },
    required: ["path"],
  },
  async execute(args) {
    return read(args);
  },
};
