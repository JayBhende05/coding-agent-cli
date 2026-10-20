import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildSystemPrompt, DEFAULT_SYSTEM_PROMPT } from "../src/systemPrompt.ts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "harness-sp-"));
});
afterEach(() => rm(root, { recursive: true, force: true }));

describe("buildSystemPrompt", () => {
  it("returns the default prompt when there is no AGENTS.md", async () => {
    expect(await buildSystemPrompt(root)).toBe(DEFAULT_SYSTEM_PROMPT);
  });

  it("appends AGENTS.md to the default prompt", async () => {
    await writeFile(join(root, "AGENTS.md"), "Use tabs.\n");
    const prompt = await buildSystemPrompt(root);
    expect(prompt.startsWith(DEFAULT_SYSTEM_PROMPT)).toBe(true);
    expect(prompt).toContain("Use tabs.");
  });

  it("--system replaces the default text but keeps AGENTS.md", async () => {
    await writeFile(join(root, "AGENTS.md"), "Use tabs.");
    const prompt = await buildSystemPrompt(root, "Answer in French.");
    expect(prompt).toContain("Answer in French.");
    expect(prompt).not.toContain(DEFAULT_SYSTEM_PROMPT);
    expect(prompt).toContain("Use tabs.");
  });

  it("ignores an empty AGENTS.md", async () => {
    await writeFile(join(root, "AGENTS.md"), "  \n");
    expect(await buildSystemPrompt(root, "Hi")).toBe("Hi");
  });
});
