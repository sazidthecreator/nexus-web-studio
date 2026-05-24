// Export/import the full editable template (block-tree) JSON.
// Round-trips perfectly with the in-app editor.
import type { ProjectContent } from "./blocks";
import { validateCommunityTemplate } from "./templates";

export type ExportedTemplate = {
  $schema: "sitely.template.v1";
  name: string;
  description?: string;
  category?: string;
  exportedAt: string;
  content: ProjectContent;
};

export function exportTemplateJson(name: string, content: ProjectContent, opts?: { description?: string; category?: string }) {
  const payload: ExportedTemplate = {
    $schema: "sitely.template.v1",
    name,
    description: opts?.description,
    category: opts?.category,
    exportedAt: new Date().toISOString(),
    content,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(name)}.template.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importTemplateFromFile(file: File): Promise<ExportedTemplate> {
  const text = await file.text();
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("File is not valid JSON."); }
  // Accept both ExportedTemplate and the community template schema.
  validateCommunityTemplate(raw);
  return raw as ExportedTemplate;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "template";
}
