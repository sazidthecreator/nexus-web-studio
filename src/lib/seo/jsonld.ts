// JSON-LD schema generators. Returns a script tag string or object.
import type { Block, ProjectContent } from "@/lib/blocks";

export type SchemaType = "WebSite" | "LocalBusiness" | "Article" | "FAQPage" | "Organization";

export type SchemaInput = {
  type: SchemaType;
  url?: string;
  name?: string;
  description?: string;
  image?: string;
  // LocalBusiness
  telephone?: string;
  address?: { street?: string; city?: string; region?: string; postalCode?: string; country?: string };
  // Article
  author?: string;
  datePublished?: string;
  // FAQ
  faqs?: { question: string; answer: string }[];
};

export function buildJsonLd(input: SchemaInput): Record<string, any> {
  const base: Record<string, any> = { "@context": "https://schema.org", "@type": input.type };
  if (input.name) base.name = input.name;
  if (input.url) base.url = input.url;
  if (input.description) base.description = input.description;
  if (input.image) base.image = input.image;

  if (input.type === "LocalBusiness") {
    if (input.telephone) base.telephone = input.telephone;
    if (input.address) {
      base.address = {
        "@type": "PostalAddress",
        streetAddress: input.address.street,
        addressLocality: input.address.city,
        addressRegion: input.address.region,
        postalCode: input.address.postalCode,
        addressCountry: input.address.country,
      };
    }
  }
  if (input.type === "Article") {
    if (input.author) base.author = { "@type": "Person", name: input.author };
    if (input.datePublished) base.datePublished = input.datePublished;
  }
  if (input.type === "FAQPage" && input.faqs?.length) {
    base.mainEntity = input.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    }));
  }
  return base;
}

export function jsonLdScript(data: Record<string, any>) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

// Auto-detect FAQ blocks (heuristic) from content
export function autoFaqsFromContent(content: ProjectContent): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];
  const blocks: Block[] = (content.pages || []).flatMap((p) => p.blocks || []);
  for (const b of blocks) {
    const items = (b.props?.faqs || b.props?.questions || b.props?.items) as any[] | undefined;
    if (Array.isArray(items)) {
      for (const it of items) {
        const q = it?.question || it?.q || it?.title;
        const a = it?.answer || it?.a || it?.text || it?.description;
        if (q && a) faqs.push({ question: String(q), answer: String(a) });
      }
    }
  }
  return faqs;
}
