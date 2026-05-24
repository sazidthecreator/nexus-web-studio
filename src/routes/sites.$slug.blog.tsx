// Public blog index for a published project: /sites/:slug/blog
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { listPublishedPosts } from "@/lib/blog.functions";

export const Route = createFileRoute("/sites/$slug/blog")({
  loader: async ({ params }) => {
    try {
      return await listPublishedPosts({ data: { slug: params.slug } });
    } catch (err: any) {
      if (err?.statusCode === 404) throw notFound();
      throw err;
    }
  },
  head: ({ loaderData }) => {
    const name = loaderData?.project?.name || "Blog";
    return {
      meta: [
        { title: `Blog — ${name}` },
        { name: "description", content: `Latest posts from ${name}.` },
        { property: "og:title", content: `Blog — ${name}` },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Blog not found.</p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-destructive">{error.message}</p>
    </div>
  ),
  component: BlogIndex,
});

function BlogIndex() {
  const { project, posts } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto max-w-4xl px-6 py-6 flex items-center justify-between">
          <Link to="/sites/$slug" params={{ slug: project.slug! }} className="text-sm text-muted-foreground hover:text-foreground">
            ← {project.name}
          </Link>
          <h1 className="text-lg font-semibold">Blog</h1>
        </div>
      </header>
      <main className="container mx-auto max-w-4xl px-6 py-10">
        {posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No posts yet.</p>
        ) : (
          <ul className="space-y-8">
            {posts.map((p: any) => (
              <li key={p.id} className="border-b pb-8 last:border-0">
                <Link to="/sites/$slug/blog/$postSlug" params={{ slug: project.slug!, postSlug: p.slug }} className="block group">
                  {p.cover_url && (
                    <img src={p.cover_url} alt="" className="w-full aspect-[2/1] object-cover rounded-xl mb-4" />
                  )}
                  <h2 className="text-2xl font-bold tracking-tight group-hover:underline">{p.title}</h2>
                  {p.excerpt && <p className="text-muted-foreground mt-2">{p.excerpt}</p>}
                  <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3">
                    {p.published_at && <time>{new Date(p.published_at).toLocaleDateString()}</time>}
                    {p.tags?.length > 0 && <span>{p.tags.join(" · ")}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
