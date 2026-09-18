import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { useLocation } from 'react-router-dom';

export function LenisScroll({ children }) {
  const lenisRef = useRef(null);
  const frameRef = useRef(0);
  const location = useLocation();
  const useSmoothScroll = location.pathname === '/';

  useEffect(() => {
    if (location.hash || useSmoothScroll) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.hash, location.pathname, location.search, useSmoothScroll]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!useSmoothScroll || prefersReducedMotion) return undefined;

    const lenis = new Lenis({
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
      prevent: (node) => Boolean(node?.closest?.(
        '[data-lenis-prevent], [data-radix-scroll-area-viewport], [role="dialog"], .overflow-auto, .overflow-y-auto, .overflow-x-auto'
      )),
    });

    lenisRef.current = lenis;

    function raf(time) {
      lenis.raf(time);
      frameRef.current = requestAnimationFrame(raf);
    }
    frameRef.current = requestAnimationFrame(raf);

    const handleAnchorClick = (e) => {
      const anchor = e.target.closest?.('a[href^="#"]');
      const href = anchor?.getAttribute('href');
      if (href && href.length > 1) {
        e.preventDefault();
        const idTarget = document.getElementById(href.slice(1));
        let target = idTarget;
        if (!target) {
          try {
            target = document.querySelector(href);
          } catch {
            target = null;
          }
        }
        if (target) {
          lenis.scrollTo(target, {
            offset: -80,
            duration: 1,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
          });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      document.removeEventListener('click', handleAnchorClick);
      lenis.destroy();
      if (lenisRef.current === lenis) lenisRef.current = null;
    };
  }, [useSmoothScroll]);

  useEffect(() => {
    lenisRef.current?.resize?.();
  }, [location.pathname, location.search]);

  return <>{children}</>;
}
