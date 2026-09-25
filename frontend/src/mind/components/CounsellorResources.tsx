import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/mind/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Button } from "@/mind/components/ui/button";
import { Input } from "@/mind/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mind/components/ui/select";
import { Textarea } from "@/mind/components/ui/textarea";
import { BookOpen, Upload, Pencil, Trash2, Video, FileText, Headphones, Volume2, File } from "lucide-react";
import { api } from "@/mind/lib/api";

export function CounsellorResources() {
  const { toast } = useToast();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", type: "article", category: "General", language: "English", url: "", thumbnail: "", description: "", durationMin: 5, tags: "" });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/resources/mine");
      setResources(data);
    } catch { toast({ variant: "destructive", title: "Failed to load resources" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.title.trim() || !form.url.trim()) {
      toast({ variant: "destructive", title: "Title and URL are required" }); return;
    }
    const payload = { ...form, tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [] };
    try {
      if (editing) {
        await api.patch(`/api/resources/${editing}`, payload);
        toast({ title: "Resource updated" });
      } else {
        await api.post("/api/resources", payload);
        toast({ title: "Resource created" });
      }
      setShowForm(false); setEditing(null); setForm({ title: "", type: "article", category: "General", language: "English", url: "", thumbnail: "", description: "", durationMin: 5, tags: "" });
      load();
    } catch (e: any) { toast({ variant: "destructive", title: "Failed to save", description: e?.response?.data?.error || e.message }); }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/api/resources/${id}`);
      toast({ title: "Resource deleted" });
      load();
    } catch { toast({ variant: "destructive", title: "Failed to delete" }); }
  }

  const typeIcon = (t: string) => ({ video: Video, article: FileText, audiobook: Headphones, audio: Volume2, pdf: File, blog: FileText }[t as keyof typeof typeIcon] || FileText);

  if (loading) return <div className="p-8 text-center text-foreground/50">Loading resources...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            My Resources
          </h3>
          <p className="text-sm text-foreground/60">Manage videos, audiobooks, PDFs, and articles you share with users</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ title: "", type: "article", category: "General", language: "English", url: "", thumbnail: "", description: "", durationMin: 5, tags: "" }); }} className="gap-2">
          {showForm ? "Cancel" : <><Upload className="h-4 w-4" /> Add Resource</>}
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-3"><CardTitle className="text-base">{editing ? "Edit" : "New"} Resource</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Title *</label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Resource title" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Type</label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["article", "blog", "video", "audiobook", "audio", "pdf"].map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Category</label>
                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Anxiety, Sleep" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Language</label>
                <Input value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} placeholder="English" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">URL *</label>
                <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Thumbnail URL</label>
                <Input value={form.thumbnail} onChange={(e) => setForm((f) => ({ ...f, thumbnail: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Duration (min)</label>
                <Input type="number" min={1} value={form.durationMin} onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) || 5 }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Description</label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Tags (comma-separated)</label>
                <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="meditation, stress, sleep" />
              </div>
            </div>
            <Button onClick={save} className="gap-2"><Plus className="h-4 w-4" /> {editing ? "Update" : "Create"} Resource</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {resources.length === 0 ? (
          <Card className="glass-card"><CardContent className="p-8 text-center text-foreground/50">No resources yet. Click "Add Resource" to create one.</CardContent></Card>
        ) : resources.map((r) => {
          const Icon = typeIcon(r.type) as any;
          return (
            <Card key={r._id} className="glass-card">
              <CardContent className="p-4 flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.title}</p>
                  <p className="text-xs text-foreground/50 flex items-center gap-2">
                    <span className="capitalize">{r.type}</span>
                    <span>·</span>
                    <span>{r.category}</span>
                    {r.language && <><span>·</span><span>{r.language}</span></>}
                    {r.durationMin > 0 && <><span>·</span><span>{r.durationMin} min</span></>}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setEditing(r._id);
                    setForm({ title: r.title, type: r.type, category: r.category, language: r.language, url: r.url, thumbnail: r.thumbnail || "", description: r.description || "", durationMin: r.durationMin || 5, tags: (r.tags || []).join(", ") });
                    setShowForm(true);
                  }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(r._id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
