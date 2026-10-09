# 19. UI Design System & Motion Guide (har naye module ke liye common rules)

Base: repo ka existing stack/tokens (verified `frontend/src/index.css`): Tailwind v4 + shadcn/Radix, `--primary: 174 62% 38%` (teal), `--success 152 60% 42%`, `--warning 38 92% 50%`, `--info 210 80% 55%`, `--destructive 0 72% 51%`, `--radius 0.75rem`, fonts **Plus Jakarta Sans (headings) + Inter (body)**, light/dark (+ ek aur theme block), `framer-motion`, `gsap`, `lenis`, `AppMotion` (auto reveal), `sonner`, `cmdk`, `vaul`, `recharts`.
Ye file files 11-18 ke saare UI/animation decisions ko ek jagah standardise karti hai.

## 1. Repo-specific warnings (verified)
1. **`LenisScroll` poore app ko wrap karta hai** (`App.tsx:616-1077`) => dense clinical grids/virtualised lists me smooth-scroll jank/inertia aur keyboard-scroll issues de sakta hai. Rule: `LenisScroll` sirf public/marketing + patient-portal pages par; dashboards/clinical/kiosk/display par **disable** (route-level `disableSmoothScroll` ya `data-lenis-prevent` on scroll containers).
2. **`AppMotion` auto-reveal** `[data-motion-reveal]`/cards/sections pe chalta hai aur `[data-motion-ignore]` respect karta hai. Live/real-time widgets (queue, alerts, bed board, tables) par **`data-motion-ignore` lagao** warna re-render par reveal repeat ho sakta hai.
3. **Dark theme `--destructive: 0 62.8% 30.6%`** bahut dark hai (text/icon ke liye low contrast on dark bg). Critical alerts ke liye alag token banao (neeche §2) aur WCAG check karo.
4. `Header/ AppSidebar` flat menus (file 01) => naye modules ke liye **grouped nav config** use karo.
5. i18n: custom stub (`i18n/i18n.ts`, flat JSON `en.json`/`hi.json`); `react-i18next` repo me nahi. Nayi keys namespace karo (`queue.*`, `rcm.*`), Hindi fallback to English; numbers/dates `Intl` (`en-IN`).

## 2. Clinical semantic tokens (add to `index.css`)
```css
:root{
  /* Triage / ESI */
  --esi-1: 0 72% 45%;   /* resuscitation */   --esi-2: 20 90% 50%;
  --esi-3: 45 95% 50%;  --esi-4: 152 55% 40%; --esi-5: 210 70% 55%;
  /* Bed states */
  --bed-available: 152 60% 42%; --bed-occupied: 210 80% 55%; --bed-reserved: 270 55% 55%;
  --bed-cleaning: 38 92% 50%;   --bed-maintenance: 215 15% 50%; --bed-blocked: 0 0% 40%; --bed-isolation: 330 70% 50%;
  /* Alert severity (AA on both themes; tune after contrast check) */
  --sev-info: 210 80% 55%; --sev-warning: 38 92% 45%; --sev-critical: 0 78% 48%;
  /* Queue priority stripe */
  --prio-emergency: 0 78% 48%; --prio-high: 25 92% 50%; --prio-senior: 210 80% 55%; --prio-normal: 215 10% 60%;
}
.dark{ --sev-critical: 0 85% 62%; --sev-warning: 40 95% 58%; }
```
Rules: **colour + icon + text** always (colour-blind safe); critical red reserved for truly critical; never use `success` green for "ok to ignore" on error-prone states; max 3 accent hues per screen.

## 3. Typography, spacing, density
- Headings Plus Jakarta Sans 600-700; body Inter 400-500; **numbers `font-variant-numeric: tabular-nums`** in tables/billing/vitals.
- Scale: 12/13/14 (dense tables), 16 base, 20/24/32 headings; kiosk 24+; display 48-160.
- **Density modes:** `comfortable` (default, 40px rows), `compact` (32px, clinical/billing power users), `touch` (min 44-48px targets: nurse PWA, kiosk). Implement via `data-density` on layout root + Tailwind variants; remember per-user.
- 8px spacing grid; card padding 16-24; max content width 1440 for dashboards; forms 720.
- Indian formats: `₹1,24,500`, dates `14 Oct 2026`, 12/24h toggle, Hindi numerals off by default.

## 4. Layout patterns (use consistently)
| Pattern | Used for | Notes |
|---|---|---|
| App shell: grouped sidebar + top bar (hospital switcher, search ⌘K, alerts bell, user) | everything staff | collapsible to icon rail; persistent state |
| **Master-detail (list + drawer/sheet)** | inbox (approvals, results, tasks), vendors, contracts | drawer via `sheet`/`vaul`, URL-synced `?id=` |
| **Split view** | reconciliation, template editor, OCR review | `resizable.tsx` panels |
| **Board (kanban/grid)** | tasks, bed board, OT scheduling | dnd-kit; virtualise > 200 cards |
| **Timeline** | patient chart, workflow history, movement | vertical, grouped by day, filter chips |
| **Stepper/wizard** | discharge workflow, onboarding, claim file | persistent summary rail |
| **Dashboard grid** | role dashboards | 12-col, widget registry, user layout saved |
| **Full-screen modes** | display/kiosk/scan | no chrome, large type, locked |

## 5. Component inventory
Existing (reuse): `Card, Button, Badge, Tabs, Sheet, Drawer(vaul), Dialog, AlertDialog, Command(cmdk), Table, Select, Calendar, Progress, Skeleton, Tooltip, Resizable, Sonner, Chart(recharts wrapper), StatCard, DashboardLayout`.
**New shared components to build** (one implementation, used everywhere):
| Component | Purpose / props |
|---|---|
| `PatientBanner` | name, age/sex, UHID, ABHA, flags[], payer, bed, doctor; sticky; compact variant |
| `StatusPill` | `status`, `domain` -> colour+icon+label from one map |
| `SeverityBadge`/`AlertBanner` | info/warning/critical, ack button, timer |
| `BedTile` | status, patient initials, LOS, flags, away-icon; keyboard focusable |
| `TicketCard` / `NowServing` | queue visuals |
| `SlaRing` | circular remaining-time (info→warning→critical) |
| `DataGrid` | TanStack Table + virtual rows, column pin/resize, density, saved views, CSV export |
| `FilterBar` | date presets, multi-select chips, saved filters, URL-synced |
| `EntityPicker` | async search (patient/doctor/item) with recent + create-new |
| `DiffView` | before/after (approvals, amendments) |
| `SignaturePad`, `BarcodeScanner`, `PdfViewer` | per files 14/15 |
| `EmptyState`, `ErrorState`, `OfflineBar` | consistent copy + CTA |
| `ConfirmDangerDialog` | type-to-confirm for destructive/financial actions |
| `Sparkline`, `GaugeRing`, `CountUp` | KPI visuals |
Each component: Storybook-style demo page (`/dev/ui`), a11y checks (axe), light/dark/density snapshots.

## 6. Interaction rules
- **Keyboard-first** for high-volume roles: global `⌘/Ctrl+K`, `/` focus search, `g then d` go dashboard, `n` new, `?` shortcuts sheet; tables: arrows, `Enter` open, `x` select.
- **Optimistic UI** for low-risk (task accept, ack); **confirm + server truth** for money/clinical-signing.
- **Never lose data:** unsaved-changes guard, autosave drafts, undo toast (5-8s) for reversible actions.
- **Loading:** skeleton matching final layout (no spinners for >300ms content), progressive streaming of widgets; **error isolation per widget** (retry chip) - one failing tile must not blank the page (fix for dashboard `.catch(()=>null)` silent fails: show error state, not `—`).
- **Empty states** teach: icon + one line + primary action.
- **Destructive/financial:** reason code required, show amount + patient in confirm text.
- Forms: inline validation on blur, summary at top on submit, focus first error, numeric inputs `inputMode`, Hindi labels.
- **Responsive:** desktop-first for back-office, mobile-first for nurse/doctor/patient/kiosk; breakpoints 640/768/1024/1280/1536; tables -> cards below 768 (key fields only).

## 7. Accessibility (hospital = must)
WCAG 2.2 AA minimum (AAA for display/kiosk text), focus-visible rings, 44px touch targets (touch density), aria-live for alerts (`assertive` only for critical), no timeouts without warning (kiosk shows countdown), screen-reader labels for icons, **colour-independence**, captions/transcripts for training videos, reduced-motion, text scaling to 200%, language attr per content (`lang="hi"`), tested with axe + manual keyboard pass.

## 8. Motion System

### 8.1 Principles
1. **Motion = meaning** (state change, hierarchy, feedback), never decoration in clinical work.
2. **Fast & quiet:** most transitions 120-220ms; max 400ms (except first-load chart reveal 600ms).
3. **Consistent tokens**, one library per job: `framer-motion` for component/layout motion, CSS for loops/pulses, `gsap` only for timeline-heavy (kiosk attract, display ticker), Lenis only on public pages.
4. **Respect `prefers-reduced-motion`**: replace movement with opacity/instant; stop all loops.
5. **Safety UI is static:** allergy/flag banners, vitals values, MAR "due" states don't animate continuously; critical alert pulse limited to ~5 cycles then static + persistent.
6. **Performance:** animate `transform/opacity` only; no layout-thrash; disable on lists > 200 rows; test on low-end Android.

### 8.2 Tokens (`lib/motion.ts`)
```ts
export const dur = { instant: 0.08, fast: 0.14, base: 0.2, slow: 0.32, chart: 0.6 };
export const ease = { out: [0.16, 1, 0.3, 1], inOut: [0.65, 0, 0.35, 1], spring: { type: 'spring', stiffness: 400, damping: 32 } } as const;

export const fadeUp  = { hidden: { opacity: 0, y: 8 },  show: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } } };
export const scaleIn = { hidden: { opacity: 0, scale: .96 }, show: { opacity: 1, scale: 1, transition: { duration: dur.fast, ease: ease.out } } };
export const slideInRight = { hidden: { opacity: 0, x: 16 }, show: { opacity: 1, x: 0, transition: ease.spring } };
export const listStagger = { show: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } } }; // cap to first 8 items
```
Helper `useReducedMotionSafe()` wraps `useReducedMotion()` from framer-motion and returns variants with `transition: {duration: 0}`.

### 8.3 Patterns catalogue
| Pattern | Spec | Where |
|---|---|---|
| **Page/section reveal** | `fadeUp`, once, `viewport.margin -10%`; handled by `AppMotion` (mark live widgets `data-motion-ignore`) | dashboards (first load only) |
| **Count-up numbers** | 700ms ease-out on first mount; later updates tween 250ms; `Intl.NumberFormat('en-IN')`; skip when value > 1e7 or reduced-motion | KPI cards |
| **Chart reveal** | bars `scaleY` from 0 (origin bottom) 600ms; lines `pathLength` 700ms; disable if > 500 points | recharts / SVG |
| **List reorder / insert / remove** | `layout` + `AnimatePresence`; insert slide+fade 180ms, remove collapse 200ms | queue, tasks, approvals |
| **Shared-element** | `layoutId` for ticket -> "Now serving", list row -> drawer header | queue, inbox |
| **Drawer/Sheet** | slide 240ms (vaul spring), backdrop fade 160ms | master-detail |
| **Modal/Command palette** | `opacity+y 8px+scale .98` 140ms | dialogs, ⌘K |
| **Skeleton -> content** | shimmer 1.4s loop on skeleton only; content crossfade 150ms | all fetches |
| **Status change** | background crossfade 200ms + tiny `scale 1.04→1` pop | bed tile, StatusPill |
| **Success** | SVG check `pathLength 0→1` 250ms; no confetti in clinical/financial | save/sign/pay |
| **Error** | inline message fade-in + icon; focus moves; **no shake** | forms |
| **Critical alert** | slide-down 200ms + border pulse (`@keyframes critPulse` 1.6s ×5) + persistent | alert banner |
| **Drag & drop** | lift `scale 1.02` + shadow; drop spring; drop-target ring | kanban, roster, form builder |
| **Swipe (mobile)** | `drag="x"`, threshold 96px, spring-back; haptic `navigator.vibrate(20)` | nurse tasks |
| **Progress** | determinate bars/rings only (no fake progress); indeterminate top line for refetch | reports, upload |
| **Attract/idle** | GSAP timeline slow loop, auto-pause after 5 min | kiosk, display |

```css
@keyframes critPulse { 0%,100% { box-shadow: 0 0 0 0 hsl(var(--sev-critical) / .45);} 50% { box-shadow: 0 0 0 8px hsl(var(--sev-critical) / 0);} }
.alert-critical { animation: critPulse 1.6s ease-out 5; border-color: hsl(var(--sev-critical)); }
@media (prefers-reduced-motion: reduce){ *,*::before,*::after{ animation-duration:.001ms!important; animation-iteration-count:1!important; transition-duration:.001ms!important; } }
```
```tsx
// CountUp: first mount animates, later updates tween; honours reduced motion
export function useCountUp(value: number, ms = 700) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const rounded = useTransform(mv, v => Math.round(v));
  useEffect(() => { const c = animate(mv, value, { duration: reduce ? 0 : ms/1000, ease: ease.out }); return c.stop; }, [value]);
  return rounded;
}
```

### 8.4 Where NOT to animate
Vitals values, lab results, MAR grids, medication lists, bills/line items, signature areas, any table with live updates, anything the user is typing into.

### 8.5 Motion QA checklist
- [ ] 60fps on mid Android (Chrome profiler), no layout shift (CLS < 0.1)
- [ ] reduced-motion verified per pattern
- [ ] no animation > 400ms in task flows
- [ ] looping animations have a stop condition
- [ ] audio/vibration cues user-controllable, off by default for non-critical

## 9. Per-role visual identity (subtle, same system)
Hospital admin = neutral/teal; Doctor = teal + clinical blue accents; Nurse = high-contrast touch UI; Front desk = speed-oriented compact; Billing/Accounts = compact tables + tabular numerals; Kiosk/Display = dark/AAA large type; Patient app = friendlier radius/illustration, Hindi-first option.

## 10. Design process for each new module
1. Flow diagram (who/when/exceptions) -> 2. low-fi wireframe (use ASCII boxes in these docs) -> 3. component mapping to inventory -> 4. states (loading/empty/error/offline/permission-denied) -> 5. a11y + motion spec -> 6. build with Storybook demo -> 7. usability test with 2-3 real staff (reception, nurse, billing) -> 8. iterate.
