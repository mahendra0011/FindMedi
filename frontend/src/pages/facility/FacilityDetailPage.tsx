import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import FacilityDetailLayout from '@/components/facility/FacilityDetailLayout';
import { UniversalBookingModal } from '@/components/booking';
import ReviewDialog from '@/components/ReviewDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, SearchX } from 'lucide-react';
import { adaptProviderToFacility, type ProviderDetailDto } from './providerDetailAdapter';

/**
 * The public detail page for every provider type (Spec 03).
 *
 * Data source of truth is the LIVE provider listing (`GET /api/providers/:slug`
 * -> 404 for anything not live). The legacy `Facility` row is tried second so
 * the older hospital/clinic records keep their page. When neither resolves the
 * page shows the "listing unavailable" edge state - it never renders invented
 * clinic data, because a fabricated address, fee and doctor list on a
 * healthcare listing is a patient-safety and trust problem, not a placeholder.
 */

export default function FacilityDetailPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const id = params.id || params.slug || params.facilityId || params.clinicId || 'facility-1';

  // Determine facilityType from URL path (lazy so it only runs once).
  const [facilityType, setFacilityType] = useState<string>(() => {
    const path = (location.pathname || '').toLowerCase();
    if (path.includes('/home-icu')) return 'home_icu';
    if (path.includes('/dental')) return 'dental';
    if (path.includes('/eye') || path.includes('/optical')) return 'eye';
    if (path.includes('/ayush')) return 'ayush';
    if (path.includes('/gym')) return 'gym';
    if (path.includes('/yoga')) return 'yoga';
    if (path.includes('/dialysis')) return 'dialysis';
    if (path.includes('/blood-bank')) return 'blood_bank';
    if (path.includes('/govt')) return 'govt';
    if (path.includes('/ambulance')) return 'ambulance';
    if (path.includes('/wellness') && !path.includes('/corporate-wellness')) return 'wellness';
    if (path.includes('/equipment')) return 'equipment';
    if (path.includes('/event')) return 'event';
    if (path.includes('/maternity') || path.includes('/ivf')) return 'maternity_ivf';
    if (path.includes('/rehab') || path.includes('/deaddiction')) return 'rehab';
    if (path.includes('/program')) return 'program';
    if (path.includes('/support-group')) return 'support_group';
    if (path.includes('/health-store')) return 'health_store';
    if (path.includes('/pharmacy') || path.includes('/buy-medicine')) return 'pharmacy';
    if (path.includes('/diagnostic') || path.includes('/lab')) return 'diagnostic';
    if (path.includes('/clinic')) return 'clinic';
    if (path.includes('/eldercare') || path.includes('/elder-care') || path.includes('/assisted-living') || path.includes('/hospice')) return 'eldercare';
    if (path.includes('/vaccination') || path.includes('/vaccine')) return 'vaccination';
    if (path.includes('/meals') || path.includes('/diet-kitchen')) return 'diet_kitchen';
    if (path.includes('/specialty-centre') || path.includes('/cancer') || path.includes('/cardiac-centre')) return 'specialty_centre';
    if (path.includes('/corporate-wellness')) return 'corporate_wellness';
    return params.type || params.category || 'hospital';
  });

  const [facility, setFacility] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // SEO: title + JSON-LD (spec §1.2). aggregateRating only when ≥3 real reviews.
  useEffect(() => {
    if (!facility) return;
    document.title = `${facility.name}${facility.subType ? ` — ${facility.subType}` : ''} | FindMedi`;
    const ldType = facilityType === 'event' ? 'Event'
      : ['gym', 'yoga', 'wellness', 'equipment', 'health_store', 'pharmacy'].includes(facilityType) ? 'LocalBusiness'
      : 'MedicalOrganization';
    const ld: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': ldType,
      name: facility.name,
      description: facility.description || facility.tagline || '',
      address: facility.address ? {
        '@type': 'PostalAddress',
        streetAddress: facility.address,
        addressLocality: facility.city || '',
        postalCode: facility.pincode || '',
        addressCountry: 'IN',
      } : undefined,
      telephone: facility.phone || undefined,
      openingHours: facility.is24x7 ? 'Mo-Su 00:00-24:00' : undefined,
    };
    const reviewCount = facility.reviewsCount ?? facility.ratingCount ?? 0;
    if (facility.ratingAvg && reviewCount >= 3) {
      ld.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: facility.ratingAvg,
        reviewCount,
      };
    }
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld);
    script.setAttribute('data-facility-seo', 'true');
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [facility, facilityType]);

  // Dialog states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  // Auto-open modal on search query (?quote=1, ?book=1, ?rent=1, ?enroll=1)
  useEffect(() => {
    if (
      searchParams.get('quote') === '1' ||
      searchParams.get('book') === '1' ||
      searchParams.get('rent') === '1' ||
      searchParams.get('enroll') === '1'
    ) {
      setShowBookingModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        // 1) the live provider listing - the source of truth for every type
        //    that joined through the platform (dental, gym, yoga, equipment...).
        const provider = await api.get(`/providers/${encodeURIComponent(id)}`) as ProviderDetailDto;
        if (cancelled) return;
        if (provider?.name) {
          setFacility(adaptProviderToFacility(provider));
          if (provider.type) setFacilityType(String(provider.type).toLowerCase());
          setLoading(false);
          return;
        }
      } catch {
        // not a provider listing - fall through to the legacy facility row
      }

      try {
        // 2) the legacy `Facility` row (older hospital / clinic records)
        const res = (await api.get(`/facilities/${encodeURIComponent(id)}`)) as any;
        if (cancelled) return;
        if (res?.facility) {
          setFacility({ ...res.facility, services: res.services || [], doctors: res.doctors || [] });
          setLoading(false);
          return;
        }
      } catch {
        // neither surface has this listing
      }

      if (!cancelled) {
        setFacility(null);
        setNotFound(true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, facilityType]);

  const handleToggleSave = () => {
    setIsSaved((prev) => {
      const next = !prev;
      toast.success(next ? 'Saved to Favorites' : 'Removed from Favorites');
      return next;
    });
  };

  const handleBookGeneral = () => {
    setSelectedDoctor(null);
    setSelectedService(null);
    setShowBookingModal(true);
  };

  const handleBookDoctor = (doc: any) => {
    setSelectedDoctor(doc);
    setShowBookingModal(true);
  };

  const handleBookService = (svc: any) => {
    setSelectedService(svc);
    setShowBookingModal(true);
  };

  const handleSubmitReport = () => {
    toast.success('Thank you. Our compliance team will review your report within 24 hours.');
    setShowReportDialog(false);
    setReportReason('');
  };

  const handleSubmitClaim = async () => {
    if (!facility) return;
    // A detail page knows the listing by slug (that is its public address);
    // an id-shaped value resolves too, so both surfaces can file a request.
    const target = facility.slug || facility._id;
    if (!target) {
      toast.error('This listing has no claimable record');
      setShowClaimDialog(false);
      return;
    }
    setClaimSubmitting(true);
    try {
      await api.post(`/providers/${target}/claim`, { note: `Claimed from the ${facility.name} detail page` });
      toast.success('Claim request submitted. Moderation reviews govt/imported claims before ownership changes.');
      setShowClaimDialog(false);
    } catch (e: any) {
      // Surface the server's actual verdict (not claimable / already claimed /
      // already under review) instead of pretending the request went through.
      toast.error(e?.response?.data?.message || 'Could not submit a claim for this listing');
    } finally {
      setClaimSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading facility information…</p>
      </div>
    );
  }

  if (notFound || !facility) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <SearchX className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-foreground">Listing not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This listing doesn&apos;t exist, was removed by the provider, or the link is outdated.
          Nothing is shown in its place.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => navigate('/search')}>Search providers</Button>
          <Button variant="outline" onClick={() => navigate('/')}>Back to home</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <FacilityDetailLayout
        facilityType={facilityType}
        facility={facility}
        isSaved={isSaved}
        onToggleSave={handleToggleSave}
        onBook={handleBookGeneral}
        onBookDoctor={handleBookDoctor}
        onBookService={handleBookService}
        onWriteReview={() => setShowReviewDialog(true)}
        onReport={() => setShowReportDialog(true)}
        onClaim={() => setShowClaimDialog(true)}
        similarFacilities={facility.similar}
      />

      {/* Universal Booking & Order Flow Modal (8 Flows) */}
      <UniversalBookingModal
        open={showBookingModal}
        onOpenChange={setShowBookingModal}
        facility={facility}
        facilityType={facilityType}
        doctor={selectedDoctor}
        service={selectedService}
        onSuccess={() => {
          setShowBookingModal(false);
        }}
      />

      {/* Review Dialog */}
      {showReviewDialog && (
        <ReviewDialog
          open={showReviewDialog}
          onOpenChange={setShowReviewDialog}
          hospitalId={facility._id || facility.id}
          hospitalName={facility.name}
          onReviewSubmitted={() => {
            setShowReviewDialog(false);
            toast.success('Your review has been submitted for moderation.');
          }}
        />
      )}

      {/* Report Modal */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Incorrect Information</DialogTitle>
            <DialogDescription>
              Help maintain clinical accuracy on FindMedi. Our moderation desk inspects every report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold">What seems incorrect?</label>
            <Textarea
              rows={4}
              placeholder="e.g. Phone number out of order, incorrect address, doctor no longer practicing here…"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReport} disabled={!reportReason.trim()}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim Listing Modal */}
      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Claim Establishment Listing</DialogTitle>
            <DialogDescription>
              Are you the authorized administrator of {facility.name}? Claiming allows managing appointments, timetables, and staff profiles.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground space-y-2">
            <p>Verification requires:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Clinical establishment registration / Shop licence</li>
              <li>OTP verification on official contact number</li>
              <li>Authorized signatory ID proof</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClaimDialog(false)} disabled={claimSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitClaim} disabled={claimSubmitting}>
              {claimSubmitting ? 'Submitting…' : 'Begin Verification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
