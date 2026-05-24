// Smart importers: GitHub repos, WordPress XML exports, screenshots.
// All produce a ProjectContent that can be saved as an imported template
// or directly as a new project.
import { createBlock, DEFAULT_BRANDING, type ProjectContent, uid } from "@/lib/blocks";
import { ai } from "@/lib/ai-gateway";

export type SmartImportResult = {
  content: ProjectContent;
  detectedTitle: string;
  source: "github" | "wordpress" | "screenshot";
  blockCount: number;
};

// ---------- GitHub ----------

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (!/github\.com$/.test(u.hostname)) return null;
    const [owner, repo] = u.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch { return null; }
}

export async function importFromGitHub(url: string): Promise<SmartImportResult> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) throw new Error("Not a valid GitHub repo URL");
  const { owner, repo } = parsed;
  const meta = await fetch(`https://api.github.com/repos/${owner}/${repo}`).then((r) => {
    if (!r.ok) throw new Error(`GitHub API ${r.status}`);
    return r.json();
  });
  const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
    headers: { Accept: "application/vnd.github.raw" },
  });
  const readme = readmeRes.ok ? await readmeRes.text() : "";

  const title: string = meta.name || repo;
  const description: string = meta.description || "Open-source project";
  const stars = meta.stargazers_count || 0;
  const homepage = meta.homepage || `https://github.com/${owner}/${repo}`;

  // Extract first H1, install snippet, feature bullets from README (heuristic)
  const features = (readme.match(/^[-*]\s+(.{8,140})$/gm) || [])
    .slice(0, 6)
    .map((l) => l.replace(/^[-*]\s+/, "").trim());

  const navbar = createBlock("navbar");
  navbar.props = {
    links: [
      { label: "Docs", href: meta.homepage || `https://github.com/${owner}/${repo}#readme` },
      { label: "GitHub", href: `https://github.com/${owner}/${repo}` },
    ],
    ctaLabel: "Star on GitHub",
    ctaHref: `https://github.com/${owner}/${repo}`,
  };

  const hero = createBlock("hero");
  hero.props = {
    eyebrow: `⭐ ${stars.toLocaleString()} stars`,
    headline: title,
    subheadline: description,
    ctaLabel: "View on GitHub",
    ctaHref: `https://github.com/${owner}/${repo}`,
    secondaryLabel: "Read the docs",
    secondaryHref: homepage,
  };

  const blocks = [navbar, hero];

  if (features.length >= 3) {
    const feat = createBlock("features");
    feat.props = {
      title: "Highlights",
      subtitle: "Pulled from the project README.",
      items: features.slice(0, 6).map((f) => ({ icon: "✨", title: f.split(/[:.\-—]/)[0].slice(0, 60), body: f.slice(0, 180) })),
    };
    blocks.push(feat);
  }

  const cta = createBlock("cta");
  cta.props = {
    headline: `Get started with ${title}`,
    subheadline: description,
    ctaLabel: "Open repository",
    ctaHref: `https://github.com/${owner}/${repo}`,
  };
  blocks.push(cta);

  const footer = createBlock("footer");
  footer.props = {
    tagline: `${title} — open source on GitHub`,
    columns: [
      { title: "Project", links: [
        { label: "Repository", href: `https://github.com/${owner}/${repo}` },
        { label: "Issues", href: `https://github.com/${owner}/${repo}/issues` },
      ] },
    ],
  };
  blocks.push(footer);

  const content: ProjectContent = {
    branding: { ...DEFAULT_BRANDING, siteName: title },
    pages: [{ id: uid("page"), name: "Home", blocks }],
  };
  return { content, detectedTitle: title, source: "github", blockCount: blocks.length };
}

// ---------- WordPress WXR (XML) ----------

export function importFromWordpressXml(xml: string): SmartImportResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const channelTitle = doc.querySelector("channel > title")?.textContent?.trim() || "Imported site";
  const channelDesc = doc.querySelector("channel > description")?.textContent?.trim() || "";
  const items = Array.from(doc.querySelectorAll("item")).filter(
    (it) => (it.querySelector("post_type, *|post_type")?.textContent || "post").match(/post|page/),
  );

  const navbar = createBlock("navbar");
  navbar.props = { links: [{ label: "Posts", href: "#posts" }], ctaLabel: "Read", ctaHref: "#posts" };

  const hero = createBlock("hero");
  hero.props = {
    eyebrow: "Imported from WordPress",
    headline: channelTitle,
    subheadline: channelDesc,
    ctaLabel: "Browse posts",
    ctaHref: "#posts",
  };

  const blocks = [navbar, hero];

  const posts = items.slice(0, 9).map((it) => ({
    title: it.querySelector("title")?.textContent?.trim() || "Untitled",
    excerpt: (it.querySelector("description")?.textContent || it.textContent || "").replace(/<[^>]+>/g, "").trim().slice(0, 200),
  }));

  if (posts.length) {
    const feat = createBlock("features");
    feat.props = {
      title: "Recent posts",
      subtitle: `Imported ${posts.length} item(s) from your WordPress export.`,
      items: posts.map((p) => ({ icon: "📝", title: p.title.slice(0, 70), body: p.excerpt })),
    };
    blocks.push(feat);
  }

  const footer = createBlock("footer");
  footer.props = { tagline: channelTitle, columns: [] };
  blocks.push(footer);

  return {
    content: {
      branding: { ...DEFAULT_BRANDING, siteName: channelTitle },
      pages: [{ id: uid("page"), name: "Home", blocks }],
    },
    detectedTitle: channelTitle,
    source: "wordpress",
    blockCount: blocks.length,
  };
}

// ---------- Screenshot ----------

export async function importFromScreenshot(file: File): Promise<SmartImportResult> {
  const b64 = await fileToBase64(file);
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: {
      task: "analyze_screenshot",
      payload: {
        prompt: "Identify sections, color palette and dominant style of this website screenshot. Reply only with JSON.",
        imageBase64: b64.data, mime: b64.mime,
      },
    },
  });
  if (error) throw error;
  const text = (data as any)?.result?.analysis || "";
  let palette: string[] = []; let sections: string[] = [];
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      palette = (parsed.palette || []).slice(0, 5);
      sections = (parsed.sections || []).slice(0, 8);
    }
  } catch { /* ignore */ }

  // Hand off to generate-blocks for an actual layout based on the analysis
  const prompt = `Build a landing page inspired by a website with these sections: ${sections.join(", ") || "navbar, hero, features, cta, footer"}. Color palette hint: ${palette.join(", ") || "modern, vibrant"}.`;
  const { data: gen, error: gErr } = await supabase.functions.invoke("generate-blocks", { body: { prompt } });
  if (gErr) throw gErr;
  const generated = (gen as any)?.blocks;
  const blocks = Array.isArray(generated) && generated.length
    ? generated.map((b: any) => ({ id: uid(b.type || "blk"), type: b.type, props: b.props || {} }))
    : [createBlock("navbar"), createBlock("hero"), createBlock("footer")];

  const primary = palette[0] && /^#?[0-9a-f]{3,8}$/i.test(palette[0].replace("#", ""))
    ? (palette[0].startsWith("#") ? palette[0] : `#${palette[0]}`)
    : DEFAULT_BRANDING.primaryColor;

  return {
    content: {
      branding: { ...DEFAULT_BRANDING, primaryColor: primary, siteName: "Imported site" },
      pages: [{ id: uid("page"), name: "Home", blocks }],
    },
    detectedTitle: "Imported from screenshot",
    source: "screenshot",
    blockCount: blocks.length,
  };
}

async function fileToBase64(file: File): Promise<{ data: string; mime: string }> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return { data: btoa(binary), mime: file.type || "image/png" };
}
