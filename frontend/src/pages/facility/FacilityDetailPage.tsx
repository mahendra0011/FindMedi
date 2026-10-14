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
import { Loader2 } from 'lucide-react';

const DEMO_SIMILAR: Record<string, { id: string; name: string; route: string; category?: string; rating?: number; reviewsCount?: number; distanceKm?: string }[]> = {
  dental: [
    { id: 'demo-dent-1', name: 'BrightSmile Dental Studio', route: '/dental/demo-dent-1', category: 'Dental Clinic', rating: 4.6, reviewsCount: 88, distanceKm: '1.2' },
    { id: 'demo-dent-2', name: 'Kids & Family Dental Care', route: '/dental/demo-dent-2', category: 'Paediatric Dental', rating: 4.8, reviewsCount: 120, distanceKm: '2.8' },
    { id: 'demo-dent-3', name: 'Implant & Smile Design Centre', route: '/dental/demo-dent-3', category: 'Implantology', rating: 4.5, reviewsCount: 64, distanceKm: '3.4' },
  ],
  eye: [
    { id: 'demo-eye-1', name: 'SightLine Eye Care', route: '/eye/demo-eye-1', category: 'Eye Hospital', rating: 4.7, reviewsCount: 210, distanceKm: '1.9' },
    { id: 'demo-eye-2', name: 'VisionPlus Optical & Clinic', route: '/optical/demo-eye-2', category: 'Optical + Clinic', rating: 4.4, reviewsCount: 95, distanceKm: '2.3' },
  ],
  gym: [
    { id: 'demo-gym-1', name: 'IronWorks Gym & Fitness', route: '/gym/demo-gym-1', category: 'Gym', rating: 4.5, reviewsCount: 156, distanceKm: '0.8' },
    { id: 'demo-gym-2', name: 'FitZone Women Only Gym', route: '/gym/demo-gym-2', category: 'Women-only Gym', rating: 4.9, reviewsCount: 88, distanceKm: '1.6' },
  ],
  yoga: [
    { id: 'demo-yoga-1', name: 'Anand Yoga & Meditation Hall', route: '/yoga/demo-yoga-1', category: 'Yoga Studio', rating: 4.8, reviewsCount: 72, distanceKm: '1.1' },
  ],
  ayush: [
    { id: 'demo-ayush-1', name: 'Kerala Ayurveda Gram', route: '/ayush/demo-ayush-1', category: 'Panchakarma Centre', rating: 4.6, reviewsCount: 130, distanceKm: '4.2' },
    { id: 'demo-ayush-2', name: 'Homeo Care Multispeciality', route: '/ayush/demo-ayush-2', category: 'Homeopathy Clinic', rating: 4.5, reviewsCount: 67, distanceKm: '2.0' },
  ],
  wellness: [
    { id: 'demo-well-1', name: 'Oasis Spa & Therapy', route: '/wellness-centre/demo-well-1', category: 'Spa & Wellness', rating: 4.6, reviewsCount: 90, distanceKm: '1.5' },
  ],
  dialysis: [
    { id: 'demo-dial-1', name: 'Sunrise Renal Care Unit', route: '/dialysis/demo-dial-1', category: 'Dialysis Centre', rating: 4.7, reviewsCount: 55, distanceKm: '3.0' },
  ],
  pharmacy: [
    { id: 'demo-ph-1', name: 'WellCare Pharmacy 24x7', route: '/buy-medicine/demo-ph-1', category: '24x7 Pharmacy', rating: 4.6, reviewsCount: 340, distanceKm: '0.6' },
    { id: 'demo-ph-2', name: 'Jan Aushadhi Kendra', route: '/buy-medicine/demo-ph-2', category: 'Jan Aushadhi', rating: 4.8, reviewsCount: 210, distanceKm: '1.8' },
  ],
  hospital: [
    { id: 'demo-h-1', name: 'City Multispeciality Hospital', route: '/hospitals/demo-h-1', category: 'Multi-speciality', rating: 4.6, reviewsCount: 512, distanceKm: '1.4' },
    { id: 'demo-h-2', name: 'Sunrise Nursing Home', route: '/hospitals/demo-h-2', category: 'Nursing Home', rating: 4.3, reviewsCount: 96, distanceKm: '2.7' },
  ],
  clinic: [
    { id: 'demo-c-1', name: 'Family Health Clinic', route: '/clinic/demo-c-1', category: 'Polyclinic', rating: 4.5, reviewsCount: 78, distanceKm: '0.9' },
  ],
  diagnostic: [
    { id: 'demo-lab-1', name: 'HealthFirst Pathology Lab', route: '/lab/demo-lab-1', category: 'Pathology Lab', rating: 4.7, reviewsCount: 189, distanceKm: '1.0' },
    { id: 'demo-lab-2', name: 'ScanCentre Imaging', route: '/imaging/demo-lab-2', category: 'Imaging Centre', rating: 4.6, reviewsCount: 143, distanceKm: '2.2' },
  ],
  eldercare: [
    { id: 'demo-eld-1', name: 'SilverCare Assisted Living & Hospice', route: '/eldercare/demo-eld-1', category: 'Assisted Living', rating: 4.8, reviewsCount: 62, distanceKm: '2.4' },
    { id: 'demo-eld-2', name: 'Grace Senior Living Suite', route: '/eldercare/demo-eld-2', category: 'Elder Care Home', rating: 4.6, reviewsCount: 45, distanceKm: '3.1' },
  ],
  vaccination: [
    { id: 'demo-vac-1', name: 'City Immunization & Vaccine Hub', route: '/vaccinations/demo-vac-1', category: 'Vaccination Centre', rating: 4.9, reviewsCount: 310, distanceKm: '1.1' },
  ],
  diet_kitchen: [
    { id: 'demo-meal-1', name: 'NutriCare Clinical Diet Kitchen', route: '/meals/demo-meal-1', category: 'Diet Kitchen', rating: 4.7, reviewsCount: 140, distanceKm: '1.8' },
  ],
  specialty_centre: [
    { id: 'demo-spec-1', name: 'Apex Oncology & Daycare Chemotherapy', route: '/specialty-centre/demo-spec-1', category: 'Cancer Centre', rating: 4.9, reviewsCount: 220, distanceKm: '3.5' },
    { id: 'demo-spec-2', name: 'Heart & Rhythm Institute', route: '/specialty-centre/demo-spec-2', category: 'Cardiac Centre', rating: 4.8, reviewsCount: 180, distanceKm: '2.9' },
  ],
  corporate_wellness: [
    { id: 'demo-corp-1', name: 'FitCorp Enterprise Wellness Desk', route: '/corporate-wellness/demo-corp-1', category: 'Corporate Wellness', rating: 4.8, reviewsCount: 50, distanceKm: '0.0' },
  ],
};

export default function FacilityDetailPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const id = params.id || params.slug || params.facilityId || params.clinicId || 'facility-1';

  // Determine facilityType from URL path
  let facilityType = params.type || params.category || 'hospital';
  const path = location.pathname.toLowerCase();
  if (path.includes('/dental')) facilityType = 'dental';
  else if (path.includes('/eye') || path.includes('/optical')) facilityType = 'eye';
  else if (path.includes('/ayush')) facilityType = 'ayush';
  else if (path.includes('/gym')) facilityType = 'gym';
  else if (path.includes('/yoga')) facilityType = 'yoga';
  else if (path.includes('/dialysis')) facilityType = 'dialysis';
  else if (path.includes('/blood-bank')) facilityType = 'blood_bank';
  else if (path.includes('/govt')) facilityType = 'govt';
  else if (path.includes('/ambulance')) facilityType = 'ambulance';
  else if (path.includes('/wellness') && !path.includes('/corporate-wellness')) facilityType = 'wellness';
  else if (path.includes('/equipment')) facilityType = 'equipment';
  else if (path.includes('/event')) facilityType = 'event';
  else if (path.includes('/maternity') || path.includes('/ivf')) facilityType = 'maternity_ivf';
  else if (path.includes('/rehab') || path.includes('/deaddiction')) facilityType = 'rehab';
  else if (path.includes('/program')) facilityType = 'program';
  else if (path.includes('/support-group')) facilityType = 'support_group';
  else if (path.includes('/health-store')) facilityType = 'health_store';
  else if (path.includes('/pharmacy') || path.includes('/buy-medicine')) facilityType = 'pharmacy';
  else if (path.includes('/diagnostic') || path.includes('/lab')) facilityType = 'diagnostic';
  else if (path.includes('/clinic')) facilityType = 'clinic';
  else if (path.includes('/eldercare') || path.includes('/elder-care') || path.includes('/assisted-living') || path.includes('/hospice')) facilityType = 'eldercare';
  else if (path.includes('/vaccination') || path.includes('/vaccine')) facilityType = 'vaccination';
  else if (path.includes('/meals') || path.includes('/diet-kitchen')) facilityType = 'diet_kitchen';
  else if (path.includes('/specialty-centre') || path.includes('/cancer') || path.includes('/cardiac-centre')) facilityType = 'specialty_centre';
  else if (path.includes('/corporate-wellness')) facilityType = 'corporate_wellness';

  const [facility, setFacility] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
      try {
        setLoading(true);
        // Try fetching real facility/hospital data
        const res = (await api.get(`/facilities/${id}`)) as any;
        if (!cancelled && res?.facility) {
          setFacility(res.facility);
          return;
        }
      } catch {
        // Fallback demo data generation based on type
      }

      if (!cancelled) {
        setFacility(generateFacilityDto(facilityType, id));
      }
      setLoading(false);
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

  const handleSubmitClaim = () => {
    toast.success('Claim verification initiated. An OTP has been sent to the registered establishment phone.');
    setShowClaimDialog(false);
  };

  if (loading || !facility) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading facility information…</p>
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
        similarFacilities={facility.similar || DEMO_SIMILAR[facilityType]}
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
            <Button variant="outline" onClick={() => setShowClaimDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitClaim}>
              Begin Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Type-specific DTO Builder
 * Generates rich, canonical facility data matching File 03 specifications.
 */
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
      tagline: 'Free BP, Sugar & Doctor Consultation Camp — Walk-ins Welcome',
      category: 'Health Camp',
      subType: 'Community Event',
      consultFee: 0,
      is24x7: false,
      timingsToday: 'Event: 9:00 AM - 2:00 PM',
      seatsLeft: 23,
      registrationDeadline: '23 Oct',
      eligibility: 'Age 18+ · Carry any previous reports',
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
      tagline: 'Moderated Peer Support — Anonymity Option, Verified Host',
      category: 'Support Group',
      subType: 'NGO / Peer Support',
      consultFee: 0,
      is24x7: false,
      timingsToday: 'Meets: Mon 6:00 PM',
      schedule: 'Weekly · Mon 6:00 PM',
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
      deliveryEta: '60–90 min within 5 km',
      deliveryFee: '₹30 · Free above ₹499',
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
      tagline: 'NABL-Accredited Lab · Home Collection · Reports in 6 Hours',
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
