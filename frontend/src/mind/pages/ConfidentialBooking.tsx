import { useEffect, useMemo, useState } from "react";
import Navigation from "@/mind/components/Navigation";
import Footer from "@/mind/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/mind/components/ui/card";
import { Button } from "@/mind/components/ui/button";
import { Input } from "@/mind/components/ui/input";
import { Label } from "@/mind/components/ui/label";
import { Textarea } from "@/mind/components/ui/textarea";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/mind/components/ui/select";
import { Switch } from "@/mind/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mind/components/ui/table";
import { useToast } from "@/mind/components/ui/use-toast";
import { Badge } from "@/mind/components/ui/badge";
import { CalendarDays, Clock, Shield, User2, CheckCircle2, XCircle, PenLine, Video, Star, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/mind/lib/api";
import { sanitizeInput } from "@/mind/lib/sanitize";
import { fetchCounsellors, selectCounsellors, selectCounsellorsStatus } from "@/mind/store/counsellorsSlice";
import { useAppDispatch, useAppSelector } from "@/mind/store/hooks";
async function getStudentAppointments(studentId) {
    try {
        const { data } = await api.get(`/api/appointments/my`);
        return data;
    }
    catch {
        return [];
    }
}
async function createAppointment(payload) {
    const { data } = await api.post("/api/appointments", payload);
    return data;
}
async function updateAppointment(id, payload) {
    const { data } = await api.put(`/api/appointments/${encodeURIComponent(id)}`, payload);
    return data;
}
async function deleteAppointment(id) {
    await api.delete(`/api/appointments/${encodeURIComponent(id)}`);
}
const statusColor = {
    pending: "bg-amber-500/15 text-amber-600 border border-amber-500/30",
    confirmed: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30",
    declined: "bg-rose-500/15 text-rose-600 border border-rose-500/30",
    cancelled: "bg-zinc-500/15 text-zinc-600 border border-zinc-500/30",
    completed: "bg-blue-500/15 text-blue-600 border border-blue-500/30",
};
const emergencyKeywords = ["suicide", "self-harm", "panic attack", "abuse"];
const hasEmergencyLanguage = (text) => emergencyKeywords.some((keyword) => String(text || "").toLowerCase().includes(keyword));
const defaultReview = { professionalism: "5", helpfulness: "5", communication: "5", comment: "", anonymous: true };

function getAnonymousDefault() {
    try {
        const prefs = JSON.parse(localStorage.getItem("mindsupport_privacy_prefs") || "{}");
        return Boolean(prefs.anonymousDefault);
    }
    catch {
        return false;
    }
}

function todayYMD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
function timeNowHM() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
const ConfidentialBooking = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const counsellorsFromStore = useAppSelector(selectCounsellors);
    const counsellorsStatus = useAppSelector(selectCounsellorsStatus);
    const counsellors = useMemo(() => {
        return [{ id: "first_available", name: "First Available" }, ...counsellorsFromStore];
    }, [counsellorsFromStore]);
    const [loading, setLoading] = useState(false);
    const [appointments, setAppointments] = useState([]);
    // Form state
    const [studentEmail, setStudentEmail] = useState("");
    const studentId = useMemo(() => (studentEmail || "").trim().toLowerCase(), [studentEmail]);
    const [counsellorId, setCounsellorId] = useState("first_available");
    const [date, setDate] = useState(todayYMD());
    const [time, setTime] = useState(timeNowHM());
    const [mode, setMode] = useState("google-meet");
    const [concern, setConcern] = useState("");
    const [anonymousMode, setAnonymousMode] = useState(getAnonymousDefault);
    const [anonymousAlias, setAnonymousAlias] = useState("Anonymous user");
    const [reviewingId, setReviewingId] = useState(null);
    const [reviewForms, setReviewForms] = useState({});
    // Reschedule state per appointment id
    const [editingId, setEditingId] = useState(null);
    const [editDate, setEditDate] = useState(todayYMD());
    const [editTime, setEditTime] = useState(timeNowHM());
    useEffect(() => {
        if (counsellorsStatus === "idle") {
            dispatch(fetchCounsellors());
        }
    }, [dispatch, counsellorsStatus]);
    useEffect(() => {
        // Load student's appointments whenever studentId changes and looks like an email
        (async () => {
            if (!studentId || !studentId.includes("@")) {
                setAppointments([]);
                return;
            }
            try {
                const data = await getStudentAppointments(studentId);
                setAppointments(data);
            }
            catch (e) {
                // ignore
            }
        })();
    }, [studentId]);
    const canSubmit = useMemo(() => {
        return !loading && studentId.includes("@") && !!date && !!time && !!mode && !!counsellorId;
    }, [loading, studentId, date, time, mode, counsellorId]);
    const selectedCounsellor = counsellors.find((c) => c.id === counsellorId);
    async function onSubmit() {
        if (!canSubmit)
            return;
        setLoading(true);
        try {
            const appt = await createAppointment({
                studentId,
                studentEmail: sanitizeInput(studentEmail),
                counsellorId,
                date,
                time,
                mode,
                concern: sanitizeInput(concern),
                isAnonymous: anonymousMode,
                anonymousAlias: sanitizeInput(anonymousAlias),
            });
            toast({ title: "Request submitted", description: "Your appointment request has been created." });
            // Refresh list
            const list = await getStudentAppointments(studentId);
            setAppointments(list);
            // Reset a bit
            if (counsellorId === "first_available")
                setCounsellorId("first_available");
        }
        catch (e) {
            toast({
                variant: "destructive",
                title: "Unable to create booking",
                description: e?.message || "Please try again.",
            });
        }
        finally {
            setLoading(false);
        }
    }
    function getReviewForm(id) {
        return { ...defaultReview, ...(reviewForms[id] || {}) };
    }
    function updateReviewField(id, key, value) {
        setReviewForms((prev) => ({
            ...prev,
            [id]: { ...defaultReview, ...(prev[id] || {}), [key]: value },
        }));
    }
    async function submitReview(id) {
        setLoading(true);
        try {
            const reviewForm = getReviewForm(id);
            await api.post("/api/reviews", { appointmentId: id, ...reviewForm, comment: sanitizeInput(reviewForm.comment) });
            toast({ title: "Review submitted", description: "Thank you. Your feedback helps keep counsellor quality high." });
            setReviewingId(null);
            const list = await getStudentAppointments(studentId);
            setAppointments(list);
        }
        catch (e) {
            toast({ variant: "destructive", title: "Review failed", description: e?.message || "" });
        }
        finally {
            setLoading(false);
        }
    }
    async function onCancel(id) {
        setLoading(true);
        try {
            await deleteAppointment(id);
            toast({ title: "Appointment cancelled" });
            const list = await getStudentAppointments(studentId);
            setAppointments(list);
        }
        catch (e) {
            toast({ variant: "destructive", title: "Cancel failed", description: e?.message || "" });
        }
        finally {
            setLoading(false);
        }
    }
    function startEdit(appt) {
        setEditingId(appt.id);
        setEditDate(appt.date);
        setEditTime(appt.time);
    }
    async function saveEdit(id) {
        setLoading(true);
        try {
            await updateAppointment(id, { date: editDate, time: editTime });
            toast({ title: "Rescheduled successfully" });
            const list = await getStudentAppointments(studentId);
            setAppointments(list);
            setEditingId(null);
        }
        catch (e) {
            toast({ variant: "destructive", title: "Reschedule failed", description: e?.message || "" });
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        <section className="py-6 md:py-8 lg:py-10 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Confidential Booking System</h1>
                <p className="text-foreground/70 mt-2">
                  Book a confidential counseling session. Your information is protected and will only be used to coordinate your session.
                </p>
              </div>
              <div className="hidden md:flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => navigate("/mind")}>
                  Home
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(360px,420px)] gap-6">
              {/* Booking Form */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-primary"/> Book Appointment
                  </CardTitle>
                  <CardDescription>Select your preferences and submit a booking request</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">University Email (used as Student ID)</Label>
                      <Input id="email" type="email" placeholder="you@university.edu" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label>Mode</Label>
                      <Select value={mode} onValueChange={(v) => setMode(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode"/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google-meet">Google Meet</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="in-person">In-person</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Counsellor</Label>
                      <Select value={counsellorId} onValueChange={setCounsellorId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select counsellor"/>
                        </SelectTrigger>
                        <SelectContent>
                          {counsellors.map((c) => (<SelectItem key={c.id} value={c.id}>
                              {c.name}{c.specialization ? ` — ${c.specialization}` : ""}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-foreground/60">Choose specific counsellor or First Available</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date" className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary"/> Date
                      </Label>
                      <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={todayYMD()}/>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="time" className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary"/> Time
                      </Label>
                      <Input id="time" type="time" step={1800} value={time} onChange={(e) => setTime(e.target.value)}/>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="concern">What would you like support with?</Label>
                    <Textarea id="concern" rows={4} value={concern} onChange={(event) => setConcern(event.target.value)} placeholder="Share a brief concern, goal, or preferred support area." />
                    {hasEmergencyLanguage(concern) && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                        Urgent support options: call local emergency services, 1800-599-0019 in India, or 988 where available.
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-glass-border/40 bg-background/60 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label htmlFor="anonymous-mode" className="flex items-center gap-2">
                          <EyeOff className="h-4 w-4 text-primary" />
                          Anonymous counselling
                        </Label>
                        <p className="text-xs text-foreground/60 mt-1">Hide your real name and email from the counsellor. Admin can still view identity for safety.</p>
                      </div>
                      <Switch id="anonymous-mode" checked={anonymousMode} onCheckedChange={setAnonymousMode} />
                    </div>
                    {anonymousMode && (
                      <div className="space-y-2">
                        <Label htmlFor="anonymous-alias">Nickname shown to counsellor</Label>
                        <Input id="anonymous-alias" value={anonymousAlias} onChange={(event) => setAnonymousAlias(event.target.value)} placeholder="Calm Student" />
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    By continuing, you understand this platform provides emotional support and is not emergency medical care.
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-foreground/70 flex items-center gap-2">
                      <User2 className="h-4 w-4"/> Student ID: <span className="font-medium">{studentId || "—"}</span>
                    </div>
                    <Button disabled={!canSubmit} onClick={onSubmit} className="px-6">
                      Submit Request
                    </Button>
                  </div>

                  {selectedCounsellor && selectedCounsellor.id !== "first_available" && (<p className="text-xs text-foreground/60">
                      Booking with: <span className="font-medium">{selectedCounsellor.name}</span>
                    </p>)}
                </CardContent>
              </Card>

              {/* Right Panel: Privacy & Tips */}
              <div className="space-y-4">
                <Card className="glass-card border-primary/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Shield className="h-6 w-6 text-primary"/> Privacy & Safety
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-foreground/80 space-y-2">
                    <p>Your booking details are handled confidentially and used only for coordinating your session.</p>
                    <p>You can cancel or reschedule at any time from your appointment list below.</p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-secondary/30">
                  <CardHeader>
                    <CardTitle className="text-base">How it works</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-foreground/80 space-y-2">
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Submit your preferred slot and counsellor</li>
                      <li>We validate and create a Pending request</li>
                      <li>Counsellor confirms and you get updated here</li>
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Student Appointments */}
            <div className="mt-8">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <CalendarDays className="h-6 w-6 text-secondary"/> Your Appointments
                  </CardTitle>
                  <CardDescription>Track status, cancel or reschedule</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!studentId || !studentId.includes("@")) ? (<p className="text-sm text-foreground/70">Enter your university email above to view your appointments.</p>) : appointments.length === 0 ? (<p className="text-sm text-foreground/70">No appointments yet.</p>) : (<div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Counsellor</TableHead>
                                <TableHead>Mode</TableHead>
                                <TableHead>Privacy</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Meet</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {appointments.map((a) => {
                const isEditing = editingId === a.id;
                return (<TableRow key={a.id}>
                                <TableCell>
                                  {isEditing ? (<Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}/>) : (a.date)}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (<Input type="time" step={1800} value={editTime} onChange={(e) => setEditTime(e.target.value)}/>) : (a.time)}
                                </TableCell>
                                <TableCell>{a.counsellorName || a.counsellorId}</TableCell>
                                <TableCell className="capitalize">{a.mode}</TableCell>
                                <TableCell>{a.isAnonymous ? <Badge variant="secondary">Anonymous</Badge> : <span className="text-xs text-foreground/50">Standard</span>}</TableCell>
                                <TableCell>
                                  <Badge className={`${statusColor[a.status]} px-2 py-0.5`}>{a.status}</Badge>
                                </TableCell>
                                <TableCell>
                                  {a.meetingLink ? (<Button asChild size="sm" variant="outline" className="gap-1">
                                      <a href={a.meetingLink} target="_blank" rel="noreferrer">
                                        <Video className="h-4 w-4"/> Join same Meet
                                      </a>
                                    </Button>) : (<span className="text-xs text-foreground/50">-</span>)}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                  {isEditing ? (<Button size="sm" variant="outline" className="gap-1" disabled={loading} onClick={() => saveEdit(a.id)}>
                                      <CheckCircle2 className="h-4 w-4"/> Save
                                    </Button>) : (<Button size="sm" variant="outline" className="gap-1" disabled={loading || a.status === "cancelled" || a.status === "completed"} onClick={() => startEdit(a)}>
                                      <PenLine className="h-4 w-4"/> Reschedule
                                    </Button>)}
                                  <Button size="sm" variant="outline" className="gap-1" disabled={loading || a.status === "cancelled" || a.status === "completed"} onClick={() => onCancel(a.id)}>
                                    <XCircle className="h-4 w-4"/> Cancel
                                  </Button>
                                  {a.status === "completed" && (<Button size="sm" variant="outline" className="gap-1" disabled={loading || a.reviewSubmitted} onClick={() => setReviewingId(a.id)}>
                                      <Star className="h-4 w-4"/> {a.reviewSubmitted ? "Reviewed" : "Review"}
                                    </Button>)}
                                </TableCell>
                              </TableRow>);
            })}
                        </TableBody>
                      </Table>
                      {reviewingId && (() => {
                        const appointment = appointments.find((item) => item.id === reviewingId);
                        const form = getReviewForm(reviewingId);
                        if (!appointment) return null;
                        return (
                          <div className="mt-4 rounded-lg border border-glass-border/40 bg-background/70 p-4 space-y-4">
                            <div>
                              <h3 className="font-semibold flex items-center gap-2">
                                <Star className="h-4 w-4 text-amber-500" />
                                Rate {appointment.counsellorName}
                              </h3>
                              <p className="text-sm text-foreground/60">Score professionalism, helpfulness, and communication after your completed session.</p>
                            </div>
                            <div className="grid sm:grid-cols-3 gap-3">
                              <RatingSelect label="Professionalism" value={form.professionalism} onChange={(value) => updateReviewField(reviewingId, "professionalism", value)} />
                              <RatingSelect label="Helpfulness" value={form.helpfulness} onChange={(value) => updateReviewField(reviewingId, "helpfulness", value)} />
                              <RatingSelect label="Communication" value={form.communication} onChange={(value) => updateReviewField(reviewingId, "communication", value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Review comment</Label>
                              <Textarea rows={3} value={form.comment} onChange={(event) => updateReviewField(reviewingId, "comment", event.target.value)} placeholder="Share what went well or what should improve." />
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <Switch checked={form.anonymous} onCheckedChange={(checked) => updateReviewField(reviewingId, "anonymous", checked)} />
                                <span className="text-sm text-foreground/70">Post review anonymously</span>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setReviewingId(null)}>Cancel</Button>
                                <Button disabled={loading} onClick={() => submitReview(reviewingId)}>Submit Review</Button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>)}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>);
};

function RatingSelect({ label, value, onChange }) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Select value={String(value)} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 4, 3, 2, 1].map((rating) => (
              <SelectItem key={rating} value={String(rating)}>
                {rating} stars
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
}

export default ConfidentialBooking;
