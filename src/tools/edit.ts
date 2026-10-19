import { readFile, writeFile } from "node:fs/promises";

import type { Tool } from "../types.ts";
import { askUser, Confirm, DENIED, preview } from "./confirm.ts";
import { safePath } from "./safePath.ts";
import { toRel } from "./walk.ts";

export async function edit(
  args: Record<string, unknown>,
  root = process.cwd(),
  confirm: Confirm = askUser,
): Promise<string> {
  const file = safePath(String(args.path), root);
  const oldText = String(args.oldText ?? "");
  const newText = String(args.newText ?? "");
  if (oldText === "") throw new Error("oldText must not be empty");

  const text = await readFile(file, "utf8");
  const first = text.indexOf(oldText);
  if (first === -1) throw new Error(`oldText not found in ${args.path}`);
  const count = text.split(oldText).length - 1;
  if (count > 1) throw new Error(`oldText matches ${count} places in ${args.path}; add more surrounding lines to make it unique`);

  const rel = toRel(root, file);
  const question = `edit ${rel}:\n--- remove\n${preview(oldText)}\n+++ add\n${preview(newText)}`;
  if (!(await confirm(question))) return DENIED;

  // slice instead of String.replace so "$&" and friends in newText stay literal
  await writeFile(file, text.slice(0, first) + newText + text.slice(first + oldText.length), "utf8");
  return `Edited ${rel}`;
}

export const editTool: Tool = {
  name: "edit",
  description:
    "Replace one piece of text in an existing file. oldText must match exactly one place in the file. The user is asked to approve first.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file, relative to the current folder" },
      oldText: { type: "string", description: "Exact text to replace; must appear exactly once" },
      newText: { type: "string", description: "Text to put in its place" },
    },
    required: ["path", "oldText", "newText"],
  },
  async execute(args) {
    return edit(args);
  },
};
