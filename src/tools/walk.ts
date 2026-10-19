import { readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const IGNORED_DIRS = new Set(["node_modules", ".git"]);

// path relative to root, always with forward slashes so output is the same on every OS
export function toRel(root: string, full: string): string {
  return relative(root, full).split(sep).join("/") || ".";
}

// yield every file under `start` (or `start` itself if it is a file), skipping node_modules and .git
export async function* walk(start: string): AsyncGenerator<string> {
  if ((await stat(start)).isFile()) {
    yield start;
    return;
  }
  const entries = await readdir(start, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = join(start, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    } // symlinks and other types are skipped
  }
}

// small glob: * (no slash), ** (any depth), ?  — a pattern without "/" matches the file name only
export function globMatcher(glob: string): (relPath: string) => boolean {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") {
        re += "(?:.*/)?";
        i += 2;
      } else {
        re += ".*";
        i += 1;
      }
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  const regex = new RegExp(`^${re}$`);
  const nameOnly = !glob.includes("/");
  return (relPath) => regex.test(nameOnly ? relPath.slice(relPath.lastIndexOf("/") + 1) : relPath);
}
