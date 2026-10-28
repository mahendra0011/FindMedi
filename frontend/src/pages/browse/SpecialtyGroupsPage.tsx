import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Lock, TriangleAlert } from 'lucide-react';
import { getSpecialtyVisual } from '@/data/specialtyVisuals';
import { useSpecialtyTiles } from '@/hooks/useSpecialtyBrowse';

// Browse-by-specialties, §2/§5.1: the 13 curated groups, each tile carrying
// its chip preview (§5.2) and honest child count. Sensitive tiles render
// discreetly (muted styling 🔒), claims-restricted ones carry ⚠.
// SITE-I18N 3.2: every label is a registry key and the name itself follows
// the active language — hi renders the Hindi name as primary, en dangles it
// as the secondary line under the English name.
const INITIAL_GROUPS = 3;

export default function SpecialtyGroupsPage() {
  const { t, i18n } = useTranslation();
  const isHi = (i18n.language || 'en').toLowerCase().startsWith('hi');
  const { groups, tiles, fromApi, isLoading } = useSpecialtyTiles();
  const [showAllGroups, setShowAllGroups] = useState(false);

  const visibleGroups = showAllGroups ? groups : groups.slice(0, INITIAL_GROUPS);
  const tileCount = tiles.length || 43;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">{t('specialties.browse_title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('specialties.browse_subtitle', {
            n: tileCount,
            where: fromApi ? t('specialties.browse_subtitle_api') : t('specialties.browse_subtitle_offline'),
          })}
        </p>
      </div>

      {!fromApi && (
        <p className="mb-6 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          {t('specialties.fallback_notice')}
        </p>
      )}
      {isLoading && !groups.length && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      <div className="space-y-10">
        {visibleGroups.map((group) => (
          <section key={group.id}>
            <div className="flex items-center gap-3 mb-4">
              <span className={`w-2.5 h-2.5 rounded-full bg-${group.color}-500`} />
              <h2 className="font-heading text-xl font-bold text-foreground">{group.name}</h2>
              <span className="text-xs text-muted-foreground">{group.tiles.length} specialties</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {group.tiles.map((tile) => {
                const visual = getSpecialtyVisual(tile.code);
                const Icon = visual.icon;
                const chips = (tile.children || []).slice(0, 3);
                return (
                  <Link
                    key={tile.code}
                    to={`/browse-specialties/${tile.code}`}
                    className={`group rounded-xl p-3 border border-border/60 bg-card hover:border-primary/30 hover:shadow-sm transition-all ${
                      tile.sensitive ? 'opacity-90' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${visual.color} flex items-center justify-center mb-2`}>
                      <Icon className={`w-4 h-4 ${visual.textColor}`} />
                    </div>
                    <h3 className={`font-semibold text-xs leading-tight ${tile.sensitive ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {(isHi && tile.meta?.nameHi) ? tile.meta.nameHi : tile.name}
                      {tile.sensitive && <Lock className="inline w-3 h-3 ml-1 -mt-0.5 text-muted-foreground" />}
                      {tile.claimsRestricted && <TriangleAlert className="inline w-3 h-3 ml-1 -mt-0.5 text-amber-500" />}
                    </h3>
                    {!isHi && tile.meta?.nameHi && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{tile.meta.nameHi}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {(tile.children || []).length > 0
                        ? t('specialties.n_subspecialties', { n: (tile.children || []).length })
                        : t('specialties.doctors_labs')}
                    </p>
                    {chips.length > 0 && (
                      <p className="text-[9px] text-muted-foreground/80 mt-1 truncate group-hover:text-primary" title={chips.map((c) => c.name).join(', ')}>
                        {chips.map((c) => c.name).join(' · ')}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {groups.length > INITIAL_GROUPS && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAllGroups(!showAllGroups)}
          className="mt-10 w-full flex items-center justify-center gap-2 text-sm text-primary bg-primary/5 border border-primary/20 rounded-xl py-3"
        >
          {showAllGroups ? t('specialties.show_fewer') : t('specialties.show_all_groups', { n: groups.length })}
          {showAllGroups ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </motion.button>
      )}
    </div>
  );
}
