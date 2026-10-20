import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const DEFAULT_SYSTEM_PROMPT = `You are a coding assistant running in a terminal, working inside the user's current project folder.

Rules:
- Use your tools to look before you answer. Do not guess what a file contains; read it, search for it, list the folder.
- Prefer grep and find to locate code, then read only the part you need.
- Change files only when the user asks. Use edit for a small change and write for a new file. The user approves each change.
- Run shell commands only when they are needed to answer or to finish the task.
- Be concise. Say what you found or did, and mention file paths.`;

// the user's --system text replaces the default; AGENTS.md in the project folder is always added after it
export async function buildSystemPrompt(root = process.cwd(), override?: string): Promise<string> {
  const base = override ?? DEFAULT_SYSTEM_PROMPT;
  const agents = await readFile(join(root, "AGENTS.md"), "utf8").catch(() => "");
  if (!agents.trim()) return base;
  return `${base}\n\nProject instructions (from AGENTS.md):\n${agents.trim()}`;
}
