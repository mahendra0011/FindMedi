import { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function LicenseExpiryReminder() {
  const { user } = useAuth();
  const [expiringLicenses, setExpiringLicenses] = useState([]);

  useEffect(() => {
    if (user?.role !== 'superadmin') return;

    const checkLicenses = async () => {
      try {
        const { licenses } = await api.getLicenses();
        if (licenses && licenses.length > 0) {
          const now = new Date();
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(now.getDate() + 30);
          
          const expiring = licenses.filter(lic => {
            const expDate = new Date(lic.expiryDate);
            return lic.status === 'Active' && expDate <= thirtyDaysFromNow;
          });
          setExpiringLicenses(expiring);
        }
      } catch (err) {
        console.error('Failed to fetch licenses for expiry check', err);
      }
    };
    checkLicenses();
  }, [user]);

  if (expiringLicenses.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {expiringLicenses.map(lic => {
        const isExpired = new Date(lic.expiryDate) < new Date();
        return (
          <div key={lic._id} className={`p-4 rounded-xl border flex items-center gap-3 ${isExpired ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-warning/10 border-warning/20 text-warning-foreground'}`}>
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold">{lic.licenseType} {isExpired ? 'Expired' : 'Expiring Soon'}</h4>
              <p className="text-sm opacity-90">
                Your {lic.licenseType} ({lic.licenseNumber}) {isExpired ? 'expired on' : 'will expire on'} {new Date(lic.expiryDate).toLocaleDateString()}. Please renew it to avoid service interruption.
              </p>
            </div>
            <Clock className="w-5 h-5 shrink-0 opacity-50" />
          </div>
        );
      })}
    </div>
  );
}
