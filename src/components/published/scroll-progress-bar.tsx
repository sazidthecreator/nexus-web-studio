// Top-edge scroll progress bar for published sites.
// Subtle, GPU-friendly: transforms a fixed bar via scaleX.
import { useEffect, useState } from "react";

export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const scrolled = window.scrollY;
      const total = document.body.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-50 origin-left"
      style={{
        transform: `scaleX(${progress / 100})`,
        background: "var(--color-primary-500, oklch(55% 0.165 265))",
        transition: "transform 50ms linear",
        boxShadow: "0 0 8px oklch(55% 0.165 265 / 0.6)",
      }}
    />
  );
}
