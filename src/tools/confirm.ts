import { createInterface } from "node:readline/promises";

export type Confirm = (message: string) => Promise<boolean>;

export const DENIED = "User denied the change";

// ask y/N in the terminal; the prompt goes to stderr so it never mixes with streamed model text
export const askUser: Confirm = async (message) => {
  if (!process.stdin.isTTY) return false; // nobody to ask (piped input, CI): default to no
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await rl.question(`\n${message}\nAllow? [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
};

// first few lines of a text, for showing in a confirmation prompt
export function preview(text: string, maxLines = 10): string {
  const lines = text.split("\n");
  const shown = lines.slice(0, maxLines).join("\n");
  return lines.length > maxLines ? `${shown}\n... (${lines.length - maxLines} more lines)` : shown;
}
