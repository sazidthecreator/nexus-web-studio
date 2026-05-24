// Scroll-driven reveal animations for published sites.
// Native IntersectionObserver — no library, no battery drain.
// Auto-attaches to [data-reveal] elements. Stagger children via [data-stagger].
// Respects prefers-reduced-motion.

export type RevealVariant =
  | "fade-up"
  | "fade-in"
  | "slide-left"
  | "slide-right"
  | "scale-in"
  | "stagger";

const VARIANTS: Record<RevealVariant, { from: string; to: string }> = {
  "fade-up": {
    from: "opacity:0;transform:translateY(24px)",
    to: "opacity:1;transform:translateY(0)",
  },
  "fade-in": { from: "opacity:0", to: "opacity:1" },
  "slide-left": {
    from: "opacity:0;transform:translateX(32px)",
    to: "opacity:1;transform:translateX(0)",
  },
  "slide-right": {
    from: "opacity:0;transform:translateX(-32px)",
    to: "opacity:1;transform:translateX(0)",
  },
  "scale-in": {
    from: "opacity:0;transform:scale(0.88)",
    to: "opacity:1;transform:scale(1)",
  },
  stagger: { from: "", to: "" },
};

let installed = false;

export function initScrollReveal(): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => undefined;
  }
  if (installed) return () => undefined;
  installed = true;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        const delay = el.dataset.delay ? parseInt(el.dataset.delay, 10) : 0;
        const variant = (el.dataset.reveal as RevealVariant) || "fade-up";
        window.setTimeout(() => {
          el.style.transition =
            "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)";
          el.style.cssText += VARIANTS[variant]?.to || "";
          observer.unobserve(el);
        }, delay);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
  );

  // Stagger children of [data-stagger] containers
  document.querySelectorAll<HTMLElement>("[data-stagger]").forEach((parent) => {
    Array.from(parent.children).forEach((child, i) => {
      const c = child as HTMLElement;
      if (!c.dataset.reveal) c.dataset.reveal = "fade-up";
      if (!c.dataset.delay) c.dataset.delay = String(i * 80);
    });
  });

  // Attach to every reveal element
  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    const variant = (el.dataset.reveal as RevealVariant) || "fade-up";
    const from = VARIANTS[variant]?.from;
    if (from) el.style.cssText += from;
    observer.observe(el);
  });

  return () => {
    observer.disconnect();
    installed = false;
  };
}
