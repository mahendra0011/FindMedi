# ReactBits Component Audit & Retirement Strategy

**Date**: September 17, 2026  
**Audited Directory**: `FindMedi/client/src/components/reactbits/` (9 files)

---

## 1. Inventory of Files

The legacy Vite client contains 5 ReactBits components and 4 associated CSS files:

| File | Type | Lines / Size | Dependencies | Description |
|------|------|-------------|--------------|-------------|
| `BlurText.jsx` | Component | ~2.9 KB | React, CSS | Staggered blur-in animated text |
| `ElectricBorder.jsx` + `.css` | Component + Style | ~8.3 KB + ~1.2 KB | React, Canvas / SVG | Glowing electric border animation effect |
| `FlowingMenu.jsx` + `.css` | Component + Style | ~5.3 KB + ~1.6 KB | React, CSS | Infinite flowing circular/linear menu |
| `ScrollVelocity.jsx` + `.css` | Component + Style | ~3.5 KB + ~1.5 KB | React, CSS | Velocity-based horizontal scrolling text marquee |
| `SplitText.jsx` + `.css` | Component + Style | ~4.4 KB + ~0.5 KB | React, CSS | Split-by-word / split-by-letter spring text animation |

---

## 2. Usage Assessment in Next.js (`findmedi-next`)

1. **Native Motion Stack**: `findmedi-next` standardizes on `motion/react` (Framer Motion v12) alongside Tailwind CSS animations.
2. **SSR & Hydration Safety**: ReactBits components in `client` rely heavily on un-hydrated DOM measurements, `window` access without `use client` / dynamic import guard, and ad-hoc global CSS files that conflict with Next.js module scoping.
3. **Typography & Staggers**: Staggered text animations like `BlurText` and `SplitText` are implemented natively in Next.js pages using clean Framer Motion variants:
   ```tsx
   const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
   const item = { hidden: { opacity: 0, y: 10, filter: 'blur(4px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)' } };
   ```
4. **Performance Impact**: Direct migration of raw ReactBits CSS and JS files would add unnecessary client bundle bloat and potential hydration mismatches on server components.

---

## 3. Decision & Migration Roadmap

- **Status**: **Retire in `findmedi-next`** in favor of native `motion/react` + Tailwind utilities.
- **Legacy Retention**: Keep intact in `FindMedi/client/` to preserve backwards compatibility for legacy Vite client demos.
- **Next.js Implementation**:
  - For marquee scrolling -> Use native CSS Tailwind `animate-marquee` or lightweight Framer Motion transforms.
  - For animated text staggers -> Use standard Framer Motion `motion.span` wrappers.
  - For borders / cards -> Use Tailwind glassmorphism borders (`border border-border/50 bg-card/80 backdrop-blur-sm`).
