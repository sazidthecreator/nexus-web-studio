import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Trash2, MessageSquare, CornerDownRight, Reply } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Comment = {
  id: string;
  user_id: string;
  page_id: string;
  block_id: string | null;
  body: string;
  resolved: boolean;
  parent_id: string | null;
  created_at: string;
};

export function CommentsPanel({
  open,
  onOpenChange,
  projectId,
  pageId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  pageId: string;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", projectId, pageId],
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await supabase
        .from("project_comments")
        .select("*")
        .eq("project_id", projectId)
        .eq("page_id", pageId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Comment[];
    },
    enabled: open,
  });

  // Group into threads
  const threads = useMemo(() => {
    const roots = comments.filter((c) => !c.parent_id);
    const childrenOf = (id: string) =>
      comments
        .filter((c) => c.parent_id === id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return roots
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((root) => ({ root, replies: childrenOf(root.id) }));
  }, [comments]);

  useEffect(() => {
    if (!open) return;
    const ch = supabase
      .channel(`comments:${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_comments", filter: `project_id=eq.${projectId}` },
        () => qc.invalidateQueries({ queryKey: ["comments", projectId, pageId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [open, projectId, pageId, qc]);

  const add = useMutation({
    mutationFn: async (opts: { text: string; parentId?: string | null }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("project_comments").insert({
        project_id: projectId,
        user_id: u.user.id,
        page_id: pageId,
        body: opts.text.trim(),
        parent_id: opts.parentId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      if (vars.parentId) {
        setReplyBody("");
        setReplyTo(null);
      } else {
        setBody("");
      }
      toast.success("Comment posted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggle = useMutation({
    mutationFn: async (c: Comment) => {
      const { error } = await supabase
        .from("project_comments")
        .update({ resolved: !c.resolved })
        .eq("id", c.id);
      if (error) throw error;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_comments").delete().eq("id", id);
      if (error) throw error;
    },
  });

  function CommentItem({ c, isReply = false }: { c: Comment; isReply?: boolean }) {
    return (
      <div
        className={`rounded-md border p-3 text-sm ${c.resolved ? "opacity-60" : ""} ${isReply ? "ml-6 border-l-2" : ""}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {isReply && <CornerDownRight className="size-3" />}
            {new Date(c.created_at).toLocaleString()}
          </span>
          {c.resolved && <Badge variant="secondary" className="text-xs">Resolved</Badge>}
        </div>
        <p className="whitespace-pre-wrap break-words">{c.body}</p>
        <div className="flex gap-1 mt-2">
          {!isReply && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
            >
              <Reply className="size-3.5" /> Reply
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => toggle.mutate(c)}>
            <Check className="size-3.5" /> {c.resolved ? "Reopen" : "Resolve"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => remove.mutate(c.id)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="size-4" /> Comments
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-2 mt-4">
          <Textarea
            placeholder="Leave a comment for collaborators…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
          <Button
            size="sm"
            disabled={!body.trim() || add.isPending}
            onClick={() => add.mutate({ text: body })}
          >
            {add.isPending ? "Posting…" : "Post comment"}
          </Button>
        </div>
        <div className="flex-1 overflow-auto mt-4 space-y-3">
          {threads.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No comments yet on this page.
            </p>
          )}
          {threads.map(({ root, replies }) => (
            <div key={root.id} className="space-y-2">
              <CommentItem c={root} />
              {replies.map((r) => (
                <CommentItem key={r.id} c={r} isReply />
              ))}
              {replyTo === root.id && (
                <div className="ml-6 space-y-2">
                  <Textarea
                    placeholder="Write a reply…"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!replyBody.trim() || add.isPending}
                      onClick={() => add.mutate({ text: replyBody, parentId: root.id })}
                    >
                      Post reply
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReplyTo(null);
                        setReplyBody("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
