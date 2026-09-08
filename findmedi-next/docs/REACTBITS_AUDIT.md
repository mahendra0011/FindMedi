# ReactBits Audit (Phase 0 – Todo 3)

Generated: 2026-09-08 · Source: `client/src/components/reactbits/`

## Inventory

| # | File | Size | Deps | Imported where |
|---|------|------|------|----------------|
| 1 | `BlurText.jsx` + `SplitText`-related logic | ~120 LOC | `motion/react` | `client/src/pages/Home.jsx:16` |
| 2 | `ElectricBorder.jsx` + `.css` | canvas + RAF loop | none (vanilla canvas) | `Home.jsx:12` |
| 3 | `FlowingMenu.jsx` + `.css` | GSAP `gsap.to` | `gsap` | `Home.jsx:13` |
| 4 | `ScrollVelocity.jsx` + `.css` | `motion/react` hooks (`useScroll`, `useVelocity`, `useSpring`, `useTransform`) | `motion/react` | `Home.jsx:14` |
| 5 | `SplitText.jsx` + `.css` | GSAP `SplitText` + `ScrollTrigger` + `useGSAP` | `gsap`, `@gsap/react` | `Home.jsx:15` |

All 5 are **only** imported in `Home.jsx` — no other consumer in `client/src`.

## Assessment per component

| Component | Verdict | Rationale | Next.js risk |
|-----------|---------|-----------|--------------|
| **BlurText** | **Keep — port as-is** | Already on `motion/react`, tiny, SSR-safe with `useEffect` guard for `inView`. Visual uniqueness: per-word blur reveal not trivially replaced by Tailwind animate. | Low — needs `"use client"` + `dynamic` if it measures `window`, otherwise fine as client component |
| **ScrollVelocity** | **Keep — port as-is** | Also already on `motion/react` (`useScroll` + `useVelocity`). Unique marquee-on-scroll effect; would be more work to reimplement. | Low — `useScroll` touches `window` → must be `ssr:false` dynamic or client component; already client-only in old app |
| **SplitText** | **Keep (conditional)** | GSAP `SplitText` is licensed/paid in GSAP 3.12+ (Club GreenSock). If the project already has license, keep. Otherwise replace with `motion` + `SplitText`-like stagger (BlurText already does similar). Audit license before porting. | Medium — `ScrollTrigger` + `SplitText` register globally; must be inside `useGSAP` + `useEffect` to avoid SSR `window` access |
| **FlowingMenu** | **Replace** | GSAP `gsap.to` marquee + DOM measuring; can be rebuilt with `motion` (`useAnimationFrame` + `motion.div`) or simple CSS marquee. Adds an extra GSAP tick for one marketing section. | Low — replace saves one GSAP timeline |
| **ElectricBorder** | **Replace or drop** | Canvas border animation — heavy (`requestAnimationFrame` + per-pixel noise). Holiday effect for marketing; not in dashboards. Replace with CSS `border-image` + `motion` glow or just Tailwind `ring` + `shadow` if design allows. Worth design review. | Medium — canvas `getContext('2d')` → client-only; biggest perf cost of the 5 |

## Recommended decision (lock via `config/site.ts` feature flag)

```ts
// findmedi-next/src/config/site.ts
export const FEATURES = {
  useReactBitsBlurText: true,
  useReactBitsScrollVelocity: true,
  useGSAPSplitText: false, // require GSAP SplitText license check
  useFlowingMenu: false,   // replace with motion
  useElectricBorder: false,
} as const;
```

## Porting checklist (when `Home` is migrated to `(public)/page.tsx`)

- [ ] `components/shared/reactbits/` → port `BlurText.tsx` + `ScrollVelocity.tsx` only (typed props, `"use client"`).
- [ ] `SplitText` → either port if licensed, or delete and use `BlurText` stagger.
- [ ] `FlowingMenu` + `ElectricBorder` → rebuild with `motion` in `findmedi-next/src/components/shared/marketing/` or drop.
- [ ] All must be `dynamic(() => import(...), { ssr: false })` or at least `"use client"` because they read `window`/canvas.

## Dependencies retained

- `motion` stays (already in `findmedi-next/package.json: ^13.2.0`)
- `gsap` + `@gsap/react` stay only if `SplitText` is kept; otherwise they remain for `LenisScroll.jsx` / `AppMotion.jsx` scroll work (Todo 28).
