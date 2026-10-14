import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';
import { ShieldCheck, HeartHandshake, EyeOff } from 'lucide-react';

export interface CounsellorCardProps {
  item: {
    id?: string;
    _id?: string;
    name: string;
    type?: 'professional' | 'mentor';
    title?: string;
    concerns?: string[];
    modalities?: string[];
    languages?: string[];
    responseTime?: string;
    pricePerSession?: number;
    rating?: number;
    ratingAvg?: number;
    reviewsCount?: number;
    firstSessionFree?: boolean;
    imageUrl?: string;
    photo?: string;
    verified?: boolean;
    status?: string;
  };
  onPrimary?: () => void;
  onSecondary?: () => void;
}

export default function CounsellorCard({ item, onPrimary, onSecondary }: CounsellorCardProps) {
  const navigate = useNavigate();
  if (!item) return null;

  const isPeerMentor = item.type === 'mentor';
  const concerns = (item.concerns || []).slice(0, 3);
  const chips = [...concerns, ...(item.languages || []).slice(0, 1)].slice(0, 4);

  const trust: string[] = [];
  if (item.verified || item.status === 'approved') trust.push('Credentials Verified');
  if (item.firstSessionFree) trust.push('First session free');
  if (item.responseTime) trust.push(item.responseTime);

  return (
    <div className="flex flex-col h-full">
      {isPeerMentor && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-[11px] font-semibold text-amber-800 dark:text-amber-300 px-3 py-1 rounded-t-2xl flex items-center gap-1.5">
          <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
          <span>Peer Support Specialist — Not a replacement for psychiatric care</span>
        </div>
      )}

      <ProviderCardBase
        imageUrl={item.photo || item.imageUrl}
        title={item.name}
        verified={item.verified || item.status === 'approved'}
        subtitle={isPeerMentor ? 'Peer Mentor (Lived Experience)' : 'Licensed Clinical Psychologist / Therapist'}
        overlayBadge={isPeerMentor ? 'Peer Guide' : 'Therapist'}
        ratingAvg={item.rating ?? item.ratingAvg ?? 0}
        ratingCount={item.reviewsCount ?? 0}
        discreet={true}
        chips={chips}
        priceLine={item.pricePerSession ? `₹${item.pricePerSession} / session` : 'Confidential consultation'}
        trustBadges={trust}
        primaryLabel="Book Session"
        secondaryLabel="View Bio"
        onPrimary={onPrimary || (() => navigate(`/mind/counselling/${item._id || item.id}`))}
        onSecondary={onSecondary}
      />
    </div>
  );
}
