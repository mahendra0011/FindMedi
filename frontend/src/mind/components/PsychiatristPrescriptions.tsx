import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/mind/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Button } from "@/mind/components/ui/button";
import { Input } from "@/mind/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mind/components/ui/select";
import { Textarea } from "@/mind/components/ui/textarea";
import { FileText, Plus } from "lucide-react";
import { api } from "@/mind/lib/api";

function PrescriptionCard({ r, onChanged }: any) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [draft, setDraft] = useState({ diagnosis: "", clinicName: "", notes: "", followUpDate: "", medicinesText: "" });

  const startEdit = () => {
    setDraft({
      diagnosis: r.diagnosis || "",
      clinicName: r.clinicName || "",
      notes: r.notes || "",
      followUpDate: r.followUpDate ? new Date(r.followUpDate).toISOString().slice(0, 10) : "",
      medicinesText: (r.medicines || []).map((m: any) => [m.name, m.dosage, m.frequency, m.duration, m.notes].map((x) => x || "").join(" | ").replace(/\s*\|\s*$/, "")).join("\n"),
    });
    setEditing(true);
  };

  const parseMedicines = () => {
    const rawLines = draft.medicinesText.split("\n").map((l) => l.trim()).filter(Boolean);
    const medicines = [];
    for (let i = 0; i < rawLines.length; i++) {
      const parts = rawLines[i].split("|").map((s) => s.trim());
      const name = (parts[0] || "").replace(/^[|\s]+|[|\s]+$/g, "");
      if (!name) return { error: `Line ${i + 1}: medicine name is required.` };
      const extra = parts.length > 5 ? ` | ${parts.slice(5).join(" | ")}` : "";
      medicines.push({ name, dosage: parts[1] || "", frequency: parts[2] || "", duration: parts[3] || "", notes: `${parts[4] || ""}${extra}`.trim() });
    }
    if (medicines.length === 0) return { error: "At least one medicine is required." };
    return { medicines };
  };

  const saveEdit = async () => {
    const parsed = parseMedicines();
    if (parsed.error) {
      toast({ variant: "destructive", title: "Invalid medicines", description: parsed.error });
      return;
    }
    setBusy(true);
    try {
      await api.put(`/api/prescriptions/${r.id}`, {
        diagnosis: draft.diagnosis,
        clinicName: draft.clinicName,
        notes: draft.notes,
        followUpDate: draft.followUpDate || undefined,
        medicines: parsed.medicines,
      });
      toast({ title: "Prescription updated" });
      setEditing(false);
      onChanged();
    } catch (e: any) { toast({ variant: "destructive", title: "Update failed", description: e?.response?.data?.error || e.message }); }
    finally { setBusy(false); }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await api.patch(`/api/prescriptions/${r.id}/revoke`, { reason: revokeReason });
      toast({ title: "Prescription revoked" });
      setRevoking(false);
      setRevokeReason("");
      onChanged();
    } catch (e: any) { toast({ variant: "destructive", title: "Revoke failed", description: e?.response?.data?.error || e.message }); }
    finally { setBusy(false); }
  };

  const renew = async () => {
    setBusy(true);
    try {
      await api.post(`/api/prescriptions/${r.id}/renew`, {});
      toast({ title: "Prescription renewed" });
      onChanged();
    } catch (e: any) { toast({ variant: "destructive", title: "Renew failed", description: e?.response?.data?.error || e.message }); }
    finally { setBusy(false); }
  };

  const revoked = r.status === "revoked";
  return (
    <Card key={r.id} className={`glass-card ${revoked ? "opacity-70" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              {r.diagnosis || "Prescription"} — {r.medicines?.length || 0} medicine(s)
              {revoked && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">Revoked</span>}
              {r.renewedFrom && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary">Renewed</span>}
            </p>
            <p className="text-xs text-foreground/50">{r.userName ? `${r.userName} · ` : ""}{r.clinicName} {r.followUpDate ? `· Follow-up ${new Date(r.followUpDate).toLocaleDateString("en-IN")}` : ""}</p>
            {(r.counsellorName || r.createdAt) && (
              <p className="text-[11px] text-foreground/40">
                {r.counsellorName ? `Prescribed by ${r.counsellorName}` : ""}{r.createdAt ? ` · ${new Date(r.createdAt).toLocaleDateString("en-IN")}` : ""}
                {r.revokedAt ? ` · Revoked ${new Date(r.revokedAt).toLocaleDateString("en-IN")}${r.revokeReason ? ` (${r.revokeReason})` : ""}` : ""}
              </p>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
            <Button size="sm" variant="outline" onClick={() => window.print()}>Print</Button>
            {!revoked && <Button size="sm" variant="outline" disabled={busy} onClick={startEdit}>Edit</Button>}
            {!revoked && <Button size="sm" variant="outline" disabled={busy} onClick={renew}>Renew</Button>}
            {!revoked && <Button size="sm" variant="destructive" disabled={busy} onClick={() => setRevoking(true)}>Revoke</Button>}
          </div>
        </div>
        {editing ? (
          <div className="mt-3 space-y-3 rounded-xl border border-glass-border/30 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Diagnosis</label>
                <Input value={draft.diagnosis} onChange={(e) => setDraft((f) => ({ ...f, diagnosis: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Clinic</label>
                <Input value={draft.clinicName} onChange={(e) => setDraft((f) => ({ ...f, clinicName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Follow-up date</label>
                <Input type="date" value={draft.followUpDate} onChange={(e) => setDraft((f) => ({ ...f, followUpDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Medicines (one per line: Name | Dosage | Frequency | Duration | Notes)</label>
                <Textarea value={draft.medicinesText} onChange={(e) => setDraft((f) => ({ ...f, medicinesText: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Clinical notes</label>
                <Textarea value={draft.notes} onChange={(e) => setDraft((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" disabled={busy} onClick={saveEdit}>{busy ? "Saving..." : "Save changes"}</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-2 space-y-1">
              {(r.medicines || []).map((m: any, i: number) => (
                <p key={i} className="text-xs text-foreground/70">{m.name} {m.dosage ? `· ${m.dosage}` : ""} {m.frequency ? `· ${m.frequency}` : ""} {m.duration ? `· ${m.duration}` : ""}{m.notes ? ` · ${m.notes}` : ""}</p>
              ))}
            </div>
            {r.notes && <p className="mt-2 text-xs text-foreground/60">Notes: {r.notes}</p>}
          </>
        )}
        {revoking && (
          <div className="mt-3 space-y-2 rounded-xl border border-destructive/30 p-3">
            <label className="text-xs font-medium">Revoke reason (recorded in audit trail)</label>
            <Input value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} placeholder="e.g. Side effects reported, switching medication" />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setRevoking(false); setRevokeReason(""); }}>Cancel</Button>
              <Button size="sm" variant="destructive" disabled={busy} onClick={revoke}>{busy ? "Revoking..." : "Confirm revoke"}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PsychiatristPrescriptions({ patients = [] }: any) {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userId: "", diagnosis: "", clinicName: "", notes: "", followUpDate: "", medicinesText: "" });
  const [assignments, setAssignments] = useState<any[]>([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({ userId: "", title: "", description: "", category: "other", dueDate: "" });

  const load = useCallback(async () => {
    try {
      const [{ data }, assignRes] = await Promise.all([
        api.get("/api/prescriptions"),
        api.get("/api/assignments").catch(() => ({ data: [] })),
      ]);
      setItems(Array.isArray(data) ? data : []);
      setAssignments(Array.isArray(assignRes?.data) ? assignRes.data : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveAssignment() {
    if (!assignForm.userId || !assignForm.title.trim()) {
      toast({ variant: "destructive", title: "Patient and title required" });
      return;
    }
    try {
      await api.post("/api/assignments", {
        userId: assignForm.userId,
        title: assignForm.title.trim(),
        description: assignForm.description,
        category: assignForm.category,
        dueDate: assignForm.dueDate || undefined,
      });
      toast({ title: "Assignment created" });
      setShowAssignForm(false);
      setAssignForm({ userId: "", title: "", description: "", category: "other", dueDate: "" });
      load();
    } catch (e: any) { toast({ variant: "destructive", title: "Failed to save assignment", description: e?.response?.data?.error || e.message }); }
  }

  const [formError, setFormError] = useState("");
  async function save() {
    setFormError("");
    if (!form.userId || !form.medicinesText.trim()) {
      setFormError("Patient and at least one medicine are required.");
      toast({ variant: "destructive", title: "Patient and medicines required" });
      return;
    }
    const rawLines = form.medicinesText.split("\n").map((l) => l.trim()).filter(Boolean);
    const medicines: any[] = [];
    for (let i = 0; i < rawLines.length; i++) {
      const parts = rawLines[i].split("|").map((s) => s.trim());
      const name = (parts[0] || "").replace(/^[|\s]+|[|\s]+$/g, "");
      if (!name) {
        const msg = `Line ${i + 1}: medicine name is required (format: Name | Dosage | Frequency | Duration | Notes).`;
        setFormError(msg);
        toast({ variant: "destructive", title: "Invalid medicine line", description: msg });
        return;
      }
      const extra = parts.length > 5 ? ` | ${parts.slice(5).join(" | ")}` : "";
      medicines.push({
        name,
        dosage: parts[1] || "",
        frequency: parts[2] || "",
        duration: parts[3] || "",
        notes: `${parts[4] || ""}${extra}`.trim(),
      });
    }
    try {
      await api.post("/api/prescriptions", {
        userId: form.userId,
        diagnosis: form.diagnosis,
        clinicName: form.clinicName,
        notes: form.notes,
        followUpDate: form.followUpDate || undefined,
        medicines,
      });
      toast({ title: "Prescription created" });
      setShowForm(false);
      setForm({ userId: "", diagnosis: "", clinicName: "", notes: "", followUpDate: "", medicinesText: "" });
      load();
    } catch (e: any) { toast({ variant: "destructive", title: "Failed to save", description: e?.response?.data?.error || e.message }); }
  }

  if (loading) return <div className="p-8 text-center text-foreground/50">Loading prescriptions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Prescriptions
          </h3>
          <p className="text-sm text-foreground/60">Diagnosis + medicines for your patients (medical scope)</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">{showForm ? "Cancel" : <><Plus className="h-4 w-4" /> New Prescription</>}</Button>
      </div>
      {showForm && (
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-3"><CardTitle className="text-base">New Prescription</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Patient *</label>
                <Select value={form.userId} onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — {p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Follow-up date</label>
                <Input type="date" value={form.followUpDate} onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Diagnosis</label>
                <Input value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} placeholder="e.g. Moderate anxiety" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Clinic</label>
                <Input value={form.clinicName} onChange={(e) => setForm((f) => ({ ...f, clinicName: e.target.value }))} placeholder="Clinic name" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Medicines * (one per line: Name | Dosage | Frequency | Duration | Notes)</label>
                <Textarea value={form.medicinesText} onChange={(e) => { setForm((f) => ({ ...f, medicinesText: e.target.value })); setFormError(""); }} rows={3} placeholder={"Ativan 1mg | 1mg | Once daily | 14 days | After food"} />
                {formError && <p className="text-xs text-destructive font-medium">{formError}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Clinical notes</label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>
            <Button onClick={save} className="gap-2"><Plus className="h-4 w-4" /> Create Prescription</Button>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="text-lg font-semibold">Therapy Assignments</h3>
          <p className="text-sm text-foreground/60">Homework / exercises for your patients</p>
        </div>
        <Button variant="outline" onClick={() => setShowAssignForm(!showAssignForm)} className="gap-2">{showAssignForm ? "Cancel" : <><Plus className="h-4 w-4" /> New Assignment</>}</Button>
      </div>
      {showAssignForm && (
        <Card className="glass-card border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Patient *</label>
                <Select value={assignForm.userId} onValueChange={(v) => setAssignForm((f) => ({ ...f, userId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — {p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Due date</label>
                <Input type="date" value={assignForm.dueDate} onChange={(e) => setAssignForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Title *</label>
                <Input value={assignForm.title} onChange={(e) => setAssignForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Daily breathing exercise" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Category</label>
                <Select value={assignForm.category} onValueChange={(v) => setAssignForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["other", "exercise", "journal", "reading", "meditation", "exposure"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Instructions</label>
                <Textarea value={assignForm.description} onChange={(e) => setAssignForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
            </div>
            <Button onClick={saveAssignment} className="gap-2"><Plus className="h-4 w-4" /> Create Assignment</Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3">
        {assignments.length === 0 ? (
          <Card className="glass-card"><CardContent className="p-6 text-center text-foreground/50 text-sm">No assignments yet.</CardContent></Card>
        ) : assignments.map((a) => (
          <Card key={a.id} className="glass-card">
            <CardContent className="p-4">
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="text-xs text-foreground/50">{a.userName || a.userEmail} · {a.category} · {a.status}{a.dueDate ? ` · Due ${new Date(a.dueDate).toLocaleDateString("en-IN")}` : ""}</p>
              {a.description && <p className="mt-1 text-xs text-foreground/60">{a.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-3">
        {items.length === 0 ? (
          <Card className="glass-card"><CardContent className="p-8 text-center text-foreground/50">No prescriptions yet. Create one for a patient.</CardContent></Card>
        ) : items.map((r) => (
          <PrescriptionCard key={r.id} r={r} onChanged={load} />
        ))}
      </div>
    </div>
  );
}
