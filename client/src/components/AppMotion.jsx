import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const REVEAL_SELECTOR = [
  '.page-header',
  '.stat-card',
  '[data-motion-card]',
  '[data-motion-reveal]',
  'main section',
  'main form',
  'main table',
  '.motion-route-shell form',
  'main > div > .grid',
  'main > div > .space-y-4',
  'main > div > .space-y-6',
  'section',
].join(',');

const isVisibleCandidate = (element) => {
  if (!(element instanceof HTMLElement)) return false;
  if (element.dataset.motionReady === 'true') return false;
  if (element.closest('[data-motion-ignore]')) return false;
  if (element.closest('[data-radix-popper-content-wrapper]')) return false;

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

export default function AppMotion({ children }) {
  const location = useLocation();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    const root = document.getElementById('root');
    if (!root) return undefined;

    let sequence = 0;
    let frameId = 0;

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.12,
      }
    );

    const prepareElements = () => {
      frameId = 0;
      const elements = Array.from(document.querySelectorAll(REVEAL_SELECTOR));

      elements.forEach((element) => {
        if (!isVisibleCandidate(element)) return;

        element.dataset.motionReady = 'true';
        element.style.setProperty('--motion-index', String(sequence % 8));
        element.classList.add('motion-reveal');
        revealObserver.observe(element);
        sequence += 1;
      });
    };

    const schedulePrepare = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(prepareElements);
    };

    const mutationObserver = new MutationObserver(schedulePrepare);
    mutationObserver.observe(root, { childList: true, subtree: true });
    schedulePrepare();

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      mutationObserver.disconnect();
      revealObserver.disconnect();
    };
  }, [location.pathname, location.search]);

  return (
    <div key={location.pathname} className="motion-route-shell">
      {children}
    </div>
  );
}
