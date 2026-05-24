// Global Cmd-K command palette. Lists projects + quick navigation + theme.
// Mounted once in __root and toggled with ⌘K / Ctrl-K from anywhere.
import { useEffect, useState, useSyncExternalStore } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  Plus, LayoutTemplate, Palette, Key, Settings, LayoutDashboard, Sun, Moon, LogOut, Sparkles, Archive, ArchiveRestore, Eye, EyeOff, Timer,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { getArchivedIds, restoreProject, subscribeArchive } from "@/lib/archive";

function useArchivedSet(): Set<string> {
  return useSyncExternalStore(
    subscribeArchive,
    () => {
      const key = getArchivedIds().sort().join(",");
      const cache = (useArchivedSet as any)._c as { key: string; set: Set<string> } | undefined;
      if (cache && cache.key === key) return cache.set;
      const set = new Set(key ? key.split(",") : []);
      (useArchivedSet as any)._c = { key, set };
      return set;
    },
    () => new Set<string>(),
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const archived = useArchivedSet();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ["palette-projects", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,name,updated_at,published")
        .order("updated_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as { id: string; name: string; updated_at: string; published: boolean }[];
    },
  });

  const go = (fn: () => void) => { setOpen(false); fn(); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, jump to a page, run a command…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {user && (
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => go(() => navigate({ to: "/dashboard", search: { newProject: 1 } as any }))}>
              <Plus className="size-4" /> New project
            </CommandItem>
            <CommandItem onSelect={() => go(() => navigate({ to: "/templates" }))}>
              <LayoutTemplate className="size-4" /> Browse templates
            </CommandItem>
            <CommandItem
              value={includeArchived ? "hide archived projects" : "show archived projects"}
              onSelect={() => setIncludeArchived((v) => !v)}
            >
              {includeArchived ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {includeArchived ? "Hide archived projects" : "Show archived projects"}
              {archived.size > 0 && (
                <span className="ml-auto text-[10px] uppercase text-muted-foreground">{archived.size}</span>
              )}
            </CommandItem>
          </CommandGroup>
        )}

        {user && projects.length > 0 && (() => {
          const active = projects.filter((p) => !archived.has(p.id));
          const archivedList = projects.filter((p) => archived.has(p.id));
          return (
            <>
              {active.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Recent projects">
                    {active.slice(0, 8).map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`project ${p.name}`}
                        onSelect={() => go(() => navigate({ to: "/editor/$projectId", params: { projectId: p.id } }))}
                      >
                        <Sparkles className="size-4" />
                        <span className="flex-1 truncate">{p.name}</span>
                        {p.published && <span className="text-[10px] uppercase text-muted-foreground">Live</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              {includeArchived && archivedList.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Archived projects">
                    {archivedList.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`archived project ${p.name}`}
                        onSelect={() => go(() => navigate({ to: "/editor/$projectId", params: { projectId: p.id } }))}
                      >
                        <Archive className="size-4" />
                        <span className="flex-1 truncate">{p.name}</span>
                        <button
                          type="button"
                          className="text-[10px] uppercase text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            restoreProject(p.id);
                            toast.success(`Restored "${p.name}"`);
                          }}
                          aria-label={`Restore ${p.name}`}
                        >
                          <ArchiveRestore className="size-3" /> Restore
                        </button>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          );
        })()}

        {user && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => go(() => navigate({ to: "/dashboard" }))}>
                <LayoutDashboard className="size-4" /> Dashboard
              </CommandItem>
              <CommandItem onSelect={() => go(() => navigate({ to: "/brand-kit" }))}>
                <Palette className="size-4" /> Brand kit
              </CommandItem>
              <CommandItem onSelect={() => go(() => navigate({ to: "/focus" }))}>
                <Timer className="size-4" /> Focus timer
              </CommandItem>
              <CommandItem onSelect={() => go(() => navigate({ to: "/ai-keys" }))}>
                <Key className="size-4" /> AI keys
              </CommandItem>
              <CommandItem onSelect={() => go(() => navigate({ to: "/settings" }))}>
                <Settings className="size-4" /> Settings
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Preferences">
          <CommandItem onSelect={() => go(() => toggleTheme())}>
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            Toggle {theme === "dark" ? "light" : "dark"} mode
          </CommandItem>
          {user && (
            <CommandItem onSelect={() => go(() => signOut())}>
              <LogOut className="size-4" /> Sign out
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
