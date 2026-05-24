// Public read of blog posts for /sites/:slug/blog and /sites/:slug/blog/:postSlug.
// RLS allows anon to read posts with status='published' on published projects.
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const ListInput = z.object({ slug: z.string() });
const PostInput = z.object({ slug: z.string(), postSlug: z.string() });

export const listPublishedPosts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ListInput.parse(d))
  .handler(async ({ data }) => {
    const { data: proj } = await supabase
      .from("projects")
      .select("id, name, slug, seo")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (!proj) {
      const e = new Error("Not found"); (e as any).statusCode = 404; throw e;
    }
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, cover_url, tags, published_at")
      .eq("project_id", proj.id)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error) throw error;
    setResponseHeaders(new Headers({
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    }));
    return { project: proj, posts: posts ?? [] };
  });

export const getPublishedPost = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PostInput.parse(d))
  .handler(async ({ data }) => {
    const { data: proj } = await supabase
      .from("projects")
      .select("id, name, slug, seo")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (!proj) { const e = new Error("Not found"); (e as any).statusCode = 404; throw e; }
    const { data: post, error } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, cover_url, body, tags, published_at")
      .eq("project_id", proj.id)
      .eq("slug", data.postSlug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    if (!post) { const e = new Error("Not found"); (e as any).statusCode = 404; throw e; }
    setResponseHeaders(new Headers({
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    }));
    return { project: proj, post };
  });
