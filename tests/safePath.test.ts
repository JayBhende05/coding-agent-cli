import { basename, dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { safePath } from "../src/tools/safePath.ts";

const root = resolve("proj-root");

describe("safePath", () => {
  it("allows a file inside the root", () => {
    expect(safePath("a.txt", root)).toBe(join(root, "a.txt"));
  });

  it("allows the root itself", () => {
    expect(safePath(".", root)).toBe(root);
  });

  it("allows sub/../a.txt", () => {
    expect(safePath("sub/../a.txt", root)).toBe(join(root, "a.txt"));
  });

  it("rejects ../x", () => {
    expect(() => safePath("../x", root)).toThrow("outside project root");
  });

  it("rejects .. itself", () => {
    expect(() => safePath("..", root)).toThrow("outside project root");
  });




  it("allows an absolute path inside the root", () => {
    expect(safePath(join(root, "a.txt"), root)).toBe(join(root, "a.txt"));
  });
});
