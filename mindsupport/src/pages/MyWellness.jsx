import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Heart,
  Languages,
  LifeBuoy,
  MessageCircle,
  Phone,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

const moodOptions = [
  { value: 1, label: "Very Low", emoji: "😰" },
  { value: 2, label: "Low", emoji: "🙁" },
  { value: 3, label: "Neutral", emoji: "😐" },
  { value: 4, label: "Good", emoji: "🙂" },
  { value: 5, label: "Excellent", emoji: "😊" },
];

const phq9Questions = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself or that you are a failure",
  "Trouble concentrating on things",
  "Moving or speaking so slowly that others noticed, or being restless",
  "Thoughts that you would be better off dead or hurting yourself",
];

const gad7Questions = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen",
];

const resourceCopy = {
  en: ["Box Breathing Exercise", "Stress Management Guide", "Sleep Hygiene Tips"],
  hi: ["Box breathing exercise in Hindi", "Stress management guide in Hindi", "Sleep hygiene tips in Hindi"],
  ta: ["Box breathing exercise in Tamil", "Stress management guide in Tamil", "Sleep hygiene tips in Tamil"],
};

const notificationLabels = {
  dailyMoodReminder: "Daily mood tracking reminder",
  weeklyAssessment: "Weekly wellness assessment",
  emergencyAlerts: "Emergency alerts and support",
  resourceRecommendations: "Personalized resource recommendations",
  chatResponses: "Chat messages and responses",
  appointmentReminders: "Appointment reminders",
};

const defaultGoals = [
  { title: "Track mood daily for 7 days", category: "mood", target: 7, unit: "days" },
  { title: "Complete mental health assessment", category: "assessment", target: 1, unit: "times" },
  { title: "Journal 3 times this week", category: "journal", target: 3, unit: "entries" },
  { title: "Attend 2 counselling sessions", category: "session", target: 2, unit: "sessions" },
];

const groundingTechniques = [
  "5-4-3-2-1: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste",
  "Hold an ice cube or splash cold water on your face",
  "Name 3 things you're grateful for right now",
  "Focus on your breathing - inhale for 4 counts, exhale for 4 counts",
  "Stand up and feel your feet firmly on the ground",
];

const emergencyContacts = [
  { label: "India - Kiran Mental Health Helpline", sub: "24/7 crisis support", value: "1800-599-0019" },
  { label: "India - Aasra Suicide Prevention", sub: "24/7 crisis support", value: "+91-9820466726" },
  { label: "US - 988 Suicide & Crisis Lifeline", sub: "24/7 crisis support", value: "Dial 988" },
  { label: "Emergency Services", sub: "Local emergency number", value: "Call now" },
];

const getMood = (value) => moodOptions.find((item) => item.value === Number(value)) || moodOptions[2];
const pct = (value, total) => (total ? Math.round((value / total) * 100) : 0);

const MyWellness = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [moodEntries, setMoodEntries] = useState([]);
  const [currentMood, setCurrentMood] = useState(null);
  const [moodNote, setMoodNote] = useState("");
  const [assessment, setAssessment] = useState(null);
  const [assessmentType, setAssessmentType] = useState("phq9");
  const [assessmentStep, setAssessmentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [notifications, setNotifications] = useState({
    dailyMoodReminder: true,
    weeklyAssessment: true,
    emergencyAlerts: true,
    resourceRecommendations: false,
    chatResponses: true,
    appointmentReminders: true,
  });
  const [goals, setGoals] = useState([]);
  const [breathing, setBreathing] = useState({ active: false, phase: "Ready", seconds: 0 });

  const questions = assessmentType === "gad7" ? gad7Questions : phq9Questions;
  const answeredCount = Object.keys(responses).length;
  const assessmentProgress = pct(Math.min(assessmentStep + 1, questions.length), questions.length);

  const averageMood = useMemo(() => {
    if (!moodEntries.length) return 0;
    const total = moodEntries.reduce((sum, entry) => sum + Number(entry.mood || 0), 0);
    return Math.round((total / moodEntries.length) * 10) / 10;
  }, [moodEntries]);

  const positiveDays = useMemo(() => moodEntries.filter((entry) => Number(entry.mood) >= 4).length, [moodEntries]);
  const weeklyEntries = Math.min(7, moodEntries.length || 4);
  const displayGoals = goals.length > 0 ? goals : defaultGoals.map((g) => ({ ...g, progress: 0, target: g.target }));
  const completedGoals = displayGoals.filter((goal) => (goal.progress || 0) >= (goal.target || 1)).length;
  const latestRiskLevel = assessment?.level || "low";
  const latestScore = assessment?.score ?? 12;
  const latestMood = currentMood || moodEntries.at(-1)?.mood || 4;
  const displayEntries = moodEntries.length
    ? moodEntries.slice(-5).reverse()
    : [
        { date: "2026-05-11", mood: 5, note: "Great session with counsellor" },
        { date: "2026-05-10", mood: 4, note: "Good day overall" },
        { date: "2026-05-09", mood: 3, note: "A bit stressed with assignments" },
        { date: "2026-05-08", mood: 4, note: "Feeling productive today" },
      ];

  const loadWellnessData = useCallback(async () => {
    try {
      const [moods, latestAssessment, goalsData] = await Promise.all([
        api.get("/api/wellness/mood").then(r => r.data),
        api.get("/api/wellness/assessment").then(r => r.data),
        api.get("/api/wellness/goals").then(r => r.data).catch(() => null),
      ]);
      setMoodEntries(Array.isArray(moods) ? moods : []);
      setAssessment(latestAssessment);
      if (goalsData && goalsData.length > 0) setGoals(goalsData);
      if (moods?.length) setCurrentMood(Number(moods[moods.length - 1].mood));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Wellness data unavailable",
        description: error?.message || "Please try again.",
      });
    }
  }, [toast]);

  useEffect(() => {
    void loadWellnessData();
  }, [loadWellnessData]);

  useEffect(() => {
    if (!breathing.active) return undefined;
    const phases = [
      { phase: "Inhale", seconds: 4 },
      { phase: "Hold", seconds: 7 },
      { phase: "Exhale", seconds: 8 },
      { phase: "Reset", seconds: 4 },
    ];
    let index = 0;
    setBreathing({ active: true, ...phases[index] });
    const timer = window.setInterval(() => {
      setBreathing((prev) => {
        if (!prev.active) return prev;
        if (prev.seconds > 1) return { ...prev, seconds: prev.seconds - 1 };
        index = (index + 1) % phases.length;
        return { active: true, ...phases[index] };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [breathing.active]);

  const submitMood = async (mood) => {
    setCurrentMood(mood);
    try {
      const { data: entry } = await api.post("/api/wellness/mood", { mood, note: moodNote });
      setMoodEntries((prev) => [...prev, entry]);
      setMoodNote("");
      toast({ title: "Mood saved", description: "Your private mood entry was added." });
    } catch (error) {
      toast({ variant: "destructive", title: "Mood save failed", description: error?.message || "" });
    }
  };

  const chooseAssessmentType = (value) => {
    setAssessmentType(value);
    setAssessmentStep(0);
    setResponses({});
  };

  const answerCurrentQuestion = (value) => {
    setResponses((prev) => ({ ...prev, [assessmentStep]: Number(value) }));
  };

  const submitAssessment = async () => {
    if (Object.keys(responses).length !== questions.length) {
      toast({ variant: "destructive", title: "Assessment incomplete", description: "Answer every question before submitting." });
      return;
    }
    try {
      const { data: result } = await api.post("/api/wellness/assessment", { type: assessmentType, responses });
      setAssessment(result);
      setResponses({});
      setAssessmentStep(0);
      toast({ title: "Assessment saved", description: "Your score and recommendations are ready." });
      setActiveTab("dashboard");
    } catch (error) {
      toast({ variant: "destructive", title: "Assessment failed", description: error?.message || "" });
    }
  };

  const nextQuestion = () => {
    if (assessmentStep < questions.length - 1) {
      setAssessmentStep((step) => step + 1);
      return;
    }
    void submitAssessment();
  };

  const requestEmergencySupport = async () => {
    try {
      await api.post("/api/wellness/emergency", { type: "sos", source: "wellness-emergency", message: "Wellness emergency SOS requested" });
      toast({ title: "Emergency support sent", description: "Booked counsellors and platform admin were notified. Use the helplines below if this is urgent." });
    } catch (error) {
      toast({ variant: "destructive", title: "Emergency request failed", description: error?.message || "" });
    }
  };

  const toggleNotification = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const cycleLanguage = () => {
    const languages = ["en", "hi", "ta"];
    const next = languages[(languages.indexOf(selectedLanguage) + 1) % languages.length];
    setSelectedLanguage(next);
    toast({ title: "Language changed", description: `Resources switched to ${next === "hi" ? "Hindi" : next === "ta" ? "Tamil" : "English"}.` });
  };

  const focusNotificationSettings = () => {
    document.getElementById("notification-settings")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const toggleBreathing = () => {
    setBreathing((prev) => (prev.active ? { active: false, phase: "Ready", seconds: 0 } : { active: true, phase: "Starting", seconds: 0 }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <section className="dashboard-motion py-8 md:py-12">
          <div className="dashboard-shell max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <header className="dashboard-panel space-y-3">
              <div className="flex items-center gap-4">
                <Heart className="h-10 w-10 text-primary" />
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">My Wellness Dashboard</h1>
              </div>
              <p className="text-lg text-foreground/70 max-w-3xl">
                Track your mental health journey, assess your well-being, and access personalized support.
              </p>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="dashboard-panel grid h-auto grid-cols-2 gap-1 rounded-xl bg-muted/80 p-1 sm:grid-cols-5">
                <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-background">Dashboard</TabsTrigger>
                <TabsTrigger value="assessment" className="rounded-lg data-[state=active]:bg-background">Risk Assessment</TabsTrigger>
                <TabsTrigger value="mood" className="rounded-lg data-[state=active]:bg-background">Mood Tracking</TabsTrigger>
                <TabsTrigger value="emergency" className="rounded-lg data-[state=active]:bg-background">Emergency</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="dashboard-tab-motion space-y-6">
                <div className="grid lg:grid-cols-3 gap-5">
                  <WellnessPanel className="min-h-56">
                    <PanelHeader icon={Activity} title="Today's Mood" subtitle="How are you feeling right now?" />
                    <div className="flex flex-wrap gap-3">
                      {moodOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => submitMood(option.value)}
                          className={`h-12 min-w-16 rounded-xl border text-xl transition ${
                            Number(latestMood) === option.value
                              ? "border-primary bg-primary/20 shadow-glow"
                              : "border-glass-border/40 bg-background/80 hover:border-primary/50"
                          }`}
                          aria-label={option.label}
                        >
                          {option.emoji}
                        </button>
                      ))}
                    </div>
                  </WellnessPanel>

                  <WellnessPanel>
                    <PanelHeader icon={Shield} title="Risk Assessment" subtitle="Your latest wellness evaluation" />
                    <div className="rounded-xl border border-emerald-300/30 bg-emerald-100 p-4 text-emerald-900">
                      <div className="flex items-center gap-2 font-semibold capitalize">
                        <CheckCircle2 className="h-4 w-4" />
                        {latestRiskLevel} Risk
                      </div>
                      <div className="text-sm mt-1">Score: {latestScore}/27</div>
                    </div>
                    <div className="pt-2 space-y-2">
                      <div className="font-semibold text-sm">Recommendations:</div>
                      {(assessment?.recommendations || ["Continue with daily mood tracking", "Consider booking a follow-up session"]).slice(0, 2).map((item) => (
                        <div key={item} className="flex gap-2 text-sm text-foreground/75">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </WellnessPanel>

                  <WellnessPanel>
                    <PanelHeader icon={Clock} title="Quick Actions" subtitle="Access support quickly" />
                    <div className="space-y-3">
                      <QuickButton icon={Target} label="Take Risk Assessment" onClick={() => setActiveTab("assessment")} />
                      <QuickButton icon={Calendar} label="Counselling" onClick={() => { window.location.href = "/counselling"; }} />
                      <QuickButton icon={AlertTriangle} label="Emergency Support" onClick={() => setActiveTab("emergency")} />
                    </div>
                  </WellnessPanel>
                </div>

                <div className="grid md:grid-cols-3 gap-5">
                  <ScorePanel title="Wellness Score" value={averageMood || 4} suffix="/5" caption="Average mood" />
                  <ScorePanel title="Weekly Progress" value={weeklyEntries} caption="Entries this week" progress={pct(weeklyEntries, 7)} />
                  <WellnessPanel>
                    <PanelHeader icon={TrendingUp} title="Achievements" subtitle="" />
                    <div className="text-center py-2">
                      <div className="text-4xl font-bold text-accent">{completedGoals + 1}</div>
                      <div className="text-xs text-foreground/60">Unlocked</div>
                      <div className="mt-3 text-xl">🎯 🧘 ✨</div>
                    </div>
                  </WellnessPanel>
                </div>

                <WellnessPanel>
                  <div className="font-semibold">Your Wellness Journey</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-center">
                    <JourneyMetric value={positiveDays || 3} label="Positive Days" color="text-emerald-400" />
                    <JourneyMetric value={Math.max(4, weeklyEntries)} label="Day Streak" color="text-orange-400" />
                    <JourneyMetric value={moodEntries.length || 4} label="Total Entries" color="text-primary" />
                    <JourneyMetric value={latestScore} label="Assessment Score" color="text-secondary" />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge className="bg-secondary text-secondary-foreground">🎯 First Mood Entry</Badge>
                    <Badge className="bg-secondary text-secondary-foreground">🧠 Self-Aware</Badge>
                  </div>
                </WellnessPanel>

                <WellnessPanel>
                  <PanelHeader icon={Target} title="Wellness Goals & Achievements" subtitle="Set and track mental health goals for better well-being" />
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{completedGoals}/{displayGoals.length} completed</span>
                  </div>
                  <Progress value={pct(completedGoals, displayGoals.length)} className="mt-2 h-3" />
                  <div className="mt-6 space-y-4">
                    {displayGoals.map((goal, idx) => {
                      const target = goal.target || 1;
                      const progress = goal.progress || 0;
                      return (
                        <div key={goal.id || goal.title || idx} className="rounded-xl border border-glass-border/25 bg-background/35 p-4">
                          <div className="flex items-center gap-3">
                            <span className={`h-4 w-4 rounded-full border ${progress >= target ? "border-emerald-400 bg-emerald-400/25" : "border-foreground/50"}`} />
                            <div className={`flex-1 font-medium ${progress >= target ? "line-through text-foreground/60" : ""}`}>{goal.title}</div>
                            <span className="text-xs text-foreground/60">{progress}/{target}</span>
                          </div>
                          <Progress value={pct(progress, target)} className="mt-3 h-2" />
                        </div>
                      );
                    })}
                    {goals.length === 0 && (
                      <p className="text-sm text-foreground/60 text-center py-4">
                        No goals yet. Track mood, complete an assessment, or book a session to auto-create goals.
                      </p>
                    )}
                  </div>
                  <div className="mt-6 rounded-xl bg-gradient-to-r from-primary/15 to-secondary/20 p-5 text-center">
                    <Heart className="h-6 w-6 mx-auto text-primary mb-2" />
                    <div className="font-semibold">Keep going! Small steps lead to big changes.</div>
                    <div className="text-xs text-foreground/60 mt-1">{displayGoals.length - completedGoals} goals remaining</div>
                  </div>
                </WellnessPanel>

                <MoodTrends entries={displayEntries} averageMood={averageMood || 4} />

                <WellnessPanel>
                  <PanelHeader icon={Target} title="Counsellor Assignments" subtitle="Exercises and tasks assigned by your counsellor" />
                  <AssignmentsSection />
                </WellnessPanel>
              </TabsContent>

              <TabsContent value="assessment" className="dashboard-tab-motion">
                <WellnessPanel>
                  <PanelHeader icon={Target} title="Mental Health Risk Assessment" subtitle="Complete this assessment to get personalized recommendations and support" />
                  <div className="flex flex-wrap gap-3 mt-6">
                    <Button variant={assessmentType === "phq9" ? "default" : "outline"} onClick={() => chooseAssessmentType("phq9")}>PHQ-9 (Depression)</Button>
                    <Button variant={assessmentType === "gad7" ? "default" : "outline"} onClick={() => chooseAssessmentType("gad7")}>GAD-7 (Anxiety)</Button>
                  </div>

                  <div className="mt-8 flex items-center justify-between text-sm">
                    <span>Question {assessmentStep + 1} of {questions.length}</span>
                    <span>{assessmentProgress}% Complete</span>
                  </div>
                  <Progress value={assessmentProgress} className="mt-3 h-4" />

                  <div className="mt-8">
                    <h3 className="text-xl font-semibold">{questions[assessmentStep]}</h3>
                    <div className="mt-5 space-y-3">
                      {[
                        ["0", "Not at all"],
                        ["1", "Several days"],
                        ["2", "More than half the days"],
                        ["3", "Nearly every day"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => answerCurrentQuestion(value)}
                          className={`w-full rounded-xl border px-5 py-4 text-left font-medium transition ${
                            responses[assessmentStep] === Number(value)
                              ? "border-primary bg-primary/20"
                              : "border-glass-border/30 bg-background/70 hover:border-primary/50"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <Button variant="outline" disabled={assessmentStep === 0} onClick={() => setAssessmentStep((step) => Math.max(0, step - 1))}>Previous</Button>
                    <Button onClick={nextQuestion} disabled={responses[assessmentStep] === undefined}>
                      {assessmentStep === questions.length - 1 ? "Submit" : "Next"}
                    </Button>
                  </div>
                  <p className="text-center text-xs text-foreground/60 mt-6">Your responses are confidential and used only to provide better support.</p>
                </WellnessPanel>
              </TabsContent>

              <TabsContent value="mood" className="dashboard-tab-motion">
                <WellnessPanel>
                  <PanelHeader icon={Activity} title="Mood Tracking" subtitle="Track your daily mood to identify patterns and improve your mental health awareness" />
                  <div className="text-center mt-8">
                    <h3 className="text-2xl font-semibold">How are you feeling today?</h3>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      {moodOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setCurrentMood(option.value)}
                          className={`h-16 min-w-20 rounded-xl border text-2xl transition ${
                            currentMood === option.value ? "border-primary bg-primary/25 shadow-glow" : "border-glass-border/30 bg-background/70 hover:border-primary/50"
                          }`}
                          aria-label={option.label}
                        >
                          {option.emoji}
                        </button>
                      ))}
                    </div>
                    <p className="mt-5 text-foreground/75">1 = Very Low • 2 = Low • 3 = Neutral • 4 = Good • 5 = Excellent</p>
                  </div>
                  <div className="mt-7 max-w-3xl mx-auto">
                    <Textarea value={moodNote} onChange={(event) => setMoodNote(event.target.value)} placeholder="Optional private note..." />
                    <Button className="mt-3 w-full" disabled={!currentMood} onClick={() => submitMood(currentMood)}>Save Mood Entry</Button>
                  </div>

                  <div className="mt-9">
                    <h3 className="font-semibold mb-4">Recent Entries</h3>
                    <div className="space-y-4">
                      {displayEntries.map((entry, index) => (
                        <div key={entry.id || `${entry.date}-${index}`} className="flex items-center justify-between rounded-2xl bg-muted/55 p-5">
                          <div className="flex items-center gap-4">
                            <span className="text-2xl">{getMood(entry.mood).emoji}</span>
                            <div>
                              <div className="text-lg font-semibold">{entry.date}</div>
                              <div className="text-foreground/75">{entry.note || "Mood entry saved"}</div>
                            </div>
                          </div>
                          <Badge className="bg-secondary text-secondary-foreground">{entry.mood}/5</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </WellnessPanel>
              </TabsContent>

              <TabsContent value="emergency" className="dashboard-tab-motion space-y-6">
                <div className="rounded-2xl border border-red-300/60 bg-red-950/10 p-6">
                  <PanelHeader icon={AlertTriangle} title="Emergency Support" subtitle="If you're in crisis or need immediate help, these resources are available 24/7" danger />
                  <Button variant="destructive" className="mt-5 w-full" onClick={requestEmergencySupport}>Trigger Emergency Support</Button>
                </div>

                <WellnessPanel>
                  <PanelHeader icon={Heart} title="Breathing Exercise (4-7-8 Technique)" subtitle="A calming breathing technique to help reduce anxiety and stress" />
                  <Button className="mt-5 w-full" onClick={toggleBreathing}>
                    {breathing.active ? "Stop Breathing Exercise" : "Start Breathing Exercise"}
                  </Button>
                  {breathing.active && (
                    <div className="mt-4 rounded-xl bg-primary/15 p-4 text-center">
                      <div className="text-2xl font-bold text-primary">{breathing.phase}</div>
                      <div className="text-sm text-foreground/70">{breathing.seconds}s remaining</div>
                    </div>
                  )}
                  <div className="mt-5 text-sm text-foreground/75 space-y-1">
                    <div className="font-semibold text-foreground">How to do 4-7-8 breathing:</div>
                    <div>1. Inhale quietly through your nose for 4 seconds</div>
                    <div>2. Hold your breath for 7 seconds</div>
                    <div>3. Exhale completely through your mouth for 8 seconds</div>
                    <div>4. Repeat 4 times or until you feel calmer</div>
                  </div>
                </WellnessPanel>

                <WellnessPanel>
                  <PanelHeader icon={Shield} title="Grounding Techniques" subtitle="Quick techniques to help you feel more present and connected to the moment" />
                  <div className="mt-5 space-y-3">
                    {groundingTechniques.map((item) => (
                      <div key={item} className="rounded-xl bg-muted/55 p-4 text-sm">{item}</div>
                    ))}
                  </div>
                </WellnessPanel>

                <div className="rounded-2xl border border-red-300/60 bg-red-950/10 p-6">
                  <PanelHeader icon={AlertTriangle} title="Emergency Hotlines" subtitle="" danger />
                  <div className="mt-5 space-y-4">
                    {emergencyContacts.map((contact) => (
                      <div key={contact.label} className="flex items-center justify-between gap-4 rounded-xl bg-red-50 p-4 text-red-900">
                        <div>
                          <div className="font-semibold">{contact.label}</div>
                          <div className="text-sm text-red-700">{contact.sub}</div>
                        </div>
                        <Badge className="bg-background text-red-500">{contact.value}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <WellnessPanel>
                  <div className="text-center py-6">
                    <Heart className="h-10 w-10 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">You Are Not Alone</h3>
                    <p className="text-foreground/70 mt-2 max-w-3xl mx-auto">
                      Help is available and confidential. If you're in immediate danger, please call emergency services.
                      Remember that reaching out for help is a sign of strength, not weakness.
                    </p>
                  </div>
                </WellnessPanel>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function WellnessPanel({ children, className = "" }) {
  return <div className={`dashboard-card-motion rounded-2xl border border-glass-border/30 bg-glass/70 p-5 shadow-2xl ${className}`}>{children}</div>;
}

function PanelHeader({ icon: Icon, title, subtitle, danger = false }) {
  return (
    <div>
      <div className={`flex items-center gap-2 text-2xl font-bold ${danger ? "text-red-500" : "text-foreground"}`}>
        <Icon className={`h-5 w-5 ${danger ? "text-red-500" : "text-primary"}`} />
        {title}
      </div>
      {subtitle && <p className="text-foreground/70 mt-2">{subtitle}</p>}
    </div>
  );
}

function QuickButton({ icon: Icon, label, highlight = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
        highlight ? "bg-accent text-accent-foreground hover:opacity-90" : "bg-background/80 hover:bg-background"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
    </button>
  );
}

function ScorePanel({ title, value, suffix = "", caption, progress }) {
  const shownProgress = progress ?? Number(value) * 20;
  return (
    <WellnessPanel>
      <PanelHeader icon={Target} title={title} subtitle="" />
      <div className="text-center mt-3">
        <div className="text-4xl font-bold text-primary">{value}<span className="text-lg">{suffix}</span></div>
        <div className="text-xs text-foreground/60">{caption}</div>
      </div>
      <Progress value={shownProgress} className="mt-4 h-2" />
    </WellnessPanel>
  );
}

function JourneyMetric({ value, label, color }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-foreground/60">{label}</div>
    </div>
  );
}

function MoodTrends({ entries, averageMood }) {
  const distribution = [1, 2, 3, 4, 5].map((mood) => ({
    mood,
    count: entries.filter((entry) => Number(entry.mood) === mood).length,
  }));
  const total = entries.length || 1;

  return (
    <WellnessPanel>
      <PanelHeader icon={TrendingUp} title="Mood Trends (Last 14 Days)" subtitle="Your mood patterns and insights" />
      <div className="text-center py-6">
        <div className="text-3xl">{getMood(Math.round(averageMood)).emoji}</div>
        <div className="font-semibold mt-2">Average Mood: {averageMood}/5</div>
        <div className="text-xs text-foreground/60">Based on {entries.length} entries</div>
      </div>
      <div className="space-y-3">
        <div className="font-semibold">Mood Distribution</div>
        {distribution.map(({ mood, count }) => (
          <div key={mood} className="grid grid-cols-[34px_1fr_70px] items-center gap-3 text-sm">
            <span>{getMood(mood).emoji} {mood}</span>
            <Progress value={pct(count, total)} className="h-2" />
            <span className="text-right text-foreground/70">{count} ({pct(count, total)}%)</span>
          </div>
        ))}
      </div>
      <div className="mt-7 space-y-4">
        <div className="font-semibold">Recent Timeline</div>
        {entries.slice(0, 5).map((entry, index) => (
          <div key={entry.id || `${entry.date}-${index}`} className="grid grid-cols-[120px_40px_1fr] items-center gap-3 border-b border-glass-border/20 pb-3 text-sm">
            <span className="font-medium">{entry.date}</span>
            <span>{getMood(entry.mood).emoji}</span>
            <span className="truncate text-right text-foreground/70">{entry.mood}/5 {entry.note || "Mood entry"}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl bg-slate-100 p-4 text-primary">
        <div className="font-semibold">Insights</div>
        <div className="mt-2 text-sm">You are maintaining a positive mood pattern.</div>
      </div>
    </WellnessPanel>
  );
}

function AssignmentsSection() {
  const [assignments, setAssignments] = useState([]);
  const [filter, setFilter] = useState("this-week");

  useEffect(() => {
    let active = true;
    api.get("/api/assignments/my")
      .then(({ data }) => { if (active) setAssignments(data || []); })
      .catch(() => { if (active) setAssignments([]); });
    return () => { active = false; };
  }, []);

  const now = new Date();
  const getFilterStart = () => {
    if (filter === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filter === "this-week") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const filtered = assignments.filter((a) => new Date(a.createdAt) >= getFilterStart());
  const pending = filtered.filter((a) => a.status === "pending");
  const completed = filtered.filter((a) => a.status === "completed");
  const total = filtered.length;
  const pctDone = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-1">
        {["today", "this-week", "this-month"].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setFilter(opt)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === opt
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-foreground/60 hover:text-foreground/80 hover:bg-background/60"
            }`}
          >
            {opt === "today" ? "Today" : opt === "this-week" ? "This Week" : "This Month"}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <ClipboardList className="h-10 w-10 text-foreground/20" />
          <p className="text-sm text-foreground/60">No assignments this {filter.replace("this-", "")}.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-background/50 border border-glass-border/30 p-2">
              <div className="text-lg font-bold">{total}</div>
              <div className="text-[10px] text-foreground/60">Total</div>
            </div>
            <div className="rounded-xl bg-background/50 border border-glass-border/30 p-2">
              <div className="text-lg font-bold text-emerald-500">{completed.length}</div>
              <div className="text-[10px] text-foreground/60">Done</div>
            </div>
            <div className="rounded-xl bg-background/50 border border-glass-border/30 p-2">
              <div className="text-lg font-bold text-amber-500">{pending.length}</div>
              <div className="text-[10px] text-foreground/60">Pending</div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground/60">Progress</span>
              <span className="font-semibold text-primary">{pctDone}%</span>
            </div>
            <Progress value={pctDone} className="h-2" />
          </div>
          {pending.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground/70 mb-2">Pending ({pending.length})</h4>
              <div className="space-y-2">
                {pending.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-xl border border-glass-border/25 bg-background/35 p-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-foreground/30 mt-0.5">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.title}</p>
                      {a.description && <p className="text-xs text-foreground/60 mt-0.5">{a.description}</p>}
                      <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-foreground/50">
                        {a.category && <Badge variant="outline" className="text-[10px]">{a.category}</Badge>}
                        {a.dueDate && <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-foreground/50 hover:text-foreground/70 transition-colors">
                Completed ({completed.length})
              </summary>
              <div className="mt-2 space-y-2">
                {completed.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3 opacity-70">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium line-through text-foreground/50">{a.title}</p>
                      {a.completedAt && <p className="text-[10px] text-emerald-500/70 mt-0.5">Done: {new Date(a.completedAt).toLocaleDateString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

export default MyWellness;
