# ReactBits Component Audit & Decision Log

**Date**: September 17, 2026
**Audited Directory**: `client/src/components/reactbits/` (legacy app, since removed — was `apps/client/...`) (9 files — 5 components + 4 CSS)
**Target**: `frontend/src/components/shared/`

---

## Usage in Legacy Client

All 5 ReactBits components are consumed by `client/src/pages/Home.jsx` (legacy app, since removed)
(imports at lines 12–16; usages at lines 260, 274, 288, 304, 428, 545, 585, 746):

| Component | Effect | Used for |
|-----------|--------|----------|
| `SplitText` | Per-char / per-word staggered reveal on scroll | Hero headline ("FindMedi", "Healthcare Solutions", …) |
| `BlurText` | Staggered word blur-in on Intersection | Hero sub-description |
| `ScrollVelocity` | Scroll-linked horizontal velocity marquee | Scroll-velocity strip below hero |
| `ElectricBorder` | Canvas noise + glow animated border | "Why Choose Us" card frame |
| `FlowingMenu` | Edge-detection marquee hover menu | "Fast Navigation" section |

---

## Audit Methodology

A repo-wide content search (`motion.*`, `gsap`, `stagger`, `marquee`, `velocity`,
`split`, `BlurText`, `FlowingMenu`, `ScrollVelocity`, `SplitText`, `ElectricBorder`)
was run against `frontend/src`.

**Findings:**

1. `motion/react` is already a dependency and is used for basic `opacity` / `y` /
   `scale` transitions (51 call-sites). It is **not** used for any staggered text,
   char-split, scroll-velocity, or canvas effects.
2. `gsap` 3.15 and `@gsap/react` 2.1 are installed dependencies but have **zero**
   usages anywhere in `findmedi-next`.
3. **None** of the 5 ReactBits visual effects are currently replicated in
   `findmedi-next`. The prior audit note claiming "staggered text animations are
   implemented natively" was incorrect — no such patterns exist.
4. The existing landing page (`(public)/page.tsx`) is a static server component
   with animations deferred to Phase 5.

---

## Per-File Decision

| # | File | Animation lib | Already covered in findmedi-next? | Decision |
|---|------|---------------|-----------------------------------|----------|
| 1 | `BlurText.jsx` | `motion/react` | **No** — no word-stagger/blur pattern exists | **Port** → `components/shared/BlurText.tsx` |
| 2 | `ElectricBorder.jsx` + `.css` | raw `<canvas>` + `rAF` | **No** — no canvas-border effect | **Port** → `components/shared/ElectricBorder.tsx` (+ `.css`) |
| 3 | `FlowingMenu.jsx` + `.css` | `gsap` | **No** — no edge-detection marquee | **Port** → `components/shared/FlowingMenu.tsx` (+ `.css`) |
| 4 | `ScrollVelocity.jsx` + `.css` | `motion/react` | **No** — no scroll-velocity/parallax text | **Port** → `components/shared/ScrollVelocity.tsx` (+ `.css`) |
| 5 | `SplitText.jsx` + `.css` | `gsap` + `SplitText` plugin + `@gsap/react` | **No** — no char-split animation | **Port** → `components/shared/SplitText.tsx` (+ `.css`) |

All 5 are **genuinely unique effects** not covered by findmedi-next's existing
motion usage, and all are used on the home page. Per the migration plan they are
**ported as typed `.tsx`** (with `"use client"` directives and proper TS props)
rather than dropped as raw `.jsx`.

---

## Migration Notes

- `toast` / `toaster` ReactBits shadcn components are **deprecated** in favour of
  the `sonner` component; `findmedi-next` already has `src/components/ui/sonner.tsx`
  which exports both `Toaster` and `toast`. No ReactBits toast needed.
- The 4 CSS files are co-located beside their `.tsx` components and imported
  directly (valid in Next.js App Router client components).
- `react-resizable-panels@4.x` exports `Group` / `Panel` / `Separator` (not the
  legacy `PanelGroup` / `PanelResizeHandle`); `resizable.tsx` was patched at
  creation time to map these while preserving the public API.

## Legacy Retention

The original 9 files remained untouched in legacy `client/` until cutover (completed — legacy app deleted, all 5 effects live in `frontend/src/components/shared/`).
until Phase 5 cut-over, so the legacy Vite client retains a clean rollback path.
