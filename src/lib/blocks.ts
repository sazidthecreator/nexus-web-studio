// Reusable block definitions for the website builder.
// Each block is a serializable JSON node rendered by <BlockRenderer />.

export type BlockType =
  | "navbar"
  | "hero"
  | "heading"
  | "text"
  | "image"
  | "image_generation"
  | "gallery"
  | "button"
  | "video"
  | "divider"
  | "form"
  | "features"
  | "cta"
  | "install_prompt"
  | "cookie_consent"
  | "popup"
  | "footer";

export type Block = {
  id: string;
  type: BlockType;
  props: Record<string, any>;
};

export type Branding = {
  siteName: string;
  primaryColor: string; // hex
  fontFamily: string;
  /** Optional typography preset id from src/lib/typography.ts. */
  typographyPreset?: string;
};

export type PageSEO = {
  /** Override <title>. Falls back to "<page.name> — <site title>". */
  title?: string;
  /** Override <meta name="description">. Falls back to site SEO description. */
  description?: string;
  /** Override og:image / twitter:image. */
  ogImage?: string;
  /** Hide from generated nav pickers / sitemaps when true. */
  noindex?: boolean;
};

export type ProjectPage = {
  id: string;
  name: string;
  blocks: Block[];
  /** Optional URL slug override. When unset, derived from name. */
  slug?: string;
  /** Hide from auto-generated nav links. */
  hiddenFromNav?: boolean;
  /** Per-page SEO overrides — merged on top of site-level SEO. */
  seo?: PageSEO;
};

export type ProjectContent = {
  branding: Branding;
  pages: ProjectPage[];
};

export const FONTS = [
  { value: "Inter, system-ui, sans-serif", label: "Inter (Modern)" },
  { value: "'Playfair Display', Georgia, serif", label: "Playfair (Editorial)" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk (Tech)" },
  { value: "'DM Sans', sans-serif", label: "DM Sans (Friendly)" },
  { value: "'IBM Plex Mono', monospace", label: "IBM Plex Mono (Dev)" },
];

export const DEFAULT_BRANDING: Branding = {
  siteName: "My Website",
  primaryColor: "#7c5cff",
  fontFamily: FONTS[0].value,
};

let _id = 0;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}_${(_id++).toString(36)}`;

// Library of blocks the user can drag/drop. Each entry has a label,
// description, category, and a factory that yields a fresh JSON node.
export const BLOCK_LIBRARY: {
  type: BlockType;
  label: string;
  description: string;
  category: "Navigation" | "Hero" | "Content" | "Media" | "Conversion" | "Footer";
  create: () => Block;
}[] = [
  {
    type: "navbar",
    label: "Navbar",
    description: "Top navigation with logo and links",
    category: "Navigation",
    create: () => ({
      id: uid("nav"),
      type: "navbar",
      props: {
        links: [
          { label: "Features", href: "#features" },
          { label: "Pricing", href: "#pricing" },
          { label: "About", href: "#about" },
        ],
        ctaLabel: "Get started",
        ctaHref: "#",
      },
    }),
  },
  {
    type: "hero",
    label: "Hero",
    description: "Big headline + subheading + CTAs",
    category: "Hero",
    create: () => ({
      id: uid("hero"),
      type: "hero",
      props: {
        eyebrow: "Introducing",
        headline: "Build beautiful websites in minutes",
        subheadline: "A drag-and-drop builder with thoughtful defaults and powerful customization.",
        ctaLabel: "Start free",
        ctaHref: "#",
        secondaryLabel: "Learn more",
        secondaryHref: "#",
      },
    }),
  },
  {
    type: "heading",
    label: "Heading",
    description: "Section heading with optional subtitle",
    category: "Content",
    create: () => ({
      id: uid("h"),
      type: "heading",
      props: { title: "A bold section heading", subtitle: "Optional supporting copy.", align: "center" },
    }),
  },
  {
    type: "text",
    label: "Text",
    description: "Rich paragraph block",
    category: "Content",
    create: () => ({
      id: uid("txt"),
      type: "text",
      props: { body: "Write your content here. Tell visitors why they should care.", align: "left" },
    }),
  },
  {
    type: "image",
    label: "Image",
    description: "Single full-width image with caption",
    category: "Media",
    create: () => ({
      id: uid("img"),
      type: "image",
      props: { src: "", alt: "Image", caption: "", maxWidth: 960, rounded: true },
    }),
  },
  {
    type: "image_generation",
    label: "AI Image",
    description: "Generate an image from a prompt with AI",
    category: "Media",
    create: () => ({
      id: uid("aimg"),
      type: "image_generation",
      props: {
        prompt: "A minimalist product hero shot, soft studio lighting, on a warm beige background",
        src: "",
        alt: "",
        width: 1024,
        height: 768,
        rounded: true,
      },
    }),
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "3-column image grid",
    category: "Media",
    create: () => ({
      id: uid("gal"),
      type: "gallery",
      props: { images: [{ src: "", alt: "" }, { src: "", alt: "" }, { src: "", alt: "" }] },
    }),
  },
  {
    type: "button",
    label: "Button",
    description: "Single CTA button",
    category: "Conversion",
    create: () => ({
      id: uid("btn"),
      type: "button",
      props: { label: "Click me", href: "#", style: "solid", align: "center" },
    }),
  },
  {
    type: "video",
    label: "Video",
    description: "Embedded YouTube/Vimeo video",
    category: "Media",
    create: () => ({
      id: uid("vid"),
      type: "video",
      props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    }),
  },
  {
    type: "divider",
    label: "Divider",
    description: "Spacer / horizontal rule",
    category: "Content",
    create: () => ({
      id: uid("div"),
      type: "divider",
      props: { style: "line", spacing: 48 },
    }),
  },
  {
    type: "form",
    label: "Contact form",
    description: "Lead-capture form with custom fields",
    category: "Conversion",
    create: () => ({
      id: uid("frm"),
      type: "form",
      props: {
        title: "Get in touch",
        subtitle: "We'll get back to you within 24 hours.",
        submitLabel: "Send message",
        fields: [
          { name: "name", label: "Name", type: "text", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "message", label: "Message", type: "textarea", required: true },
        ],
      },
    }),
  },
  {
    type: "features",
    label: "Features",
    description: "3-column feature grid",
    category: "Content",
    create: () => ({
      id: uid("feat"),
      type: "features",
      props: {
        title: "Everything you need",
        subtitle: "Powerful features that grow with you.",
        items: [
          { icon: "✨", title: "Beautiful by default", body: "Production-grade design tokens out of the box." },
          { icon: "⚡", title: "Lightning fast", body: "Static export with optimized assets." },
          { icon: "🛡", title: "Secure & reliable", body: "Best practices baked into every template." },
        ],
      },
    }),
  },
  {
    type: "cta",
    label: "Call to Action",
    description: "Conversion-focused banner",
    category: "Conversion",
    create: () => ({
      id: uid("cta"),
      type: "cta",
      props: {
        headline: "Ready to launch?",
        subheadline: "Join thousands of teams shipping faster.",
        ctaLabel: "Get started free",
        ctaHref: "#",
      },
    }),
  },
  {
    type: "install_prompt",
    label: "Install App banner",
    description: "Prompts visitors to install your site as a PWA",
    category: "Conversion",
    create: () => ({
      id: uid("inst"),
      type: "install_prompt",
      props: {
        title: "Install our app",
        body: "Add to your home screen for a faster, full-screen experience.",
        ctaLabel: "Install",
        dismissLabel: "Not now",
      },
    }),
  },
  {
    type: "cookie_consent",
    label: "Cookie consent",
    description: "GDPR-style consent banner with accept/reject",
    category: "Conversion",
    create: () => ({
      id: uid("cc"),
      type: "cookie_consent",
      props: {
        title: "We value your privacy",
        body: "We use cookies to improve your experience. By accepting, you agree to our use of analytics and marketing cookies.",
        acceptLabel: "Accept all",
        rejectLabel: "Reject non-essential",
        learnMoreLabel: "Privacy policy",
        learnMoreHref: "/privacy",
        position: "bottom",
      },
    }),
  },
  {
    type: "popup",
    label: "Popup / Modal",
    description: "Timed or exit-intent overlay with CTA",
    category: "Conversion",
    create: () => ({
      id: uid("pop"),
      type: "popup",
      props: {
        title: "Don't miss out",
        body: "Sign up for our newsletter and get 10% off your first order.",
        ctaLabel: "Subscribe",
        ctaHref: "#",
        trigger: "delay",
        delaySeconds: 8,
        showOnce: true,
      },
    }),
  },
  {
    type: "footer",
    label: "Footer",
    description: "Site footer with links and copyright",
    category: "Footer",
    create: () => ({
      id: uid("ft"),
      type: "footer",
      props: {
        tagline: "Build the web, beautifully.",
        columns: [
          { title: "Product", links: [{ label: "Features", href: "#" }, { label: "Pricing", href: "#" }] },
          { title: "Company", links: [{ label: "About", href: "#" }, { label: "Contact", href: "#" }] },
        ],
      },
    }),
  },
];

export function createBlock(type: BlockType): Block {
  const def = BLOCK_LIBRARY.find((b) => b.type === type);
  if (!def) throw new Error(`Unknown block type: ${type}`);
  return def.create();
}