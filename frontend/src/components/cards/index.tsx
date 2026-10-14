import ProviderCardBase, { ProviderCardSkeleton, ProviderCardEmpty } from './ProviderCardBase';
import AmbulanceCard from './AmbulanceCard';
import AyushCard from './AyushCard';
import BloodBankCard from './BloodBankCard';
import DentistCard from './DentistCard';
import DietitianCard from './DietitianCard';
import EquipmentCard from './EquipmentCard';
import EventCard from './EventCard';
import EyeCard from './EyeCard';
import GovtFacilityCard from './GovtFacilityCard';
import GymCard from './GymCard';
import NurseCard from './NurseCard';
import PhysioCard from './PhysioCard';
import ProductCard from './ProductCard';
import MedicineCard from './MedicineCard';
import HealthPackageCard from './HealthPackageCard';
import ProgramCard from './ProgramCard';
import SupportGroupCard from './SupportGroupCard';
import ContentCard from './ContentCard';
import CounsellorCard from './CounsellorCard';
import WellnessCard from './WellnessCard';
import YogaCard from './YogaCard';

// 🆕 Newly added card variants according to Spec 02 §2.29 - §2.38
import DialysisCard from './DialysisCard';
import IvfClinicCard from './IvfClinicCard';
import ElderCareCard from './ElderCareCard';
import ChildDevCard from './ChildDevCard';
import VaccinationCard from './VaccinationCard';
import DietKitchenCard from './DietKitchenCard';
import CorporateWellnessCard from './CorporateWellnessCard';
import HomeServiceCard from './HomeServiceCard';
import AlliedTherapistCard from './AlliedTherapistCard';
import SpecialtyCenterCard from './SpecialtyCenterCard';

export {
  ProviderCardBase,
  ProviderCardSkeleton,
  ProviderCardEmpty,
  AmbulanceCard,
  AyushCard,
  BloodBankCard,
  DentistCard,
  DietitianCard,
  EquipmentCard,
  EventCard,
  EyeCard,
  GovtFacilityCard,
  GymCard,
  NurseCard,
  PhysioCard,
  ProductCard,
  MedicineCard,
  HealthPackageCard,
  ProgramCard,
  SupportGroupCard,
  ContentCard,
  CounsellorCard,
  WellnessCard,
  YogaCard,
  DialysisCard,
  IvfClinicCard,
  ElderCareCard,
  ChildDevCard,
  VaccinationCard,
  DietKitchenCard,
  CorporateWellnessCard,
  HomeServiceCard,
  AlliedTherapistCard,
  SpecialtyCenterCard,
};

/**
 * Universal Entity Card Dispatcher
 *
 * Renders the dedicated card for any given entity type with consistent fallbacks.
 */
export function RenderEntityCard({
  type,
  item,
  variant = 'grid',
  onPrimary,
  onSecondary,
}: {
  type: string;
  item: any;
  variant?: 'grid' | 'list' | 'compact' | 'map-pin';
  onPrimary?: () => void;
  onSecondary?: () => void;
}) {
  if (!item) return null;

  switch (type) {
    case 'dentist':
    case 'dental_clinic':
      return <DentistCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'eye_hospital':
    case 'optical':
    case 'eye':
      return <EyeCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'ayush':
    case 'ayush_clinic':
    case 'ayush_practitioner':
      return <AyushCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'physio':
    case 'physiotherapist':
    case 'home_physio':
      return <PhysioCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'dietitian':
      return <DietitianCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'nurse':
    case 'home_nurse':
    case 'home_nursing_agency':
      return <NurseCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'yoga':
    case 'yoga_studio':
      return <YogaCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'gym':
    case 'fitness_centre':
    case 'personal_trainer':
      return <GymCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'wellness':
    case 'wellness_centre':
      return <WellnessCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'equipment':
    case 'equipment_rental':
    case 'medical_device_seller':
      return <EquipmentCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'medicine':
    case 'pharmacy_item':
      return <MedicineCard item={item} onAddToCart={onPrimary} onUploadRx={onSecondary} />;
    case 'health_package':
    case 'lab_package':
      return <HealthPackageCard item={item} onBook={onPrimary} onViewDetails={onSecondary} />;
    case 'product':
    case 'supplement':
    case 'skincare':
      return <ProductCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'program':
    case 'membership':
      return <ProgramCard item={item} onEnroll={onPrimary} onTalkAdvisor={onSecondary} />;
    case 'support_group':
      return <SupportGroupCard item={item} onJoin={onPrimary} />;
    case 'content':
    case 'article':
    case 'video':
      return <ContentCard item={item} onClick={onPrimary} />;
    case 'event':
    case 'camp':
    case 'workshop':
      return <EventCard item={item} onRegister={onPrimary} onViewDetails={onSecondary} />;
    case 'counsellor':
    case 'psychologist':
      return <CounsellorCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'blood_bank':
      return <BloodBankCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'ambulance':
    case 'ambulance_operator':
      return <AmbulanceCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'govt_facility':
    case 'phc':
    case 'chc':
      return <GovtFacilityCard item={item} onPrimary={onPrimary} onSecondary={onSecondary} />;

    // 🆕 Spec 02 §2.29 - §2.38 Dispatchers
    case 'dialysis':
    case 'dialysis_centre':
      return <DialysisCard item={item} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'fertility':
    case 'ivf':
    case 'fertility_clinic':
    case 'maternity_ivf':
      return <IvfClinicCard item={item} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'elder_care':
    case 'eldercare':
    case 'elder_care_home':
    case 'assisted_living':
    case 'hospice':
      return <ElderCareCard item={item} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'child_development':
    case 'child_dev':
    case 'child_development_centre':
      return <ChildDevCard item={item} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'vaccination':
    case 'vaccination_centre':
      return <VaccinationCard item={item} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'diet_kitchen':
    case 'meal_plan':
    case 'healthy_meals':
      return <DietKitchenCard item={item} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'corporate_wellness':
    case 'corporate_program':
      return <CorporateWellnessCard item={item} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'home_service':
    case 'home_care':
    case 'home_sample_collection':
      return <HomeServiceCard item={item} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'allied_therapist':
    case 'speech_therapist':
    case 'occupational_therapist':
    case 'audiologist':
    case 'optometrist':
      return <AlliedTherapistCard item={item} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'specialty_centre':
    case 'cancer_centre':
    case 'cardiac_cath_lab':
    case 'ortho_spine_clinic':
    case 'pain_clinic':
    case 'sleep_lab':
    case 'urology_centre':
    case 'skin_hair_clinic':
      return <SpecialtyCenterCard item={item} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;

    default:
      return (
        <ProviderCardBase
          imageUrl={item.imageUrl || item.photos?.[0] || item.logo}
          title={item.name || item.title}
          verified={item.verified || item.status === 'approved'}
          subtitle={item.subtitle || item.specialty || item.category || type}
          ratingAvg={item.rating ?? item.ratingAvg ?? 0}
          ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
          distanceKm={item.distanceKm ?? item.distance}
          openNow={item.openNow ?? item.open ?? null}
          chips={item.chips || item.specialties?.slice(0, 4) || item.services?.slice(0, 4)}
          priceLine={item.priceLine || (item.consultFee ? `₹${item.consultFee} consult` : undefined)}
          trustBadges={item.trustBadges || (item.verified ? ['Verified'] : [])}
          nextSlotLabel={item.nextSlotLabel || item.nextSlotAt}
          primaryLabel={item.primaryLabel || 'Book'}
          secondaryLabel={item.secondaryLabel || 'View'}
          onPrimary={onPrimary}
          onSecondary={onSecondary}
          variant={variant}
        />
      );
  }
}
