// Built-in blog/CMS panel — manage markdown posts per project.
// Opens as a side sheet from the editor. Posts publish to /sites/:slug/blog.
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Eye, Save, Loader2, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { renderMarkdown } from "@/lib/markdown";

type Post = {
  id: string;
  project_id: string;
  user_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  body: string;
  tags: string[];
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export function BlogPanel({
  open,
  onOpenChange,
  projectId,
  projectSlug,
  projectPublished,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectSlug: string | null;
  projectPublished: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts", projectId],
    enabled: open && !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Post[];
    },
  });

  const editing = useMemo(() => posts.find((p) => p.id === editingId) ?? null, [posts, editingId]);

  const createPost = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const base = `untitled-${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from("blog_posts")
        .insert({
          project_id: projectId,
          user_id: user.id,
          slug: base,
          title: "Untitled post",
          body: "# Untitled post\n\nStart writing here.",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Post;
    },
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: ["blog-posts", projectId] });
      setEditingId(post.id);
      toast.success("Draft created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-posts", projectId] });
      setEditingId(null);
      toast.success("Post deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-5xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2"><FileText className="size-4" /> Blog & CMS</SheetTitle>
          <SheetDescription>
            Author markdown posts. Published posts appear at{" "}
            {projectPublished && projectSlug ? (
              <a href={`/sites/${projectSlug}/blog`} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
                /sites/{projectSlug}/blog <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="text-muted-foreground">/sites/{"<slug>"}/blog (publish your site first)</span>
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 grid grid-cols-[260px_1fr] min-h-0">
          {/* Post list */}
          <aside className="border-r overflow-y-auto">
            <div className="p-3 border-b">
              <Button size="sm" className="w-full" onClick={() => createPost.mutate()} disabled={createPost.isPending}>
                <Plus className="size-3.5" /> New post
              </Button>
            </div>
            <ul className="text-sm">
              {isLoading && <li className="p-4 text-muted-foreground text-xs">Loading…</li>}
              {!isLoading && posts.length === 0 && (
                <li className="p-4 text-muted-foreground text-xs">No posts yet.</li>
              )}
              {posts.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => { setEditingId(p.id); setPreviewing(false); }}
                    className={`w-full text-left px-3 py-2.5 border-b hover:bg-accent/40 ${editingId === p.id ? "bg-accent/60" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{p.title || "Untitled"}</span>
                      <span className={`text-[10px] uppercase tracking-wide shrink-0 rounded px-1.5 py-0.5 ${p.status === "published" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">/{p.slug}</div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Editor */}
          <section className="overflow-y-auto">
            {!editing ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
                Select a post on the left or create a new one to start writing.
              </div>
            ) : previewing ? (
              <PostPreview post={editing} onBack={() => setPreviewing(false)} />
            ) : (
              <PostEditor
                key={editing.id}
                post={editing}
                projectId={projectId}
                projectSlug={projectSlug}
                projectPublished={projectPublished}
                onSaved={() => qc.invalidateQueries({ queryKey: ["blog-posts", projectId] })}
                onDelete={() => deletePost.mutate(editing.id)}
                onPreview={() => setPreviewing(true)}
              />
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PostEditor({
  post, projectId, projectSlug, projectPublished, onSaved, onDelete, onPreview,
}: {
  post: Post;
  projectId: string;
  projectSlug: string | null;
  projectPublished: boolean;
  onSaved: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [excerpt, setExcerpt] = useState(post.excerpt ?? "");
  const [coverUrl, setCoverUrl] = useState(post.cover_url ?? "");
  const [body, setBody] = useState(post.body);
  const [tags, setTags] = useState(post.tags.join(", "));
  const [status, setStatus] = useState<"draft" | "published">(post.status);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setDirty(true); }, [title, slug, excerpt, coverUrl, body, tags, status]);
  useEffect(() => { setDirty(false); }, [post.id]);

  async function save() {
    const cleanSlug = slugify(slug) || slugify(title) || `post-${Date.now().toString(36)}`;
    setBusy(true);
    const { error } = await supabase
      .from("blog_posts")
      .update({
        title: title.trim() || "Untitled",
        slug: cleanSlug,
        excerpt: excerpt.trim() || null,
        cover_url: coverUrl.trim() || null,
        body,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        status,
        published_at: status === "published" && !post.published_at ? new Date().toISOString() : post.published_at,
      })
      .eq("id", post.id);
    setBusy(false);
    if (error) {
      if ((error as any).code === "23505") return toast.error("Slug already used in this project");
      return toast.error(error.message);
    }
    setSlug(cleanSlug);
    setDirty(false);
    onSaved();
    toast.success(status === "published" ? "Post published" : "Draft saved");
  }

  const publicHref = projectPublished && projectSlug && post.status === "published"
    ? `/sites/${projectSlug}/blog/${post.slug}`
    : null;

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => { if (!slug || slug.startsWith("untitled-")) setSlug(slugify(title)); }}
          placeholder="Post title"
          className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 shadow-none"
        />
        <div className="flex items-center gap-1.5">
          {publicHref && (
            <a href={publicHref} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm"><ExternalLink className="size-3.5" /></Button>
            </a>
          )}
          <Button variant="ghost" size="sm" onClick={onPreview}><Eye className="size-3.5" /> Preview</Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive"><Trash2 className="size-3.5" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-post" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Cover image URL (optional)</Label>
          <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Excerpt</Label>
          <Textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary shown on the blog index." />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Tags (comma separated)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="release, product" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Body (Markdown)</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={18}
          className="font-mono text-sm"
          placeholder={"# Heading\n\nWrite your post in **markdown**…"}
        />
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">{dirty ? "Unsaved changes" : "Saved"}</p>
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {status === "published" ? "Save & publish" : "Save draft"}
        </Button>
      </div>
    </div>
  );
}

function PostPreview({ post, onBack }: { post: Post; onBack: () => void }) {
  const html = useMemo(() => renderMarkdown(post.body), [post.body]);
  return (
    <article className="p-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">← Back to edit</Button>
      {post.cover_url && <img src={post.cover_url} alt="" className="w-full rounded-xl mb-6 aspect-video object-cover" />}
      <h1 className="text-3xl font-bold tracking-tight mb-3">{post.title}</h1>
      {post.excerpt && <p className="text-muted-foreground mb-6">{post.excerpt}</p>}
      <div className="prose prose-neutral dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
