import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home, Phone, CalendarDays, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSectionsForPractitionerRole, PractitionerSectionKey } from './practitionerSectionRegistry';
import PractitionerHeader, { PractitionerDTO } from './sections/PractitionerHeader';
import PractitionerQuickFacts from './sections/PractitionerQuickFacts';
import PractitionerAbout from './sections/PractitionerAbout';
import PractitionerServicesFees from './sections/PractitionerServicesFees';
import PractitionerEducation from './sections/PractitionerEducation';
import PractitionerLocations from './sections/PractitionerLocations';
import PractitionerAvailability from './sections/PractitionerAvailability';
import PractitionerTypeSpecific from './sections/PractitionerTypeSpecific';
import PractitionerReviews from './sections/PractitionerReviews';
import PractitionerFaq from './sections/PractitionerFaq';
import PractitionerBookingWidget from './sections/PractitionerBookingWidget';
import PractitionerSimilar from './sections/PractitionerSimilar';

export interface PractitionerProfileLayoutProps {
  practitioner: PractitionerDTO;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onBookNow: (details: any) => void;
  onWriteReview?: () => void;
  onReport?: () => void;
}

export default function PractitionerProfileLayout({
  practitioner,
  isSaved = false,
  onToggleSave,
  onBookNow,
  onWriteReview,
  onReport,
}: PractitionerProfileLayoutProps) {
  const role = practitioner.roleType || practitioner.kind || (typeof practitioner.specialty === 'string' ? practitioner.specialty : 'doctor');
  const sections = getSectionsForPractitionerRole(role);

  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<string>('in_clinic');

  const specialtyLabel =
    typeof practitioner.specialty === 'object' && practitioner.specialty?.label
      ? practitioner.specialty.label
      : typeof practitioner.specialty === 'string'
      ? practitioner.specialty
      : practitioner.roleType || 'Specialist';

  const city = practitioner.city || practitioner.address?.city || 'Delhi';

  const tabs = [
    { key: 'all', label: 'All Profile' },
    { key: 'about', label: 'About & Qualifications' },
    { key: 'services', label: 'Services & Fees' },
    { key: 'locations', label: 'Where They Practise' },
    { key: 'availability', label: 'Slots & Timings' },
    { key: 'reviews', label: 'Patient Reviews' },
    { key: 'faq', label: 'FAQs & Policies' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-24 md:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
          <Link to="/healthcare" className="hover:text-foreground capitalize">
            {city}
          </Link>
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
          <span className="capitalize text-muted-foreground">{specialtyLabel}</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
          <span className="font-semibold text-foreground truncate max-w-xs">{practitioner.name}</span>
        </nav>

        {/* Profile Hero Header */}
        <PractitionerHeader
          practitioner={practitioner}
          isSaved={isSaved}
          onToggleSave={onToggleSave}
          onReport={onReport}
        />

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Quick facts strip */}
            {sections.includes('quick_facts') && (activeTab === 'all' || activeTab === 'about') && (
              <PractitionerQuickFacts practitioner={practitioner} />
            )}

            {/* About & Credentials */}
            {sections.includes('about') && (activeTab === 'all' || activeTab === 'about') && (
              <PractitionerAbout practitioner={practitioner} />
            )}

            {/* Specialized Type Specific Section */}
            {sections.includes('type_specific') && (activeTab === 'all' || activeTab === 'about' || activeTab === 'services') && (
              <PractitionerTypeSpecific practitioner={practitioner} />
            )}

            {/* Services & Fees */}
            {sections.includes('services_fees') && (activeTab === 'all' || activeTab === 'services') && (
              <PractitionerServicesFees
                practitioner={practitioner}
                onSelectMode={(mode) => setSelectedMode(mode)}
              />
            )}

            {/* Where they practice / Affiliated locations */}
            {sections.includes('locations') && (activeTab === 'all' || activeTab === 'locations') && (
              <PractitionerLocations
                practitioner={practitioner}
                onBookAtLocation={(loc) => onBookNow({ location: loc })}
              />
            )}

            {/* Education & Experience timeline */}
            {sections.includes('education_experience') && (activeTab === 'all' || activeTab === 'about') && (
              <PractitionerEducation practitioner={practitioner} />
            )}

            {/* Availability & Slots calendar */}
            {sections.includes('availability') && (activeTab === 'all' || activeTab === 'availability') && (
              <PractitionerAvailability
                practitioner={practitioner}
                onSelectSlot={(slot) => onBookNow(slot)}
              />
            )}

            {/* Reviews & Ratings */}
            {sections.includes('reviews') && (activeTab === 'all' || activeTab === 'reviews') && (
              <PractitionerReviews
                practitioner={practitioner}
                onWriteReview={onWriteReview}
              />
            )}

            {/* FAQs & Medical Policy */}
            {sections.includes('faq') && (activeTab === 'all' || activeTab === 'faq') && (
              <PractitionerFaq practitioner={practitioner} />
            )}

            {/* Similar practitioners nearby */}
            {sections.includes('related') && activeTab === 'all' && (
              <PractitionerSimilar practitioner={practitioner} />
            )}
          </div>

          {/* Desktop Right Rail: Booking Widget */}
          <div className="hidden lg:block lg:col-span-4">
            <PractitionerBookingWidget
              practitioner={practitioner}
              selectedMode={selectedMode}
              onSelectMode={(mode) => setSelectedMode(mode)}
              onBookNow={onBookNow}
            />
          </div>
        </div>
      </div>

      {/* Sticky Mobile Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/60 p-3 flex items-center justify-between gap-3 shadow-2xl">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
            Consultation Fee
          </span>
          <span className="text-lg font-black text-foreground">
            ₹{practitioner.fee || practitioner.consultation_fees || 500}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const query = encodeURIComponent(`${practitioner.clinic || practitioner.name}, ${city}`);
              window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
            }}
            className="h-10 px-3 rounded-xl gap-1 text-xs font-semibold"
          >
            <MapPin className="w-3.5 h-3.5" /> Directions
          </Button>

          <Button
            size="sm"
            onClick={() => onBookNow({ mode: selectedMode })}
            className="h-10 px-5 rounded-xl gap-1.5 text-xs font-bold shadow-md"
          >
            <CalendarDays className="w-3.5 h-3.5" /> Book Consultation
          </Button>
        </div>
      </div>
    </div>
  );
}
