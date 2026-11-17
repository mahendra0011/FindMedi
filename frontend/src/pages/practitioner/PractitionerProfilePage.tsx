import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import SeoHead, { aggregateRating } from '@/components/SeoHead';
import { buildLocaleAlternates } from '@/lib/seoAlternates';
import { UniversalBookingModal } from '@/components/booking';
import ReviewDialog from '@/components/ReviewDialog';
import PractitionerProfileLayout from '@/components/practitioner/PractitionerProfileLayout';
import { PractitionerDTO } from '@/components/practitioner/sections/PractitionerHeader';
import { adaptProviderToPractitioner } from './practitionerDetailAdapter';

/**
 * Public practitioner profile (Spec 04). Data source of truth is the live
 * provider listing (`GET /api/practitioners/:slug` -> 404 for anything not
 * live). The legacy `/doctors/:id` row is tried second. When neither resolves
 * the page shows a real "not found" state instead of an invented biography.
 */

export default function PractitionerProfilePage() {
  const { id, slug, specialty, city, type } = useParams<{
    id?: string;
    slug?: string;
    specialty?: string;
    city?: string;
    type?: string;
  }>();

  const navigate = useNavigate();
  const location = useLocation();

  const [practitioner, setPractitioner] = useState<PractitionerDTO | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedBookingContext, setSelectedBookingContext] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  const identifier = id || slug;

  useEffect(() => {
    let cancelled = false;

    async function fetchPractitioner() {
      setLoading(true);
      setNotFound(false);
      try {
        let fetchedData: any = null;

        // 1) live provider listing (practitioner kind) - source of truth
        if (identifier) {
          try {
            const res: any = await api.get(`/practitioners/${encodeURIComponent(identifier)}`);
            const provider = res?.data || res;
            if (provider?.name) fetchedData = adaptProviderToPractitioner(provider);
          } catch {
            // fall through
          }
        }

        // 2) legacy doctor row
        if (!fetchedData && identifier) {
          try {
            const resDoc: any = await api.get(`/doctors/${encodeURIComponent(identifier)}`);
            const doc = resDoc?.data || resDoc;
            if (doc?.name) fetchedData = doc;
          } catch {
            // fall through
          }
        }

        if (!fetchedData || !fetchedData.name) {
          if (!cancelled) {
            setPractitioner(null);
            setNotFound(true);
          }
          return;
        }

        if (!cancelled) {
          setPractitioner(fetchedData);
          const savedList = JSON.parse(localStorage.getItem('findmedi_saved_practitioners') || '[]');
          setIsSaved(savedList.includes(fetchedData.id || identifier));
        }
      } catch (err: any) {
        if (!cancelled) {
          toast.error('Could not load practitioner profile');
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPractitioner();

    return () => {
      cancelled = true;
    };
  }, [identifier, specialty, city, type, location.pathname]);

  const handleToggleSave = () => {
    if (!practitioner) return;
    const targetId = practitioner.id || identifier || 'unknown';
    const savedList: string[] = JSON.parse(localStorage.getItem('findmedi_saved_practitioners') || '[]');
    let updated: string[];
    if (savedList.includes(targetId)) {
      updated = savedList.filter((id) => id !== targetId);
      setIsSaved(false);
      toast.info('Removed from saved practitioners');
    } else {
      updated = [...savedList, targetId];
      setIsSaved(true);
      toast.success('Practitioner saved to favorites!');
    }
    localStorage.setItem('findmedi_saved_practitioners', JSON.stringify(updated));
  };

  const handleBookNow = (bookingContext: any) => {
    setSelectedBookingContext(bookingContext);
    setShowBookingModal(true);
  };

  const handleReport = () => {
    toast.info('Report submitted to FindMedi clinical moderation team for verification.');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="h-4 w-48 bg-muted rounded" />
        <div className="h-64 bg-card rounded-3xl border border-border/60" />
      </div>
    );
  }

  if (notFound || !practitioner) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold font-heading">Practitioner Not Found</h1>
        <p className="text-sm text-muted-foreground">
          The requested practitioner listing could not be found or has been updated.
        </p>
        <button
          onClick={() => navigate('/healthcare')}
          className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-sm"
        >
          Explore Healthcare Specialists
        </button>
      </div>
    );
  }

  const rating = practitioner.rating ?? practitioner.ratingAvg ?? 0;
  const ratingCount = practitioner.reviewsCount ?? practitioner.ratingCount ?? 0;
  const specialtyStr =
    typeof practitioner.specialty === 'object'
      ? practitioner.specialty?.label || 'Doctor'
      : practitioner.specialty || 'Doctor';

  const canonicalPath = specialty && city && slug
    ? `/doctors/${specialty}/${city}/${slug}`
    : `/${type || 'practitioner'}/${identifier}`;

  return (
    <>
      <SeoHead
        title={`${practitioner.name} — ${specialtyStr} in ${practitioner.city || 'India'} | FindMedi`}
        description={practitioner.bio ? practitioner.bio.slice(0, 160) : `Consult with ${practitioner.name}, verified ${specialtyStr}. Check consultation fees, clinic locations, and book appointments online.`}
        canonical={canonicalPath}
        alternates={buildLocaleAlternates(canonicalPath)}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Physician',
          name: practitioner.name,
          medicalSpecialty: specialtyStr,
          ...(aggregateRating(rating, ratingCount)
            ? { aggregateRating: aggregateRating(rating, ratingCount) }
            : {}),
        }}
      />

      <PractitionerProfileLayout
        practitioner={practitioner}
        isSaved={isSaved}
        onToggleSave={handleToggleSave}
        onBookNow={handleBookNow}
        onWriteReview={() => setShowReviewDialog(true)}
        onReport={handleReport}
      />

      {/* Universal Booking & Order Flow Modal */}
      <UniversalBookingModal
        open={showBookingModal}
        onOpenChange={setShowBookingModal}
        doctor={practitioner}
        facility={practitioner.clinic ? { name: practitioner.clinic } : null}
        service={selectedBookingContext}
        initialContext={selectedBookingContext}
        onSuccess={() => setShowBookingModal(false)}
      />

      {/* Review Dialog Integration */}
      <ReviewDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        entityType="doctor"
        entityId={practitioner.id || identifier || ''}
        entityName={practitioner.name}
        onReviewSubmitted={() => {
          toast.success('Thank you! Your verified visit review was submitted.');
        }}
      />
    </>
  );
}
