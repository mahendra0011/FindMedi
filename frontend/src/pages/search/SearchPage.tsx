import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Search, Filter, MapPin, CheckCircle2, Star, Clock, Phone, AlertTriangle,
  Building2, Stethoscope, Pill, ShieldCheck, HeartPulse, ExternalLink,
  ChevronRight, CalendarCheck, Home as HomeIcon, Video, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import UnifiedSearch from '@/components/search/UnifiedSearch';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';

const VERTICALS = [
  { key: '', label: 'All Services' },
  { key: 'doctor', label: 'Doctors' },
  { key: 'hospital', label: 'Hospitals' },
  { key: 'clinic', label: 'Clinics' },
  { key: 'lab', label: 'Diagnostic Labs' },
  { key: 'pharmacy', label: 'Pharmacies' },
  { key: 'transport', label: 'Ambulance / Rides' },
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('q') || '';
  const city = searchParams.get('city') || '';

  const [vertical, setVertical] = useState(searchParams.get('vertical') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [taxonomy, setTaxonomy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (query.trim()) qParams.set('q', query.trim());
      if (city && city !== 'All Cities') qParams.set('city', city);
      if (vertical) qParams.set('category', vertical);
      qParams.set('limit', '30');

      const res: any = await api.get(`/search/unified?${qParams.toString()}`);
      if (res?.success) {
        setResults(res.results || []);
        setTaxonomy(res.taxonomy || null);
      } else {
        setResults([]);
        setTaxonomy(null);
      }
    } catch {
      toast.error('Search request failed. Please check network.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, city, vertical]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // Client side facet filtering
  const filteredResults = results.filter((item) => {
    if (verifiedOnly && !item.verified) return false;
    if (emergencyOnly && !item.openNow && !item.emergency) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-6">
        {/* Top Search Hero Strip */}
        <div className="bg-card border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Find Healthcare Providers & Services
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unified discovery across clinics, hospitals, diagnostic centers, and certified doctors
              </p>
            </div>
            {city && city !== 'All Cities' && (
              <Badge variant="outline" className="w-fit text-xs gap-1 py-1 px-2.5">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Location: {city}
              </Badge>
            )}
          </div>

          {/* Unified Search Input bar */}
          <UnifiedSearch
            initialQuery={query}
            initialCity={city}
            compact={true}
            onSearchSubmitted={(q, c) => {
              const nextParams = new URLSearchParams();
              if (q) nextParams.set('q', q);
              if (c) nextParams.set('city', c);
              setSearchParams(nextParams);
            }}
          />
        </div>

        {/* Emergency Alert Prompt if triggered by symptom */}
        {taxonomy?.isEmergency && (
          <div className="p-4 rounded-xl border border-destructive bg-destructive/10 text-destructive flex flex-col sm:flex-row sm:items-center justify-between gap-3" role="alert">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">Emergency Alert: Immediate Medical Care Needed</h3>
                <p className="text-xs text-foreground/80 mt-0.5">
                  {taxonomy.emergencyMessage || 'Your symptoms may indicate an acute medical emergency. Dial 108 or 112 immediately.'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="destructive" className="gap-1.5 shrink-0" onClick={() => window.location.href = 'tel:108'}>
              <Phone className="w-3.5 h-3.5" /> Call 108 Ambulance
            </Button>
          </div>
        )}

        {/* Filter Strip */}
        <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-border/60">
          {/* Vertical tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
            {VERTICALS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setVertical(v.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  vertical === v.key
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Quick toggle chips */}
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                verifiedOnly
                  ? 'border-success bg-success/10 text-success'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              ✓ Verified Only
            </button>
            <button
              type="button"
              onClick={() => setEmergencyOnly(!emergencyOnly)}
              className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                emergencyOnly
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              🚨 24x7 Emergency
            </button>
          </div>
        </div>

        {/* Results Count & Taxonomy insight */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing <strong>{filteredResults.length}</strong> {filteredResults.length === 1 ? 'provider' : 'providers'}
            {query ? ` for "${query}"` : ''}
          </span>
          {taxonomy?.matchedSpecialty && (
            <span>
              Specialty: <strong className="text-foreground">{taxonomy.matchedSpecialty}</strong>
            </span>
          )}
        </div>

        {/* Results Grid / List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Card key={n} className="animate-pulse">
                <CardContent className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResults.map((item) => {
              const isDoc = item.vertical === 'doctor';
              const isMed = item.vertical === 'medicine';
              const detailPath = isDoc
                ? `/doctor/${item.id}`
                : isMed
                ? `/buy-medicine?q=${encodeURIComponent(item.fullName)}`
                : `/facility/${item.slug || item.id}`;

              return (
                <Card key={`${item.vertical}-${item.id}`} className="hover:shadow-md transition-all border-border/80 flex flex-col justify-between">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={detailPath} className="font-bold text-base text-foreground hover:text-primary transition-colors line-clamp-1">
                          {item.fullName}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {[item.specialization || item.category, item.city].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                        {item.vertical}
                      </Badge>
                    </div>

                    {/* Address & Emergency Info */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {item.address?.city && (
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          {item.address.city}{item.address.area ? `, ${item.address.area}` : ''}
                        </p>
                      )}
                      {item.openNow && (
                        <p className="flex items-center gap-1.5 text-success font-medium">
                          <Clock className="w-3.5 h-3.5 shrink-0" /> Open 24/7 Emergency Service
                        </p>
                      )}
                    </div>

                    {/* Badges strip */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1">
                      {item.verified && (
                        <Badge variant="outline" className="text-[10px] text-success border-success/30 gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                        </Badge>
                      )}
                      {item.rating > 0 && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          {item.rating.toFixed(1)}
                        </span>
                      )}
                      {item.fee && (
                        <Badge variant="secondary" className="text-[10px]">
                          ₹{item.fee} Consult
                        </Badge>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="pt-2 border-t border-border/60">
                      <Button asChild size="sm" className="w-full gap-1.5 text-xs font-semibold">
                        <Link to={detailPath}>
                          View Profile & Book <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Zero-Results State */
          <Card className="p-12 text-center border-dashed">
            <HeartPulse className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground">No Verified Providers Found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-5">
              We couldn't find any live providers matching "{query}" in {city || 'this region'}. Try clearing filters or submit a service request.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setVertical('');
                setVerifiedOnly(false);
                setEmergencyOnly(false);
              }}
            >
              Reset Filters
            </Button>
          </Card>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
