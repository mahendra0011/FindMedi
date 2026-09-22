import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/mind/components/Navigation";
import Footer from "@/mind/components/Footer";
import { Button } from "@/mind/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Input } from "@/mind/components/ui/input";
import { Textarea } from "@/mind/components/ui/textarea";
import { Label } from "@/mind/components/ui/label";
import { useToast } from "@/mind/components/ui/use-toast";
import { api } from "@/mind/lib/api";
import { ArrowLeft, ClipboardList, Loader2, Shield } from "lucide-react";
import { sanitizeInput } from "@/mind/lib/sanitize";

const concernOptions = [
  "Stress", "Anxiety", "Depression", "Relationship issues", "Trauma",
  "Loneliness", "Exam pressure", "Career confusion", "Grief", "Anger management",
  "Self-esteem", "Sleep issues", "Family conflict", "Addiction", "Other",
];

export default function IntakeFormPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "", age: "", gender: "", occupation: "", contactPhone: "",
    emergencyContact: "", concerns: [], concernsDetail: "",
    previousTherapy: "", medicalHistory: "", medications: "", goals: "",
  });

  useEffect(() => {
    if (packageId) {
      setLoading(true);
      api.get(`/api/intake/${packageId}`)
        .then(({ data }) => { if (data.submitted) setSubmitted(true); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [packageId]);

  const toggleConcern = (c) => {
    setForm(prev => ({
      ...prev,
      concerns: prev.concerns.includes(c)
        ? prev.concerns.filter(x => x !== c)
        : [...prev.concerns, c],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast({ title: "Required", description: "Please enter your full name", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/intake/submit", {
        packageId, counsellorId: null,
        ...form,
        fullName: sanitizeInput(form.fullName),
        gender: sanitizeInput(form.gender),
        occupation: sanitizeInput(form.occupation),
        contactPhone: sanitizeInput(form.contactPhone),
        emergencyContact: sanitizeInput(form.emergencyContact),
        concernsDetail: sanitizeInput(form.concernsDetail),
        previousTherapy: sanitizeInput(form.previousTherapy),
        medicalHistory: sanitizeInput(form.medicalHistory),
        medications: sanitizeInput(form.medications),
        goals: sanitizeInput(form.goals),
        age: Number(form.age) || undefined,
      });
      if (data.success) {
        toast({ title: "Intake submitted", description: "You can now book your first session" });
        navigate(`/mind/session-schedule?packageId=${packageId}`);
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navigation />
      <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
      <Footer />
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navigation />
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <ClipboardList className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Intake Form Already Submitted</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">You've already completed your intake form for this package.</p>
        <Button onClick={() => navigate(`/mind/session-schedule?packageId=${packageId}`)}>Book Your First Session</Button>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <Card className="mb-6 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-purple-500" />
              Intake Form
            </CardTitle>
            <CardDescription>
              Please fill out this form before your first session. This helps your counsellor understand your background and needs. 
              All information is encrypted and confidential.
            </CardDescription>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full Name *</Label>
                <Input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Your full name" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Age</Label>
                  <Input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} placeholder="e.g. 25" />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Input value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} placeholder="e.g. Female, Male, Non-binary" />
                </div>
              </div>
              <div>
                <Label>Occupation</Label>
                <Input value={form.occupation} onChange={e => setForm(p => ({ ...p, occupation: e.target.value }))} placeholder="e.g. Student, Software engineer" />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={form.contactPhone} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))} placeholder="For emergency contact only" />
              </div>
              <div>
                <Label>Emergency Contact (optional)</Label>
                <Input value={form.emergencyContact} onChange={e => setForm(p => ({ ...p, emergencyContact: e.target.value }))} placeholder="Name and phone of emergency contact" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Your Concerns</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>What brings you here?</Label>
                <p className="text-xs text-slate-400 mb-2">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {concernOptions.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleConcern(c)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                        form.concerns.includes(c)
                          ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 text-purple-700 dark:text-purple-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Tell us more about your concerns</Label>
                <Textarea
                  value={form.concernsDetail}
                  onChange={e => setForm(p => ({ ...p, concernsDetail: e.target.value }))}
                  placeholder="Describe what you've been experiencing, how long, and any triggers..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Background</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Have you had therapy before?</Label>
                <Textarea
                  value={form.previousTherapy}
                  onChange={e => setForm(p => ({ ...p, previousTherapy: e.target.value }))}
                  placeholder="If yes, briefly describe your experience. If no, just say 'No'"
                  rows={2}
                />
              </div>
              <div>
                <Label>Medical History (relevant)</Label>
                <Textarea
                  value={form.medicalHistory}
                  onChange={e => setForm(p => ({ ...p, medicalHistory: e.target.value }))}
                  placeholder="Any relevant medical conditions, medications, or health history..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Current Medications</Label>
                <Textarea
                  value={form.medications}
                  onChange={e => setForm(p => ({ ...p, medications: e.target.value }))}
                  placeholder="List any medications you're currently taking (optional)"
                  rows={2}
                />
              </div>
              <div>
                <Label>What are your goals for counselling?</Label>
                <Textarea
                  value={form.goals}
                  onChange={e => setForm(p => ({ ...p, goals: e.target.value }))}
                  placeholder="What do you hope to achieve through our sessions?"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <Shield className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
            <p className="text-xs text-purple-600 dark:text-purple-400">
              Your responses are encrypted and confidential. This information will only be shared with your assigned counsellor 
              to provide you with the best care. By submitting, you consent to our data handling practices as per our Privacy Policy.
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Intake Form"}
            </Button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
