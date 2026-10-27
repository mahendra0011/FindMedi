import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Mic, MicOff, MapPin, X, AlertTriangle, Phone, ShieldAlert,
  Sparkles, Stethoscope, Building2, Pill, ChevronRight, CheckCircle2,
  HeartPulse, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { allCities } from '@/data/cities';
import { useTranslation } from 'react-i18next';

export const QUICK_SYMPTOMS = [
  { label: '🦷 Tooth pain', query: 'tooth pain', hint: 'Dentist' },
  { label: '🦴 Hadda ka doctor', query: 'hadda ka doctor', hint: 'Orthopaedics' },
  { label: '❤️ Seene me dard', query: 'seene me dard', hint: 'Emergency / Cardiology' },
  { label: '👶 Fever in baby', query: 'fever in baby', hint: 'Pediatrician' },
  { label: '🧠 Tanav / Depression', query: 'tanav anxiety depression', hint: 'Mental Health' },
  { label: '👁️ Blurry vision', query: 'chashma eye test', hint: 'Ophthalmology' },
  { label: '💊 Sugar / Diabetes', query: 'sugar diabetes test', hint: 'Endocrinology' },
  { label: '🌿 Ayurvedic Clinic', query: 'ayurveda panchakarma', hint: 'AYUSH' },
];

interface Props {
  initialQuery?: string;
  initialCity?: string;
  compact?: boolean;
  autoNavigate?: boolean;
  onSearchSubmitted?: (query: string, city: string) => void;
  className?: string;
}

export default function UnifiedSearch({
  initialQuery = '',
  initialCity = '',
  compact = false,
  autoNavigate = true,
  onSearchSubmitted,
  className = '',
}: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity || 'All Cities');
  const [results, setResults] = useState<any[]>([]);
  const [taxonomy, setTaxonomy] = useState<any>(null);
  // Taxonomy-backed typeahead chips (/search/suggest — tiles, subs,
  // conditions, procedures, Hinglish symptoms; sensitive items stay hidden).
  const [suggestList, setSuggestList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Unmet demand modal state
  const [unmetModalOpen, setUnmetModalOpen] = useState(false);
  const [unmetContact, setUnmetContact] = useState('');
  const [unmetSubmitted, setUnmetSubmitted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<any>(null);

  // Instant client-side emergency & mental health red-flag detection (zero-latency safety guard)
  const isImmediateEmergency = /chest pain|heart attack|cardiac|seene me dard|saans nahi aa rahi|stroke|unconscious/i.test(query);
  const isImmediateSensitive = /depression|tanav|suicid|hopeless|anxiety|panic attack/i.test(query);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch unified search live preview
  const fetchPreview = useCallback(async (qText: string, cName: string) => {
    if (!qText.trim() || qText.trim().length < 2) {
      setResults([]);
      setTaxonomy(null);
      setSuggestList([]);
      return;
    }
    setLoading(true);
    try {
      const qParams = new URLSearchParams();
      qParams.set('q', qText.trim());
      if (cName && cName !== 'All Cities') qParams.set('city', cName);
      qParams.set('limit', '8');

      const [res, sug]: any[] = await Promise.all([
        api.get(`/search/unified?${qParams.toString()}`).catch(() => null),
        api.get(`/search/suggest?q=${encodeURIComponent(qText.trim())}`).catch(() => null),
      ]);
      if (sug?.success) setSuggestList(sug.results || []); else setSuggestList([]);
      if (res?.success) {
        setResults(res.results || []);
        setTaxonomy(res.taxonomy || null);
      } else {
        setResults([]);
        setTaxonomy(null);
      }
    } catch {
      setResults([]);
      setSuggestList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setShowDropdown(true);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchPreview(val, selectedCity);
    }, 280);
  };

  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    if (query.trim()) {
      fetchPreview(query, cityName);
    }
  };

  const triggerSearch = (searchVal = query) => {
    setShowDropdown(false);
    if (onSearchSubmitted) {
      onSearchSubmitted(searchVal.trim(), selectedCity);
    }
    if (autoNavigate) {
      const q = new URLSearchParams();
      if (searchVal.trim()) q.set('q', searchVal.trim());
      if (selectedCity && selectedCity !== 'All Cities') q.set('city', selectedCity);
      navigate(`/search?${q.toString()}`);
    }
  };

  // Web Speech API Voice Search handler
  const toggleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice search is not supported on this browser. Please type your query.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN'; // Supports Hindi/Hinglish/Indian English
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info('Listening... Speak your symptom, doctor, or test name');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setQuery(transcript);
          setIsListening(false);
          setShowDropdown(true);
          fetchPreview(transcript, selectedCity);
          toast.success(`Heard: "${transcript}"`);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast.error('Could not catch your voice. Please try typing.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      toast.error('Voice microphone access denied or failed.');
    }
  };

  // Submit unmet demand request
  const submitUnmetDemand = async () => {
    if (!query.trim()) return;
    try {
      await api.post('/search/unmet-demand', {
        query: query.trim(),
        city: selectedCity !== 'All Cities' ? selectedCity : 'Unspecified',
        userContact: unmetContact.trim(),
      });
      setUnmetSubmitted(true);
      toast.success('Service request logged! Our operations team prioritizes onboarding providers in high-demand areas.');
      setTimeout(() => {
        setUnmetModalOpen(false);
        setUnmetSubmitted(false);
        setUnmetContact('');
      }, 1500);
    } catch {
      toast.error('Failed to log request. Please try again.');
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* ── Main Unified Search Input Bar ── */}
      <div className={`relative flex items-center bg-card rounded-2xl border-2 transition-all shadow-md ${
        showDropdown && results.length > 0
          ? 'border-primary ring-4 ring-primary/10 rounded-b-none'
          : 'border-border/80 hover:border-primary/50'
      }`}>
        {/* City Filter Selector */}
        <div className="relative border-r border-border/70 hidden sm:flex items-center pl-3.5 pr-2">
          <MapPin className="w-4 h-4 text-primary shrink-0 mr-1.5" />
          <select
            value={selectedCity}
            onChange={(e) => handleCityChange(e.target.value)}
            className="text-xs font-semibold bg-transparent text-foreground cursor-pointer focus:outline-none py-3 pr-1"
            aria-label="Select City"
          >
            <option value="All Cities">All Cities</option>
            {allCities.slice(0, 20).map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Query Input */}
        <div className="relative flex-1 flex items-center">
          <Search className="w-5 h-5 text-muted-foreground ml-3 shrink-0" />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                triggerSearch();
              }
            }}
            placeholder={t('common.search', { defaultValue: 'Search doctors, clinics, tests, medicines…' })}
            className="border-0 shadow-none focus-visible:ring-0 text-sm h-13 pl-3 pr-10 bg-transparent placeholder:text-muted-foreground/70"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setTaxonomy(null); }}
              className="p-1 text-muted-foreground hover:text-foreground mr-1"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Voice Search Mic Button */}
        <button
          type="button"
          onClick={toggleVoiceSearch}
          className={`p-2.5 mr-2 rounded-xl transition-all ${
            isListening
              ? 'bg-destructive text-white animate-pulse shadow-md'
              : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
          }`}
          title={isListening ? 'Listening...' : 'Voice Search (Hindi / English)'}
          aria-label="Voice Search"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Search CTA Button */}
        <Button
          onClick={() => triggerSearch()}
          className="mr-2 px-5 h-10 rounded-xl font-semibold gap-1.5 shrink-0 shadow-sm"
        >
          <Search className="w-4 h-4" /> Search
        </Button>
      </div>

      {/* ── Quick Symptom Suggestions Strip (if not compact) ── */}
      {!compact && (
        <div className="flex items-center gap-2 overflow-x-auto pt-2.5 pb-1 text-xs no-scrollbar">
          <span className="text-[11px] font-semibold text-muted-foreground shrink-0 uppercase tracking-wider">
            Popular Symptoms:
          </span>
          {QUICK_SYMPTOMS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setQuery(s.query);
                fetchPreview(s.query, selectedCity);
                triggerSearch(s.query);
              }}
              className="px-2.5 py-1 rounded-full border border-border/70 bg-card hover:border-primary/50 hover:bg-primary/5 text-foreground transition-all shrink-0 font-medium"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Typeahead Live Preview & Emergency Dropdown ── */}
      {showDropdown && (query.trim().length >= 2 || results.length > 0 || taxonomy) && (
        <div className="absolute top-full left-0 right-0 z-50 bg-card border-2 border-t-0 border-primary rounded-b-2xl shadow-2xl max-h-[80vh] overflow-y-auto divide-y divide-border/60">
          {/* Red-Flag Emergency Escalation Banner */}
          {(taxonomy?.isEmergency || isImmediateEmergency) && (
            <div className="p-3.5 bg-red-600 text-white flex items-start justify-between gap-3 animate-pulse">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-white" />
                <div>
                  <p className="text-sm font-bold">EMERGENCY RED-FLAG TRIGGERED: Chest pain / heart attack signs detected</p>
                  <p className="text-xs opacity-95 mt-0.5">
                    {taxonomy?.emergencyMessage || 'Possible life-threatening emergency. Do not wait for online booking.'}
                  </p>
                </div>
              </div>
              <a
                href="tel:108"
                className="px-3.5 py-1.5 bg-white text-red-700 rounded-lg text-xs font-bold hover:bg-red-50 flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" /> Call 108 Ambulance
              </a>
            </div>
          )}

          {/* Mental Health Crisis Support Banner */}
          {(taxonomy?.isSensitive || isImmediateSensitive) && (
            <div className="p-3 bg-purple-600 text-white flex items-center justify-between gap-3 text-xs font-medium">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-200 shrink-0" />
                <span>Mental health crisis support: You are not alone. 24x7 Free Tele-MANAS support available.</span>
              </div>
              <a
                href="tel:14416"
                className="px-2.5 py-1 bg-white text-purple-800 rounded-md font-bold text-[11px] hover:bg-purple-50 shrink-0"
              >
                Call Tele-MANAS (14416)
              </a>
            </div>
          )}

          {/* Symptom to Specialty Mapping Suggestion */}
          {taxonomy?.matchedSpecialty && (
            <div className="p-3 bg-primary/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span>
                  Symptom mapped to: <strong className="text-primary font-bold">{taxonomy.matchedSpecialty}</strong>
                </span>
              </div>
              {taxonomy.suggestedQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery(taxonomy.suggestedQuery);
                    triggerSearch(taxonomy.suggestedQuery);
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Search {taxonomy.suggestedQuery} →
                </button>
              )}
            </div>
          )}

          {/* Taxonomy-backed specialty chips (§5.4) */}
          {suggestList.length > 0 && (
            <div className="py-1.5">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                Specialties & symptoms
              </div>
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {suggestList.map((s, i) => (
                  <button
                    key={`${s.kind}-${s.code || s.label}-${i}`}
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      if (s.kind === 'specialty' && s.code) {
                        navigate(`/browse-specialties/${s.code}`);
                        return;
                      }
                      if (s.specialty?.name) {
                        navigate(`/clinic-doctors?specialty=${encodeURIComponent(s.specialty.name)}`);
                        return;
                      }
                      triggerSearch(s.label || s.name || '');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border/70 bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    {s.specialty?.icon && <span className="text-muted-foreground">{s.specialty.icon}</span>}
                    <span className={s.kind === 'symptom' ? 'text-muted-foreground' : 'text-foreground font-medium'}>
                      {s.label || s.name}{s.nameHi ? ` · ${s.nameHi}` : ''}
                    </span>
                    {s.parentName && (
                      <span className="text-[10px] text-muted-foreground/70">in {s.parentName}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Search Results List */}
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Searching across clinics, doctors, tests & medicines...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                Matching Providers & Services
              </div>
              {results.map((item) => {
                const isDoc = item.vertical === 'doctor';
                const isMed = item.vertical === 'medicine';
                const Icon = isDoc ? Stethoscope : isMed ? Pill : Building2;

                return (
                  <button
                    key={`${item.vertical}-${item.id}`}
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      if (isDoc) navigate(`/doctor/${item.id}`);
                      else if (isMed) navigate(`/buy-medicine?q=${encodeURIComponent(item.fullName)}`);
                      else navigate(`/facility/${item.slug || item.id}`);
                    }}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/60 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary">
                          {item.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[item.specialization || item.category, item.city].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.verified && (
                        <Badge variant="outline" className="text-[10px] gap-1 text-success border-success/30">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
              <div className="p-2.5 bg-muted/30 border-t border-border flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Showing top matches for "{query}"</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold gap-1 text-primary" onClick={() => triggerSearch()}>
                  View all results <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : query.trim().length >= 2 ? (
            /* ── Zero Results Unmet Demand State ── */
            <div className="p-6 text-center space-y-3">
              <HeartPulse className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="font-semibold text-foreground text-sm">
                  No verified providers found matching "{query}" in {selectedCity}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Looking for this service in your area? Let us know and our onboarding team will bring them on board.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setUnmetModalOpen(true)}
                className="gap-1.5 font-semibold"
              >
                Request this service in {selectedCity}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Unmet Demand Request Modal ── */}
      {unmetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="unmet-title">
          <div className="bg-card border rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="unmet-title" className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Request Service in Your City
              </h3>
              <button
                type="button"
                onClick={() => setUnmetModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              We monitor unmet search requests to partner with clinics, diagnostic labs, and specialists where patients need them most.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Service / Specialty Needed</label>
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Service name" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">City / Locality</label>
                <Input value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} placeholder="e.g. Bengaluru, Indiranagar" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Phone or Email (Optional, for notifications)</label>
                <Input value={unmetContact} onChange={(e) => setUnmetContact(e.target.value)} placeholder="+91 9876543210" className="text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setUnmetModalOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={unmetSubmitted} onClick={submitUnmetDemand}>
                {unmetSubmitted ? 'Submitted!' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
