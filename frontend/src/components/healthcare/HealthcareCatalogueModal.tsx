import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { HeartPulse, Heart, Scale, Car, X } from 'lucide-react';
import { api } from '@/lib/api';
import { HEALTHCARE_CATALOGUE } from '@/data/healthcareCatalogue';

export interface HealthcareCatalogueModalProps {
  isOpen: boolean;
  onClose: () => void;
}


export default function HealthcareCatalogueModal({ isOpen, onClose }: HealthcareCatalogueModalProps) {
  const navigate = useNavigate();
  const [hospitalsCount, setHospitalsCount] = useState<number>(0);
  const [doctorsCount, setDoctorsCount] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h2 id="healthcare-modal-title" className="font-heading text-lg sm:text-xl font-bold text-foreground">
              Healthcare Categories
            </h2>
            <p className="text-xs text-muted-foreground">
              Aapko kis suvidha ki zarurat hai? Kisi bhi category par click karein:
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full space-y-10">
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

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {section.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleNavigate(item.route, item.name)}
                      className="rounded-2xl p-3 border border-border/70 bg-card hover:bg-card/90 hover:border-primary/50 hover:shadow-md transition-all text-center flex flex-col items-center justify-between min-h-[140px] cursor-pointer group"
                    >
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-2 mx-auto transition-transform group-hover:scale-110 shadow-xs`}>
                        <ItemIcon className={`w-5 h-5 ${item.textColor}`} />
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <h4 className="font-semibold text-xs text-foreground leading-tight line-clamp-2">
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground/90 mt-1 line-clamp-2 leading-tight">
                          {item.summary}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                        {item.soon
                          ? 'Coming soon'
                          : item.countKey === 'hospitals' && hospitalsCount > 0
                            ? `${hospitalsCount} hospitals`
                            : item.countKey === 'doctors' && doctorsCount > 0
                              ? `${doctorsCount} doctors`
                              : `${item.subs.length} subcategories`}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
