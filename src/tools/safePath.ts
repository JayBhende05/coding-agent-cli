import { isAbsolute, relative, resolve } from "node:path";

export function safePath(p: string, root = process.cwd()): string {
  const resolved = resolve(root, p);
  const rel = relative(root, resolved);
  
  if (rel === ".." || rel.startsWith(`..\\`) || rel.startsWith("../") || isAbsolute(rel)) {
    throw new Error(`path outside project root: ${p}`);
  }
  return resolved;
}
