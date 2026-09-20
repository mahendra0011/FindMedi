import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const motionSelector = [
  "main > section",
  "main .glass-card",
  "main article",
  "main .dashboard-card-motion",
  "main [data-motion]",
  "footer",
].join(",");

function MotionProvider({ children }) {
  const location = useLocation();

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const observed = new Set();
    const observer = reduceMotion
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
        );

    const hydrate = () => {
      document.querySelectorAll(motionSelector).forEach((element, index) => {
        if (element.closest("[data-motion-skip]")) return;
        element.classList.add("reveal-on-scroll");
        element.style.setProperty("--motion-order", String(index % 8));
        if (reduceMotion) {
          element.classList.add("is-visible");
          return;
        }
        if (!observed.has(element)) {
          observed.add(element);
          observer.observe(element);
        }
      });
    };

    const timer = window.setTimeout(hydrate, 40);
    const mutationObserver = new MutationObserver(() => {
      window.requestAnimationFrame(hydrate);
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timer);
      mutationObserver.disconnect();
      observer?.disconnect();
    };
  }, [location.pathname]);

  return <div className="app-motion-shell">{children}</div>;
}

export default MotionProvider;
