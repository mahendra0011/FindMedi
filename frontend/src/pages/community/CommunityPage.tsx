import { useEffect, useState } from 'react';
import { MessageSquare, Loader2, Plus, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import type { ApiRow, Unmodelled } from '@/lib/apiTypes';

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const CATEGORIES = ['general', 'diabetes', 'bp', 'mental_health', 'parenting', 'elder_care', 'nutrition', 'fitness', 'recovery', 'other'];

export default function CommunityPage() {
  const [posts, setPosts] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState('');
  const [reply, setReply] = useState<Unmodelled>({});
  const [reportedPosts, setReportedPosts] = useState<Set<string>>(new Set());
  const [reportReason, setReportReason] = useState('medical_advice');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getCommunityPosts({});
      setPosts(res.posts || []);
    } catch (e: unknown) {
      setError(errMsg(e, 'Failed to load forum'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy('create'); setError('');
    try {
      await api.createCommunityPost({ category, title: title.trim(), body: body.trim() });
      setTitle(''); setBody('');
      await load();
    } catch (e: unknown) {
      setError(errMsg(e, 'Failed to post'));
    } finally {
      setBusy('');
    }
  };

  const comment = async (id: string) => {
    const text = String(reply[id] || '').trim();
    if (!text) return;
    setBusy('c' + id); setError('');
    try {
      await api.commentCommunityPost(id, { body: text });
      setReply({ ...reply, [id]: '' });
      await load();
    } catch (e: unknown) {
      setError(errMsg(e, 'Failed to comment'));
    } finally {
      setBusy('');
    }
  };

  const report = async (id: string) => {
    setBusy('r' + id); setError('');
    try {
      await api.reportCommunityPost(id, { reason: reportReason });
      setReportedPosts((current) => new Set(current).add(id));
    } catch (e: unknown) {
      setError(errMsg(e, 'Failed to report post'));
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Community</h1>
        <p className="text-muted-foreground text-sm">Peer support — not medical advice. Crisis? Call Tele-MANAS 14416 or 112.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="bg-card rounded-2xl border border-border/60 p-5 space-y-3">
        <h2 className="font-semibold">New post</h2>
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="border rounded-lg px-3 py-2 text-sm bg-background" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Textarea placeholder="Share your experience (no dosage/diagnosis instructions)" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
        <Button disabled={!title.trim() || !body.trim() || busy === 'create'} onClick={create}>
          {busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Post
        </Button>
      </section>

      <section className="space-y-3">
        {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet.</p>}
        {posts.map((p: ApiRow) => (
          <article key={String(p._id)} className="bg-card rounded-2xl border border-border/60 p-5 space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">{String(p.title)}</h3>
              <Badge className="bg-muted">{String(p.category)}</Badge>
            </div>
            <p className="text-sm">{String(p.body)}</p>
            <p className="text-xs text-muted-foreground">{new Date(String(p.createdAt)).toLocaleString()} · {Number(p.comments?.length || 0)} comments</p>
            {p.comments?.length > 0 && (
              <div className="space-y-1 pl-3 border-l">
                {p.comments.map((c: Unmodelled, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground">{String(c.body)}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input className="max-w-md" placeholder="Reply" value={reply[String(p._id)] || ''} onChange={(e) => setReply({ ...reply, [String(p._id)]: e.target.value })} />
              <Button size="sm" disabled={busy === 'c' + String(p._id)} onClick={() => comment(String(p._id))}>Reply</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="sr-only" htmlFor={`report-reason-${String(p._id)}`}>Report reason</label>
              <select id={`report-reason-${String(p._id)}`} className="border rounded-lg px-2 py-1 text-xs bg-background" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                <option value="medical_advice">Unsafe medical advice</option>
                <option value="crisis">Crisis or self-harm content</option>
                <option value="privacy">Someone’s private information</option>
                <option value="harassment">Harassment</option>
                <option value="spam">Spam</option>
                <option value="other">Other safety concern</option>
              </select>
              <Button size="sm" variant="ghost" disabled={busy === 'r' + String(p._id) || reportedPosts.has(String(p._id))} onClick={() => report(String(p._id))}>
                <Flag className="mr-1 h-3.5 w-3.5" />{reportedPosts.has(String(p._id)) ? 'Reported' : 'Report'}
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
