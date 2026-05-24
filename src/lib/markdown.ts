// Tiny wrapper around `marked` for rendering blog post markdown.
// Output is HTML; callers are responsible for trusting the input.
// Author-only writes (RLS), so we trust the project owner.
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(input: string): string {
  if (!input) return "";
  try {
    return marked.parse(input, { async: false }) as string;
  } catch {
    return `<pre>${escapeHtml(input)}</pre>`;
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
