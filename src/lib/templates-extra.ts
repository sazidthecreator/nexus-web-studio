// 15 additional production-grade native templates.
// Each is a fresh ProjectContent built with the same block primitives.
import type { ProjectContent, Block } from "./blocks";
import { uid } from "./blocks";

const blk = (type: Block["type"], props: Record<string, any>): Block => ({
  id: uid(type.slice(0, 3)),
  type,
  props,
});
const homePage = (blocks: Block[]) => [{ id: "home", name: "Home", blocks }];

export const ecommerceBoutique = (): ProjectContent => ({
  branding: { siteName: "Mara&Co.", primaryColor: "#111827", fontFamily: "'Playfair Display', Georgia, serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Shop", href: "#shop" }, { label: "Lookbook", href: "#look" }, { label: "About", href: "#about" }, { label: "Stockists", href: "#stockists" }], ctaLabel: "Cart (0)", ctaHref: "#cart" }),
    blk("hero", { eyebrow: "Spring / Summer 2026", headline: "Quiet luxury, made to last decades.", subheadline: "Small-batch knitwear and tailoring crafted in our family workshop in Porto since 1974.", ctaLabel: "Shop the collection", ctaHref: "#shop", secondaryLabel: "Read our story", secondaryHref: "#about" }),
    blk("features", { title: "This season", subtitle: "Three pieces that define SS26.", items: [
      { icon: "01", title: "The Mara Cardigan", body: "Hand-finished merino, mother-of-pearl buttons. €380." },
      { icon: "02", title: "Linen Trouser No.4", body: "Belgian linen, single pleat, side adjusters. €220." },
      { icon: "03", title: "Silk Scarf — Olivia", body: "Hand-rolled hem. Seven colourways. €145." },
    ]}),
    blk("cta", { headline: "Free shipping on orders over €200", subheadline: "60-day returns. Repairs for life. Carbon-neutral delivery.", ctaLabel: "Shop now", ctaHref: "#shop" }),
    blk("footer", { tagline: "Mara&Co · Porto · est. 1974", columns: [
      { title: "Shop", links: [{ label: "Knitwear", href: "#" }, { label: "Tailoring", href: "#" }, { label: "Gift cards", href: "#" }] },
      { title: "Help", links: [{ label: "Sizing", href: "#" }, { label: "Returns", href: "#" }, { label: "Contact", href: "#" }] },
    ]}),
  ]),
});

export const photographyStudio = (): ProjectContent => ({
  branding: { siteName: "Idris Okafor", primaryColor: "#0a0a0a", fontFamily: "'Space Grotesk', sans-serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Series", href: "#series" }, { label: "Editorial", href: "#editorial" }, { label: "About", href: "#about" }], ctaLabel: "Book a session", ctaHref: "#book" }),
    blk("hero", { eyebrow: "Photographer · Lagos / London", headline: "Photographs that hold their breath.", subheadline: "Portrait and editorial work for The New Yorker, Aperture, and a small handful of brands I believe in.", ctaLabel: "View series", ctaHref: "#series", secondaryLabel: "Get in touch", secondaryHref: "#contact" }),
    blk("gallery", { images: [{ src: "", alt: "Portrait series" }, { src: "", alt: "Editorial" }, { src: "", alt: "Documentary" }] }),
    blk("text", { body: "Currently booking commissions for Q3 2026. Studio days in London, location work worldwide. Represented by Webber Represents.", align: "center" }),
    blk("cta", { headline: "Studio enquiries", subheadline: "studio@idrisokafor.com · +44 20 7946 0123", ctaLabel: "Email the studio", ctaHref: "mailto:studio@idrisokafor.com" }),
    blk("footer", { tagline: "© Idris Okafor · All images copyright protected", columns: [{ title: "Elsewhere", links: [{ label: "Instagram", href: "#" }, { label: "Are.na", href: "#" }] }] }),
  ]),
});

export const blogEditorial = (): ProjectContent => ({
  branding: { siteName: "The Long Form", primaryColor: "#1d4ed8", fontFamily: "'Playfair Display', Georgia, serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Essays", href: "#essays" }, { label: "Notes", href: "#notes" }, { label: "About", href: "#about" }], ctaLabel: "Subscribe", ctaHref: "#subscribe" }),
    blk("hero", { eyebrow: "Issue 042 · May 2026", headline: "Slow ideas about a fast internet.", subheadline: "A weekly essay on technology, work, and craft — read by 38,000 thoughtful people.", ctaLabel: "Read latest", ctaHref: "#latest", secondaryLabel: "Browse archive", secondaryHref: "#archive" }),
    blk("features", { title: "Recent essays", subtitle: "Long, considered pieces. No clickbait, ever.", items: [
      { icon: "✦", title: "On building tools that age well", body: "12 min read · The case for software that becomes more familiar, not more bloated." },
      { icon: "✦", title: "What craftsmen know that we don't", body: "9 min read · Lessons from a decade of watching joiners, tailors, and sushi chefs at work." },
      { icon: "✦", title: "The end of the attention economy", body: "15 min read · Why the next decade belongs to focused products and patient users." },
    ]}),
    blk("form", { title: "Get the weekly essay", subtitle: "One email, every Sunday. No ads, no tracking. Unsubscribe in one click.", submitLabel: "Subscribe", fields: [{ name: "email", label: "Email address", type: "email", required: true }] }),
    blk("footer", { tagline: "The Long Form · Independent since 2019", columns: [{ title: "Read", links: [{ label: "Archive", href: "#" }, { label: "RSS", href: "#" }, { label: "Membership", href: "#" }] }] }),
  ]),
});

export const eventConference = (): ProjectContent => ({
  branding: { siteName: "Make/Shift 2026", primaryColor: "#9333ea", fontFamily: "'Space Grotesk', sans-serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Speakers", href: "#speakers" }, { label: "Schedule", href: "#schedule" }, { label: "Venue", href: "#venue" }, { label: "Sponsors", href: "#sponsors" }], ctaLabel: "Get tickets", ctaHref: "#tickets" }),
    blk("hero", { eyebrow: "Sept 18–20, 2026 · Lisbon", headline: "Three days for people who build things on the internet.", subheadline: "300 designers, engineers, and founders. Forty talks. One unforgettable rooftop dinner overlooking the Tagus.", ctaLabel: "Buy a ticket — €590", ctaHref: "#tickets", secondaryLabel: "See last year's recap", secondaryHref: "#recap" }),
    blk("features", { title: "Confirmed speakers · partial line-up", subtitle: "Twenty more announced through July.", items: [
      { icon: "🎤", title: "Linda Liukas", body: "Author, Hello Ruby. On teaching kids to build software they own." },
      { icon: "🎤", title: "Jeremy Keith", body: "Co-founder, Clearleft. On building for the next billion users." },
      { icon: "🎤", title: "Anil Dash", body: "CEO, Glitch. On the next generation of programmable web." },
    ]}),
    blk("cta", { headline: "Early-bird tickets end June 30", subheadline: "After that, tickets jump to €790 and usually sell out by mid-August.", ctaLabel: "Reserve your seat", ctaHref: "#tickets" }),
    blk("footer", { tagline: "Make/Shift · An independent conference, run by humans.", columns: [{ title: "Conference", links: [{ label: "Code of conduct", href: "#" }, { label: "Diversity scholarships", href: "#" }, { label: "Press", href: "#" }] }] }),
  ]),
});

export const courseAcademy = (): ProjectContent => ({
  branding: { siteName: "Studio School", primaryColor: "#059669", fontFamily: "Inter, system-ui, sans-serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Curriculum", href: "#curriculum" }, { label: "Instructors", href: "#instructors" }, { label: "Outcomes", href: "#outcomes" }, { label: "FAQ", href: "#faq" }], ctaLabel: "Apply now", ctaHref: "#apply" }),
    blk("hero", { eyebrow: "Cohort 14 · Begins Sept 2026", headline: "Become a senior product designer in 16 weeks.", subheadline: "A part-time, mentor-led program for working designers. 92% of graduates land senior roles within six months.", ctaLabel: "Apply for cohort 14", ctaHref: "#apply", secondaryLabel: "Download syllabus", secondaryHref: "#syllabus" }),
    blk("features", { title: "What you'll build", subtitle: "Three real client projects, mentored by senior designers from Stripe, Notion, and Figma.", items: [
      { icon: "01", title: "Discovery & strategy", body: "Weeks 1–4. Stakeholder interviews, jobs-to-be-done, success metrics." },
      { icon: "02", title: "Craft & systems", body: "Weeks 5–10. Design systems, motion, prototyping at production fidelity." },
      { icon: "03", title: "Ship & lead", body: "Weeks 11–16. Cross-functional shipping, design reviews, leadership skills." },
    ]}),
    blk("cta", { headline: "Tuition: $4,800 · Payment plans available", subheadline: "Need-based scholarships cover up to 100% of tuition for underrepresented designers.", ctaLabel: "Start your application", ctaHref: "#apply" }),
    blk("footer", { tagline: "Studio School · Remote, worldwide.", columns: [{ title: "Program", links: [{ label: "Curriculum", href: "#" }, { label: "Outcomes report", href: "#" }, { label: "Scholarships", href: "#" }] }] }),
  ]),
});

export const newsletterPublication = (): ProjectContent => ({
  branding: { siteName: "Margins", primaryColor: "#dc2626", fontFamily: "'DM Sans', sans-serif" },
  pages: homePage([
    blk("hero", { eyebrow: "A Tuesday morning email", headline: "Smart writing about money, for people who hate finance content.", subheadline: "30,000 readers. No hot takes, no charts, no Substack-bro energy. Just clear thinking about how money actually works.", ctaLabel: "Read this week's issue", ctaHref: "#latest", secondaryLabel: "Browse archive", secondaryHref: "#archive" }),
    blk("form", { title: "Subscribe — it's free", subtitle: "Tuesday mornings. Three minutes. No spam, ever.", submitLabel: "Subscribe", fields: [{ name: "email", label: "Your email", type: "email", required: true }] }),
    blk("features", { title: "What readers are saying", items: [
      { icon: "★", title: "“Finally a finance newsletter that respects me.”", body: "— Hema, software engineer" },
      { icon: "★", title: "“The only money writing I read end-to-end.”", body: "— Marco, founder" },
      { icon: "★", title: "“Like a smart friend explaining why your rent went up.”", body: "— Aisha, journalist" },
    ]}),
    blk("footer", { tagline: "Margins · Independent since 2022", columns: [{ title: "About", links: [{ label: "About the author", href: "#" }, { label: "Press", href: "#" }, { label: "Sponsor", href: "#" }] }] }),
  ]),
});

export const charityNonprofit = (): ProjectContent => ({
  branding: { siteName: "Ocean Trust", primaryColor: "#0891b2", fontFamily: "Inter, system-ui, sans-serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Our work", href: "#work" }, { label: "Impact", href: "#impact" }, { label: "Get involved", href: "#involved" }], ctaLabel: "Donate", ctaHref: "#donate" }),
    blk("hero", { eyebrow: "Protecting the world's coastlines since 1998", headline: "12,400 km of coastline protected. We're just getting started.", subheadline: "Ocean Trust funds local communities to restore mangroves, seagrass, and coral reefs in 17 countries — measurably, transparently, and forever.", ctaLabel: "Donate now", ctaHref: "#donate", secondaryLabel: "Read our 2025 impact report", secondaryHref: "#report" }),
    blk("features", { title: "How your donation works", subtitle: "94¢ of every dollar goes directly to coastal restoration.", items: [
      { icon: "🌱", title: "$25 plants 50 mangroves", body: "Mangroves sequester carbon 4x faster than rainforest. We've planted 41 million." },
      { icon: "🐠", title: "$100 funds a reef survey", body: "Local divers monitor reef health quarterly. Data is open and public." },
      { icon: "🤝", title: "$500 trains a community ranger", body: "Local rangers protect what they restored. 1,200 trained to date." },
    ]}),
    blk("cta", { headline: "Become a monthly giver", subheadline: "Sustainable funding lets us plan ten years out, not one campaign at a time.", ctaLabel: "Give monthly", ctaHref: "#monthly" }),
    blk("footer", { tagline: "Ocean Trust · 501(c)(3) · EIN 12-3456789", columns: [{ title: "Trust", links: [{ label: "Annual report", href: "#" }, { label: "Financials", href: "#" }, { label: "Charity Navigator", href: "#" }] }] }),
  ]),
});

export const realEstateLanding = (): ProjectContent => ({
  branding: { siteName: "Hayward & Co.", primaryColor: "#92400e", fontFamily: "'Playfair Display', Georgia, serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Listings", href: "#listings" }, { label: "Sell with us", href: "#sell" }, { label: "Neighborhoods", href: "#hoods" }, { label: "Team", href: "#team" }], ctaLabel: "Schedule a viewing", ctaHref: "#viewing" }),
    blk("hero", { eyebrow: "Boutique residential brokerage · Brooklyn", headline: "Brownstones, lofts, and the occasional carriage house.", subheadline: "We sell about thirty homes a year. Each one matters. We don't farm leads, we don't pressure clients, and we know every block.", ctaLabel: "Browse current listings", ctaHref: "#listings", secondaryLabel: "Meet the team", secondaryHref: "#team" }),
    blk("features", { title: "Featured listings · May 2026", items: [
      { icon: "🏠", title: "$2.4M · Cobble Hill brownstone", body: "Four bed, three bath, restored 1880s parlor floor, garden." },
      { icon: "🏠", title: "$1.8M · DUMBO factory loft", body: "2,100 sqft, river views, original maple floors, doorman." },
      { icon: "🏠", title: "$985K · Park Slope co-op", body: "Top floor, two bed, exposed brick, three blocks to the park." },
    ]}),
    blk("cta", { headline: "Thinking of selling?", subheadline: "We'll walk through your home, give you a free valuation, and a frank conversation. No pressure, no listing presentation theatre.", ctaLabel: "Request a valuation", ctaHref: "#valuation" }),
    blk("footer", { tagline: "Hayward & Co. · Licensed RE Broker, NY", columns: [{ title: "Contact", links: [{ label: "team@hayward.co", href: "#" }, { label: "(718) 555-0177", href: "#" }, { label: "Visit our office", href: "#" }] }] }),
  ]),
});

export const medicalClinic = (): ProjectContent => ({
  branding: { siteName: "Northpark Medical", primaryColor: "#0d9488", fontFamily: "Inter, system-ui, sans-serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Services", href: "#services" }, { label: "Doctors", href: "#doctors" }, { label: "Insurance", href: "#insurance" }, { label: "Patient portal", href: "#portal" }], ctaLabel: "Book an appointment", ctaHref: "#book" }),
    blk("hero", { eyebrow: "Family medicine · Open Mon–Sat", headline: "Healthcare that feels like home, not a hospital.", subheadline: "Same-day appointments, doctors who know your name, and 30-minute visits — because medicine works better when no one's rushing.", ctaLabel: "Book an appointment", ctaHref: "#book", secondaryLabel: "Meet our team", secondaryHref: "#doctors" }),
    blk("features", { title: "What we treat", subtitle: "Comprehensive primary care for adults and children.", items: [
      { icon: "🩺", title: "Annual physicals", body: "Thorough exam, lab work, and a real conversation about your health." },
      { icon: "💉", title: "Vaccinations & travel", body: "All routine immunizations plus travel consultations and prescriptions." },
      { icon: "🧠", title: "Mental health support", body: "Therapy referrals, medication management, and same-week access." },
    ]}),
    blk("cta", { headline: "Most insurance plans accepted", subheadline: "We work with Aetna, BCBS, Cigna, United, and most local plans. Self-pay options also available.", ctaLabel: "Verify your insurance", ctaHref: "#insurance" }),
    blk("footer", { tagline: "Northpark Medical · 1421 N Park Ave · (510) 555-0144", columns: [{ title: "Patient", links: [{ label: "Patient portal", href: "#" }, { label: "Records request", href: "#" }, { label: "Billing", href: "#" }] }] }),
  ]),
});

export const legalFirm = (): ProjectContent => ({
  branding: { siteName: "Cole & Whitfield", primaryColor: "#1e3a8a", fontFamily: "'Playfair Display', Georgia, serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Practice areas", href: "#practice" }, { label: "Attorneys", href: "#attorneys" }, { label: "Results", href: "#results" }], ctaLabel: "Free consultation", ctaHref: "#consult" }),
    blk("hero", { eyebrow: "Trial attorneys · Established 1987", headline: "When the stakes are real, you need a real trial firm.", subheadline: "Cole & Whitfield has tried over 400 cases to verdict. We don't outsource. We don't settle reflexively. We prepare every case as if it's going to a jury.", ctaLabel: "Request a free consultation", ctaHref: "#consult", secondaryLabel: "View case results", secondaryHref: "#results" }),
    blk("features", { title: "Practice areas", items: [
      { icon: "⚖", title: "Personal injury", body: "Catastrophic injury, wrongful death, medical malpractice. No fee unless we win." },
      { icon: "⚖", title: "Commercial litigation", body: "Contract disputes, business torts, partnership dissolutions. Hourly or hybrid fee." },
      { icon: "⚖", title: "Appeals", body: "State and federal appellate work. Eleven published opinions." },
    ]}),
    blk("cta", { headline: "Speak with an attorney today", subheadline: "Initial consultations are free and confidential. We respond within four business hours.", ctaLabel: "Schedule consultation", ctaHref: "#consult" }),
    blk("footer", { tagline: "Cole & Whitfield, LLP · Attorney advertising · Prior results do not guarantee a similar outcome", columns: [{ title: "Offices", links: [{ label: "San Francisco", href: "#" }, { label: "Sacramento", href: "#" }, { label: "Los Angeles", href: "#" }] }] }),
  ]),
});

export const weddingInvite = (): ProjectContent => ({
  branding: { siteName: "Sofia & Mateo", primaryColor: "#be185d", fontFamily: "'Playfair Display', Georgia, serif" },
  pages: homePage([
    blk("hero", { eyebrow: "Saturday, October 11, 2026 · Tuscany", headline: "Sofia & Mateo are getting married.", subheadline: "And we'd love for you to be there. Three days of wine, food, and dancing in a 17th-century villa outside Siena.", ctaLabel: "RSVP", ctaHref: "#rsvp", secondaryLabel: "Travel & lodging", secondaryHref: "#travel" }),
    blk("features", { title: "The weekend", subtitle: "October 10–12, 2026.", items: [
      { icon: "🍷", title: "Friday: Welcome dinner", body: "7pm at the villa. Aperitivo, family-style dinner, casual dress." },
      { icon: "💒", title: "Saturday: Ceremony & celebration", body: "5pm ceremony in the olive grove, dinner and dancing until late." },
      { icon: "🥐", title: "Sunday: Farewell brunch", body: "10am, lazy and long. Bring your sunglasses." },
    ]}),
    blk("form", { title: "RSVP by August 1, 2026", subtitle: "We can't wait.", submitLabel: "Send RSVP", fields: [
      { name: "name", label: "Your name(s)", type: "text", required: true },
      { name: "attending", label: "Will you attend?", type: "text", required: true },
      { name: "diet", label: "Dietary restrictions", type: "text", required: false },
    ]}),
    blk("footer", { tagline: "With love · Sofia & Mateo · sofia.mateo.2026@gmail.com", columns: [] }),
  ]),
});

export const appLaunchMobile = (): ProjectContent => ({
  branding: { siteName: "Cadence", primaryColor: "#7c3aed", fontFamily: "Inter, system-ui, sans-serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Features", href: "#features" }, { label: "Reviews", href: "#reviews" }, { label: "Pricing", href: "#pricing" }], ctaLabel: "Download free", ctaHref: "#download" }),
    blk("hero", { eyebrow: "App of the Day · Apple App Store", headline: "Run smarter. Train kinder.", subheadline: "Cadence is a running coach in your pocket. Adaptive plans, beautiful audio guidance, and zero pressure to PR every weekend.", ctaLabel: "Download for iPhone", ctaHref: "#ios", secondaryLabel: "Get it on Google Play", secondaryHref: "#android" }),
    blk("features", { title: "Built for real runners", subtitle: "Whether you're starting Couch-to-5K or chasing a sub-3 marathon.", items: [
      { icon: "🎧", title: "Voice coaching that adapts", body: "Real-time tempo, form, and effort cues. Not just \"good job!\" every kilometer." },
      { icon: "📈", title: "Plans that bend, not break", body: "Miss a session? We restructure the next two weeks automatically. No guilt." },
      { icon: "💬", title: "Real coaches, on demand", body: "Pro tier includes weekly check-ins with certified running coaches. Reply in app." },
    ]}),
    blk("cta", { headline: "Free for 14 days. $9/mo or $59/year after.", subheadline: "Cancel anytime. No credit card required to start.", ctaLabel: "Start free trial", ctaHref: "#trial" }),
    blk("footer", { tagline: "Cadence · Made by runners, for runners.", columns: [{ title: "App", links: [{ label: "iOS", href: "#" }, { label: "Android", href: "#" }, { label: "Apple Watch", href: "#" }] }] }),
  ]),
});

export const resumePersonal = (): ProjectContent => ({
  branding: { siteName: "Priya Raman", primaryColor: "#0f766e", fontFamily: "'DM Sans', sans-serif" },
  pages: homePage([
    blk("hero", { eyebrow: "Senior software engineer · Available for new roles Q3 2026", headline: "Hi, I'm Priya. I build things on the backend.", subheadline: "Eight years building distributed systems at Stripe and Datadog. I care about correctness, observability, and making other engineers more productive.", ctaLabel: "Email me", ctaHref: "mailto:hi@priya.dev", secondaryLabel: "Download resume PDF", secondaryHref: "#resume.pdf" }),
    blk("features", { title: "Recent work", items: [
      { icon: "01", title: "Stripe — Senior Engineer · 2021–present", body: "Tech lead for the global payments routing team. Cut latency 38% across the Asia-Pacific region." },
      { icon: "02", title: "Datadog — Engineer · 2018–2021", body: "Built the timeseries query optimizer powering APM dashboards for 12,000 customers." },
      { icon: "03", title: "Open source", body: "Maintainer of `pgcompat` (1.2k ⭐). Co-organizer of PyData Bangalore." },
    ]}),
    blk("text", { body: "I write occasionally about systems and engineering culture. The best way to reach me is by email — I read everything and reply within a day or two.", align: "center" }),
    blk("footer", { tagline: "© Priya Raman · Bangalore", columns: [{ title: "Find me", links: [{ label: "GitHub", href: "#" }, { label: "LinkedIn", href: "#" }, { label: "Read.cv", href: "#" }] }] }),
  ]),
});

export const docsKnowledgeBase = (): ProjectContent => ({
  branding: { siteName: "Plume Docs", primaryColor: "#2563eb", fontFamily: "Inter, system-ui, sans-serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Docs", href: "#docs" }, { label: "API Reference", href: "#api" }, { label: "Guides", href: "#guides" }, { label: "Changelog", href: "#changelog" }], ctaLabel: "Sign in", ctaHref: "#signin" }),
    blk("hero", { eyebrow: "Documentation", headline: "Everything you need to ship with Plume.", subheadline: "Quickstarts, API reference, SDKs in five languages, and a hundred-plus copy-pasteable recipes for common use cases.", ctaLabel: "Read the quickstart", ctaHref: "#quickstart", secondaryLabel: "Browse API reference", secondaryHref: "#api" }),
    blk("features", { title: "Start where you are", items: [
      { icon: "🚀", title: "Quickstart", body: "Send your first event in 5 minutes. Node, Python, Ruby, Go, or curl." },
      { icon: "📚", title: "Concepts", body: "Mental models that make Plume click. Read these before going deep." },
      { icon: "🔧", title: "Recipes", body: "Production-grade snippets for auth, webhooks, retries, and more." },
    ]}),
    blk("cta", { headline: "Stuck? Our team replies fast.", subheadline: "Open a ticket from any docs page or email support@plume.dev. Median first response: 38 minutes.", ctaLabel: "Contact support", ctaHref: "#support" }),
    blk("footer", { tagline: "Plume · Developer-first event platform", columns: [{ title: "Resources", links: [{ label: "Status", href: "#" }, { label: "Changelog", href: "#" }, { label: "Community", href: "#" }] }] }),
  ]),
});

export const podcastShow = (): ProjectContent => ({
  branding: { siteName: "Slow Thoughts", primaryColor: "#ea580c", fontFamily: "'Space Grotesk', sans-serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Episodes", href: "#episodes" }, { label: "Guests", href: "#guests" }, { label: "About", href: "#about" }], ctaLabel: "Listen now", ctaHref: "#listen" }),
    blk("hero", { eyebrow: "A weekly podcast · 90 minutes, no ads", headline: "Long, unhurried conversations with people who make things.", subheadline: "Designers, engineers, writers, and the occasional chef. New episode every Thursday since 2021.", ctaLabel: "Listen on Apple Podcasts", ctaHref: "#apple", secondaryLabel: "Listen on Spotify", secondaryHref: "#spotify" }),
    blk("features", { title: "Recent episodes", items: [
      { icon: "▶", title: "Ep 187 · Andy Matuschak on tools for thought", body: "1h 48m · On spaced repetition, why notebooks fail, and what comes next." },
      { icon: "▶", title: "Ep 186 · Bret Victor on visible computing", body: "2h 02m · A wide-ranging conversation about programming as a medium." },
      { icon: "▶", title: "Ep 185 · Soleio Cuervo on slow design", body: "1h 36m · From early Facebook to investing in companies built to last." },
    ]}),
    blk("form", { title: "Get new episodes by email", subtitle: "One short email each Thursday with the new episode and show notes.", submitLabel: "Subscribe", fields: [{ name: "email", label: "Email", type: "email", required: true }] }),
    blk("footer", { tagline: "Slow Thoughts · Independent · Listener-supported", columns: [{ title: "Support", links: [{ label: "Patreon", href: "#" }, { label: "Merch", href: "#" }, { label: "RSS", href: "#" }] }] }),
  ]),
});

export const fitnessGym = (): ProjectContent => ({
  branding: { siteName: "Iron Hall", primaryColor: "#dc2626", fontFamily: "'Space Grotesk', sans-serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Classes", href: "#classes" }, { label: "Coaches", href: "#coaches" }, { label: "Pricing", href: "#pricing" }, { label: "Schedule", href: "#schedule" }], ctaLabel: "Join now", ctaHref: "#join" }),
    blk("hero", { eyebrow: "Strength · Conditioning · Community", headline: "Train hard. Live strong.", subheadline: "A no-nonsense strength gym in the heart of the city. Coached classes, open floor, and a community that shows up.", ctaLabel: "Book a free trial", ctaHref: "#trial", secondaryLabel: "See the schedule", secondaryHref: "#schedule" }),
    blk("features", { title: "Three ways to train", subtitle: "Whatever your goal, we've built a path.", items: [
      { icon: "🏋", title: "Strength Foundations", body: "Twice-weekly coached barbell class. Squat, bench, deadlift, press." },
      { icon: "🔥", title: "Metabolic Conditioning", body: "45-minute mixed-modal sessions. Built to sweat, designed to scale." },
      { icon: "🥊", title: "Personal Coaching", body: "1:1 programming with a dedicated coach. In-person or hybrid." },
    ]}),
    blk("cta", { headline: "First week on us", subheadline: "Walk in, train with us, decide after. No pressure, no contracts.", ctaLabel: "Claim your free week", ctaHref: "#trial" }),
    blk("footer", { tagline: "Iron Hall · Open 5am–10pm daily", columns: [{ title: "Visit", links: [{ label: "Find us", href: "#" }, { label: "Contact", href: "#" }, { label: "Careers", href: "#" }] }] }),
  ]),
});

export const cryptoWeb3 = (): ProjectContent => ({
  branding: { siteName: "Mesh Protocol", primaryColor: "#a855f7", fontFamily: "'Space Grotesk', sans-serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Protocol", href: "#protocol" }, { label: "Validators", href: "#validators" }, { label: "Docs", href: "#docs" }, { label: "Governance", href: "#gov" }], ctaLabel: "Launch app", ctaHref: "#app" }),
    blk("hero", { eyebrow: "Mainnet live · $2.1B TVL", headline: "The settlement layer for the open web.", subheadline: "Sub-second finality. Permissionless. Audited by Trail of Bits, Sigma Prime, and Certora.", ctaLabel: "Launch app", ctaHref: "#app", secondaryLabel: "Read the whitepaper", secondaryHref: "#paper" }),
    blk("features", { title: "Built for builders", items: [
      { icon: "◆", title: "EVM-equivalent", body: "Drop in your Solidity. Hardhat, Foundry, and Viem work out of the box." },
      { icon: "⬡", title: "Proof of stake", body: "200+ independent validators. Slashing live. No foundation control." },
      { icon: "⚡", title: "Sub-second finality", body: "400ms blocks, single-slot finality. Real UX, not just numbers." },
    ]}),
    blk("cta", { headline: "Become a validator", subheadline: "Run a node, stake MESH, earn protocol rewards. No minimum, no whitelist.", ctaLabel: "Run a node", ctaHref: "#validators" }),
    blk("footer", { tagline: "Mesh · Open source · MIT licensed", columns: [{ title: "Develop", links: [{ label: "GitHub", href: "#" }, { label: "Discord", href: "#" }, { label: "Forum", href: "#" }] }] }),
  ]),
});

export const aiStartup = (): ProjectContent => ({
  branding: { siteName: "Synapse", primaryColor: "#0f172a", fontFamily: "Inter, system-ui, sans-serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Product", href: "#product" }, { label: "Research", href: "#research" }, { label: "Pricing", href: "#pricing" }, { label: "Customers", href: "#cust" }], ctaLabel: "Try free", ctaHref: "#signup" }),
    blk("hero", { eyebrow: "Now in private beta", headline: "Your team's second brain — powered by AI.", subheadline: "Synapse reads your docs, code, and conversations to answer questions in seconds. SOC 2 Type II. Your data never trains a public model.", ctaLabel: "Request access", ctaHref: "#access", secondaryLabel: "See it in action", secondaryHref: "#demo" }),
    blk("features", { title: "What it does", subtitle: "Three superpowers, zero setup.", items: [
      { icon: "🧠", title: "Ask anything", body: "Natural-language search across Notion, Linear, GitHub, Slack, and Drive. Cited answers, every time." },
      { icon: "✦", title: "Auto-summarize", body: "Daily digests for any project, person, or topic. Catch up in 60 seconds, not 60 minutes." },
      { icon: "🛡", title: "Private by design", body: "Single-tenant deployment. Your embeddings, your encryption keys, your data — never anyone else's." },
    ]}),
    blk("cta", { headline: "Stop searching. Start asking.", subheadline: "Join 800+ teams already on the waitlist. Onboarding the next 50 next week.", ctaLabel: "Request access", ctaHref: "#access" }),
    blk("footer", { tagline: "Synapse · San Francisco · Backed by Sequoia and a16z", columns: [{ title: "Company", links: [{ label: "About", href: "#" }, { label: "Security", href: "#" }, { label: "Careers", href: "#" }] }] }),
  ]),
});

export const travelBooking = (): ProjectContent => ({
  branding: { siteName: "Far & Wise", primaryColor: "#0d9488", fontFamily: "'Playfair Display', Georgia, serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Trips", href: "#trips" }, { label: "Destinations", href: "#dest" }, { label: "Journal", href: "#journal" }, { label: "About", href: "#about" }], ctaLabel: "Plan my trip", ctaHref: "#plan" }),
    blk("hero", { eyebrow: "Small-group journeys · Since 2008", headline: "Travel slowly. See more.", subheadline: "Thoughtfully designed trips to Japan, Patagonia, Morocco, and beyond. Eight travelers max. Local guides. No bus tours, ever.", ctaLabel: "Explore trips", ctaHref: "#trips", secondaryLabel: "Read the journal", secondaryHref: "#journal" }),
    blk("features", { title: "Upcoming departures", subtitle: "A few spots remaining for 2026.", items: [
      { icon: "🌸", title: "Japan · Cherry Blossom · 12 days", body: "Kyoto, Naoshima, and a ryokan in the alps. April 4–15. €5,400." },
      { icon: "🏔", title: "Patagonia · W Trek · 10 days", body: "Torres del Paine on foot, with a wine country wind-down. November. €4,200." },
      { icon: "🌅", title: "Morocco · Atlas & Sahara · 9 days", body: "Marrakech, the High Atlas, a night under the stars. October. €3,600." },
    ]}),
    blk("cta", { headline: "Not sure where to go?", subheadline: "Tell us how you like to travel. We'll design a private itinerary in 48 hours.", ctaLabel: "Plan a private trip", ctaHref: "#plan" }),
    blk("footer", { tagline: "Far & Wise · Carbon-offset on every trip · ABTA bonded", columns: [{ title: "Plan", links: [{ label: "Brochure", href: "#" }, { label: "FAQs", href: "#" }, { label: "Contact", href: "#" }] }] }),
  ]),
});

export const musicArtist = (): ProjectContent => ({
  branding: { siteName: "Nadia Cole", primaryColor: "#7c2d12", fontFamily: "'Space Grotesk', sans-serif" },
  pages: homePage([
    blk("navbar", { links: [{ label: "Music", href: "#music" }, { label: "Tour", href: "#tour" }, { label: "Videos", href: "#videos" }, { label: "Store", href: "#store" }], ctaLabel: "Listen now", ctaHref: "#listen" }),
    blk("hero", { eyebrow: "New album · Out May 30th", headline: "Nights in Lower Town.", subheadline: "The third record from Nadia Cole. Eleven songs about leaving, staying, and the long road home.", ctaLabel: "Pre-save the album", ctaHref: "#presave", secondaryLabel: "Watch the single", secondaryHref: "#single" }),
    blk("features", { title: "2026 World Tour", subtitle: "More dates announced monthly.", items: [
      { icon: "Jun 12", title: "London · Roundhouse", body: "Sold out · Waitlist open" },
      { icon: "Jun 18", title: "Paris · Olympia", body: "Limited tickets · €45" },
      { icon: "Jun 24", title: "Berlin · Astra Kulturhaus", body: "On sale Friday · €38" },
    ]}),
    blk("cta", { headline: "Join the mailing list", subheadline: "First access to tickets, vinyl drops, and the occasional unreleased demo.", ctaLabel: "Sign up", ctaHref: "#mail" }),
    blk("footer", { tagline: "© Nadia Cole · Booking: hello@nadiacole.com", columns: [{ title: "Follow", links: [{ label: "Spotify", href: "#" }, { label: "Apple Music", href: "#" }, { label: "Instagram", href: "#" }] }] }),
  ]),
});
