import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

import "./SplitText.css";

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

/** Elements `<SplitText>` may render as (drives the dynamic `<Tag>` below). */
type SplitTag = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/**
 * Host element we render as. Typed as `HTMLDivElement` (rather than plain
 * `HTMLElement`) so the ref stays assignable for every `<SplitTag>` option —
 * `p`/`div`/`hN` each require `align`, which `HTMLElement` alone lacks. The live
 * instance is parked on it as `_rbsplitInstance` so a re-run can revert the
 * previous split first.
 */
interface SplitHostElement extends HTMLDivElement {
  _rbsplitInstance?: { revert: () => void } | null;
}

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: string;
  /** gsap "from" vars bag, e.g. `{ opacity: 0, y: 40 }`. */
  from?: object;
  /** gsap "to" vars bag, e.g. `{ opacity: 1, y: 0 }`. */
  to?: object;
  threshold?: number;
  rootMargin?: string;
  textAlign?: CSSProperties["textAlign"];
  tag?: SplitTag;
  onLetterAnimationComplete?: () => void;
}

const SplitText = ({
  text,
  className = "",
  delay = 50,
  duration = 1.25,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  tag = "p",
  onLetterAnimationComplete
}: SplitTextProps) => {
  const ref = useRef<SplitHostElement | null>(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useEffect(() => {
    if (!document.fonts || document.fonts.status === "loaded") {
      setFontsLoaded(true);
      return;
    }

    document.fonts.ready.then(() => {
      setFontsLoaded(true);
    });
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return undefined;
      if (animationCompletedRef.current) return undefined;

      const el = ref.current;

      if (el._rbsplitInstance) {
        try {
          el._rbsplitInstance.revert();
        } catch {
          /* noop */
        }
        el._rbsplitInstance = null;
      }

      const startPct = (1 - threshold) * 100;
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
      const marginUnit = marginMatch ? marginMatch[2] || "px" : "px";
      const sign = marginValue === 0
        ? ""
        : marginValue < 0
          ? `-=${Math.abs(marginValue)}${marginUnit}`
          : `+=${marginValue}${marginUnit}`;
      const start = `top ${startPct}%${sign}`;

      const pickTargets = (self: GSAPSplitText): Element[] => {
        if (splitType.includes("chars") && self.chars.length) return self.chars;
        if (splitType.includes("words") && self.words.length) return self.words;
        if (splitType.includes("lines") && self.lines.length) return self.lines;
        return self.chars || self.words || self.lines;
      };

      const splitInstance = new GSAPSplitText(el, {
        type: splitType,
        smartWrap: true,
        autoSplit: splitType === "lines",
        linesClass: "split-line",
        wordsClass: "split-word",
        charsClass: "split-char",
        reduceWhiteSpace: false,
        onSplit: (self) => {
          const targets = pickTargets(self);
          return gsap.fromTo(
            targets,
            { ...from },
            {
              ...to,
              duration,
              ease,
              stagger: delay / 1000,
              scrollTrigger: {
                trigger: el,
                start,
                once: true,
                fastScrollEnd: true,
                anticipatePin: 0.4
              },
              onComplete: () => {
                animationCompletedRef.current = true;
                onCompleteRef.current?.();
              },
              willChange: "transform, opacity",
              force3D: true
            }
          );
        }
      });

      el._rbsplitInstance = splitInstance;

      return () => {
        ScrollTrigger.getAll().forEach((st) => {
          if (st.trigger === el) st.kill();
        });
        try {
          splitInstance.revert();
        } catch {
          /* noop */
        }
        el._rbsplitInstance = null;
      };
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        fontsLoaded
      ],
      scope: ref
    }
  );

  const Tag = tag || "p";

  return (
    <Tag
      ref={ref}
      style={{
        textAlign,
        overflow: "hidden",
        display: "inline-block",
        whiteSpace: "normal",
        wordWrap: "break-word",
        willChange: "transform, opacity"
      }}
      className={`split-parent ${className}`}
    >
      {text}
    </Tag>
  );
};

export default SplitText;
