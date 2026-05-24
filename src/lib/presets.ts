// Curated multi-block section presets.
// Each preset returns a list of fully configured, production-grade blocks
// ready to insert as a group into the canvas. Field names match the
// renderer contracts in src/lib/blocks.ts and src/components/block-renderer.tsx.
import { createBlock, type Block } from "./blocks";

export type PresetCategory =
  | "Landing"
  | "Marketing"
  | "Conversion"
  | "Content"
  | "Premium"
  | "Sections";

export type Preset = {
  id: string;
  label: string;
  description: string;
  category: PresetCategory;
  build: () => Block[];
};

function patch(b: Block, props: Record<string, any>): Block {
  return { ...b, props: { ...b.props, ...props } };
}

export const PRESETS: Preset[] = [
  // ───────────────────────── Landing ─────────────────────────
  {
    id: "saas-landing",
    label: "SaaS landing",
    description: "Hero · features · CTA stack for a product launch.",
    category: "Landing",
    build: () => [
      patch(createBlock("hero"), {
        eyebrow: "New · v2.0",
        headline: "Ship faster with a tool you'll actually love",
        subheadline: "Everything you need to design, build, and launch — in one calm, fast place.",
        ctaLabel: "Start free",
        ctaHref: "#signup",
        secondaryLabel: "Book a demo",
        secondaryHref: "#demo",
        animation: "fade",
      }),
      patch(createBlock("features"), { animation: "slide-up" }),
      patch(createBlock("cta"), {
        headline: "Ready to see it in action?",
        subheadline: "Free for 14 days. No credit card required.",
        ctaLabel: "Get started",
        ctaHref: "#signup",
        animation: "zoom",
      }),
    ],
  },
  {
    id: "agency-pitch",
    label: "Agency pitch",
    description: "Heading · value text · gallery · contact form.",
    category: "Marketing",
    build: () => [
      patch(createBlock("heading"), {
        title: "Brands trust us to ship beautiful work.",
        subtitle: "A small team. Considered process. Outsized outcomes.",
        align: "center",
      }),
      patch(createBlock("text"), {
        body: "We are designers and engineers turning ambitious ideas into category-defining digital products for teams who care about craft.",
        align: "center",
      }),
      createBlock("gallery"),
      patch(createBlock("form"), { title: "Tell us about your project" }),
    ],
  },
  {
    id: "lead-capture",
    label: "Lead capture funnel",
    description: "Hero · form · popup · cookie consent.",
    category: "Conversion",
    build: () => [
      patch(createBlock("hero"), {
        eyebrow: "Free playbook",
        headline: "Get the 20-page launch playbook",
        subheadline: "Drop your email and we'll send the guide instantly — plus a weekly tip on growing without burning out.",
        ctaLabel: "Download now",
        ctaHref: "#form",
        secondaryLabel: "See what's inside",
        secondaryHref: "#preview",
      }),
      patch(createBlock("form"), {
        title: "Send me the guide",
        subtitle: "We respect your inbox. Unsubscribe in one click.",
        submitLabel: "Send the guide",
      }),
      createBlock("popup"),
      createBlock("cookie_consent"),
    ],
  },
  {
    id: "blog-article",
    label: "Long-form article",
    description: "Heading · cover image · body · divider · CTA.",
    category: "Content",
    build: () => [
      patch(createBlock("heading"), {
        title: "How we redesigned our onboarding in 30 days",
        subtitle: "A research-led teardown of what worked, what didn't, and what we'd do again.",
        align: "left",
      }),
      createBlock("image"),
      patch(createBlock("text"), {
        body: "We rebuilt activation from scratch in a single sprint. Here's the research, the prototypes, the metrics, and the three decisions that mattered most.",
        align: "left",
      }),
      createBlock("divider"),
      patch(createBlock("cta"), {
        headline: "Liked this? Subscribe for more.",
        subheadline: "One thoughtful essay on product craft, every Sunday.",
        ctaLabel: "Subscribe",
        ctaHref: "#subscribe",
      }),
    ],
  },

  // ───────────────────────── Premium ─────────────────────────
  {
    id: "premium-product-launch",
    label: "Premium product launch",
    description: "Cinematic hero · feature triad · social proof CTA.",
    category: "Premium",
    build: () => [
      patch(createBlock("navbar"), {
        links: [
          { label: "Product", href: "#product" },
          { label: "Pricing", href: "#pricing" },
          { label: "Customers", href: "#customers" },
          { label: "Changelog", href: "#changelog" },
        ],
        ctaLabel: "Start free",
        ctaHref: "#signup",
      }),
      patch(createBlock("hero"), {
        eyebrow: "Launching today",
        headline: "The fastest way to ship beautiful software.",
        subheadline: "An end-to-end studio for product teams who refuse to compromise on craft, speed, or taste.",
        ctaLabel: "Start free — no card",
        ctaHref: "#signup",
        secondaryLabel: "Watch the 90-second demo",
        secondaryHref: "#demo",
        animation: "fade",
      }),
      patch(createBlock("features"), {
        title: "Built for the way modern teams ship",
        subtitle: "Three opinionated primitives. Infinite combinations.",
        items: [
          { icon: "✦", title: "Composable canvas", body: "Drag, snap, and remix production-grade blocks with zero setup." },
          { icon: "◆", title: "Realtime everywhere", body: "Multiplayer cursors, comments, and live previews — built in." },
          { icon: "✺", title: "One-click publish", body: "Global edge delivery. Sub-100ms TTFB on every continent." },
        ],
        animation: "slide-up",
      }),
      patch(createBlock("cta"), {
        headline: "Loved by 12,000+ product teams",
        subheadline: "From scrappy two-person startups to public companies. Join them — your first project is free, forever.",
        ctaLabel: "Create your first project",
        ctaHref: "#signup",
        animation: "zoom",
      }),
    ],
  },
  {
    id: "premium-portfolio",
    label: "Editorial portfolio",
    description: "Statement hero · curated work grid · contact CTA.",
    category: "Premium",
    build: () => [
      patch(createBlock("navbar"), {
        links: [
          { label: "Work", href: "#work" },
          { label: "About", href: "#about" },
          { label: "Journal", href: "#journal" },
        ],
        ctaLabel: "Get in touch",
        ctaHref: "#contact",
      }),
      patch(createBlock("hero"), {
        eyebrow: "Independent designer · Lisbon",
        headline: "Design with restraint. Build with care.",
        subheadline: "Twelve years helping teams turn rough ideas into products people quietly love.",
        ctaLabel: "See selected work",
        ctaHref: "#work",
        secondaryLabel: "Read the journal",
        secondaryHref: "#journal",
        animation: "fade",
      }),
      patch(createBlock("heading"), {
        title: "Selected work",
        subtitle: "A small, considered slice. Full case studies on request.",
        align: "left",
      }),
      createBlock("gallery"),
      patch(createBlock("cta"), {
        headline: "Currently booking Q3 commissions",
        subheadline: "Studio days in Lisbon, remote work worldwide.",
        ctaLabel: "Start a conversation",
        ctaHref: "mailto:hello@studio.com",
      }),
    ],
  },
  {
    id: "premium-pricing",
    label: "Pricing section",
    description: "Heading · three-tier feature grid · trust CTA.",
    category: "Premium",
    build: () => [
      patch(createBlock("heading"), {
        title: "Simple, honest pricing",
        subtitle: "Pay for what you use. Cancel anytime. No surprise invoices, ever.",
        align: "center",
      }),
      patch(createBlock("features"), {
        title: "",
        subtitle: "",
        items: [
          { icon: "Free", title: "Starter — €0", body: "1 project · 100 MB storage · community support. Perfect to kick the tires." },
          { icon: "Pro", title: "Pro — €19/mo", body: "Unlimited projects · 50 GB · custom domain · priority support." },
          { icon: "Team", title: "Team — €49/seat", body: "Realtime collaboration · roles & permissions · audit log · SSO add-on." },
        ],
      }),
      patch(createBlock("cta"), {
        headline: "Try Pro free for 14 days",
        subheadline: "No credit card required. Downgrade anytime with one click.",
        ctaLabel: "Start free trial",
        ctaHref: "#trial",
      }),
    ],
  },
  {
    id: "premium-faq",
    label: "FAQ + contact",
    description: "Heading · questions · contact CTA · footer.",
    category: "Premium",
    build: () => [
      patch(createBlock("heading"), {
        title: "Frequently asked",
        subtitle: "Everything you wanted to know — answered plainly.",
        align: "center",
      }),
      patch(createBlock("features"), {
        title: "",
        subtitle: "",
        items: [
          { icon: "Q.", title: "Is there a free plan?", body: "Yes — forever free, no credit card. Upgrade only when your team grows past one." },
          { icon: "Q.", title: "Can I cancel anytime?", body: "One click in settings. We'll prorate the unused time back to your card." },
          { icon: "Q.", title: "Where is my data stored?", body: "EU region by default (Frankfurt). US region available on request. SOC 2 Type II." },
          { icon: "Q.", title: "Do you offer SSO?", body: "Google and Microsoft SSO included on Team. SAML / Okta on Enterprise." },
        ],
      }),
      patch(createBlock("cta"), {
        headline: "Still curious?",
        subheadline: "Real humans on support, Mon–Fri 9–18 CET. Median first reply: 14 minutes.",
        ctaLabel: "Email support",
        ctaHref: "mailto:support@example.com",
      }),
    ],
  },

  // ───────────────────────── Sections ─────────────────────────
  {
    id: "section-hero-only",
    label: "Hero · centered",
    description: "Single statement hero with dual CTAs.",
    category: "Sections",
    build: () => [
      patch(createBlock("hero"), {
        eyebrow: "Now in beta",
        headline: "A calmer way to build for the web",
        subheadline: "Designed for teams who care about typography, motion, and the small details that compound.",
        ctaLabel: "Request access",
        ctaHref: "#access",
        secondaryLabel: "Read the manifesto",
        secondaryHref: "#manifesto",
        animation: "fade",
      }),
    ],
  },
  {
    id: "section-feature-grid",
    label: "Feature grid · 3-up",
    description: "Section heading + three-feature row.",
    category: "Sections",
    build: () => [
      patch(createBlock("features"), {
        title: "Why teams switch",
        subtitle: "Three reasons we hear over and over.",
        items: [
          { icon: "⚡", title: "Faster from idea to live", body: "Average team ships the first page in under 9 minutes." },
          { icon: "🎯", title: "On-brand by default", body: "Tokens, fonts, and motion stay consistent across every page." },
          { icon: "🛡", title: "Production-grade", body: "Accessibility, SEO, and performance baked into every block." },
        ],
        animation: "slide-up",
      }),
    ],
  },
  {
    id: "section-testimonial-cta",
    label: "Social proof + CTA",
    description: "Quote-style heading + conversion CTA.",
    category: "Sections",
    build: () => [
      patch(createBlock("heading"), {
        title: "“We replaced four tools with one and our team finally agrees on something.”",
        subtitle: "— Priya M., Head of Design, Lattice",
        align: "center",
      }),
      patch(createBlock("cta"), {
        headline: "Join 12,000+ teams shipping faster",
        subheadline: "Start free. Invite your team in 30 seconds.",
        ctaLabel: "Create your workspace",
        ctaHref: "#signup",
        animation: "zoom",
      }),
    ],
  },
  {
    id: "section-newsletter",
    label: "Newsletter signup",
    description: "Editorial heading + email capture form.",
    category: "Sections",
    build: () => [
      patch(createBlock("heading"), {
        title: "One thoughtful email, every Sunday.",
        subtitle: "Essays on craft, product, and the slow internet. Read by 38,000 quiet thinkers.",
        align: "center",
      }),
      patch(createBlock("form"), {
        title: "",
        subtitle: "",
        submitLabel: "Subscribe",
        fields: [{ name: "email", label: "Email address", type: "email", required: true }],
      }),
    ],
  },
  {
    id: "section-contact",
    label: "Contact block",
    description: "Heading + multi-field contact form.",
    category: "Sections",
    build: () => [
      patch(createBlock("heading"), {
        title: "Let's talk",
        subtitle: "Tell us a little about your project. We reply within one working day.",
        align: "center",
      }),
      patch(createBlock("form"), {
        title: "",
        subtitle: "",
        submitLabel: "Send message",
        fields: [
          { name: "name", label: "Your name", type: "text", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "company", label: "Company", type: "text", required: false },
          { name: "message", label: "What are you working on?", type: "textarea", required: true },
        ],
      }),
    ],
  },
  {
    id: "section-footer-rich",
    label: "Footer · rich",
    description: "CTA banner above a multi-column footer.",
    category: "Sections",
    build: () => [
      patch(createBlock("cta"), {
        headline: "Build something worth visiting twice.",
        subheadline: "Free forever for solo makers. €19/mo when you're ready to grow.",
        ctaLabel: "Start free",
        ctaHref: "#signup",
      }),
      patch(createBlock("footer"), {
        tagline: "Crafted with care · © 2026",
        columns: [
          { title: "Product", links: [{ label: "Features", href: "#" }, { label: "Pricing", href: "#" }, { label: "Changelog", href: "#" }] },
          { title: "Company", links: [{ label: "About", href: "#" }, { label: "Journal", href: "#" }, { label: "Careers", href: "#" }] },
          { title: "Resources", links: [{ label: "Docs", href: "#" }, { label: "Templates", href: "#" }, { label: "Support", href: "#" }] },
        ],
      }),
    ],
  },
];

export const PRESET_CATEGORIES: PresetCategory[] = [
  "Premium",
  "Landing",
  "Sections",
  "Marketing",
  "Conversion",
  "Content",
];
