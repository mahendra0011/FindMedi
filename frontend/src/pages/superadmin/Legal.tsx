import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Save, History, Eye, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const CONTENT_KEYS = [
  { key: 'terms', label: 'Terms & Conditions', icon: FileText },
  { key: 'privacy', label: 'Privacy Policy', icon: Shield },
];

export default function Legal() {
  const [activeKey, setActiveKey] = useState('terms');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [changeNotes, setChangeNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getPlatformContent(activeKey);
      setContent(res);
      setEditTitle(res.title || '');
      setEditBody(res.body || '');
    } catch {
      setContent(null);
      setEditTitle(CONTENT_KEYS.find(k => k.key === activeKey)?.label || '');
      setEditBody('');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeKey]);

  const handleSave = async () => {
    if (!editTitle.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      await api.updatePlatformContent(activeKey, { title: editTitle, body: editBody, publish: true, changeNotes });
      toast.success(`${editTitle} updated (v${(content?.version || 0) + 1})`);
      setChangeNotes('');
      load();
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Legal & Compliance</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage Terms & Conditions, Privacy Policy with version control</p>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {CONTENT_KEYS.map(ck => (
          <button key={ck.key} onClick={() => setActiveKey(ck.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeKey === ck.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <ck.icon className="w-4 h-4" /> {ck.label}
          </button>
        ))}
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground`}>
          <Clock className="w-4 h-4" /> License Tracking
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    {content?.title || editTitle}
                  </CardTitle>
                  {content && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <History className="w-3 h-3" /> v{content.version}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Title</label>
                  <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Content</label>
                  <textarea
                    className="w-full min-h-[300px] rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editBody} onChange={e => setEditBody(e.target.value)}
                    placeholder="Enter HTML or markdown content..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Change Notes</label>
                  <Input placeholder="What changed in this version?" value={changeNotes} onChange={e => setChangeNotes(e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : `Publish v${(content?.version || 0) + 1}`}
                  </Button>
                  {content?.publishedAt && (
                    <span className="text-xs text-muted-foreground">Last published: {new Date(content.publishedAt).toLocaleString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Version History</CardTitle></CardHeader>
              <CardContent>
                {content ? (
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">v{content.version}</span>
                        <span className="text-xs">{new Date(content.updatedAt || content.createdAt).toLocaleDateString()}</span>
                      </div>
                      {content.changeNotes && <p className="text-xs mt-1">{content.changeNotes}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No published versions yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> License Expiry Tracking</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Track facility license renewals (NABL, AERB, Drug License)</p>
                <a href="#/superadmin/licenses" className="text-sm text-primary hover:underline">Go to Licenses →</a>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
