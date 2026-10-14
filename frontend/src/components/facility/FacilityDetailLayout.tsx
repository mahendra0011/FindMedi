import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { getSectionsForFacilityType, FacilitySectionKey } from './sectionRegistry';
import FacilityHero from './sections/FacilityHero';
import FacilityActionBar from './sections/FacilityActionBar';
import FacilityOverview from './sections/FacilityOverview';
import FacilityServices, { ServiceItem } from './sections/FacilityServices';
import FacilityDoctors, { DoctorItem } from './sections/FacilityDoctors';
import FacilityTypeSpecific from './sections/FacilityTypeSpecific';
import FacilityTimings from './sections/FacilityTimings';
import FacilityAmenities from './sections/FacilityAmenities';
import FacilityAccreditations from './sections/FacilityAccreditations';
import FacilityReviews from './sections/FacilityReviews';
import FacilityLocation from './sections/FacilityLocation';
import FacilityFaqPolicies from './sections/FacilityFaqPolicies';
import FacilityRightRail from './sections/FacilityRightRail';
import FacilitySimilar, { SimilarFacility } from './sections/FacilitySimilar';

export interface FacilityDetailLayoutProps {
  facilityType: string;
  facility: any;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onBook?: () => void;
  onBookDoctor?: (doctor: DoctorItem) => void;
  onBookService?: (service: ServiceItem) => void;
  onWriteReview?: () => void;
  onReport?: () => void;
  onClaim?: () => void;
  similarFacilities?: SimilarFacility[];
}

export default function FacilityDetailLayout({
  facilityType,
  facility,
  isSaved,
  onToggleSave,
  onBook,
  onBookDoctor,
  onBookService,
  onWriteReview,
  onReport,
  onClaim,
  similarFacilities,
}: FacilityDetailLayoutProps) {
  const sections = getSectionsForFacilityType(facilityType);
  const [activeTab, setActiveTab] = useState<string>('all');

  const categoryLabel = facility.subType || facility.category || facilityType.replaceAll('_', ' ');

  // Tab definitions
  const tabs = [
    { key: 'all', label: 'All Details' },
    { key: 'overview', label: 'Overview' },
    { key: 'services', label: 'Services & Pricing' },
    { key: 'doctors', label: 'Specialists' },
    { key: 'timings', label: 'Timings' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'location', label: 'Location' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-20 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
          <Link to={`/healthcare`} className="hover:text-foreground capitalize">
            {facility.city || 'India'}
          </Link>
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
          <span className="capitalize text-muted-foreground">{categoryLabel}</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
          <span className="font-semibold text-foreground truncate max-w-xs">{facility.name}</span>
        </nav>

        {/* Hero Gallery & Header */}
        <FacilityHero
          facility={facility}
          isSaved={isSaved}
          onToggleSave={onToggleSave}
          onReport={onReport}
        />

        {/* Floating Desktop & Mobile Action Bar */}
        <FacilityActionBar
          facility={facility}
          primaryLabel={facilityType === 'pharmacy' ? 'Order Medicines' : facilityType === 'gym' ? 'Get Trial Pass' : 'Book Appointment'}
          onPrimary={onBook}
          isSaved={isSaved}
          onToggleSave={onToggleSave}
          onShare={() => {}}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Layout: 2-Column Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Overview */}
            {(activeTab === 'all' || activeTab === 'overview') && sections.includes('overview') && (
              <section id="section-overview">
                <FacilityOverview facility={facility} />
              </section>
            )}

            {/* Type Specific Block (Emergency, Departments, Beds, Blood Bank Heatmap, Gym Equipment, etc.) */}
            {(activeTab === 'all' || activeTab === 'overview') && (
              <FacilityTypeSpecific type={facilityType} data={facility} onAction={onBook} />
            )}

            {/* Services & Procedures */}
            {(activeTab === 'all' || activeTab === 'services') && sections.includes('services') && (
              <section id="section-services">
                <FacilityServices
                  services={facility.services || facility.tests || []}
                  onBookService={onBookService}
                />
              </section>
            )}

            {/* Doctors & Specialists */}
            {(activeTab === 'all' || activeTab === 'doctors') && sections.includes('doctors') && (
              <section id="section-doctors">
                <FacilityDoctors
                  doctors={facility.doctors || []}
                  onBookDoctor={onBookDoctor}
                />
              </section>
            )}

            {/* Operating Timings */}
            {(activeTab === 'all' || activeTab === 'timings') && sections.includes('timings') && (
              <section id="section-timings">
                <FacilityTimings
                  timings={facility.weekSchedule || facility.timings}
                  is24x7={facility.is24x7}
                />
              </section>
            )}

            {/* Physical Amenities */}
            {(activeTab === 'all' || activeTab === 'overview') && sections.includes('amenities') && (
              <section id="section-amenities">
                <FacilityAmenities amenities={facility.amenities} />
              </section>
            )}

            {/* Accreditations & Insurance Empanelment */}
            {(activeTab === 'all' || activeTab === 'overview') && sections.includes('accreditations') && (
              <section id="section-accreditations">
                <FacilityAccreditations
                  accreditations={facility.accreditations}
                  insurance={facility.insurance}
                />
              </section>
            )}

            {/* Reviews & Ratings */}
            {(activeTab === 'all' || activeTab === 'reviews') && sections.includes('reviews') && (
              <section id="section-reviews">
                <FacilityReviews
                  reviews={facility.reviews}
                  ratingAvg={facility.rating ?? facility.ratingAvg}
                  reviewsCount={facility.reviewsCount}
                  onWriteReview={onWriteReview}
                />
              </section>
            )}

            {/* Location & Directions */}
            {(activeTab === 'all' || activeTab === 'location') && sections.includes('location') && (
              <section id="section-location">
                <FacilityLocation facility={facility} />
              </section>
            )}

            {/* FAQ, Policies & Medical Disclaimer */}
            {(activeTab === 'all' || activeTab === 'overview') && sections.includes('faq') && (
              <section id="section-faq">
                <FacilityFaqPolicies
                  facilityName={facility.name}
                  faqs={facility.faqs}
                  onClaimListing={onClaim}
                  onReportListing={onReport}
                />
              </section>
            )}

            {/* Similar Nearby */}
            {(activeTab === 'all' || activeTab === 'location') && sections.includes('similar') && (similarFacilities?.length ?? 0) > 0 && (
              <section id="section-similar">
                <FacilitySimilar facilities={similarFacilities!} />
              </section>
            )}
          </div>

          {/* Right Rail (Desktop Booking Widget & Quick Info) */}
          <div className="hidden lg:block lg:col-span-4">
            <FacilityRightRail
              facility={facility}
              primaryLabel={facilityType === 'pharmacy' ? 'Order Medicines' : facilityType === 'gym' ? 'Get Trial Pass' : 'Book Appointment'}
              onPrimary={onBook}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
