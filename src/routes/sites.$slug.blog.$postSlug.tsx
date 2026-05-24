// Public blog post: /sites/:slug/blog/:postSlug
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { getPublishedPost } from "@/lib/blog.functions";
import { renderMarkdown } from "@/lib/markdown";
import { useMemo } from "react";

export const Route = createFileRoute("/sites/$slug/blog/$postSlug")({
  loader: async ({ params }) => {
    try {
      return await getPublishedPost({ data: { slug: params.slug, postSlug: params.postSlug } });
    } catch (err: any) {
      if (err?.statusCode === 404) throw notFound();
      throw err;
    }
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    return {
      meta: [
        { title: post?.title ?? "Post" },
        { name: "description", content: post?.excerpt ?? "" },
        { property: "og:title", content: post?.title ?? "" },
        { property: "og:description", content: post?.excerpt ?? "" },
        ...(post?.cover_url ? [{ property: "og:image", content: post.cover_url as string }] : []),
        { property: "og:type", content: "article" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-dvh flex items-center justify-center">
      <p className="text-muted-foreground">Post not found.</p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-dvh flex items-center justify-center">
      <p className="text-destructive">{error.message}</p>
    </div>
  ),
  component: PostPage,
});

function PostPage() {
  const { project, post } = Route.useLoaderData();
  const html = useMemo(() => renderMarkdown(post.body || ""), [post.body]);
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto max-w-3xl px-6 py-6 flex items-center justify-between">
          <Link to="/sites/$slug/blog" params={{ slug: project.slug! }} className="text-sm text-muted-foreground hover:text-foreground">
            ← Blog
          </Link>
          <Link to="/sites/$slug" params={{ slug: project.slug! }} className="text-sm text-muted-foreground hover:text-foreground">
            {project.name}
          </Link>
        </div>
      </header>
      <main>
        <article className="container mx-auto max-w-3xl px-6 py-10">
          {post.cover_url && (
            <img src={post.cover_url} alt="" className="w-full aspect-[2/1] object-cover rounded-xl mb-8" />
          )}
          <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
          {post.excerpt && <p className="text-lg text-muted-foreground mt-3">{post.excerpt}</p>}
          {post.published_at && (
            <time className="text-xs text-muted-foreground block mt-2">
              {new Date(post.published_at).toLocaleDateString()}
            </time>
          )}
          <div
            className="prose prose-neutral dark:prose-invert max-w-none mt-8"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </main>
    </div>
  );
}
