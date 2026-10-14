import { BookOpen, Clock, BadgeCheck, Video, ArrowUpRight } from 'lucide-react';

export interface ContentCardProps {
  item: {
    id?: string;
    _id?: string;
    title: string;
    type: 'article' | 'video' | 'guide';
    specialty?: string;
    thumbnailUrl?: string;
    reviewedByDoctor?: string;
    duration?: string;
    readTime?: string;
    publishedDate?: string;
    language?: string;
  };
  onClick?: () => void;
}

export default function ContentCard({ item, onClick }: ContentCardProps) {
  if (!item) return null;

  return (
    <div
      onClick={onClick}
      className="group bg-card border rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="relative aspect-video bg-muted overflow-hidden">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
              {item.type === 'video' ? <Video className="w-8 h-8 text-primary" /> : <BookOpen className="w-8 h-8 text-primary" />}
            </div>
          )}

          <span className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
            {item.specialty || (item.type === 'video' ? 'Video' : 'Article')}
          </span>

          <span className="absolute bottom-2.5 right-2.5 text-[10px] font-medium px-2 py-0.5 rounded bg-black/70 text-white">
            {item.duration || item.readTime || '5 min read'}
          </span>
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {item.title}
          </h3>

          {item.reviewedByDoctor && (
            <p className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <BadgeCheck className="w-3 h-3" /> Medically Reviewed by {item.reviewedByDoctor}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 pt-1 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 mt-2">
        <span>{item.publishedDate || 'FindMedi Editorial'}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
          {item.type === 'video' ? 'Watch' : 'Read'} <ArrowUpRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}
