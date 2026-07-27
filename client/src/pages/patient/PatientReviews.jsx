import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, Trash2, Calendar, Search, Stethoscope, Filter, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const ratingLevels = [
  { label: 'All', value: 0 },
  { label: '★★★★★', value: 5 },
  { label: '★★★★☆', value: 4 },
  { label: '★★★☆☆', value: 3 },
  { label: '★★☆☆☆', value: 2 },
  { label: '★☆☆☆☆', value: 1 },
];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const avatarColors = [
  'bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];

function getAvatarColor(name) {
  if (!name) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return dateStr; }
}

export default function PatientReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await api.getReviews();
      const reviewsList = r?.reviews || r?.data || r || [];
      setReviews(Array.isArray(reviewsList) ? reviewsList.filter(rv => rv.patientName === user?.name) : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [user?.name]);

  const handleDelete = async (id) => {
    try { await api.deleteReview(id); loadData(); toast.success('Review deleted'); } catch { toast.error('Failed to delete'); }
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter((rv) => {
      const matchSearch = !search || (rv.doctorName || '').toLowerCase().includes(search.toLowerCase());
      const matchRating = ratingFilter === 0 || rv.rating === ratingFilter;
      return matchSearch && matchRating;
    });
  }, [reviews, search, ratingFilter]);

  const clearFilters = () => { setSearch(''); setRatingFilter(0); };
  const hasFilters = search || ratingFilter > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Reviews</h1>
        <p className="text-muted-foreground">Your reviews across doctors and hospitals</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by doctor name..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          {ratingLevels.map((r) => (
            <button
              key={r.value}
              onClick={() => setRatingFilter(ratingFilter === r.value ? 0 : r.value)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                ratingFilter === r.value
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-card border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {hasFilters ? 'No reviews match your filters.' : "You haven't written any reviews yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((rv, i) => (
            <motion.div
              key={rv._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group relative bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-200"
            >
              {/* Delete button */}
              <button
                onClick={() => handleDelete(rv._id)}
                className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Doctor avatar + name + stars */}
              <div className="flex items-start gap-3.5 mb-3.5">
                <div className={`w-10 h-10 rounded-xl ${getAvatarColor(rv.doctorName)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                  {getInitials(rv.doctorName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate pr-6">{rv.doctorName || 'Unknown Doctor'}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= rv.rating ? 'text-amber-500 fill-amber-500' : 'text-muted stroke-muted'}`} />
                    ))}
                    <span className="text-[11px] text-muted-foreground ml-1 font-medium">{rv.rating}.0</span>
                  </div>
                </div>
              </div>

              {/* Comment */}
              {rv.comment && (
                <p className="text-sm text-foreground/85 leading-relaxed mb-3.5 line-clamp-3">
                  &ldquo;{rv.comment}&rdquo;
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(rv.date || rv.createdAt)}</span>
                </div>
                {rv.facilityName && (
                  <div className="flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[140px]">{rv.facilityName}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
