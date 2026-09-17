#!/usr/bin/env bash
#
# fix-structure.sh — audits and repairs findmedi-next's folder structure
# against the planned architecture. Safe to re-run (idempotent).
#
# Usage:
#   cd findmedi-next
#   bash fix-structure.sh            # dry-run: reports only, changes nothing
#   bash fix-structure.sh --apply    # actually creates/moves/cleans files
#
set -euo pipefail

APPLY=false
if [[ "${1:-}" == "--apply" ]]; then
  APPLY=true
fi

ROOT="$(pwd)"
SRC="$ROOT/src"

if [[ ! -d "$SRC/app" ]]; then
  echo "❌ Run this from inside findmedi-next/ (src/app not found here: $ROOT)"
  exit 1
fi

ISSUES=0
FIXED=0

log_issue() {
  ISSUES=$((ISSUES + 1))
  echo "  🔴 $1"
}

log_fix() {
  FIXED=$((FIXED + 1))
  echo "  ✅ $1"
}

section() {
  echo ""
  echo "── $1 ──────────────────────────────────────────"
}

# ── 1. Required top-level src/ folders ──────────────────────────────────
section "1. Checking required top-level folders"

REQUIRED_DIRS=(
  "app" "components" "features" "lib" "store" "hooks" "types" "config" "styles"
)
for d in "${REQUIRED_DIRS[@]}"; do
  if [[ ! -d "$SRC/$d" ]]; then
    log_issue "Missing src/$d/"
    if $APPLY; then
      mkdir -p "$SRC/$d"
      log_fix "Created src/$d/"
    fi
  else
    echo "  ✔ src/$d/ exists"
  fi
done

# ── 2. Role-specific component folders must exist (even if empty for now) ──
section "2. Checking role-specific component folders"

ROLES=(patient doctor hospital pharmacy labcenter admin superadmin)
for r in "${ROLES[@]}"; do
  if [[ ! -d "$SRC/components/$r" ]]; then
    log_issue "Missing src/components/$r/"
    if $APPLY; then
      mkdir -p "$SRC/components/$r"
      touch "$SRC/components/$r/.gitkeep"
      log_fix "Created src/components/$r/"
    fi
  else
    count=$(find "$SRC/components/$r" -name "*.tsx" | wc -l)
    if [[ "$count" -eq 0 ]]; then
      echo "  ⚠ src/components/$r/ exists but is EMPTY (0 .tsx files) — not a structure bug, just unmigrated content"
    else
      echo "  ✔ src/components/$r/ has $count component(s)"
    fi
  fi
done

# ── 3. shared/ subfolders ────────────────────────────────────────────────
section "3. Checking components/shared/ subfolders"

SHARED_SUBDIRS=(cards forms layout maps modals notifications realtime sections)
for s in "${SHARED_SUBDIRS[@]}"; do
  if [[ ! -d "$SRC/components/shared/$s" ]]; then
    log_issue "Missing src/components/shared/$s/"
    if $APPLY; then
      mkdir -p "$SRC/components/shared/$s"
      touch "$SRC/components/shared/$s/.gitkeep"
      log_fix "Created src/components/shared/$s/"
    fi
  else
    echo "  ✔ src/components/shared/$s/ exists"
  fi
done

# ── 4. features/ domains must each have the standard 5 files ───────────────
section "4. Checking features/ domain completeness"

FEATURES=(appointments auth billing lab-tests notifications pharmacy-orders prescriptions)
for f in "${FEATURES[@]}"; do
  fdir="$SRC/features/$f"
  if [[ ! -d "$fdir" ]]; then
    log_issue "Missing src/features/$f/"
    if $APPLY; then
      mkdir -p "$fdir"
    fi
  fi
  for file in api.ts hooks.ts types.ts utils.ts index.ts; do
    if [[ ! -f "$fdir/$file" ]]; then
      log_issue "Missing src/features/$f/$file"
      if $APPLY; then
        touch "$fdir/$file"
        log_fix "Created src/features/$f/$file (empty stub — fill in manually)"
      fi
    fi
  done
  if [[ -d "$fdir" ]] && [[ -f "$fdir/api.ts" ]]; then
    echo "  ✔ src/features/$f/ complete"
  fi
done

# ── 5. config/ must have theme.ts, site.ts, roles.ts ────────────────────
section "5. Checking config/ completeness"

for f in theme.ts site.ts roles.ts; do
  if [[ ! -f "$SRC/config/$f" ]]; then
    log_issue "Missing src/config/$f"
    if $APPLY && [[ "$f" == "theme.ts" ]]; then
      cat > "$SRC/config/theme.ts" <<'EOF'
// White-label / brand customization layer.
// Swap these values per deployment — nothing else in the app should
// hardcode a brand color, logo path, or font choice.

export const theme = {
  brand: {
    name: "FindMedi",
    logo: "/images/logo.svg",
    logoLight: "/images/logo-light.svg",
  },
  colors: {
    primary: "hsl(var(--primary))",
    secondary: "hsl(var(--secondary))",
    accent: "hsl(var(--accent))",
  },
} as const;

export type Theme = typeof theme;
EOF
      log_fix "Created src/config/theme.ts (starter version — fill in real brand values)"
    fi
  else
    echo "  ✔ src/config/$f exists"
  fi
done

# ── 6. Detect misplaced files: business logic living directly in app/ ────
section "6. Checking for business logic misplaced inside app/ (should be in features/ or components/)"

# Flags any page.tsx that's suspiciously large (likely has inline logic that
# should be extracted into features/ or components/<role>/)
while IFS= read -r pagefile; do
  lines=$(wc -l < "$pagefile")
  if [[ "$lines" -gt 150 ]]; then
    echo "  ⚠ Large page file ($lines lines): ${pagefile#$SRC/} — consider extracting logic into features/ or components/<role>/"
  fi
done < <(find "$SRC/app" -name "page.tsx")

# ── 7. Detect duplicate/leftover context/ folder (Context API vs Redux) ──
section "7. Checking for context/ folder (should generally be Redux slices per plan)"

if [[ -d "$SRC/context" ]]; then
  count=$(find "$SRC/context" -name "*.tsx" -o -name "*.ts" | wc -l)
  echo "  ⚠ src/context/ exists with $count file(s) — plan calls for Redux slices instead."
  echo "     This isn't auto-fixed (needs a real decision), just flagged:"
  find "$SRC/context" -type f | sed 's/^/       - /'
else
  echo "  ✔ No stray context/ folder"
fi

# ── 8. napi-core cleanup (backend, not src/, but worth checking from repo root) ──
section "8. Checking server/napi-core/ for leftover build artifacts"

NAPI_DIR="$ROOT/../server/napi-core"
if [[ -d "$NAPI_DIR" ]]; then
  ARTIFACTS=(
    "$NAPI_DIR/index.js.bak"
    "$NAPI_DIR/index.win32-x64-gnu.node.bak"
    "$NAPI_DIR/dlltool.exe"
    "$NAPI_DIR/test.js"
    "$NAPI_DIR/test-image.js"
    "$NAPI_DIR/test-invoice.pdf"
  )
  for a in "${ARTIFACTS[@]}"; do
    if [[ -f "$a" ]]; then
      log_issue "Leftover artifact: ${a#$ROOT/../}"
      if $APPLY; then
        mkdir -p "$NAPI_DIR/tests"
        base="$(basename "$a")"
        if [[ "$base" == *.bak ]]; then
          rm -f "$a"
          log_fix "Deleted $base"
        else
          mv "$a" "$NAPI_DIR/tests/$base"
          log_fix "Moved $base to napi-core/tests/"
        fi
      fi
    fi
  done
else
  echo "  (server/napi-core not found relative to this script — skipping, run from findmedi-next/ inside the repo)"
fi

# ── 9. Stub vs real page report ─────────────────────────────────────────
section "9. Page migration status"

total=$(find "$SRC/app" -name "page.tsx" | wc -l)
stub=$(grep -rl "Phase 4\|under migration\|coming soon\|page stub" "$SRC/app" --include="page.tsx" 2>/dev/null | wc -l)
real=$((total - stub))
echo "  Total pages: $total"
echo "  Real:        $real"
echo "  Stubs:       $stub"

# ── 10. Component count per role (for tracking migration progress) ───────
section "10. Component counts per role folder"

for r in "${ROLES[@]}" shared ui; do
  d="$SRC/components/$r"
  if [[ -d "$d" ]]; then
    c=$(find "$d" -name "*.tsx" 2>/dev/null | wc -l)
    printf "  %-12s %s file(s)\n" "$r:" "$c"
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
if $APPLY; then
  echo " Applied $FIXED fix(es). $((ISSUES - FIXED)) issue(s) need manual attention (see ⚠ lines above)."
else
  echo " DRY RUN — found $ISSUES issue(s). Re-run with --apply to fix what's auto-fixable."
  echo " (Some issues, like the context/ folder and large page files, always need a manual decision.)"
fi
echo "════════════════════════════════════════════════"