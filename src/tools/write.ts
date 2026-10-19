import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { Tool } from "../types.ts";
import { askUser, Confirm, DENIED, preview } from "./confirm.ts";
import { safePath } from "./safePath.ts";
import { toRel } from "./walk.ts";

export async function write(
  args: Record<string, unknown>,
  root = process.cwd(),
  confirm: Confirm = askUser,
): Promise<string> {
  const file = safePath(String(args.path), root);
  const content = String(args.content ?? "");
  const exists = await stat(file).then((s) => s.isFile(), () => false);
  const rel = toRel(root, file);

  const action = exists ? "OVERWRITE" : "create";
  if (!(await confirm(`${action} ${rel} (${Buffer.byteLength(content)} bytes):\n${preview(content)}`))) return DENIED;

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
  return `Wrote ${Buffer.byteLength(content)} bytes to ${rel}`;
}

export const writeTool: Tool = {
  name: "write",
  description:
    "Create a file, or completely overwrite an existing one, inside the project. The user is asked to approve first. To change part of a file use edit instead.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file, relative to the current folder" },
      content: { type: "string", description: "The full new contents of the file" },
    },
    required: ["path", "content"],
  },
  async execute(args) {
    return write(args);
  },
};
