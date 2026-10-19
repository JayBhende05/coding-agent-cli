const MAX_LINES = 2000;
const MAX_BYTES = 50 * 1024;

// keep the END of the output (errors and results are usually at the bottom) and say what was cut
export function truncateTail(text: string, maxLines = MAX_LINES, maxBytes = MAX_BYTES): string {
  const lines = text.split("\n");
  let kept = lines.slice(-maxLines);
  while (kept.length > 1 && Buffer.byteLength(kept.join("\n")) > maxBytes) kept.shift();
  let out = kept.join("\n");
  if (Buffer.byteLength(out) > maxBytes) out = out.slice(-maxBytes); // one giant line
  if (kept.length === lines.length && out.length === text.length) return text;
  return `[truncated: showing the last ${kept.length} of ${lines.length} lines]\n${out}`;
}

// keep the START of the output (file contents, search results) and say what was cut
export function truncateHead(text: string, maxLines = MAX_LINES, maxBytes = MAX_BYTES): string {
  const lines = text.split("\n");
  let kept = lines.slice(0, maxLines);
  while (kept.length > 1 && Buffer.byteLength(kept.join("\n")) > maxBytes) kept.pop();
  let out = kept.join("\n");
  if (Buffer.byteLength(out) > maxBytes) out = out.slice(0, maxBytes); // one giant line
  if (kept.length === lines.length && out.length === text.length) return text;
  return `${out}\n[truncated: showing the first ${kept.length} of ${lines.length} lines]`;
}
