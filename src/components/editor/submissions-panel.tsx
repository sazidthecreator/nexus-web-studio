// Form submissions viewer. Lists responses for the current project, grouped by form_id.
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Inbox, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export function SubmissionsPanel({
  open, onOpenChange, projectId,
}: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["form_responses", projectId, open],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_responses")
        .select("id, form_id, data, created_at, ip")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const grouped = (data || []).reduce<Record<string, any[]>>((acc: Record<string, any[]>, r: any) => {
    (acc[r.form_id] ||= []).push(r);
    return acc;
  }, {});

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Inbox className="size-4" /> Form submissions</SheetTitle>
          <SheetDescription>Responses sent through your published forms.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>}
          {error && <div className="text-sm text-destructive">{(error as Error).message}</div>}
          {!isLoading && !data?.length && (
            <div className="text-sm text-muted-foreground text-center py-8">No submissions yet.</div>
          )}
          {Object.entries(grouped).map(([formId, rows]) => (
            <div key={formId} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{formId.slice(0, 14)}</Badge>
                <span className="text-xs text-muted-foreground">{rows!.length} response(s)</span>
              </div>
              <div className="space-y-2">
                {rows!.map((r: any) => (
                  <div key={r.id} className="rounded-md border border-border p-3 text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                      <span>{r.ip || "—"}</span>
                    </div>
                    <div className="space-y-0.5">
                      {Object.entries(r.data || {}).map(([k, v]) => (
                        <div key={k}><span className="font-medium">{k}:</span> {String(v)}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
