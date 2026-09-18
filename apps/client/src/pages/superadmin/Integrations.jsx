import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, MessageSquare, Mail, HardDrive, Map, Webhook, Settings, Wifi,
  WifiOff, TestTube, Plus, Trash2, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const CATEGORY_ICONS = {
  payment: CreditCard, sms: MessageSquare, email: Mail, storage: HardDrive,
  maps: Map, webhook: Webhook, analytics: Settings, other: Settings,
};

const CATEGORY_LABELS = {
  payment: 'Payment Gateways', sms: 'SMS Providers', email: 'Email Services',
  storage: 'File Storage', maps: 'Map Services', webhook: 'Webhooks',
  analytics: 'Analytics', other: 'Other',
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showKeys, setShowKeys] = useState({});
  const [webhooks, setWebhooks] = useState([]);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [whForm, setWhForm] = useState({ name: '', url: '', events: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getIntegrations();
      setIntegrations(res.integrations || []);
    } catch { toast.error('Failed to load integrations'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadWebhooks = async (provider) => {
    try {
      const res = await api.getWebhooks(provider);
      setWebhooks(res.webhooks || []);
    } catch { setWebhooks([]); }
  };

  const handleToggle = async (integration) => {
    try {
      await api.updateIntegration(integration.provider, { isEnabled: !integration.isEnabled });
      toast.success(`${integration.label} ${integration.isEnabled ? 'disabled' : 'enabled'}`);
      load();
    } catch { toast.error('Failed to update'); }
  };

  const handleSaveConfig = async (integration) => {
    try {
      await api.updateIntegration(integration.provider, { config: integration.config });
      toast.success(`${integration.label} config saved`);
    } catch { toast.error('Failed to save'); }
  };

  const handleTest = async (provider) => {
    try {
      const res = await api.testIntegration(provider);
      toast.success(`Test ${res.status}`);
      load();
    } catch { toast.error('Test failed'); }
  };

  const handleAddWebhook = async (provider) => {
    if (!whForm.name || !whForm.url) return toast.error('Name and URL required');
    try {
      await api.createWebhook(provider, { ...whForm, events: whForm.events.split(',').map(e => e.trim()).filter(Boolean) });
      toast.success('Webhook added');
      setShowWebhookForm(false);
      setWhForm({ name: '', url: '', events: '' });
      loadWebhooks(provider);
    } catch { toast.error('Failed to add webhook'); }
  };

  const handleDeleteWebhook = async (provider, webhookId) => {
    if (!confirm('Delete this webhook?')) return;
    try { await api.deleteWebhook(provider, webhookId); loadWebhooks(provider); } catch { toast.error('Failed to delete'); }
  };

  const grouped = {};
  integrations.forEach(i => {
    if (!grouped[i.category]) grouped[i.category] = [];
    grouped[i.category].push(i);
  });

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">API & Integration Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure payment gateways, SMS, email, storage & webhooks</p>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, items]) => {
          const CatIcon = CATEGORY_ICONS[category] || Settings;
          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CatIcon className="w-4 h-4 text-primary" />
                  {CATEGORY_LABELS[category] || category}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map(integration => (
                  <div key={integration._id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${integration.isEnabled ? 'bg-success/10' : 'bg-muted'}`}>
                          {integration.isEnabled ? <Wifi className="w-5 h-5 text-success" /> : <WifiOff className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{integration.label}</p>
                          <p className="text-xs text-muted-foreground">{integration.provider}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant={integration.isEnabled ? 'default' : 'outline'} size="sm" className="text-xs h-8 gap-1.5" onClick={() => handleToggle(integration)}>
                          {integration.isEnabled ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                          {integration.isEnabled ? 'Enabled' : 'Disabled'}
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={() => handleTest(integration.provider)}>
                          <TestTube className="w-3.5 h-3.5" /> Test
                        </Button>
                        {integration.lastTestStatus !== 'untested' && (
                          <Badge className={integration.lastTestStatus === 'success' ? 'bg-success/10 text-success text-[10px]' : 'bg-destructive/10 text-destructive text-[10px]'}>
                            {integration.lastTestStatus === 'success' ? 'Pass' : 'Fail'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(integration.config || {}).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2">
                          <label className="text-xs font-medium text-muted-foreground w-32 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                          <div className="relative flex-1">
                            <Input
                              type={showKeys[`${integration.provider}-${key}`] ? 'text' : 'password'}
                              value={val || ''}
                              onChange={e => {
                                setIntegrations(integrations.map(i =>
                                  i._id === integration._id
                                    ? { ...i, config: { ...i.config, [key]: e.target.value } }
                                    : i
                                ));
                              }}
                              className="text-xs pr-8"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKeys({ ...showKeys, [`${integration.provider}-${key}`]: !showKeys[`${integration.provider}-${key}`] })}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showKeys[`${integration.provider}-${key}`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                      {Object.keys(integration.config || {}).length > 0 && (
                        <div className="flex justify-end pt-1">
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleSaveConfig(integration)}>Save Keys</Button>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <button
                        onClick={() => { setSelected(selected === integration.provider ? null : integration.provider); if (selected !== integration.provider) loadWebhooks(integration.provider); }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Webhook className="w-3 h-3" />
                        Webhooks ({integration.webhooks?.length || 0})
                      </button>

                      {selected === integration.provider && (
                        <div className="mt-3 space-y-2">
                          {webhooks.map(wh => (
                            <div key={wh._id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                              <div>
                                <span className="font-medium text-foreground">{wh.name}</span>
                                <span className="text-muted-foreground ml-2">{wh.url}</span>
                                {wh.events?.length > 0 && <span className="text-muted-foreground ml-2">· {wh.events.join(', ')}</span>}
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteWebhook(integration.provider, wh._id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          {showWebhookForm ? (
                            <div className="flex gap-2 items-end">
                              <div className="flex-1"><Input placeholder="Name" className="text-xs h-8" value={whForm.name} onChange={e => setWhForm({...whForm, name: e.target.value})} /></div>
                              <div className="flex-[2]"><Input placeholder="URL" className="text-xs h-8" value={whForm.url} onChange={e => setWhForm({...whForm, url: e.target.value})} /></div>
                              <div className="flex-1"><Input placeholder="Events (comma-separated)" className="text-xs h-8" value={whForm.events} onChange={e => setWhForm({...whForm, events: e.target.value})} /></div>
                              <Button size="sm" className="text-xs h-8" onClick={() => handleAddWebhook(integration.provider)}>Add</Button>
                              <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setShowWebhookForm(false)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setShowWebhookForm(true)}>
                              <Plus className="w-3 h-3" /> Add Webhook
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
