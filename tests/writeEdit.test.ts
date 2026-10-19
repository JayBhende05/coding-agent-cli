import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DENIED, preview } from "../src/tools/confirm.ts";
import { edit } from "../src/tools/edit.ts";
import { write } from "../src/tools/write.ts";

let root: string;
const yes = () => vi.fn(async (_message: string) => true);
const no = () => vi.fn(async (_message: string) => false);

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "harness-we-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("write", () => {
  it("creates a new file (and parent folders) after approval", async () => {
    const confirm = yes();
    const out = await write({ path: "sub/new.txt", content: "hello" }, root, confirm);
    expect(out).toBe("Wrote 5 bytes to sub/new.txt");
    expect(await readFile(join(root, "sub", "new.txt"), "utf8")).toBe("hello");
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0][0]).toContain("create sub/new.txt");
  });

  it("warns when it will overwrite", async () => {
    await writeFile(join(root, "a.txt"), "old");
    const confirm = yes();
    await write({ path: "a.txt", content: "new" }, root, confirm);
    expect(confirm.mock.calls[0][0]).toContain("OVERWRITE a.txt");
    expect(await readFile(join(root, "a.txt"), "utf8")).toBe("new");
  });

});

describe("edit", () => {
  beforeEach(async () => {
    await writeFile(join(root, "a.txt"), "one two three");
  });


  it("keeps $ patterns in newText literal", async () => {
    await edit({ path: "a.txt", oldText: "two", newText: "$& $1" }, root, yes());
    expect(await readFile(join(root, "a.txt"), "utf8")).toBe("one $& $1 three");
  });

  it("errors when oldText is not found, without asking", async () => {
    const confirm = yes();
    await expect(edit({ path: "a.txt", oldText: "zzz", newText: "x" }, root, confirm)).rejects.toThrow("not found");
    expect(confirm).not.toHaveBeenCalled();
  });



  it("errors on empty oldText", async () => {
    await expect(edit({ path: "a.txt", oldText: "", newText: "x" }, root, yes())).rejects.toThrow("must not be empty");
  });


  it("rejects a path outside the root", async () => {
    await expect(edit({ path: "../a.txt", oldText: "x", newText: "y" }, root, yes())).rejects.toThrow("outside project root");
  });
});

describe("preview", () => {
  it("shows short text as is and cuts long text", () => {
    expect(preview("a\nb")).toBe("a\nb");
    expect(preview("1\n2\n3\n4", 2)).toBe("1\n2\n... (2 more lines)");
  });
});
