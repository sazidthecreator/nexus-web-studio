import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, Trash2, Copy, ExternalLink, Sparkles, FileText, LayoutTemplate, Wand2, Activity, Search, Inbox, Archive, ArchiveRestore, Command } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CreateProjectWizard } from "@/components/dashboard/create-project-wizard";
import { OnboardingWizard, type OnboardingResult } from "@/components/dashboard/onboarding-wizard";
import { computeDashboardHealth } from "@/lib/health/dashboard-health";
import { getArchivedIds, archiveProject, restoreProject, subscribeArchive } from "@/lib/archive";
import { generateThumbnailSvg, SAFE_FALLBACK_THUMBNAIL } from "@/lib/auto-thumbnail";
import { ActivityFeedPanel } from "@/components/dashboard/activity-feed-panel";
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel";
import { useProjectsPresence, type PresencePeer } from "@/lib/use-projects-presence";
import { PresenceAvatars } from "@/components/dashboard/presence-avatars";
import { cacheProjectList, getCachedProjectList, isOnline } from "@/lib/offline-cache";

function useArchivedIds(): Set<string> {
  return useSyncExternalStore(
    subscribeArchive,
    () => {
      // Build a stable string key so React only re-renders on changes.
      const ids = getArchivedIds().sort().join(",");
      const cache = (useArchivedIds as any)._c as { key: string; set: Set<string> } | undefined;
      if (cache && cache.key === ids) return cache.set;
      const set = new Set(ids ? ids.split(",") : []);
      (useArchivedIds as any)._c = { key: ids, set };
      return set;
    },
    () => new Set<string>(),
  );
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Sitely" }] }),
  component: DashboardPage,
});

type Project = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  published: boolean;
  updated_at: string;
  content?: any;
  seo?: any;
};

function DashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingResult | null>(null);

  // Show onboarding once on first visit (no projects + no localStorage flag).
  useEffect(() => {
    if (!user) return;
    try {
      if (!localStorage.getItem("sitely:onboarded")) setOnboardOpen(true);
    } catch { /* ignore */ }
  }, [user?.id]);

  const [online, setOnline] = useState(isOnline());
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id,name,description,thumbnail_url,published,updated_at,content,seo")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        if (user?.id) {
          void cacheProjectList(user.id, (data ?? []).map((p: any) => ({
            id: p.id, name: p.name, description: p.description,
            thumbnail_url: p.thumbnail_url, published: p.published, updated_at: p.updated_at,
          })));
        }
        return data as Project[];
      } catch (err) {
        // Network failure — fall back to cached list so dashboard still loads offline.
        const cached = user?.id ? await getCachedProjectList(user.id) : null;
        if (cached && cached.length) return cached as unknown as Project[];
        throw err;
      }
    },
    enabled: !!user,
  });

  const projectIds = projects.map((p) => p.id);
  const { data: submissionCounts = {} } = useQuery({
    queryKey: ["submission-counts", projectIds.join(",")],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_responses")
        .select("project_id, created_at")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const out: Record<string, { total: number; last?: string }> = {};
      for (const r of data || []) {
        const pid = (r as any).project_id as string;
        if (!out[pid]) out[pid] = { total: 0, last: (r as any).created_at };
        out[pid].total += 1;
      }
      return out;
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateProject = useMutation({
    mutationFn: async (p: Project) => {
      const { data: full, error: fetchErr } = await supabase
        .from("projects").select("*").eq("id", p.id).single();
      if (fetchErr) throw fetchErr;
      const { error } = await supabase.from("projects").insert({
        user_id: user!.id,
        name: full.name + " (copy)",
        description: full.description,
        content: full.content,
        seo: full.seo,
        template_id: full.template_id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Duplicated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const presenceMap = useProjectsPresence(projectIds);
  const archived = useArchivedIds();
  const [showArchived, setShowArchived] = useState(false);
  const visibleProjects = projects.filter((p) => showArchived ? archived.has(p.id) : !archived.has(p.id));
  const archivedCount = projects.filter((p) => archived.has(p.id)).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {!online && (
        <div
          role="status"
          className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
        >
          You're offline — showing the last cached project list. Edits will queue and sync when you reconnect.
        </div>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your projects</h1>
          <p className="text-muted-foreground mt-1">
            {projects.length === 0
              ? "No projects yet — create your first."
              : showArchived
                ? `${archivedCount} archived`
                : `${projects.length - archivedCount} active${archivedCount ? ` · ${archivedCount} archived` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex gap-2 text-muted-foreground"
            onClick={() => {
              const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
              window.dispatchEvent(ev);
            }}
            aria-label="Open command palette"
          >
            <Command className="size-3.5" /> Search <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]">⌘K</kbd>
          </Button>
          {archivedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived((v) => !v)}
              aria-pressed={showArchived}
            >
              <Archive className="size-4" />
              {showArchived ? "Show active" : `Archived (${archivedCount})`}
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)} size="lg" className="shadow-[var(--shadow-elegant)]">
            <Plus className="size-4" /> New project
          </Button>
        </div>
      </div>

      {/* Quick start tiles */}
      {!showArchived && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <QuickStart icon={Sparkles} title="Start with AI" desc="Describe your site and let AI draft it." onClick={() => setCreateOpen(true)} accent />
          <QuickStart icon={LayoutTemplate} title="Browse templates" desc="Hand-crafted starting points." onClick={() => navigate({ to: "/templates" })} />
          <QuickStart icon={FileText} title="Blank canvas" desc="Build from scratch with full control." onClick={() => setCreateOpen(true)} />
        </div>
      )}

      {/* Projects grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card h-64 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 sm:p-16 text-center relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ background: "var(--gradient-primary)" }}
          />
          <div className="size-16 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-primary)" }}>
            <Wand2 className="size-7 text-primary-foreground" />
          </div>
          <h3 className="font-semibold text-xl">Let's build your first site</h3>
          <p className="text-muted-foreground text-sm mt-2 mb-6 max-w-md mx-auto">
            Pick a template, describe it to AI, or start from a blank canvas. Everything edits visually — no code required.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button onClick={() => setCreateOpen(true)} size="lg">
              <Sparkles className="size-4" /> Create project
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate({ to: "/templates" })}>
              <LayoutTemplate className="size-4" /> Browse templates
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setOnboardOpen(true)}>
              Take the quick tour
            </Button>
          </div>
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {showArchived ? "No archived projects." : "All projects are archived. Toggle archived to see them."}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                submissions={submissionCounts[p.id]}
                peers={presenceMap[p.id] || []}
                archived={archived.has(p.id)}
                onDelete={() => deleteProject.mutate(p.id)}
                onDuplicate={() => duplicateProject.mutate(p)}
                onArchive={() => { archiveProject(p.id); toast.success("Archived"); }}
                onRestore={() => { restoreProject(p.id); toast.success("Restored"); }}
              />
            ))}
          </div>
          {user && !showArchived && (
            <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
              <AnalyticsPanel projects={projects.map((p) => ({ id: p.id, name: p.name, published: p.published }))} />
              <ActivityFeedPanel userId={user.id} />
            </aside>
          )}
        </div>
      )}

      <CreateProjectWizard open={createOpen} onOpenChange={setCreateOpen} initial={onboarding ?? undefined} />
      <OnboardingWizard
        open={onboardOpen}
        onOpenChange={setOnboardOpen}
        onComplete={(r) => {
          setOnboarding(r);
          if (r.start === "template") navigate({ to: "/templates" });
          else setCreateOpen(true);
        }}
      />
    </div>
  );
}

function QuickStart({ icon: Icon, title, desc, onClick, accent }: { icon: any; title: string; desc: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-5 transition-all hover:shadow-[var(--shadow-elegant)] hover:border-primary/40 ${accent ? "border-primary/30 bg-accent/40" : "border-border bg-card"}`}
    >
      <div className="size-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "var(--gradient-primary)" }}>
        <Icon className="size-5 text-primary-foreground" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
    </button>
  );
}

function ProjectCard({
  project, submissions, peers, archived, onDelete, onDuplicate, onArchive, onRestore,
}: {
  project: Project;
  submissions?: { total: number; last?: string };
  peers: PresencePeer[];
  archived: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const health = computeDashboardHealth(project.content, project.seo);
  const dotClass = health.level === "good"
    ? "bg-emerald-500"
    : health.level === "warn"
      ? "bg-amber-500"
      : "bg-rose-500";
  const healthLabel = `Health ${health.score}/100${health.reasons.length ? ` — ${health.reasons.join(", ")}` : ""}`;

  // SEO score: title + description + og image presence
  const seo = (project.seo || {}) as { title?: string; description?: string; ogImage?: string; og_image?: string };
  let seoScore = 0;
  const seoMissing: string[] = [];
  if (seo.title?.trim()) seoScore += 40; else seoMissing.push("title");
  if (seo.description?.trim()) seoScore += 40; else seoMissing.push("description");
  if (seo.ogImage || seo.og_image) seoScore += 20; else seoMissing.push("OG image");
  const seoLevel: "good" | "warn" | "bad" = seoScore >= 80 ? "good" : seoScore >= 40 ? "warn" : "bad";

  const subTotal = submissions?.total ?? 0;
  const subLevel: "good" | "warn" | "bad" = subTotal > 0 ? "good" : project.published ? "warn" : "bad";

  // Auto-thumbnail: use stored thumbnail_url, else derive deterministic SVG.
  // Generation is wrapped in try/catch internally and returns SAFE_FALLBACK_THUMBNAIL on failure.
  const thumb = project.thumbnail_url || generateThumbnailSvg(project.content, project.name);

  return (
    <div className={`group rounded-xl border border-border bg-card overflow-hidden hover:shadow-[var(--shadow-elegant)] hover:border-primary/40 transition-all ${archived ? "opacity-70" : ""}`}>
      <Link to="/editor/$projectId" params={{ projectId: project.id }} className="block aspect-video relative" style={{ background: "var(--gradient-hero)" }} aria-label={`Open ${project.name} in editor`}>
        <img
          src={thumb}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src !== SAFE_FALLBACK_THUMBNAIL) img.src = SAFE_FALLBACK_THUMBNAIL;
          }}
        />
        <span
          className={`absolute top-2 left-2 size-2.5 rounded-full ring-2 ring-background ${dotClass}`}
          title={healthLabel}
          aria-label={healthLabel}
        />
        {archived && (
          <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide bg-background/80 backdrop-blur px-1.5 py-0.5 rounded">
            Archived
          </span>
        )}
        {peers.length > 0 && !archived && (
          <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur rounded-full px-1 py-1 shadow-sm">
            <PresenceAvatars peers={peers} />
          </div>
        )}
      </Link>
      <div className="relative">
        <div className="absolute -top-10 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="secondary" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Project actions">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}><Copy className="size-4" /> Duplicate</DropdownMenuItem>
              {archived ? (
                <DropdownMenuItem onClick={onRestore}><ArchiveRestore className="size-4" /> Restore</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onArchive}><Archive className="size-4" /> Archive</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Link to="/editor/$projectId" params={{ projectId: project.id }} className="block p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold truncate">{project.name}</h3>
            {project.published && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground shrink-0 inline-flex items-center gap-1">
                <ExternalLink className="size-3" /> Live
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <StatusChip
              icon={Activity}
              label="Health"
              value={`${health.score}`}
              level={health.level}
              title={healthLabel}
            />
            <StatusChip
              icon={Search}
              label="SEO"
              value={`${seoScore}`}
              level={seoLevel}
              title={seoMissing.length ? `Missing: ${seoMissing.join(", ")}` : "SEO complete"}
            />
            <StatusChip
              icon={Inbox}
              label="Forms"
              value={`${subTotal}`}
              level={subLevel}
              title={subTotal > 0 ? `${subTotal} submission(s)` : project.published ? "No submissions yet" : "Publish to collect submissions"}
            />
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatusChip({ icon: Icon, label, value, level, title }: { icon: any; label: string; value: string; level: "good" | "warn" | "bad"; title: string }) {
  const tone =
    level === "good" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : level === "warn" ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
    : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400";
  return (
    <div className={`rounded-md border px-2 py-1.5 ${tone}`} title={title} aria-label={`${label}: ${value} — ${title}`}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-80">
        <Icon className="size-3" /> {label}
      </div>
      <div className="text-sm font-semibold leading-tight">{value}</div>
    </div>
  );
}