// Custom HTML code injected into <head> and <body> of published pages.
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Code2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CustomCodePanel({
  open, onOpenChange, projectId, initialHead, initialBody, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  initialHead: string;
  initialBody: string;
  onSaved: (head: string, body: string) => void;
}) {
  const [head, setHead] = useState(initialHead);
  const [body, setBody] = useState(initialBody);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setHead(initialHead); setBody(initialBody); }
  }, [open, initialHead, initialBody]);

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("projects")
      .update({ head_code: head, body_code: body })
      .eq("id", projectId);
    setBusy(false);
    if (error) return toast.error(error.message);
    onSaved(head, body);
    toast.success("Custom code saved");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Code2 className="size-4" /> Custom code</SheetTitle>
          <SheetDescription>HTML snippets injected on your published site (analytics, fonts, etc.).</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>{"Head <head>"}</Label>
            <Textarea rows={8} value={head} onChange={(e) => setHead(e.target.value)} placeholder="<!-- e.g. <link rel='icon' href='...'> -->" className="font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label>{"Body end <body>"}</Label>
            <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="<!-- e.g. <script>...</script> -->" className="font-mono text-xs" />
          </div>
          <Button onClick={save} disabled={busy} className="w-full">
            {busy && <Loader2 className="size-3.5 animate-spin" />} Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
