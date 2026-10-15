import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartPulse, Lock, ArrowRight, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { HEALTHCARE_CATALOGUE, type CatalogueItem, type CatalogueSection } from '@/data/healthcareCatalogue';

export default function HealthcarePage() {
  const navigate = useNavigate();
  const [hospitalsCount, setHospitalsCount] = useState<number>(0);
  const [doctorsCount, setDoctorsCount] = useState<number>(0);
  const [activeItem, setActiveItem] = useState<CatalogueItem | null>(null);

  useEffect(() => {
    api.getHospitals({ status: 'approved' })
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.data || data?.hospitals || []);
        if (Array.isArray(list)) setHospitalsCount(list.length);
      })
      .catch(() => {});

    api.getDoctors({ doctor_type: 'clinic' })
      .then((data: any) => {
        const docList = Array.isArray(data) ? data : (data?.doctors || data?.data || []);
        if (Array.isArray(docList)) setDoctorsCount(docList.length);
      })
      .catch(() => {});
  }, []);

  const go = (route?: string, label?: string) => {
    if (!route) {
      toast.info(`${label || 'Ye section'} abhi launch ho raha hai`);
      return;
    }
    if (route.startsWith('tel:') || route.startsWith('http')) {
      window.location.href = route;
      return;
    }
    navigate(route);
  };

  const handleCardClick = (item: CatalogueItem) => {
    if (item.subs && item.subs.length > 0) {
      setActiveItem(item);
    } else {
      go(item.route, item.name);
    }
  };

  const itemCount = (item: CatalogueItem) => {
    if (item.countKey === 'hospitals' && hospitalsCount > 0) return `${hospitalsCount} hospital${hospitalsCount === 1 ? '' : 's'}`;
    if (item.countKey === 'doctors' && doctorsCount > 0) return `${doctorsCount} doctor${doctorsCount === 1 ? '' : 's'}`;
    return `${item.subs.length} subcategor${item.subs.length === 1 ? 'y' : 'ies'}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* ── Page Header ── */}
        <div className="flex items-center gap-3.5 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 shadow-xs">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
              Healthcare Categories & Services
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Kisi bhi category par click karein uski subcategories aur bookable services dekhne ke liye:
            </p>
          </div>
        </div>

        {/* ── Master Catalogue 24 Sections ── */}
        <div className="space-y-10">
          {HEALTHCARE_CATALOGUE.map((section: CatalogueSection) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.id} className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1.5 border-b border-border/50">
                  <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                    <SectionIcon className="w-5 h-5 text-primary" />
                    <span>{section.title}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-0">
                    {section.subtitle}
                  </p>
                </div>

                {/* ── Grid of Categories (8 per row on desktop) ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;

                    return (
                      <motion.div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        whileHover={{ scale: 1.04, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleCardClick(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCardClick(item);
                          }
                        }}
                        className={`rounded-xl p-2.5 sm:p-3 border bg-card hover:bg-card/90 hover:border-primary/50 hover:shadow-sm transition-all text-center flex flex-col items-center justify-center min-h-[92px] sm:min-h-[100px] cursor-pointer group ${
                          item.soon ? 'border-border/70 opacity-80' : 'border-border/70'
                        }`}
                      >
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-1.5 mx-auto transition-transform group-hover:scale-110 shadow-xs`}>
                          <ItemIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.textColor}`} />
                        </div>
                        <h3 className="font-medium text-[11px] sm:text-xs text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors text-center px-0.5">
                          {item.name}
                        </h3>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Subcategories Selection Modal ── */}
      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-card border border-border rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Top Bar */}
              <div className="p-5 border-b border-border/70 flex items-start justify-between gap-4 bg-muted/20">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${activeItem.color} flex items-center justify-center shrink-0 shadow-xs`}>
                    {React.createElement(activeItem.icon, { className: `w-6 h-6 ${activeItem.textColor}` })}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {activeItem.name}
                      </h3>
                      {activeItem.tier && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Tier {activeItem.tier}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeItem.summary}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className="p-1.5 rounded-lg border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Subcategories List */}
              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
                  <span>Available Subcategories & Bookable Services ({activeItem.subs.length})</span>
                  {activeItem.regulatedBy && (
                    <span className="flex items-center gap-1 text-[11px] text-teal-600 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Regulated: {activeItem.regulatedBy}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeItem.subs.map((sub, idx) => (
                    <button
                      key={sub.label}
                      type="button"
                      onClick={() => {
                        const target = sub.route ?? activeItem.route;
                        setActiveItem(null);
                        go(target, sub.label);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-background hover:bg-primary/5 hover:border-primary/50 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {sub.label}
                        </span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 ml-2 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border/70 bg-muted/20 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Close
                </button>
                {activeItem.route && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeItem.route;
                      setActiveItem(null);
                      go(target, activeItem.name);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    <span>View All in {activeItem.name.split('(')[0].trim()}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
