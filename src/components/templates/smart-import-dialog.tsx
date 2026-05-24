// Smart import dialog: GitHub repo, WordPress XML, or screenshot.
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Github, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { importFromGitHub, importFromScreenshot, importFromWordpressXml } from "@/lib/smart-importers";
import type { ProjectContent } from "@/lib/blocks";

export function SmartImportDialog({
  userId, onImported,
}: { userId: string | undefined; onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("github");
  const [ghUrl, setGhUrl] = useState("");
  const [wpFile, setWpFile] = useState<File | null>(null);
  const [shotFile, setShotFile] = useState<File | null>(null);

  async function persist(content: ProjectContent, name: string, sourceUrl: string) {
    if (!userId) throw new Error("Not signed in");
    const { error } = await supabase.from("imported_templates").insert({
      user_id: userId,
      name,
      source_url: sourceUrl,
      category: "Imported",
      thumbnail_url: null,
      content: content as any,
    });
    if (error) throw error;
  }

  async function run() {
    setBusy(true);
    try {
      if (tab === "github") {
        if (!ghUrl.trim()) throw new Error("Enter a GitHub repo URL");
        const r = await importFromGitHub(ghUrl.trim());
        await persist(r.content, r.detectedTitle, ghUrl.trim());
        toast.success(`Imported ${r.detectedTitle} — ${r.blockCount} blocks`);
      } else if (tab === "wordpress") {
        if (!wpFile) throw new Error("Choose a WordPress export XML file");
        const xml = await wpFile.text();
        const r = importFromWordpressXml(xml);
        await persist(r.content, r.detectedTitle, wpFile.name);
        toast.success(`Imported ${r.detectedTitle} — ${r.blockCount} blocks`);
      } else if (tab === "screenshot") {
        if (!shotFile) throw new Error("Choose a screenshot");
        const r = await importFromScreenshot(shotFile);
        await persist(r.content, r.detectedTitle, shotFile.name);
        toast.success(`Imported from screenshot — ${r.blockCount} blocks`);
      }
      onImported();
      setOpen(false);
      setGhUrl(""); setWpFile(null); setShotFile(null);
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Sparkles className="size-4 mr-2" /> Smart import</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Smart Import Hub</DialogTitle>
          <DialogDescription>Bring in content from GitHub, WordPress, or a screenshot.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="github" className="flex-1"><Github className="size-3.5 mr-1.5" /> GitHub</TabsTrigger>
            <TabsTrigger value="wordpress" className="flex-1"><FileText className="size-3.5 mr-1.5" /> WordPress</TabsTrigger>
            <TabsTrigger value="screenshot" className="flex-1"><ImageIcon className="size-3.5 mr-1.5" /> Screenshot</TabsTrigger>
          </TabsList>
          <TabsContent value="github" className="space-y-2 mt-3">
            <Label>Repository URL</Label>
            <Input placeholder="https://github.com/owner/repo" value={ghUrl} onChange={(e) => setGhUrl(e.target.value)} />
            <p className="text-xs text-muted-foreground">Pulls README, stars, and metadata to seed a landing page.</p>
          </TabsContent>
          <TabsContent value="wordpress" className="space-y-2 mt-3">
            <Label>WordPress export (.xml)</Label>
            <Input type="file" accept=".xml,text/xml" onChange={(e) => setWpFile(e.target.files?.[0] || null)} />
            <p className="text-xs text-muted-foreground">Tools → Export → All content from your WP admin.</p>
          </TabsContent>
          <TabsContent value="screenshot" className="space-y-2 mt-3">
            <Label>Website screenshot</Label>
            <Input type="file" accept="image/*" onChange={(e) => setShotFile(e.target.files?.[0] || null)} />
            <p className="text-xs text-muted-foreground">AI analyzes layout & palette, then drafts editable blocks.</p>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={run} disabled={busy}>
            {busy ? <><Loader2 className="size-4 mr-2 animate-spin" /> Importing…</> : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
