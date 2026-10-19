import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { find } from "../src/tools/find.ts";
import { grep } from "../src/tools/grep.ts";
import { ls } from "../src/tools/ls.ts";
import { read } from "../src/tools/readTool.ts";

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "harness-"));
  await mkdir(join(root, "src", "deep"), { recursive: true });
  await mkdir(join(root, "node_modules", "pkg"), { recursive: true });
  await mkdir(join(root, ".git"), { recursive: true });
  await writeFile(join(root, "a.txt"), "one\ntwo\nthree\nfour\nfive");
  await writeFile(join(root, "big.txt"), Array.from({ length: 3000 }, (_, i) => `row ${i + 1}`).join("\n"));
  await writeFile(join(root, "src", "main.ts"), "export function runAgent() {}\nconst x = 1;");
  await writeFile(join(root, "src", "deep", "util.ts"), "export const helper = 2;\n// runAgent mention");
  await writeFile(join(root, "src", "notes.md"), "runAgent docs");
  await writeFile(join(root, "node_modules", "pkg", "index.ts"), "runAgent hidden");
  await writeFile(join(root, ".git", "config"), "runAgent hidden");
  await writeFile(join(root, "bin.dat"), "runAgent\0binary");
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("read", () => {
  it("reads a file inside the root", async () => {
    expect(await read({ path: "a.txt" }, root)).toBe("one\ntwo\nthree\nfour\nfive");
  });

  it("rejects a path outside the root", async () => {
    await expect(read({ path: "../../etc/passwd" }, root)).rejects.toThrow("outside project root");
  });

  it("truncates a big file", async () => {
    const out = await read({ path: "big.txt" }, root);
    expect(out).toContain("row 2000");
    expect(out).not.toContain("row 2001");
    expect(out).toContain("[truncated");
  });

  it("supports offset and limit", async () => {
    expect(await read({ path: "a.txt", offset: 2, limit: 2 }, root)).toBe("two\nthree");
  });

  it("errors on a missing file", async () => {
    await expect(read({ path: "nope.txt" }, root)).rejects.toThrow();
  });
});

describe("ls", () => {
  it("lists files and marks folders", async () => {
    const out = (await ls({}, root)).split("\n");
    expect(out).toContain("a.txt");
    expect(out).toContain("src/");
  });

  it("lists a subdirectory", async () => {
    expect((await ls({ path: "src" }, root)).split("\n")).toEqual(["deep/", "main.ts", "notes.md"]);
  });

  it("errors on a missing path", async () => {
    await expect(ls({ path: "nope" }, root)).rejects.toThrow();
  });

  it("rejects a path outside the root", async () => {
    await expect(ls({ path: ".." }, root)).rejects.toThrow("outside project root");
  });
});

describe("find", () => {
  it("matches a name pattern at any depth", async () => {
    expect((await find({ pattern: "*.ts" }, root)).split("\n")).toEqual(["src/deep/util.ts", "src/main.ts"]);
  });

  it("matches a path glob", async () => {
    expect(await find({ pattern: "src/*.md" }, root)).toBe("src/notes.md");
  });

  it("skips node_modules and .git", async () => {
    const out = await find({ pattern: "*" }, root);
    expect(out).not.toContain("node_modules");
    expect(out).not.toContain(".git/");
  });

  it("reports no matches", async () => {
    expect(await find({ pattern: "*.rs" }, root)).toBe("No files match *.rs");
  });

  it("caps results", async () => {
    const dir = join(root, "many");
    await mkdir(dir);
    for (let i = 0; i < 205; i++) await writeFile(join(dir, `f${i}.log`), "");
    const out = (await find({ pattern: "*.log", path: "many" }, root)).split("\n");
    expect(out).toHaveLength(201); // 200 matches + the note
    expect(out[200]).toContain("[truncated");
  });

  it("rejects a path outside the root", async () => {
    await expect(find({ pattern: "*", path: ".." }, root)).rejects.toThrow("outside project root");
  });
});

describe("grep", () => {
  it("finds matches as file:line: text", async () => {
    expect((await grep({ pattern: "runAgent" }, root)).split("\n")).toEqual([
      "src/deep/util.ts:2: // runAgent mention",
      "src/main.ts:1: export function runAgent() {}",
      "src/notes.md:1: runAgent docs",
    ]);
  });

  it("filters by glob", async () => {
    expect(await grep({ pattern: "runAgent", glob: "*.md" }, root)).toBe("src/notes.md:1: runAgent docs");
  });

  it("searches a single file", async () => {
    expect(await grep({ pattern: "two", path: "a.txt" }, root)).toBe("a.txt:2: two");
  });

  it("skips node_modules, .git and binary files", async () => {
    const out = await grep({ pattern: "runAgent" }, root);
    expect(out).not.toContain("node_modules");
    expect(out).not.toContain(".git");
    expect(out).not.toContain("bin.dat");
  });

  it("reports no matches", async () => {
    expect(await grep({ pattern: "zzz-not-here" }, root)).toBe("No matches for zzz-not-here");
  });

  it("returns an error for an invalid regex", async () => {
    expect(await grep({ pattern: "(" }, root)).toContain("Invalid regex");
  });

  it("caps matches", async () => {
    const out = (await grep({ pattern: "^row", path: "big.txt" }, root)).split("\n");
    expect(out).toHaveLength(101); // 100 matches + the note
    expect(out[100]).toContain("[truncated");
  });

  it("rejects a path outside the root", async () => {
    await expect(grep({ pattern: "x", path: ".." }, root)).rejects.toThrow("outside project root");
  });
});
