/**
 * Adapter: public Provider DTO (backend/src/lib/providerPublicDetail.js) →
 * the PractitionerDTO vocabulary the practitioner profile layout consumes
 * (Spec 04 §5). Single place where the two dialects are reconciled.
 */

import type { ProviderDetailDto } from '../facility/providerDetailAdapter';

export interface PractitionerDTO {
  id?: string;
  _id?: string;
  slug?: string;
  name: string;
  title?: string;
  photoUrl?: string;
  photo?: string;
  profile_photo?: string;
  roleType?: string;
  kind?: string;
  specialty?: string | { code?: string; label?: string };
  subSpecialties?: string[];
  qualifications?: string | string[];
  experienceYears?: number | string;
  experience?: string;
  languages?: string[];
  gender?: string;
  registration?: {
    council?: string;
    numberMasked?: string;
    verifiedAt?: string;
    scope?: string[];
  };
  verified?: boolean;
  councilVerified?: boolean;
  backgroundChecked?: boolean;
  badges?: string[];
  rating?: number;
  ratingAvg?: number;
  reviewsCount?: number;
  ratingCount?: number;
  responseTime?: string;
  city?: string;
  state?: string;
  area?: string;
  bio?: string;
  philosophy?: string;
  fee?: number;
  consultation_fees?: number;
  modes?: Array<{ mode?: string; label?: string; fee?: number; duration?: string | number; followUp?: string }>;
  locations?: Array<{ id?: string; name?: string; type?: string; area?: string; city?: string; address?: string; timings?: string; fee?: number }>;
  services?: any[];
  reviews?: any[];
  similar?: any[];
  [key: string]: any;
}

const titleCase = (value: string) =>
  String(value || '')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const modeLabel = (mode: string) => {
  const map: Record<string, string> = {
    in_person: 'In-Clinic Consult',
    video: 'Live Video Consult',
    audio: 'Audio Call Consult',
    chat: 'Chat Consult',
    home_visit: 'Home Visit',
    class: 'Class Session',
  };
  return map[mode] || titleCase(mode);
};

export function adaptProviderToPractitioner(provider: any): PractitionerDTO {
  const media = (provider.media || []).filter((m: any) => m && m.url);
  const images = media.filter((m: any) => m.type === 'image').map((m: any) => m.url);
  const photo = images[0] || '';
  const ratingAvg = provider.ratingAvg ?? provider.stats?.ratingAvg ?? 0;
  const reviewsCount = provider.reviewsCount ?? provider.stats?.ratingCount ?? 0;
  const verified = provider.verified ?? provider.verification?.status === 'verified';

  const services = (provider.services || []).map((s: any) => s);
  const modes = services.flatMap((s: any) =>
    (s.modes || []).map((m: any) => ({
      mode: m.mode,
      label: modeLabel(m.mode),
      fee: m.fee || s.price?.amount || 0,
      duration: m.durationMin || s.durationMin || 30,
      followUp: 'Free 7 days',
    })),
  );
  const distinctModes = modes.filter((m: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.mode === m.mode) === i);

  const locations = (provider.similar || []).length
    ? []
    : [{
        id: 'loc-1',
        name: provider.name || '',
        type: 'Primary Practice',
        area: provider.address?.area || '',
        city: provider.address?.city || '',
        address: [provider.address?.line1, provider.address?.area, provider.address?.city].filter(Boolean).join(', '),
        timings: provider.timings?.is24x7 ? 'Open 24x7' : (provider.timingsToday || ''),
        fee: distinctModes[0]?.fee,
      }];

  return {
    id: provider._id || provider.id,
    _id: provider._id,
    slug: provider.slug,
    name: provider.name || '',
    title: '',
    photoUrl: photo,
    photo,
    profile_photo: photo,
    roleType: provider.type || 'doctor',
    kind: provider.kind || 'practitioner',
    specialty: titleCase(provider.type || 'doctor'),
    subSpecialties: provider.categoryCodes || [],
    qualifications: '',
    experienceYears: 0,
    experience: '',
    languages: provider.languages || [],
    gender: '',
    registration: {
      council: '',
      numberMasked: '',
      verifiedAt: provider.verification?.verifiedAt,
      scope: provider.verification?.scope || [],
    },
    verified,
    councilVerified: verified,
    backgroundChecked: false,
    badges: provider.badges || [],
    rating: ratingAvg,
    ratingAvg,
    reviewsCount,
    ratingCount: reviewsCount,
    responseTime: '',
    city: provider.address?.city || '',
    state: provider.address?.state || '',
    area: provider.address?.area || '',
    bio: provider.description || provider.tagline || '',
    philosophy: provider.tagline || '',
    fee: distinctModes[0]?.fee,
    consultation_fees: distinctModes[0]?.fee,
    modes: distinctModes.length ? distinctModes : undefined,
    locations: provider.address?.city ? locations : [],
    services: provider.services || [],
    reviews: provider.reviews || [],
    similar: provider.similar || [],
    tagline: provider.tagline,
    isSponsored: !!provider.isSponsored,
  };
}
