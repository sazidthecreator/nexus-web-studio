// Toolbar control: export current canvas as template JSON, or import one.
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileJson, Upload } from "lucide-react";
import { toast } from "sonner";
import { exportTemplateJson, importTemplateFromFile } from "@/lib/template-io";
import type { ProjectContent } from "@/lib/blocks";

export function TemplateIoButtons({
  content, projectName, onImport,
}: { content: ProjectContent | null; projectName: string; onImport: (c: ProjectContent) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        title="Export template JSON"
        onClick={() => {
          if (!content) return;
          exportTemplateJson(projectName, content, { description: "Exported from Sitely editor" });
          toast.success("Template JSON downloaded");
        }}
      >
        <FileJson className="size-4" /> Template JSON
      </Button>
      <Button
        size="sm"
        variant="ghost"
        title="Import template JSON"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-4" /> Import
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            const t = await importTemplateFromFile(f);
            onImport(t.content);
            toast.success(`Loaded "${t.name}"`);
          } catch (err: any) {
            toast.error(err?.message ?? "Import failed");
          }
        }}
      />
    </>
  );
}
