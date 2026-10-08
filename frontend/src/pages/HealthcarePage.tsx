import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeartPulse, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { HEALTHCARE_CATALOGUE, type CatalogueItem, type CatalogueSection } from '@/data/healthcareCatalogue';

export default function HealthcarePage() {
  const navigate = useNavigate();
  const [hospitalsCount, setHospitalsCount] = useState<number>(0);
  const [doctorsCount, setDoctorsCount] = useState<number>(0);

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

  const itemCount = (item: CatalogueItem) => {
    if (item.countKey === 'hospitals' && hospitalsCount > 0) return `${hospitalsCount} hospital${hospitalsCount === 1 ? '' : 's'}`;
    if (item.countKey === 'doctors' && doctorsCount > 0) return `${doctorsCount} doctor${doctorsCount === 1 ? '' : 's'}`;
    return `${item.subs.length} subcategor${item.subs.length === 1 ? 'y' : 'ies'}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* â”€â”€ Page Header â”€â”€ */}
        <div className="flex items-center gap-3.5 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 shadow-xs">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
              Healthcare Categories
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Aapko kis suvidha ki zarurat hai? Kisi bhi category par click karein:
            </p>
          </div>
        </div>

        {/* â”€â”€ Master Catalogue Sections â”€â”€ */}
        <div className="space-y-10">
          {HEALTHCARE_CATALOGUE.map((section: CatalogueSection) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.id} className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 border-b border-border/50">
                  <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                    <SectionIcon className="w-5 h-5 text-primary" />
                    <span>{section.title}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-0">
                    {section.subtitle}
                  </p>
                </div>

                {/* â”€â”€ 7-Col Grid Matching User Screenshot â”€â”€ */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-3.5">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const visibleSubs = item.subs.slice(0, 3);
                    const extraSubs = item.subs.length - visibleSubs.length;
                    return (
                      <motion.div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        whileHover={{ scale: 1.04, y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => go(item.route, item.name)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            go(item.route, item.name);
                          }
                        }}
                        className={`rounded-2xl p-3.5 border bg-card hover:bg-card/90 hover:border-primary/50 hover:shadow-md transition-all text-center flex flex-col items-center justify-between min-h-[145px] cursor-pointer group ${
                          item.soon ? 'border-border/70 opacity-75 hover:opacity-100' : 'border-border/70'
                        }`}
                      >
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-2 mx-auto transition-transform group-hover:scale-110 shadow-xs`}>
                          <ItemIcon className={`w-5 h-5 ${item.textColor}`} />
                        </div>
                        <div className="flex-1 flex flex-col justify-center w-full">
                          <h3 className="font-semibold text-xs sm:text-sm text-foreground leading-tight line-clamp-2">
                            {item.name}
                          </h3>
                          <p className="text-[10px] text-muted-foreground/90 mt-1 line-clamp-2 leading-tight">
                            {item.summary}
                          </p>
                          <div className="flex flex-wrap gap-1 justify-center mt-1.5">
                            {visibleSubs.map((sub) => (
                              <button
                                key={sub.label}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  go(sub.route ?? item.route, item.name);
                                }}
                                className="text-[9px] leading-none px-1.5 py-1 rounded-full border border-border/70 bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors max-w-full truncate"
                                title={sub.label}
                              >
                                {sub.label}
                              </button>
                            ))}
                            {extraSubs > 0 && (
                              <span className="text-[9px] leading-none px-1.5 py-1 rounded-full border border-border/70 text-muted-foreground/80">
                                +{extraSubs}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5 font-medium flex items-center gap-1">
                          {item.soon ? (
                            <>
                              <Lock className="w-3 h-3" />
                              Coming soon
                            </>
                          ) : (
                            <>
                              {itemCount(item)}
                              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </>
                          )}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
