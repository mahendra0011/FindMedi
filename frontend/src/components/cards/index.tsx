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

// Legacy entity cards (Spec 02 "Existing" list) - the seven entities that
// already owned a card before the base-card system landed.
import HospitalCard from '@/components/HospitalCard';
import ClinicCard from '@/components/ClinicCard';
import DiagnosticCenterCard from '@/components/DiagnosticCenterCard';
import PharmacyCard from '@/components/PharmacyCard';
import DoctorCard from '@/components/DoctorCard';
import AssistantCard from '@/components/AssistantCard';
import LawyerCard from '@/components/LawyerCard';

import { variantForType, toCardItem, type ListingCardVariant } from './listingCardRegistry';

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

export { variantForType, toCardItem };
export type { ListingCardVariant };

export interface RenderEntityCardProps {
  type: string;
  item: any;
  variant?: 'grid' | 'list' | 'compact' | 'map-pin';
  onPrimary?: () => void;
  onSecondary?: () => void;
  onToggleSave?: () => void;
  saved?: boolean;
  compareChecked?: boolean;
  onToggleCompare?: () => void;
}

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
  onToggleSave,
  saved,
  compareChecked,
  onToggleCompare,
}: RenderEntityCardProps) {
  if (!item) return null;

  const resolved = variantForType(type);
  const data = toCardItem(item);

  switch (resolved) {
    // ── legacy entities with their own card ─────────────────────────────
    case 'hospital':
      return <HospitalCard hospital={data} />;
    case 'clinic':
      return <ClinicCard clinic={data} />;
    case 'diagnostic':
      return <DiagnosticCenterCard clinic={data} />;
    case 'pharmacy':
      return <PharmacyCard pharmacy={data} />;
    case 'doctor':
      return <DoctorCard doctor={data} />;
    case 'assistant':
      return <AssistantCard assistant={data} />;
    case 'lawyer':
      return <LawyerCard lawyer={data} />;

    // ── base-card system ───────────────────────────────────────────────
    case 'dental':
      return <DentistCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'eye':
      return <EyeCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'ayush':
      return <AyushCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'physio':
      return <PhysioCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'dietitian':
      return <DietitianCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'nurse':
      return <NurseCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'yoga':
      return <YogaCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'gym':
      return <GymCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'wellness':
      return <WellnessCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'equipment':
      return <EquipmentCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'product':
      return <ProductCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'medicine':
      return <MedicineCard item={data} onAddToCart={onPrimary} onUploadRx={onSecondary} />;
    case 'health_package':
      return <HealthPackageCard item={data} onBook={onPrimary} onViewDetails={onSecondary} />;
    case 'program':
      return <ProgramCard item={data} onEnroll={onPrimary} onTalkAdvisor={onSecondary} />;
    case 'support_group':
      return <SupportGroupCard item={data} onJoin={onPrimary} />;
    case 'content':
      return <ContentCard item={data} onClick={onPrimary} />;
    case 'counsellor':
      return <CounsellorCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'blood_bank':
      return <BloodBankCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'ambulance':
      return <AmbulanceCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'govt':
      return <GovtFacilityCard item={data} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'dialysis':
      return <DialysisCard item={data} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'ivf':
      return <IvfClinicCard item={data} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'eldercare':
      return <ElderCareCard item={data} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'child_dev':
      return <ChildDevCard item={data} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'vaccination':
      return <VaccinationCard item={data} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'diet_kitchen':
      return <DietKitchenCard item={data} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'corporate':
      return <CorporateWellnessCard item={data} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'home_service':
      return <HomeServiceCard item={data} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'allied_therapist':
      return <AlliedTherapistCard item={data} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'specialty':
      return <SpecialtyCenterCard item={data} variant={variant} onPrimary={onPrimary} onSecondary={onSecondary} />;
    case 'event':
      return <EventCard item={data} onRegister={onPrimary} onViewDetails={onSecondary} />;

    default:
      return (
        <ProviderCardBase
          imageUrl={data.imageUrl}
          title={data.name || data.title}
          verified={data.verified || data.status === 'approved'}
          subtitle={data.subtitle || data.specialty || data.category || type}
          ratingAvg={data.rating ?? data.ratingAvg ?? 0}
          ratingCount={data.reviewsCount ?? data.ratingCount ?? 0}
          distanceKm={data.distanceKm ?? data.distance}
          openNow={data.openNow ?? data.open ?? null}
          chips={data.chips || data.specialties?.slice(0, 4) || data.services?.slice(0, 4)}
          priceLine={data.priceLine || (data.consultFee ? `₹${data.consultFee} consult` : undefined)}
          trustBadges={data.trustBadges || (data.verified ? ['Verified'] : [])}
          nextSlotLabel={data.nextSlotLabel || data.nextSlotAt}
          primaryLabel={data.primaryLabel || 'Book'}
          secondaryLabel={data.secondaryLabel || 'View'}
          onPrimary={onPrimary}
          onSecondary={onSecondary}
          sponsored={data.isSponsored}
          saved={saved}
          onToggleSave={onToggleSave}
          compareChecked={compareChecked}
          onToggleCompare={onToggleCompare}
          variant={variant}
        />
      );
  }
}
