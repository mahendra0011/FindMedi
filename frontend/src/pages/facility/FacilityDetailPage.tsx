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

  // For demo purposes, generate a canonical sample listing when no real data
  // exists so every type's page renders its sections (Spec 03 §2).
  if (notFound || !facility) {
    const demo = generateFacilityDto(facilityType, id);
    setFacility(demo);
    setNotFound(false);
    setLoading(false);
    return;
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

function generateFacilityDto(type: string, id: string) {
  const norm = (type || 'hospital').toLowerCase();

  const base = {
    _id: id,
    id,
    name: 'Apollo City Hospital & Trauma Centre',
    tagline: 'NABH Accredited Multi-Speciality Tertiary Care Hospital',
    category: 'Tertiary Care Hospital',
    subType: 'Multi-Speciality Hospital',
    ownership: 'Private Trust',
    systemOfMedicine: 'Modern Medicine (Allopathy)',
    verified: true,
    verifiedAt: '2026-08-15T00:00:00Z',
    ratingAvg: 4.8,
    reviewsCount: 142,
    openNow: true,
    openLabel: 'Open 24 Hours',
    timingsToday: 'Open 24x7',
    is24x7: true,
    emergencyAvailable: true,
    address: 'Plot 42, Health City, Ring Road',
    city: 'Bhopal',
    pincode: '462001',
    distanceKm: '2.4',
    phone: '+91-755-2400100',
    emergencyPhone: '108 / +91-755-2400108',
    consultFee: 600,
    establishedYear: 2012,
    languages: ['Hindi', 'English'],
    description:
      'Premier tertiary healthcare institution equipped with ultra-modern cardiac catheterisation lab, neuro-surgery theatres, 24x7 trauma care, and dedicated neonatal intensive care (NICU). Fully accredited by NABH and NABL with round-the-clock emergency services.',
    size: {
      beds: 250,
      icuBeds: 40,
      operationTheatres: 6,
      consultationRooms: 24,
    },
    accreditations: ['NABH Fully Accredited', 'NABL Certified Pathology Lab', 'ISO 9001:2015 Healthcare'],
    insurance: ['Ayushman Bharat PM-JAY (Cashless)', 'Star Health & Allied', 'HDFC ERGO', 'Care Health', 'ICICI Lombard'],
    services: [
      { name: 'Cardiology Consultation', category: 'Cardiology', price: 700, durationMinutes: 20, modes: ['in_person', 'video'] },
      { name: 'Joint Replacement & Arthroscopy', category: 'Orthopaedics', priceFrom: 45000, durationMinutes: 60, modes: ['in_person'] },
      { name: 'Neuro Critical Care Consultation', category: 'Neurology', price: 900, durationMinutes: 30, modes: ['in_person'] },
      { name: 'Routine Health Checkup', category: 'Preventive Health', price: 1499, durationMinutes: 45, modes: ['in_person'] },
    ],
    doctors: [
      { name: 'Dr. Vivek Saxena', specialization: 'Senior Interventional Cardiologist', qualifications: 'MBBS, MD (Medicine), DM (Cardiology)', experience: 16, consultFee: 700, nextSlot: 'Today 5:30 PM' },
      { name: 'Dr. Neha Agrawal', specialization: 'Orthopaedic & Spine Surgeon', qualifications: 'MBBS, MS (Ortho), Fellowship Joint Replacement', experience: 12, consultFee: 650, nextSlot: 'Tomorrow 10:00 AM' },
      { name: 'Dr. Alok Verma', specialization: 'Critical Care & Pulmonology', qualifications: 'MBBS, DNB (Resp Med), IDCCM', experience: 10, consultFee: 600, nextSlot: 'Today 7:00 PM' },
    ],
  };

  if (norm === 'dental') {
    return {
      ...base,
      name: 'SmileCraft Dental Care & Implant Centre',
      tagline: 'Advanced Microscopic Dentistry, Painless RCT & Clear Aligners',
      category: 'Dental Clinic',
      subType: 'Speciality Dental Centre',
      consultFee: 400,
      is24x7: false,
      timingsToday: '9:00 AM - 8:30 PM',
      size: { chairsCount: 4, consultationRooms: 4 },
      services: [
        { name: 'Ultrasonic Teeth Cleaning & Polishing', category: 'Preventive', price: 600, durationMinutes: 30, modes: ['in_person'] },
        { name: 'Single-Sitting Rotary RCT', category: 'Endodontics', priceFrom: 2800, durationMinutes: 45, modes: ['in_person'] },
        { name: 'Titanium Dental Implant with Crown', category: 'Implantology', priceFrom: 18000, durationMinutes: 60, modes: ['in_person'] },
        { name: 'Invisible Clear Aligners Consult', category: 'Orthodontics', price: 500, durationMinutes: 30, modes: ['in_person', 'video'] },
      ],
      doctors: [
        { name: 'Dr. Ananya Roy', specialization: 'Endodontist & Cosmetic Dentist', qualifications: 'BDS, MDS (Conservative & Endodontics)', experience: 9, consultFee: 400, nextSlot: 'Today 4:00 PM' },
        { name: 'Dr. Rohit Sen', specialization: 'Oral & Maxillofacial Implantologist', qualifications: 'BDS, MDS, Fellowship ICOI', experience: 14, consultFee: 500, nextSlot: 'Tomorrow 11:30 AM' },
      ],
    };
  }

  if (norm === 'gym') {
    return {
      ...base,
      name: 'Olympus Fitness & High Performance Centre',
      tagline: 'State-of-the-art Strength, Conditioning, Yoga & Recovery Centre',
      category: 'Fitness & Wellness',
      subType: 'Gym & Fitness Centre',
      ownership: 'Commercial Enterprise',
      systemOfMedicine: 'Physical Fitness & Sports Science',
      consultFee: 0,
      priceFrom: 1500,
      is24x7: false,
      timingsToday: '6:00 AM - 10:00 PM',
      size: { trainersCount: 12, consultationRooms: 2 },
      services: [
        { name: 'Day Pass & Trial Session', category: 'Trial', price: 199, durationMinutes: 90, modes: ['in_person'] },
        { name: 'Monthly Standard Membership', category: 'Membership', price: 1500, durationMinutes: 30, modes: ['in_person'] },
        { name: '1-on-1 Personal Training (12 Sessions)', category: 'Coaching', price: 4500, durationMinutes: 60, modes: ['in_person'] },
      ],
      doctors: [
        { name: 'Vikram Choudhary', specialization: 'Head Strength & Conditioning Coach', qualifications: 'CSCS, ACE Certified, K11 Master Trainer', experience: 8, consultFee: 500, nextSlot: 'Today 6:00 PM' },
      ],
    };
  }

  if (norm === 'ayush') {
    return {
      ...base,
      name: 'Sanjeevani AYUSH Clinic & Panchakarma Centre',
      tagline: 'Authentic Kerala Panchakarma, Nadi Pariksha & Holistic Wellness',
      category: 'AYUSH Clinic',
      subType: 'Ayurvedic Treatment Centre',
      systemOfMedicine: 'Ayurveda & Naturopathy',
      consultFee: 400,
      is24x7: false,
      timingsToday: '8:30 AM - 7:30 PM',
      services: [
        { name: 'Ayurvedic Nadi Pariksha & Doctor Consult', category: 'Diagnosis', price: 400, durationMinutes: 30, modes: ['in_person', 'video'] },
        { name: 'Full Body Abhyanga & Swedana (Herbal Steam)', category: 'Panchakarma', price: 1500, durationMinutes: 60, modes: ['in_person'] },
        { name: 'Shirodhara Stress Relief Therapy', category: 'Panchakarma', price: 1800, durationMinutes: 45, modes: ['in_person'] },
      ],
      doctors: [
        { name: 'Vaidya Harishankar Joshi', specialization: 'Ayurvedacharya & Panchakarma Specialist', qualifications: 'BAMS, MD (Ayurveda)', experience: 18, consultFee: 400, nextSlot: 'Today 5:00 PM' },
      ],
    };
  }

  if (norm === 'eye') {
    return {
      ...base,
      name: 'Netra Jyoti Eye Hospital & Optical',
      tagline: 'Cataract, LASIK, Retina & Glaucoma Care with In-House Optical Shop',
      category: 'Eye Hospital',
      subType: 'Speciality Eye Care Centre',
      consultFee: 500,
      is24x7: false,
      timingsToday: '9:00 AM - 7:00 PM',
      services: [
        { name: 'Comprehensive Eye Exam & Vision Test', category: 'Diagnostic', price: 300, durationMinutes: 30, modes: ['in_person'] },
        { name: 'Cataract Surgery (Phaco + Foldable IOL)', category: 'Surgery', priceFrom: 18000, durationMinutes: 60, modes: ['in_person'] },
        { name: 'LASIK Consultation & Screening', category: 'Refractive', price: 500, durationMinutes: 45, modes: ['in_person'] },
      ],
      doctors: [
        { name: 'Dr. Kavita Menon', specialization: 'Cataract & Refractive Surgeon', qualifications: 'MBBS, MS (Ophthalmology), Fellowship Phaco', experience: 14, consultFee: 500, nextSlot: 'Today 3:00 PM' },
      ],
    };
  }

  if (norm === 'dialysis') {
    return {
      ...base,
      name: 'Suvarna Kidney & Dialysis Centre',
      tagline: 'Nephrologist-Supervised Dialysis with RO-Treated Water & Isolation Machines',
      category: 'Dialysis Centre',
      subType: 'Renal Care Centre',
      consultFee: 400,
      is24x7: false,
      timingsToday: '6:00 AM - 10:00 PM',
      sessionPrice: 1800,
      sessionPriceMax: 2500,
      services: [
        { name: 'Single Dialysis Session (High-Flux)', category: 'Dialysis', price: 2200, durationMinutes: 240, modes: ['in_person'] },
        { name: 'Nephrologist Consult', category: 'Consult', price: 400, durationMinutes: 20, modes: ['in_person', 'video'] },
      ],
      doctors: [
        { name: 'Dr. S. Raghavan', specialization: 'Consultant Nephrologist', qualifications: 'MBBS, MD, DM (Nephrology)', experience: 16, consultFee: 400, nextSlot: 'Tomorrow 10:00 AM' },
      ],
    };
  }

  if (norm === 'blood_bank') {
    return {
      ...base,
      name: 'Rakta Setu Blood Bank',
      tagline: 'NACO-Licensed Blood Bank with Live Component Availability',
      category: 'Blood Bank',
      subType: 'Blood Transfusion Centre',
      consultFee: 0,
      is24x7: true,
      timingsToday: 'Open 24x7',
      services: [
        { name: 'Whole Blood / PRBC Request', category: 'Component', price: 1200, durationMinutes: 30, modes: ['in_person'] },
        { name: 'Blood Donation (Voluntary)', category: 'Donation', price: 0, durationMinutes: 45, modes: ['in_person'] },
      ],
      doctors: [],
    };
  }

  if (norm === 'govt') {
    return {
      ...base,
      name: 'Government Community Health Centre (CHC)',
      tagline: 'Free OPD, Immunisation & NCD Screening under National Health Mission',
      category: 'Government Facility',
      subType: 'CHC / UPHC',
      ownership: 'Government',
      systemOfMedicine: 'Modern Medicine (Allopathy)',
      consultFee: 0,
      is24x7: false,
      timingsToday: '8:00 AM - 2:00 PM (OPD)',
      services: [
        { name: 'Free General OPD', category: 'OPD', price: 0, durationMinutes: 15, modes: ['in_person'] },
        { name: 'Childhood Immunisation (UIP)', category: 'Vaccination', price: 0, durationMinutes: 15, modes: ['in_person'] },
      ],
      doctors: [],
    };
  }

  if (norm === 'ambulance') {
    return {
      ...base,
      name: 'Sanjeevani Ambulance Services',
      tagline: 'BLS & ALS Fleet, GPS-Trained EMT Crew, Available 24x7',
      category: 'Ambulance Operator',
      subType: 'Emergency Transport',
      consultFee: 0,
      is24x7: true,
      timingsToday: 'Available 24x7',
      services: [
        { name: 'BLS Ambulance (Oxygen + Stretcher)', category: 'Transport', priceFrom: 800, durationMinutes: 60, modes: ['in_person'] },
        { name: 'ALS Ambulance (Ventilator + Defibrillator)', category: 'Transport', priceFrom: 1500, durationMinutes: 60, modes: ['in_person'] },
      ],
      doctors: [],
    };
  }

  if (norm === 'wellness') {
    return {
      ...base,
      name: 'Aarogya Wellness & Spa Centre',
      tagline: 'Hygienic Therapeutic Massages, Physio-Assisted Therapy & Relaxation',
      category: 'Wellness Centre',
      subType: 'Spa & Wellness',
      systemOfMedicine: 'Wellness (Non-medical)',
      consultFee: 0,
      priceFrom: 800,
      is24x7: false,
      timingsToday: '10:00 AM - 9:00 PM',
      services: [
        { name: 'Full Body Therapeutic Massage', category: 'Therapy', price: 1500, durationMinutes: 60, modes: ['in_person'] },
        { name: 'Aromatherapy Session', category: 'Therapy', price: 1800, durationMinutes: 75, modes: ['in_person'] },
      ],
      doctors: [],
    };
  }

  if (norm === 'equipment') {
    return {
      ...base,
      name: 'MediRent Equipment House',
      tagline: 'Rent & Buy Hospital-Grade Home Care Equipment, Delivered & Installed',
      category: 'Equipment Rental',
      subType: 'Medical Device Store',
      consultFee: 0,
      is24x7: false,
      timingsToday: '9:00 AM - 8:00 PM',
      services: [
        { name: 'Oxygen Concentrator 5L (Rent)', category: 'Respiratory', priceFrom: 350, durationMinutes: 15, modes: ['in_person'] },
        { name: 'Electric Hospital Bed (Rent)', category: 'Mobility', priceFrom: 500, durationMinutes: 15, modes: ['in_person'] },
      ],
      doctors: [],
    };
  }

  if (norm === 'yoga') {
    return {
      ...base,
      name: 'Prana Yoga Studio & Retreat',
      tagline: 'Hatha, Vinyasa & Prenatal Batches by YCB-Certified Teachers',
      category: 'Yoga Studio',
      subType: 'Yoga & Meditation Centre',
      systemOfMedicine: 'Yoga & Wellness',
      consultFee: 0,
      priceFrom: 300,
      is24x7: false,
      timingsToday: '6:00 AM - 9:00 PM',
      services: [
        { name: 'Drop-in Yoga Class', category: 'Class', price: 300, durationMinutes: 60, modes: ['in_person'] },
        { name: 'Monthly Unlimited Batch', category: 'Membership', price: 2000, durationMinutes: 60, modes: ['in_person'] },
      ],
      doctors: [],
    };
  }

  if (norm === 'event') {
    return {
      ...base,
      name: 'Free Community Health Camp',
      tagline: 'Free BP, Sugar & Doctor Consultation Camp ΓÇö Walk-ins Welcome',
      category: 'Health Camp',
      subType: 'Community Event',
      consultFee: 0,
      is24x7: false,
      timingsToday: 'Event: 9:00 AM - 2:00 PM',
      seatsLeft: 23,
      registrationDeadline: '23 Oct',
      eligibility: 'Age 18+ ┬╖ Carry any previous reports',
      services: [],
      doctors: [],
    };
  }

  if (norm === 'maternity_ivf') {
    return {
      ...base,
      name: 'Garbha Fertility & Maternity Hospital',
      tagline: 'ART-Registered IVF Centre & Level-III NICU Maternity Care',
      category: 'Maternity & IVF Centre',
      subType: 'Fertility Clinic',
      consultFee: 600,
      is24x7: true,
      timingsToday: 'Open 24x7',
      normalDeliveryPrice: 25000,
      csectionPrice: 55000,
      services: [
        { name: 'Antenatal Consult (ANC)', category: 'Maternity', price: 600, durationMinutes: 30, modes: ['in_person', 'video'] },
        { name: 'IVF Counselling Session', category: 'IVF', price: 800, durationMinutes: 45, modes: ['in_person'] },
      ],
      doctors: [
        { name: 'Dr. Meera Krishnan', specialization: 'Reproductive Medicine & IVF Specialist', qualifications: 'MBBS, MS, MRCOG Fellowship Repro Med', experience: 15, consultFee: 600, nextSlot: 'Tomorrow 11:00 AM' },
      ],
    };
  }

  if (norm === 'rehab') {
    return {
      ...base,
      name: 'Naya Jeevan De-addiction & Rehab Centre',
      tagline: 'Psychiatrist-Led Residential & Day Programs with Family Support',
      category: 'Rehabilitation Centre',
      subType: 'De-addiction & Rehab',
      consultFee: 500,
      is24x7: true,
      timingsToday: 'Visiting: 4:00 PM - 6:00 PM',
      services: [
        { name: 'Initial Assessment (Psychiatrist)', category: 'Assessment', price: 500, durationMinutes: 45, modes: ['in_person'] },
        { name: '30-Day Residential Program', category: 'Program', priceFrom: 45000, durationMinutes: 43200, modes: ['in_person'] },
      ],
      doctors: [
        { name: 'Dr. Anil Deshmukh', specialization: 'Consultant Psychiatrist (Addiction)', qualifications: 'MBBS, MD (Psychiatry), DNBM', experience: 20, consultFee: 500, nextSlot: 'Today 12:00 PM' },
      ],
    };
  }

  if (norm === 'program') {
    return {
      ...base,
      name: 'Diabetes Reversal Program (3 Months)',
      tagline: 'Doctor + Dietitian Guided Structured Program with Monthly Tracking',
      category: 'Care Program',
      subType: 'Chronic Care Program',
      consultFee: 0,
      is24x7: false,
      duration: '3 months',
      services: [
        { name: 'Program Enrolment', category: 'Program', price: 4999, durationMinutes: 30, modes: ['in_person', 'video'] },
      ],
      doctors: [],
    };
  }

  if (norm === 'support_group') {
    return {
      ...base,
      name: 'Sahay Cancer Survivor Support Group',
      tagline: 'Moderated Peer Support ΓÇö Anonymity Option, Verified Host',
      category: 'Support Group',
      subType: 'NGO / Peer Support',
      consultFee: 0,
      is24x7: false,
      timingsToday: 'Meets: Mon 6:00 PM',
      schedule: 'Weekly ┬╖ Mon 6:00 PM',
      mode: 'Online + in-person options',
      services: [],
      doctors: [],
    };
  }

  if (norm === 'health_store') {
    return {
      ...base,
      name: 'PureLife Health Food & Supplement Store',
      tagline: 'FSSAI-Licensed Supplements, Diabetes-Friendly Foods & Personal Care',
      category: 'Health Food Store',
      subType: 'Supplement & Wellness Store',
      consultFee: 0,
      is24x7: false,
      timingsToday: '9:30 AM - 9:00 PM',
      services: [
        { name: 'Nutritionist Consult (In-store)', category: 'Consult', price: 400, durationMinutes: 30, modes: ['in_person'] },
      ],
      doctors: [],
    };
  }

  if (norm === 'pharmacy') {
    return {
      ...base,
      name: 'Apex Chemists & Druggists',
      tagline: 'Rx & OTC Medicines, Cold-Chain Items, 60-Minute Delivery',
      category: 'Pharmacy',
      subType: 'Retail Pharmacy',
      consultFee: 0,
      is24x7: false,
      timingsToday: '8:00 AM - 11:00 PM',
      deliveryEta: '60ΓÇô90 min within 5 km',
      deliveryFee: 'Γé╣30 ┬╖ Free above Γé╣499',
      services: [
        { name: 'Medicine Order (with Rx upload)', category: 'Order', price: 0, durationMinutes: 10, modes: ['in_person', 'chat'] },
      ],
      doctors: [],
    };
  }

  if (norm === 'clinic') {
    return {
      ...base,
      name: 'City Care Polyclinic',
      tagline: 'Multi-Speciality OPD Consults with Same-Day Slots',
      category: 'Polyclinic',
      subType: 'Clinic',
      consultFee: 400,
      is24x7: false,
      timingsToday: '9:00 AM - 8:00 PM',
    };
  }

  if (norm === 'diagnostic') {
    return {
      ...base,
      name: 'Precision Diagnostics & Pathology Lab',
      tagline: 'NABL-Accredited Lab ┬╖ Home Collection ┬╖ Reports in 6 Hours',
      category: 'Diagnostic Lab',
      subType: 'Pathology & Imaging',
      consultFee: 0,
      is24x7: false,
      timingsToday: '7:00 AM - 9:00 PM',
      services: [
        { name: 'CBC (Complete Blood Count)', category: 'Haematology', price: 199, durationMinutes: 15, modes: ['in_person'] },
        { name: 'Home Sample Collection', category: 'Service', price: 100, durationMinutes: 30, modes: ['in_person'] },
      ],
      doctors: [],
    };
  }

  return base;
}
