import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Trash2, ExternalLink, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function patientRequest(path, opts = {}) {
  return api.dispatch(null, path, opts);
}
const patientApi = {
  getFavorites:  (p={})    => patientRequest('/patient/favorites?' + new URLSearchParams(p)),
  removeFavorite:(id)      => patientRequest(`/patient/favorites/${id}`, { method:'DELETE' }),
};

export default function PatientFavorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await patientApi.getFavorites();
      setFavorites(res?.favorites || []);
    } catch { toast.error('Failed to load favorites'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRemove = async (id) => {
    try {
      await patientApi.removeFavorite(id);
      setFavorites(fs => fs.filter(f => f._id !== id));
      toast.success('Removed from favorites');
    } catch { toast.error('Failed to remove'); }
  };

  const handleView = (f) => {
    const path = f.refType === 'doctor' ? '/doctors' : f.refType === 'hospital' ? '/hospitals' : '/lab';
    navigate(path);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Saved & Favorites</h1>
        <p className="text-muted-foreground">Bookmarked doctors, hospitals, labs, and pharmacies</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p>No favorites yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((f, i) => (
            <motion.div key={f._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-warning fill-warning" />
                </div>
                <div>
                  <p className="font-medium">{f.refName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{f.refType}{f.notes ? ` · ${f.notes}` : ''}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleView(f)}>
                  <ExternalLink className="w-3 h-3 mr-1" /> View
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRemove(f._id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
