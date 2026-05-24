import type { ProjectContent, Block } from "./blocks";
import { uid, DEFAULT_BRANDING } from "./blocks";
import {
  ecommerceBoutique, photographyStudio, blogEditorial, eventConference,
  courseAcademy, newsletterPublication, charityNonprofit, realEstateLanding,
  medicalClinic, legalFirm, weddingInvite, appLaunchMobile, resumePersonal,
  docsKnowledgeBase, podcastShow,
  fitnessGym, cryptoWeb3, aiStartup, travelBooking, musicArtist,
  saasPricing, jobBoard, marketplace, comingSoon,
} from "./templates-extra";

export type TemplateCategory =
  | "SaaS"
  | "Agency"
  | "Portfolio"
  | "Restaurant"
  | "Startup"
  | "E-commerce"
  | "Photography"
  | "Blog"
  | "Event"
  | "Course"
  | "Newsletter"
  | "Charity"
  | "Real Estate"
  | "Medical"
  | "Legal"
  | "Wedding"
  | "App"
  | "Resume"
  | "Docs"
  | "Podcast"
  | "Fitness"
  | "Web3"
  | "AI"
  | "Travel"
  | "Music"
  | "Jobs"
  | "Marketplace"
  | "Coming Soon";

export type Template = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnailGradient: string;
  branding: ProjectContent["branding"];
  buildContent: () => ProjectContent;
};

const EXTRA_TEMPLATES: Template[] = [
  { id: "ecommerce-boutique", name: "Boutique Store", description: "Refined small-batch e-commerce storefront.", category: "E-commerce", thumbnailGradient: "linear-gradient(135deg,#111827,#6b7280)", branding: { siteName: "Mara&Co.", primaryColor: "#111827", fontFamily: "'Playfair Display', Georgia, serif" }, buildContent: ecommerceBoutique },
  { id: "photography-studio", name: "Photography Studio", description: "Editorial portfolio for a working photographer.", category: "Photography", thumbnailGradient: "linear-gradient(135deg,#0a0a0a,#525252)", branding: { siteName: "Idris Okafor", primaryColor: "#0a0a0a", fontFamily: "'Space Grotesk', sans-serif" }, buildContent: photographyStudio },
  { id: "blog-editorial", name: "Editorial Blog", description: "Long-form publication with newsletter sign-up.", category: "Blog", thumbnailGradient: "linear-gradient(135deg,#1d4ed8,#6366f1)", branding: { siteName: "The Long Form", primaryColor: "#1d4ed8", fontFamily: "'Playfair Display', Georgia, serif" }, buildContent: blogEditorial },
  { id: "event-conference", name: "Conference", description: "Multi-day conference with speakers and tickets.", category: "Event", thumbnailGradient: "linear-gradient(135deg,#9333ea,#ec4899)", branding: { siteName: "Make/Shift 2026", primaryColor: "#9333ea", fontFamily: "'Space Grotesk', sans-serif" }, buildContent: eventConference },
  { id: "course-academy", name: "Course / Academy", description: "Cohort-based course landing page.", category: "Course", thumbnailGradient: "linear-gradient(135deg,#059669,#10b981)", branding: { siteName: "Studio School", primaryColor: "#059669", fontFamily: "Inter, system-ui, sans-serif" }, buildContent: courseAcademy },
  { id: "newsletter", name: "Newsletter", description: "Subscribe-focused single-page newsletter site.", category: "Newsletter", thumbnailGradient: "linear-gradient(135deg,#dc2626,#f97316)", branding: { siteName: "Margins", primaryColor: "#dc2626", fontFamily: "'DM Sans', sans-serif" }, buildContent: newsletterPublication },
  { id: "charity", name: "Non-profit", description: "Donation-focused non-profit campaign site.", category: "Charity", thumbnailGradient: "linear-gradient(135deg,#0891b2,#22d3ee)", branding: { siteName: "Ocean Trust", primaryColor: "#0891b2", fontFamily: "Inter, system-ui, sans-serif" }, buildContent: charityNonprofit },
  { id: "real-estate", name: "Real Estate", description: "Boutique brokerage with featured listings.", category: "Real Estate", thumbnailGradient: "linear-gradient(135deg,#92400e,#fbbf24)", branding: { siteName: "Hayward & Co.", primaryColor: "#92400e", fontFamily: "'Playfair Display', Georgia, serif" }, buildContent: realEstateLanding },
  { id: "medical-clinic", name: "Medical Clinic", description: "Family-medicine clinic with appointments.", category: "Medical", thumbnailGradient: "linear-gradient(135deg,#0d9488,#5eead4)", branding: { siteName: "Northpark Medical", primaryColor: "#0d9488", fontFamily: "Inter, system-ui, sans-serif" }, buildContent: medicalClinic },
  { id: "legal-firm", name: "Law Firm", description: "Established trial-firm landing page.", category: "Legal", thumbnailGradient: "linear-gradient(135deg,#1e3a8a,#3730a3)", branding: { siteName: "Cole & Whitfield", primaryColor: "#1e3a8a", fontFamily: "'Playfair Display', Georgia, serif" }, buildContent: legalFirm },
  { id: "wedding-invite", name: "Wedding Invite", description: "Personal wedding invitation with RSVP.", category: "Wedding", thumbnailGradient: "linear-gradient(135deg,#be185d,#f472b6)", branding: { siteName: "Sofia & Mateo", primaryColor: "#be185d", fontFamily: "'Playfair Display', Georgia, serif" }, buildContent: weddingInvite },
  { id: "app-launch", name: "Mobile App Launch", description: "Consumer mobile app launch page.", category: "App", thumbnailGradient: "linear-gradient(135deg,#7c3aed,#c084fc)", branding: { siteName: "Cadence", primaryColor: "#7c3aed", fontFamily: "Inter, system-ui, sans-serif" }, buildContent: appLaunchMobile },
  { id: "resume-personal", name: "Personal Resume", description: "One-page personal résumé / CV site.", category: "Resume", thumbnailGradient: "linear-gradient(135deg,#0f766e,#14b8a6)", branding: { siteName: "Priya Raman", primaryColor: "#0f766e", fontFamily: "'DM Sans', sans-serif" }, buildContent: resumePersonal },
  { id: "docs-knowledge", name: "Docs / Knowledge Base", description: "Developer docs landing page.", category: "Docs", thumbnailGradient: "linear-gradient(135deg,#2563eb,#60a5fa)", branding: { siteName: "Plume Docs", primaryColor: "#2563eb", fontFamily: "Inter, system-ui, sans-serif" }, buildContent: docsKnowledgeBase },
  { id: "podcast", name: "Podcast", description: "Weekly podcast show site with episodes.", category: "Podcast", thumbnailGradient: "linear-gradient(135deg,#ea580c,#fbbf24)", branding: { siteName: "Slow Thoughts", primaryColor: "#ea580c", fontFamily: "'Space Grotesk', sans-serif" }, buildContent: podcastShow },
  { id: "fitness-gym", name: "Fitness Gym", description: "High-energy strength & conditioning gym site.", category: "Fitness", thumbnailGradient: "linear-gradient(135deg,#dc2626,#f97316)", branding: { siteName: "Iron Hall", primaryColor: "#dc2626", fontFamily: "'Space Grotesk', sans-serif" }, buildContent: fitnessGym },
  { id: "crypto-web3", name: "Web3 Protocol", description: "Mainnet landing for an EVM L1/L2 protocol.", category: "Web3", thumbnailGradient: "linear-gradient(135deg,#a855f7,#22d3ee)", branding: { siteName: "Mesh Protocol", primaryColor: "#a855f7", fontFamily: "'Space Grotesk', sans-serif" }, buildContent: cryptoWeb3 },
  { id: "ai-startup", name: "AI Startup", description: "Private-beta AI product with waitlist.", category: "AI", thumbnailGradient: "linear-gradient(135deg,#0f172a,#6366f1)", branding: { siteName: "Synapse", primaryColor: "#0f172a", fontFamily: "Inter, system-ui, sans-serif" }, buildContent: aiStartup },
  { id: "travel-booking", name: "Travel & Tours", description: "Boutique small-group travel operator.", category: "Travel", thumbnailGradient: "linear-gradient(135deg,#0d9488,#fbbf24)", branding: { siteName: "Far & Wise", primaryColor: "#0d9488", fontFamily: "'Playfair Display', Georgia, serif" }, buildContent: travelBooking },
  { id: "music-artist", name: "Music Artist", description: "Album release + tour site for a musician.", category: "Music", thumbnailGradient: "linear-gradient(135deg,#7c2d12,#f97316)", branding: { siteName: "Nadia Cole", primaryColor: "#7c2d12", fontFamily: "'Space Grotesk', sans-serif" }, buildContent: musicArtist },
  { id: "saas-pricing", name: "SaaS Pricing", description: "Three-tier SaaS pricing page with free trial.", category: "SaaS", thumbnailGradient: "linear-gradient(135deg,#6366f1,#a78bfa)", branding: { siteName: "Linear Flow", primaryColor: "#6366f1", fontFamily: "Inter, system-ui, sans-serif" }, buildContent: saasPricing },
  { id: "job-board", name: "Job Board", description: "Curated remote-job board with weekly digest.", category: "Jobs", thumbnailGradient: "linear-gradient(135deg,#0f172a,#475569)", branding: { siteName: "Hire Remote", primaryColor: "#0f172a", fontFamily: "'DM Sans', sans-serif" }, buildContent: jobBoard },
  { id: "marketplace", name: "Marketplace", description: "Two-sided marketplace for independent makers.", category: "Marketplace", thumbnailGradient: "linear-gradient(135deg,#0d9488,#5eead4)", branding: { siteName: "Folkside", primaryColor: "#0d9488", fontFamily: "'Space Grotesk', sans-serif" }, buildContent: marketplace },
  { id: "coming-soon", name: "Coming Soon", description: "Minimalist waitlist / pre-launch page.", category: "Coming Soon", thumbnailGradient: "linear-gradient(135deg,#0f172a,#94a3b8)", branding: { siteName: "Aurelia", primaryColor: "#0f172a", fontFamily: "'Playfair Display', Georgia, serif" }, buildContent: comingSoon },
];

// Helper to create a fully-customized block with given props.
const blk = (type: Block["type"], props: Record<string, any>): Block => ({
  id: uid(type.slice(0, 3)),
  type,
  props,
});

const homePage = (blocks: Block[]) => [{ id: "home", name: "Home", blocks }];

// =====================================================================
// 1. SaaS Pro — modern conversion-focused SaaS marketing site
// =====================================================================
const saasPro = (): ProjectContent => ({
  branding: { siteName: "Linear Flow", primaryColor: "#6366f1", fontFamily: "Inter, system-ui, sans-serif" },
  pages: homePage([
    blk("navbar", {
      links: [
        { label: "Features", href: "#features" },
        { label: "Pricing", href: "#pricing" },
        { label: "Customers", href: "#customers" },
        { label: "Blog", href: "#blog" },
      ],
      ctaLabel: "Start free trial",
      ctaHref: "#signup",
    }),
    blk("hero", {
      eyebrow: "🚀 Now with AI workflows",
      headline: "Ship product 10× faster with focused work.",
      subheadline: "The all-in-one workspace your engineering team will actually use. Roadmaps, sprints, docs, and CI insights in one beautifully fast app.",
      ctaLabel: "Start free trial",
      ctaHref: "#signup",
      secondaryLabel: "Watch 2-min demo",
      secondaryHref: "#demo",
    }),
    blk("features", {
      title: "Built for product teams who ship",
      subtitle: "Every detail thought through, so you can focus on what matters.",
      items: [
        { icon: "⚡", title: "Lightning-fast UI", body: "Sub-50ms interactions across the whole app. No spinners, no waiting, ever." },
        { icon: "🧠", title: "AI-powered triage", body: "Auto-prioritize bugs, draft release notes, and surface blockers before they happen." },
        { icon: "🔀", title: "Native Git workflows", body: "Connect your repo and watch issues update themselves as PRs ship." },
        { icon: "📊", title: "Live cycle metrics", body: "Throughput, lead time, and WIP — visualized for every team without setup." },
        { icon: "🌍", title: "Built for distributed teams", body: "Async-first. Threaded discussion, status updates, and timezone-aware deadlines." },
        { icon: "🔒", title: "Enterprise-grade security", body: "SOC 2 Type II, SAML SSO, audit logs, and a publicly-verifiable security page." },
      ],
    }),
    blk("cta", {
      headline: "Join 12,000+ teams shipping with Linear Flow",
      subheadline: "Free for up to 10 members. No credit card. Set up in under 60 seconds.",
      ctaLabel: "Start your free trial",
      ctaHref: "#signup",
    }),
    blk("footer", {
      tagline: "The fastest way to build great software.",
      columns: [
        { title: "Product", links: [{ label: "Features", href: "#" }, { label: "Pricing", href: "#" }, { label: "Changelog", href: "#" }, { label: "Roadmap", href: "#" }] },
        { title: "Company", links: [{ label: "About", href: "#" }, { label: "Careers", href: "#" }, { label: "Blog", href: "#" }, { label: "Press kit", href: "#" }] },
        { title: "Resources", links: [{ label: "Docs", href: "#" }, { label: "API", href: "#" }, { label: "Status", href: "#" }, { label: "Security", href: "#" }] },
      ],
    }),
  ]),
});

// =====================================================================
// 2. Agency Studio — bold creative agency portfolio
// =====================================================================
const agencyStudio = (): ProjectContent => ({
  branding: { siteName: "Forma Studio", primaryColor: "#ef4444", fontFamily: "'Space Grotesk', sans-serif" },
  pages: homePage([
    blk("navbar", {
      links: [
        { label: "Work", href: "#work" },
        { label: "Services", href: "#services" },
        { label: "About", href: "#about" },
        { label: "Journal", href: "#journal" },
      ],
      ctaLabel: "Start a project",
      ctaHref: "#contact",
    }),
    blk("hero", {
      eyebrow: "Independent design studio · Est. 2018",
      headline: "We build brands that move at the speed of culture.",
      subheadline: "Forma is a 12-person studio crafting brand identities, digital products, and campaigns for ambitious founders and challenger brands.",
      ctaLabel: "See our work",
      ctaHref: "#work",
      secondaryLabel: "Read our manifesto",
      secondaryHref: "#about",
    }),
    blk("features", {
      title: "What we do",
      subtitle: "A focused practice across three disciplines — deeply intertwined.",
      items: [
        { icon: "✦", title: "Brand identity", body: "Strategy, naming, visual systems, and the guidelines to keep everything coherent as you scale." },
        { icon: "◐", title: "Digital product", body: "End-to-end design for SaaS, marketplaces, and consumer apps. From discovery to ship-ready Figma." },
        { icon: "▲", title: "Launch campaigns", body: "Editorial-grade landing pages, motion design, and content systems that convert curiosity into customers." },
      ],
    }),
    blk("heading", {
      title: "Trusted by teams at",
      subtitle: "Stripe · Linear · Vercel · Notion · Loom · Cash App · Figma · Anthropic",
      align: "center",
    }),
    blk("cta", {
      headline: "Have a project in mind?",
      subheadline: "We take on a small number of new engagements each quarter. Tell us what you're building.",
      ctaLabel: "Start the conversation",
      ctaHref: "#contact",
    }),
    blk("footer", {
      tagline: "Forma Studio · Brooklyn, NY · forma@studio.com",
      columns: [
        { title: "Studio", links: [{ label: "Work", href: "#" }, { label: "About", href: "#" }, { label: "Journal", href: "#" }] },
        { title: "Connect", links: [{ label: "Instagram", href: "#" }, { label: "LinkedIn", href: "#" }, { label: "Dribbble", href: "#" }] },
      ],
    }),
  ]),
});

// =====================================================================
// 3. Portfolio Editorial — refined personal portfolio
// =====================================================================
const portfolioEditorial = (): ProjectContent => ({
  branding: { siteName: "Amelia Chen", primaryColor: "#0f172a", fontFamily: "'Playfair Display', Georgia, serif" },
  pages: homePage([
    blk("navbar", {
      links: [
        { label: "Selected work", href: "#work" },
        { label: "About", href: "#about" },
        { label: "Writing", href: "#writing" },
        { label: "Contact", href: "#contact" },
      ],
      ctaLabel: "Hire me",
      ctaHref: "#contact",
    }),
    blk("hero", {
      eyebrow: "Senior product designer",
      headline: "Designing software that respects people's time.",
      subheadline: "I'm Amelia — a designer with 9 years of experience shipping considered, accessible, and beautiful product experiences for Stripe, Notion, and a handful of seed-stage startups.",
      ctaLabel: "View selected work",
      ctaHref: "#work",
      secondaryLabel: "Download resume",
      secondaryHref: "#resume",
    }),
    blk("features", {
      title: "Selected projects · 2021–2025",
      subtitle: "A small set of recent engagements I'm proud of.",
      items: [
        { icon: "01", title: "Stripe Atlas redesign", body: "Led the IA and visual refresh for Stripe's incorporation product. +34% activation in 6 weeks." },
        { icon: "02", title: "Notion Calendar onboarding", body: "Designed the new-user flow that ships in every Notion Calendar install today." },
        { icon: "03", title: "Cash App Bitcoin", body: "Reduced first-purchase drop-off by 21% with a clearer compliance disclosure flow." },
        { icon: "04", title: "Loom for Education", body: "Pioneered a vertical-specific dashboard adopted by 1,200+ school districts." },
      ],
    }),
    blk("text", {
      body: "I'm currently open to one new client engagement per quarter and full-time roles at companies that take craft seriously. The best way to reach me is by email — I read every message and reply within 48 hours.",
      align: "center",
    }),
    blk("cta", {
      headline: "Let's make something thoughtful.",
      subheadline: "amelia@chen.studio · Based in Lisbon, working globally.",
      ctaLabel: "Send an email",
      ctaHref: "mailto:amelia@chen.studio",
    }),
    blk("footer", {
      tagline: "© Amelia Chen — Built with care.",
      columns: [
        { title: "Elsewhere", links: [{ label: "Read.cv", href: "#" }, { label: "LinkedIn", href: "#" }, { label: "Twitter / X", href: "#" }] },
      ],
    }),
  ]),
});

// =====================================================================
// 4. Restaurant Trattoria — warm hospitality site
// =====================================================================
const restaurantTrattoria = (): ProjectContent => ({
  branding: { siteName: "Osteria del Sole", primaryColor: "#b45309", fontFamily: "'Playfair Display', Georgia, serif" },
  pages: homePage([
    blk("navbar", {
      links: [
        { label: "Menu", href: "#menu" },
        { label: "Our story", href: "#about" },
        { label: "Visit", href: "#visit" },
        { label: "Private events", href: "#events" },
      ],
      ctaLabel: "Reserve a table",
      ctaHref: "#reserve",
    }),
    blk("hero", {
      eyebrow: "A neighborhood trattoria · since 2003",
      headline: "Honest Italian cooking, made by hand.",
      subheadline: "Hand-rolled pastas, wood-fired bread, and a thoughtful Italian wine list — served in a warm dining room on the corner of Bedford & 9th.",
      ctaLabel: "Reserve a table",
      ctaHref: "#reserve",
      secondaryLabel: "View tonight's menu",
      secondaryHref: "#menu",
    }),
    blk("features", {
      title: "From the kitchen",
      subtitle: "A handful of dishes that define us. The full menu changes weekly with the seasons.",
      items: [
        { icon: "🍝", title: "Cacio e pepe", body: "Hand-rolled tonnarelli, Pecorino Romano DOP, freshly cracked Tellicherry pepper. The original three-ingredient masterpiece." },
        { icon: "🍕", title: "Margherita D.O.P.", body: "72-hour cold-fermented dough, San Marzano tomatoes, fior di latte from Battipaglia, basil from our roof garden." },
        { icon: "🥩", title: "Bistecca Fiorentina", body: "Dry-aged Piedmontese ribeye, finished over olive wood embers, finished with rosemary and Tuscan olive oil. Serves two." },
      ],
    }),
    blk("cta", {
      headline: "Open Tuesday – Sunday · 5pm – 11pm",
      subheadline: "Walk-ins welcome at the bar. Reservations recommended for parties of 4 or more.",
      ctaLabel: "Reserve on Resy",
      ctaHref: "#reserve",
    }),
    blk("footer", {
      tagline: "412 Bedford Ave · Brooklyn, NY · (718) 555-0193",
      columns: [
        { title: "Visit", links: [{ label: "Hours & directions", href: "#" }, { label: "Private events", href: "#" }, { label: "Gift cards", href: "#" }] },
        { title: "Follow", links: [{ label: "Instagram", href: "#" }, { label: "Newsletter", href: "#" }] },
      ],
    }),
  ]),
});

// =====================================================================
// 5. Startup Launch — early-stage product launch page
// =====================================================================
const startupLaunch = (): ProjectContent => ({
  branding: { siteName: "Halcyon", primaryColor: "#0ea5e9", fontFamily: "Inter, system-ui, sans-serif" },
  pages: homePage([
    blk("navbar", {
      links: [
        { label: "Why Halcyon", href: "#why" },
        { label: "How it works", href: "#how" },
        { label: "FAQ", href: "#faq" },
      ],
      ctaLabel: "Join the waitlist",
      ctaHref: "#waitlist",
    }),
    blk("hero", {
      eyebrow: "Launching Q1 2026 · Limited beta access",
      headline: "Your inbox, finally peaceful.",
      subheadline: "Halcyon is an AI-native email client that triages, drafts, and summarizes — so you can spend your day on work that matters, not on email.",
      ctaLabel: "Join the waitlist",
      ctaHref: "#waitlist",
      secondaryLabel: "Read the launch post",
      secondaryHref: "#post",
    }),
    blk("features", {
      title: "What makes Halcyon different",
      subtitle: "Three opinionated bets that make email feel like 1998 in the best way.",
      items: [
        { icon: "🎯", title: "Triage that actually works", body: "Halcyon learns what matters to you in 3 days. No rules, no filters — just a focused inbox by default." },
        { icon: "✍️", title: "Drafts that sound like you", body: "Trained only on your sent mail. Your tone, your phrases, your sign-off — never generic AI fluff." },
        { icon: "🧘", title: "Calm by default", body: "No badge counts. No notifications by default. Sender-aware quiet hours. Your inbox waits for you, not the other way around." },
      ],
    }),
    blk("form", {
      title: "Be among the first 1,000 users",
      subtitle: "We're rolling out access in waves. Drop your email and we'll send your invite when it's your turn.",
      submitLabel: "Request invite",
      fields: [
        { name: "name", label: "Your name", type: "text", required: true },
        { name: "email", label: "Email address", type: "email", required: true },
        { name: "role", label: "What do you do?", type: "text", required: false },
      ],
    }),
    blk("footer", {
      tagline: "Halcyon · Calm software for serious work.",
      columns: [
        { title: "Company", links: [{ label: "About", href: "#" }, { label: "Manifesto", href: "#" }, { label: "Privacy", href: "#" }] },
      ],
    }),
  ]),
});

export const TEMPLATES: Template[] = [
  {
    id: "blank",
    name: "Blank canvas",
    description: "Start from scratch with a single empty page.",
    category: "Startup",
    thumbnailGradient: "linear-gradient(135deg,#94a3b8,#475569)",
    branding: { ...DEFAULT_BRANDING },
    buildContent: () => ({ branding: { ...DEFAULT_BRANDING }, pages: homePage([]) }),
  },
  {
    id: "saas-pro",
    name: "SaaS Pro",
    description: "Conversion-focused marketing site for a modern SaaS product.",
    category: "SaaS",
    thumbnailGradient: "linear-gradient(135deg,#6366f1,#22d3ee)",
    branding: { siteName: "Linear Flow", primaryColor: "#6366f1", fontFamily: "Inter, system-ui, sans-serif" },
    buildContent: saasPro,
  },
  {
    id: "agency-studio",
    name: "Agency Studio",
    description: "Bold, editorial portfolio for a creative studio or agency.",
    category: "Agency",
    thumbnailGradient: "linear-gradient(135deg,#ef4444,#f97316)",
    branding: { siteName: "Forma Studio", primaryColor: "#ef4444", fontFamily: "'Space Grotesk', sans-serif" },
    buildContent: agencyStudio,
  },
  {
    id: "portfolio-editorial",
    name: "Portfolio Editorial",
    description: "Refined personal portfolio with a serif editorial voice.",
    category: "Portfolio",
    thumbnailGradient: "linear-gradient(135deg,#0f172a,#475569)",
    branding: { siteName: "Amelia Chen", primaryColor: "#0f172a", fontFamily: "'Playfair Display', Georgia, serif" },
    buildContent: portfolioEditorial,
  },
  {
    id: "restaurant-trattoria",
    name: "Restaurant Trattoria",
    description: "Warm, appetizing site for a neighborhood restaurant.",
    category: "Restaurant",
    thumbnailGradient: "linear-gradient(135deg,#b45309,#fbbf24)",
    branding: { siteName: "Osteria del Sole", primaryColor: "#b45309", fontFamily: "'Playfair Display', Georgia, serif" },
    buildContent: restaurantTrattoria,
  },
  {
    id: "startup-launch",
    name: "Startup Launch",
    description: "Waitlist + product reveal page for an early-stage startup.",
    category: "Startup",
    thumbnailGradient: "linear-gradient(135deg,#0ea5e9,#8b5cf6)",
    branding: { siteName: "Halcyon", primaryColor: "#0ea5e9", fontFamily: "Inter, system-ui, sans-serif" },
    buildContent: startupLaunch,
  },
  ...EXTRA_TEMPLATES,
];

export const TEMPLATE_CATEGORIES: ("All" | TemplateCategory)[] = [
  "All", "SaaS", "Agency", "Portfolio", "Restaurant", "Startup",
  "E-commerce", "Photography", "Blog", "Event", "Course", "Newsletter",
  "Charity", "Real Estate", "Medical", "Legal", "Wedding", "App", "Resume", "Docs", "Podcast",
  "Fitness", "Web3", "AI", "Travel", "Music",
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

// ---- Community template import (paste a URL to a JSON template) ----

// A community template is a JSON file with this shape, hosted anywhere
// (raw GitHub, gist, your own CDN). No API key, no proprietary lock-in.
export type CommunityTemplate = {
  $schema?: string;
  name: string;
  description?: string;
  category?: TemplateCategory | string;
  thumbnailGradient?: string;
  content: ProjectContent;
};

export function validateCommunityTemplate(raw: unknown): CommunityTemplate {
  if (!raw || typeof raw !== "object") throw new Error("Template must be a JSON object.");
  const t = raw as any;
  if (typeof t.name !== "string" || !t.name.trim()) throw new Error("Template is missing a `name` string.");
  if (!t.content || typeof t.content !== "object") throw new Error("Template is missing a `content` object.");
  if (!t.content.branding || !Array.isArray(t.content.pages)) {
    throw new Error("Template `content` must have `branding` and `pages[]`.");
  }
  for (const page of t.content.pages) {
    if (!page.id || !Array.isArray(page.blocks)) {
      throw new Error("Each page must have an `id` and a `blocks[]` array.");
    }
    for (const block of page.blocks) {
      if (!block.id || !block.type || !block.props) {
        throw new Error(`Block is missing id/type/props: ${JSON.stringify(block).slice(0, 80)}…`);
      }
    }
  }
  return t as CommunityTemplate;
}

export async function fetchCommunityTemplate(url: string): Promise<CommunityTemplate> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Please enter a valid URL.");
  }
  if (parsed.protocol !== "https:") throw new Error("Only https:// URLs are allowed.");
  const res = await fetch(parsed.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Failed to fetch template (HTTP ${res.status}).`);
  const json = await res.json().catch(() => {
    throw new Error("Template URL did not return valid JSON.");
  });
  return validateCommunityTemplate(json);
}
