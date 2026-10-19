import { describe, expect, it } from "vitest";

import { truncateHead, truncateTail } from "../src/tools/truncate.ts";

const lines = (n: number) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n");

describe("truncateHead", () => {
  it("passes short text through unchanged", () => {
    expect(truncateHead("a\nb\nc")).toBe("a\nb\nc");
  });

  it("keeps the first lines and adds a note", () => {
    const out = truncateHead(lines(10), 3);
    expect(out).toBe("line 1\nline 2\nline 3\n[truncated: showing the first 3 of 10 lines]");
  });

  it("cuts by bytes", () => {
    const out = truncateHead(lines(100), 2000, 50);
    expect(out).toContain("[truncated");
    expect(out).toContain("line 1\n");
    expect(out).not.toContain("line 100");
  });

  it("cuts one giant line", () => {
    const out = truncateHead("x".repeat(1000), 2000, 100);
    expect(out.startsWith("x".repeat(100))).toBe(true);
    expect(out).toContain("[truncated");
  });
});

describe("truncateTail", () => {
  it("passes short text through unchanged", () => {
    expect(truncateTail("a\nb\nc")).toBe("a\nb\nc");
  });

  it("keeps the last lines and adds a note first", () => {
    const out = truncateTail(lines(10), 3);
    expect(out).toBe("[truncated: showing the last 3 of 10 lines]\nline 8\nline 9\nline 10");
  });

  it("cuts by bytes", () => {
    const out = truncateTail(lines(100), 2000, 50);
    expect(out).toContain("[truncated");
    expect(out).toContain("line 100");
    expect(out).not.toContain("line 1\n");
  });
});
