import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  BriefcaseBusiness,
  CalendarClock,
  Camera,
  Eye,
  EyeOff,
  FileCheck2,
  GraduationCap,
  HeartHandshake,
  IndianRupee,
  Languages,
  Link2,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  Video,
} from "lucide-react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { api } from "@/lib/api";
import { sanitizeInput } from "@/lib/sanitize";
import GlowPanel from "@/components/reactbits/GlowPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { registerUser } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const defaultCounsellorProfile = {
  requestedType: "mentor",
  bio: "",
  specialization: "",
  experience: "",
  languages: "",
  sessionPricing: "",
  location: "",
  consultationModes: ["google-meet", "in-person", "voice-call"],
  responseTime: "Within 24 hours",
  profilePhotoUrl: "",
  certificateLinks: "",
  linkedin: "",
  idDocumentType: "Government ID",
  idDocumentNumber: "",
  licenseNumber: "",
  education: "",
  categories: "Anxiety, Stress, Student Pressure",
  availability: "Mon 10:00-13:00, Wed 14:00-17:00",
  approach: "",
  emergencyTraining: "",
  referenceContact: "",
  verificationNotes: "",
};

const consultationModeOptions = [
  { id: "google-meet", label: "Google Meet", icon: Video },
  { id: "in-person", label: "In person", icon: MapPin },
  { id: "voice-call", label: "Voice call", icon: Phone },
];

const Signup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);
  const [role, setRole] = useState("user");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profile, setProfile] = useState(defaultCounsellorProfile);

  const setProfileField = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const toggleConsultationMode = (mode) => {
    setProfile((prev) => {
      const current = Array.isArray(prev.consultationModes) ? prev.consultationModes : [];
      const active = current.includes(mode);
      if (active && current.length === 1) return prev;
      return {
        ...prev,
        consultationModes: active ? current.filter((item) => item !== mode) : [...current, mode],
      };
    });
  };

  const uploadProfilePhoto = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please select an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Image must be 5 MB or smaller." });
      return;
    }
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      const { data: result } = await api.post("/api/upload/image", { image: dataUrl, folder: "profiles" });
      const url = result?.url || result?.secureUrl || "";
      if (!url) throw new Error("Upload returned no URL");
      setProfileField("profilePhotoUrl", url);
      toast({ title: "Photo uploaded" });
    } catch (error) {
      toast({ variant: "destructive", title: "Upload failed", description: error?.message || "Could not upload photo." });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast({ variant: "destructive", title: "Missing information", description: "Name, email, and password are required." });
      return;
    }
    if (password !== confirm) {
      toast({ variant: "destructive", title: "Password mismatch", description: "Passwords do not match." });
      return;
    }
    if (password.length < 8) {
      toast({ variant: "destructive", title: "Weak password", description: "Password must be at least 8 characters." });
      return;
    }
    if (!/[A-Z]/.test(password)) {
      toast({ variant: "destructive", title: "Weak password", description: "Password must include an uppercase letter." });
      return;
    }
    if (!/[a-z]/.test(password)) {
      toast({ variant: "destructive", title: "Weak password", description: "Password must include a lowercase letter." });
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast({ variant: "destructive", title: "Weak password", description: "Password must include a number." });
      return;
    }
    if (role === "counsellor") {
      const required = [
        ["Bio", profile.bio],
        ["Specialization", profile.specialization],
        ["Experience", profile.experience],
        ["Languages", profile.languages],
        ["Location", profile.location],
        ["Availability", profile.availability],
        ["ID verification", profile.idDocumentNumber],
      ];
      const missing = required.find(([, value]) => !String(value || "").trim());
      if (missing) {
        toast({ variant: "destructive", title: "Verification details needed", description: `${missing[0]} is required for counsellor or therapist approval.` });
        return;
      }
      if (!Number(profile.sessionPricing) || Number(profile.sessionPricing) < 1) {
        toast({ variant: "destructive", title: "Pricing required", description: "Enter an affordable base session price in rupees." });
        return;
      }
      if (!profile.consultationModes?.length) {
        toast({ variant: "destructive", title: "Mode required", description: "Select at least one counselling mode." });
        return;
      }
      if (profile.requestedType === "professional" && !profile.licenseNumber.trim()) {
        toast({ variant: "destructive", title: "License required", description: "Professional counsellors must provide a license or registration number." });
        return;
      }
    }

    try {
      const sanitizedProfile = role === "counsellor"
        ? Object.fromEntries(
            Object.entries(profile).map(([k, v]) => [k, typeof v === "string" ? sanitizeInput(v) : v])
          )
        : {};
      const result = await dispatch(
        registerUser({
          name: sanitizeInput(name),
          fullName: sanitizeInput(name),
          username: sanitizeInput(username),
          email: sanitizeInput(email),
          password,
          phone: sanitizeInput(phone),
          role,
          ...sanitizedProfile,
        })
      ).unwrap();
      if (result.approvalPending) {
        toast({ title: "Request sent", description: "Your counsellor account is pending admin approval." });
      } else {
        toast({ title: "Account created", description: "Welcome to your MindSupport dashboard." });
      }
      navigate("/dashboard");
    } catch (error) {
      toast({ variant: "destructive", title: "Signup failed", description: error?.message || "Please try again." });
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <section className="py-8 md:py-16 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="max-w-7xl mx-auto px-4">
            {/* Two-column wider layout */}
            <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8 items-start">
              {/* Left - Brand Panel */}
              <GlowPanel className="p-8 md:p-10 lg:sticky lg:top-24 min-h-[400px] flex flex-col justify-between">
                <div>
                  <div className="p-3 rounded-xl bg-gradient-primary w-fit mb-5">
                    <Brain className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                    Create your<br />
                    <span className="gradient-text">MindSupport account</span>
                  </h1>
                  <p className="mt-4 text-foreground/70 leading-relaxed max-w-md">
                    Join a supportive community. Book counselling sessions, track your wellness, journal privately, and connect with peers.
                  </p>
                  <div className="mt-8 grid gap-3">
                    <BenefitTile icon={Sparkles} title="Free to join" text="No hidden fees. Start your wellness journey today." />
                    <BenefitTile icon={ShieldCheck} title="Private & secure" text="Your data is encrypted and never shared without consent." />
                    <BenefitTile icon={HeartHandshake} title="Verified counsellors" text="Every professional is reviewed and approved by our team." />
                  </div>
                </div>
              </GlowPanel>

              {/* Right - Signup Card */}
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2.5 rounded-xl bg-gradient-primary">
                      <BadgeCheck className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Create your account</CardTitle>
                      <CardDescription>Fill in the details below to get started.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onSubmit} className="space-y-5">
                    {/* Account Type Selection */}
                    <div className="rounded-xl border border-glass-border/30 bg-background/50 p-4">
                      <Label className="text-sm font-semibold mb-3 block">Account type</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <RoleOption
                          active={role === "user"}
                          icon={UserRound}
                          title="User"
                          text="Book sessions, track mood, journal"
                          onClick={() => setRole("user")}
                        />
                        <RoleOption
                          active={role === "counsellor"}
                          icon={HeartHandshake}
                          title="Counsellor / Therapist"
                          text="Professional or mentor profile with approval"
                          onClick={() => setRole("counsellor")}
                        />
                      </div>
                    </div>

                    {/* Basic Fields */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Full name" value={name} onChange={setName} placeholder="Jane Doe" />
                      <Field label="Username" value={username} onChange={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="jane_support" />
                      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="jane@example.com" icon={Mail} />
                      <Field label="Phone" value={phone} onChange={setPhone} placeholder="+91 90000 00000" icon={Phone} />
                      <div className="space-y-1">
                        <PasswordField label="Password" value={password} onChange={setPassword} show={showPassword} setShow={setShowPassword} />
                        <p className="text-[11px] text-foreground/50 leading-relaxed px-1">Min 8 chars, with uppercase, lowercase &amp; number</p>
                      </div>
                      <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} show={showConfirm} setShow={setShowConfirm} />
                    </div>

                    {/* Divider when counsellor */}
                    {role === "counsellor" && (
                      <div className="relative my-2">
                        <Separator className="bg-border/50" />
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-foreground/50">
                          Counsellor details
                        </span>
                      </div>
                    )}

                    {/* Counsellor Fields */}
                    {role === "counsellor" && (
                      <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                        <FormSection
                          icon={Stethoscope}
                          title="Application type"
                          text="Choose how this profile should be reviewed and displayed after approval."
                        />
                        <div className="grid gap-3 md:grid-cols-2">
                          <TypeChoice
                            active={profile.requestedType === "mentor"}
                            title="Community Mentor"
                            badge="Peer support"
                            text="For lived-experience support such as stress recovery, loneliness, breakup recovery, or confidence building."
                            onClick={() => setProfileField("requestedType", "mentor")}
                          />
                          <TypeChoice
                            active={profile.requestedType === "professional"}
                            title="Licensed Therapist"
                            badge="Professional"
                            text="For psychologists, therapists, and licensed professionals. License or registration number is required."
                            onClick={() => setProfileField("requestedType", "professional")}
                          />
                        </div>

                        <FormSection icon={BriefcaseBusiness} title="Public profile" text="This information is shown to users after admin approval." />
                        <div className="grid md:grid-cols-2 gap-4">
                          <Field label="Specialization" value={profile.specialization} onChange={(value) => setProfileField("specialization", value)} placeholder="Anxiety, trauma, relationship therapy" />
                          <Field label="Experience" value={profile.experience} onChange={(value) => setProfileField("experience", value)} placeholder="6 years, peer recovery mentor" />
                          <Field label="Languages" value={profile.languages} onChange={(value) => setProfileField("languages", value)} placeholder="English, Hindi, Tamil" icon={Languages} />
                          <Field label="Location" value={profile.location} onChange={(value) => setProfileField("location", value)} placeholder="Mumbai, Maharashtra or Online" icon={MapPin} />
                          <Field label="Base session price (INR)" type="number" min="1" value={profile.sessionPricing} onChange={(value) => setProfileField("sessionPricing", value)} placeholder="500" icon={IndianRupee} />
                          <Field label="Categories" value={profile.categories} onChange={(value) => setProfileField("categories", value)} placeholder="Anxiety, Depression, Student Pressure" />
                        </div>
                        <TextField rows={4} label="Bio" value={profile.bio} onChange={(value) => setProfileField("bio", value)} placeholder="Write a warm, professional summary of your background, values, and the support you provide." />

                        <FormSection icon={CalendarClock} title="Availability and session modes" text="Users will use these details while booking sessions." />
                        <div className="grid md:grid-cols-2 gap-4">
                          <Field label="Availability" value={profile.availability} onChange={(value) => setProfileField("availability", value)} placeholder="Monday: 10:00-16:00, Friday: 09:00-14:00" />
                          <Field label="Response time" value={profile.responseTime} onChange={(value) => setProfileField("responseTime", value)} placeholder="Within 24 hours" />
                        </div>
                        <div className="space-y-2">
                          <Label>Counselling modes</Label>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {consultationModeOptions.map((mode) => (
                              <ModeChoice
                                key={mode.id}
                                active={profile.consultationModes.includes(mode.id)}
                                icon={mode.icon}
                                label={mode.label}
                                onClick={() => toggleConsultationMode(mode.id)}
                              />
                            ))}
                          </div>
                        </div>

                        <FormSection icon={FileCheck2} title="Verification details" text="Admin uses these fields to approve, reject, or request more information." />
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>ID document type</Label>
                            <Select value={profile.idDocumentType} onValueChange={(value) => setProfileField("idDocumentType", value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Government ID">Government ID</SelectItem>
                                <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                                <SelectItem value="Passport">Passport</SelectItem>
                                <SelectItem value="Driving License">Driving License</SelectItem>
                                <SelectItem value="Professional Registration">Professional Registration</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Field label="ID verification number" value={profile.idDocumentNumber} onChange={(value) => setProfileField("idDocumentNumber", value)} placeholder="Masked ID or verification reference" />
                          <Field label="License / registration number" value={profile.licenseNumber} onChange={(value) => setProfileField("licenseNumber", value)} placeholder={profile.requestedType === "professional" ? "Required for professionals" : "Optional for mentors"} />
                          <Field label="Education / training" value={profile.education} onChange={(value) => setProfileField("education", value)} placeholder="MA Psychology, counselling diploma, peer support training" icon={GraduationCap} />
                          <Field label="LinkedIn / portfolio" value={profile.linkedin} onChange={(value) => setProfileField("linkedin", value)} placeholder="https://linkedin.com/in/..." icon={Link2} />
                          <div>
                            <label className="text-sm font-medium">Profile photo</label>
                            <div className="mt-2 flex items-center gap-3">
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/20 text-lg font-bold text-primary shadow">
                                {profile.profilePhotoUrl ? (
                                  <img src={profile.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <UserRound className="h-6 w-6" />
                                )}
                              </div>
                              <div className="flex-1">
                                <input
                                  type="file"
                                  accept="image/*"
                                  ref={photoInputRef}
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadProfilePhoto(file);
                                    e.target.value = "";
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => photoInputRef.current?.click()}
                                  disabled={uploadingPhoto}
                                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-glass-border/40 bg-background/60 px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-foreground/10 disabled:opacity-50"
                                >
                                  <Camera className="h-4 w-4" />
                                  {uploadingPhoto ? "Uploading..." : "Upload photo"}
                                </button>
                                <p className="mt-1 text-xs text-foreground/50">JPG, PNG, or WebP. Max 5 MB.</p>
                              </div>
                            </div>
                            {profile.profilePhotoUrl && (
                              <div className="mt-1.5 text-xs text-emerald-500/80 truncate">{profile.profilePhotoUrl}</div>
                            )}
                          </div>
                          <Field label="Certificates / document links" value={profile.certificateLinks} onChange={(value) => setProfileField("certificateLinks", value)} placeholder="Comma-separated links" />
                          <Field label="Reference contact" value={profile.referenceContact} onChange={(value) => setProfileField("referenceContact", value)} placeholder="Email or phone of reference" />
                        </div>

                        <FormSection icon={ShieldAlert} title="Safety and approach" text="Mental health support needs clear boundaries and escalation readiness." />
                        <div className="grid md:grid-cols-2 gap-4">
                          <TextField rows={4} label="Therapy / support approach" value={profile.approach} onChange={(value) => setProfileField("approach", value)} placeholder="CBT-informed, trauma-aware, peer support boundaries, referrals when needed." />
                          <TextField rows={4} label="Emergency training" value={profile.emergencyTraining} onChange={(value) => setProfileField("emergencyTraining", value)} placeholder="Crisis response training, suicide prevention training, or escalation process." />
                        </div>
                        <TextField rows={3} label="Verification notes" value={profile.verificationNotes} onChange={(value) => setProfileField("verificationNotes", value)} placeholder="Anything admin should know while reviewing your identity, documents, or profile." />
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button type="submit" className="w-full gap-2 h-12 text-base font-semibold" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : role === "counsellor" ? (
                        <>
                          Send approval request
                          <ArrowRight className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Create user account
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Divider */}
                  <div className="relative my-6">
                    <Separator className="bg-border/50" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-foreground/50">
                      Or sign up with
                    </span>
                  </div>

                  {/* Google Signup Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-3 h-12"
                    onClick={() => {
                      const apiBase = import.meta.env.VITE_API_BASE_URL || "";
                      window.location.href = `${apiBase}/api/auth/google`;
                    }}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Sign up with Google
                  </Button>

                  <p className="text-xs text-foreground/70 mt-4 text-center leading-relaxed">
                    By signing up, you understand MindSupport provides emotional support and is not emergency medical care.
                  </p>
                  <p className="text-sm text-foreground/70 mt-5 text-center">
                    Already registered?{" "}
                    <Link to="/login" className="text-primary font-medium hover:underline">
                      Sign in
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function BenefitTile({ icon: Icon, title, text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-primary/15 p-2 text-primary shrink-0 mt-0.5">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="font-semibold text-sm text-foreground">{title}</div>
        <p className="text-xs text-foreground/65 mt-0.5">{text}</p>
      </div>
    </div>
  );
}

function RoleOption({ active, icon: Icon, title, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 sm:p-4 text-left transition-all duration-300 ${
        active ? "border-primary bg-primary/10 shadow-glow" : "border-glass-border/40 bg-background/70 hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${active ? "bg-primary/20" : "bg-foreground/10"}`}>
          <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-foreground/60"}`} />
        </div>
        <div>
          <div className="font-semibold text-sm">{title}</div>
          <p className="text-xs text-foreground/65 mt-0.5 leading-relaxed hidden sm:block">{text}</p>
        </div>
      </div>
    </button>
  );
}

function TypeChoice({ active, title, badge, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all duration-300 ${
        active ? "border-primary bg-primary/10 text-foreground" : "border-glass-border/35 bg-background/45 hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">{title}</div>
        <Badge className={active ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-foreground/75"}>{badge}</Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-foreground/70">{text}</p>
    </button>
  );
}

function ModeChoice({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
        active ? "border-primary bg-primary/15 text-primary" : "border-glass-border/35 bg-background/45 text-foreground/75 hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function FormSection({ icon: Icon, title, text }) {
  return (
    <div className="border-t border-glass-border/35 pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-2.5 text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-foreground/65 leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", icon: Icon, ...inputProps }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {Icon && <Icon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />}
        <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={Icon ? "pl-9 h-10" : "h-10"} {...inputProps} />
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, setShow }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyhole className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="••••••••"
          className="pl-9 pr-10 h-10"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = "", rows = 5 }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="resize-y" />
    </div>
  );
}

export default Signup;