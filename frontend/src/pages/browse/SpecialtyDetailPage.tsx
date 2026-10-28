import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, TriangleAlert, UserRound, Building2, BellPlus, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSpecialtyVisual } from '@/data/specialtyVisuals';
import { useSpecialtyDetail, useBrowseSpecialtyCounts, SPECIALTIES_STALE_TIME } from '@/hooks/useSpecialtyBrowse';
import { api } from '@/lib/api';

// Browse-by-specialties drill-down (§5.2): children incl. cross-lists,
// condition/procedure chips and honest provider counts. Zero-state switches
// scope city → all-India, then offers the unmet-demand keeper instead of a
// dead end.
// SITE-I18N 3.2: fully keyed chrome, and in hi the Hindi name becomes the
// primary heading (the English one dangles below as the alias line).

export default function SpecialtyDetailPage() {
  const { code = '' } = useParams();
  const { t, i18n } = useTranslation();
  const isHi = (i18n.language || 'en').toLowerCase().startsWith('hi');
  const detail = useSpecialtyDetail(code);
  const [metroCity, setMetroCity] = useState('');
  const [scope, setScope] = useState<'city' | 'all'>(metroCity ? 'city' : 'all');
  const [scopeNote, setScopeNote] = useState('');

  useEffect(() => {
    let c = '';
    try { c = localStorage.getItem('findmedi_city') || ''; } catch { c = ''; }
    if (c) {
      setMetroCity(c);
      setScope('city');
    }
  }, []);

  const specialty = detail.data?.specialty || null;
  const children = detail.data?.children || detail.data?.specialty?.children || [];

  const counts = useBrowseSpecialtyCounts(code, scope === 'city' ? { city: metroCity } : {}, {
    staleTime: SPECIALTIES_STALE_TIME,
    enabled: !!code && !!detail.isSuccess,
  });

  if (detail.isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> {t('specialties.loading')}
      </div>
    );
  }

  if (!specialty) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold">{t('specialties.not_found')}</h1>
        <p className="text-muted-foreground mt-2">{t('specialties.not_found_hint')}</p>
        <Link to="/browse-specialties" className="inline-flex items-center gap-2 mt-4 text-primary underline underline-offset-2">
          <ArrowLeft className="w-4 h-4" /> {t('specialties.all_specialties')}
        </Link>
      </div>
    );
  }

  const visual = getSpecialtyVisual(specialty.code);
  const Icon = visual.icon;
  const providerCount = counts.data?.providers ?? counts.data?.doctors ?? null;
  const facilityCount = counts.data?.facilities ?? null;
  const zero = counts.isSuccess && providerCount === 0;

  const providersHref = `/clinic-doctors?specialty=${encodeURIComponent(specialty.name)}`;
  const hospitalsHref = `/hospitals?specialty=${encodeURIComponent(specialty.name)}`;

  const notifyMe = async () => {
    try {
      await api.postSearchUnmetDemand({ query: specialty.name, category: 'specialty', city: scope === 'city' ? metroCity : 'All' });
      setScopeNote(t('specialties.notify_thanks'));
    } catch {
      setScopeNote(t('specialties.notify_error'));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/browse-specialties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> {t('specialties.all_specialties')}
      </Link>

      <div className="flex items-start gap-4 mb-6">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${visual.color} flex items-center justify-center shrink-0`}>
          <Icon className={`w-6 h-6 ${visual.textColor}`} />
        </div>
        <div>
          <h1 className={`font-heading text-2xl font-bold ${specialty.sensitive ? 'text-muted-foreground' : ''}`}>
            {(isHi && specialty.meta?.nameHi) ? specialty.meta.nameHi : specialty.name}
            {specialty.sensitive && <Lock className="inline w-4 h-4 ml-2 -mt-1 text-muted-foreground" />}
            {specialty.claimsRestricted && <TriangleAlert className="inline w-4 h-4 ml-2 -mt-1 text-amber-500" />}
          </h1>
          {isHi && specialty.name && specialty.name !== specialty.meta?.nameHi && (
            <p className="text-muted-foreground">{specialty.name}</p>
          )}
          {!isHi && specialty.meta?.nameHi && <p className="text-muted-foreground">{specialty.meta.nameHi}</p>}
          {!!(specialty.aliases || []).length && (
            <p className="text-xs text-muted-foreground mt-1 max-w-prose">{specialty.aliases.slice(0, 6).join(' · ')}</p>
          )}
        </div>
      </div>

      {(specialty.claimsRestricted || specialty.sensitive) && (
        <p className="mb-6 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          {specialty.claimsRestricted
            ? t('specialties.claims_notice')
            : t('specialties.sensitive_notice')}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Button asChild size="sm" className="gap-2">
          <Link to={providersHref}><UserRound className="w-4 h-4" /> {t('specialties.find_specialists')}</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link to={hospitalsHref}><Building2 className="w-4 h-4" /> {t('specialties.find_facilities')}</Link>
        </Button>
        <span className="text-sm text-muted-foreground">
          {counts.isLoading
            ? t('specialties.counting')
            : providerCount !== null
              ? zero
                ? t('specialties.no_providers')
                : t('specialties.count_summary', { n: providerCount, fac: facilityCount || 0 })
              : ''}
        </span>
      </div>

      {zero && (
        <p className="mb-6 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center justify-between gap-3">
          <span>
            {scope === 'city' && metroCity
              ? t('specialties.zero_city', {
                name: specialty.name,
                city: metroCity,
                extra: facilityCount === 0 ? t('specialties.zero_city_extra') : '',
              })
              : t('specialties.zero_all')}
          </span>
          <span className="flex gap-2">
            {scope === 'city' && metroCity && (
              <Button size="sm" variant="outline" onClick={() => setScope('all')}>{t('specialties.show_all_india')}</Button>
            )}
            <Button size="sm" variant="outline" className="gap-1" onClick={notifyMe}>
              <BellPlus className="w-3.5 h-3.5" /> {t('specialties.notify_me')}
            </Button>
          </span>
        </p>
      )}
      {scopeNote && <p className="mb-6 text-xs text-emerald-700">{scopeNote}</p>}

      {(children || []).length > 0 && (
        <section className="mb-10">
          <h2 className="font-heading text-lg font-bold mb-3">{t('specialties.sub_specialties', { n: children.length })}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {children.map((sub) => {
              const subVisual = getSpecialtyVisual(sub.code);
              const SubIcon = subVisual?.icon;
              return (
                <Link
                  key={sub.code}
                  to={`/browse-specialties/${sub.code}`}
                  className="rounded-xl border border-border/60 bg-card p-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {SubIcon && (
                      <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${subVisual.color} flex items-center justify-center`}>
                        <SubIcon className={`w-3.5 h-3.5 ${subVisual.textColor}`} />
                      </span>
                    )}
                    <div>
                      <h3 className={`text-sm font-semibold ${sub.sensitive ? 'text-muted-foreground' : ''}`}>
                        {(isHi && sub.meta?.nameHi) ? sub.meta.nameHi : sub.name}
                        {sub.claimsRestricted && <TriangleAlert className="inline w-3 h-3 ml-1.5 -mt-0.5 text-amber-500" />}
                      </h3>
                      {!isHi && sub.meta?.nameHi && <p className="text-[11px] text-muted-foreground">{sub.meta.nameHi}</p>}
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-primary underline underline-offset-2 inline-flex items-center gap-1">
                    <UserRound className="w-3 h-3" /> {t('specialties.find_sub_specialists', { name: sub.name })}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {!counts.isLoading && scope === 'city' && metroCity && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-6">{t('specialties.counted_in', { city: metroCity })}</p>
      )}

      {!!(specialty.meta?.conditions || []).length && (
        <section className="mb-8">
          <h2 className="font-heading text-lg font-bold mb-3">{t('specialties.conditions_treated')}</h2>
          <div className="flex flex-wrap gap-2">
            {(specialty.meta.conditions).map((c: string) => (
              <span key={c} className="text-xs bg-secondary text-secondary-foreground rounded-full px-3 py-1.5 border border-border/60">{c}</span>
            ))}
          </div>
        </section>
      )}

      {!!(specialty.meta?.procedures || []).length && (
        <section className="mb-8">
          <h2 className="font-heading text-lg font-bold mb-3">{t('specialties.common_procedures')}</h2>
          <div className="flex flex-wrap gap-2">
            {(specialty.meta.procedures).map((p: string) => (
              <span key={p} className="text-xs bg-secondary text-secondary-foreground rounded-full px-3 py-1.5 border border-border/60">{p}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
