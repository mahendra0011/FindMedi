import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { HeartPulse, X, ArrowLeft, ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { HEALTHCARE_CATALOGUE, type CatalogueItem } from '@/data/healthcareCatalogue';

export interface HealthcareCatalogueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HealthcareCatalogueModal({ isOpen, onClose }: HealthcareCatalogueModalProps) {
  const navigate = useNavigate();
  const [hospitalsCount, setHospitalsCount] = useState<number>(0);
  const [doctorsCount, setDoctorsCount] = useState<number>(0);
  const [activeItem, setActiveItem] = useState<CatalogueItem | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeItem) {
          setActiveItem(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeItem]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavigate = (route?: string, label?: string) => {
    onClose();
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
      handleNavigate(item.route, item.name);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="healthcare-modal-title"
      className="fixed inset-0 z-[99999] bg-background flex flex-col w-screen h-screen overflow-hidden"
    >
      {/* Top Bar */}
      <div className="shrink-0 bg-background border-b border-border/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeItem ? (
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              className="p-2 rounded-xl border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Back to all categories"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600">
              <HeartPulse className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 id="healthcare-modal-title" className="font-heading text-lg sm:text-xl font-bold text-foreground">
              {activeItem ? activeItem.name : 'Healthcare Categories'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {activeItem
                ? `Available subcategories and services (${activeItem.subs.length})`
                : 'Aapko kis suvidha ki zarurat hai? Kisi bhi category par click karein:'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setActiveItem(null);
            onClose();
          }}
          className="p-2 rounded-xl border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeItem ? (
            /* Subcategories Drill-Down View */
            <motion.div
              key="subcategories-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Category Info Header Banner */}
              <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

                <div className="flex items-center gap-2 shrink-0">
                  {activeItem.regulatedBy && (
                    <span className="flex items-center gap-1 text-xs text-teal-600 font-semibold px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20">
                      <ShieldCheck className="w-4 h-4" />
                      Regulated: {activeItem.regulatedBy}
                    </span>
                  )}
                  {activeItem.route && (
                    <button
                      type="button"
                      onClick={() => handleNavigate(activeItem.route, activeItem.name)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                    >
                      <span>Explore All</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Subcategories Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select a Subcategory ({activeItem.subs.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeItem.subs.map((sub, idx) => (
                    <button
                      key={sub.label}
                      type="button"
                      onClick={() => handleNavigate(sub.route ?? activeItem.route, sub.label)}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card hover:bg-primary/5 hover:border-primary/50 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {sub.label}
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 ml-2 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            /* All Categories Sections Grid */
            <motion.div
              key="all-categories-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              {HEALTHCARE_CATALOGUE.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <div key={section.title} className="space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 border-b border-border/50">
                      <h3 className="font-heading text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                        <SectionIcon className="w-4 h-4 text-primary" />
                        <span>{section.title}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 sm:mt-0">
                        {section.subtitle}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <motion.button
                            key={item.id}
                            whileHover={{ scale: 1.04, y: -2 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleCardClick(item)}
                            className="rounded-xl p-2.5 sm:p-3 border border-border/70 bg-card hover:bg-card/90 hover:border-primary/50 hover:shadow-sm transition-all text-center flex flex-col items-center justify-center min-h-[92px] sm:min-h-[100px] cursor-pointer group"
                          >
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-1.5 mx-auto transition-transform group-hover:scale-110 shadow-xs`}>
                              <ItemIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.textColor}`} />
                            </div>
                            <h4 className="font-medium text-[11px] sm:text-xs text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors text-center px-0.5">
                              {item.name}
                            </h4>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
