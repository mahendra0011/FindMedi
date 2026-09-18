import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

function SystemSettingsTab() {
  const [settings, setSettings] = useState(null);
  const [editKey, setEditKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSystemSettings();
      setSettings(data);
    } catch { toast.error('Failed to load system settings'); }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (key) => {
    try {
      const setting = settings[key];
      if (!setting) { toast.error('Setting not found'); return; }
      let val = editValue;
      if (setting.type === 'number') val = Number(val);
      else if (setting.type === 'boolean') val = val === 'true';
      else if (setting.type === 'array') val = val.split(',').map(s => s.trim());
      await api.updateSystemSetting(key, { value: val });
      toast.success('Setting updated');
      setEditKey(null);
      fetchSettings();
    } catch { toast.error('Failed to update setting'); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {settings && Object.entries(settings).map(([key, config]) => (
        <div key={key} className="bg-card rounded-xl border p-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {editKey === key ? (
              <div className="flex items-center gap-2 mt-2">
                {config.type === 'boolean' ? (
                  <select value={String(editValue)} onChange={e => setEditValue(e.target.value)}
                    className="h-8 px-2 rounded border border-input bg-background text-sm">
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="text-sm h-8 max-w-xs" />
                )}
                <Button size="sm" onClick={() => handleSave(key)}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditKey(null)}>Cancel</Button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-foreground mt-1">
                {config.type === 'boolean' ? (config.value ? '✅ Enabled' : '❌ Disabled') :
                 config.type === 'array' ? (config.value || []).join(', ') :
                 String(config.value)}
              </p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">{config.type}</Badge>
          {editKey !== key && (
            <Button variant="ghost" size="sm" onClick={() => { setEditKey(key); setEditValue(String(config.value)); }}>
              <Settings className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export default SystemSettingsTab;
