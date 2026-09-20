import { useEffect, useMemo, useRef, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { BookOpen, Filter, Languages, Search, Video, FileText, Bookmark, Headphones, Play, Pause, Clock, ChevronDown, ChevronUp, Sparkles, Heart, ArrowRight, Volume2, File } from "lucide-react";
import { useNavigate } from "react-router-dom";
function buildQuery(params) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null)
            return;
        if (typeof v === "string" && v.trim() === "")
            return;
        if (Array.isArray(v)) {
            if (v.length > 0)
                q.set(k, v.join(","));
            return;
        }
        q.set(k, String(v));
    });
    const s = q.toString();
    return s ? `?${s}` : "";
}
async function fetchResources(filters) {
    const query = buildQuery({
        q: filters.q,
        type: filters.type && filters.type !== "all" ? filters.type : undefined,
        category: filters.category && filters.category !== "all" ? filters.category : undefined,
        language: filters.language && filters.language !== "all" ? filters.language : undefined,
        tags: filters.tags && filters.tags.length ? filters.tags : undefined,
        minDur: filters.minDur,
        maxDur: filters.maxDur,
    });
    const { data } = await api.get(`/api/resources${query}`);
    return data;
}
async function fetchYouTube(q, opts) {
    try {
        if (opts.type !== "video" && opts.type !== "all")
            return [];
        const max = opts.maxResults ?? 6;
        const query = buildQuery({
            q: q || opts.category || opts.tags?.[0] || "mental health motivation",
            category: opts.category && opts.category !== "all" ? opts.category : undefined,
            language: opts.language && opts.language !== "all" ? opts.language : undefined,
            minDur: opts.minDur,
            maxDur: opts.maxDur,
            maxResults: max,
        });
        const { data: items } = await api.get(`/api/resources/youtube${query}`);
        return items.filter((i) => {
            if (opts.language && opts.language !== "all" && i.language) {
                if (i.language.toLowerCase() !== String(opts.language).toLowerCase())
                    return false;
            }
            if (typeof opts.minDur === "number" && typeof i.durationMin === "number") {
                if (i.durationMin < opts.minDur)
                    return false;
            }
            if (typeof opts.maxDur === "number" && typeof i.durationMin === "number") {
                if (i.durationMin > opts.maxDur)
                    return false;
            }
            return true;
        });
    }
    catch {
        return [];
    }
}
function getYoutubeId(url) {
    try {
        const u = new URL(url);
        if (u.hostname.includes("youtube.com")) {
            const id = u.searchParams.get("v");
            return id;
        }
        if (u.hostname === "youtu.be") {
            return u.pathname.replace("/", "") || null;
        }
        return null;
    }
    catch {
        return null;
    }
}
function getResourceThumbnail(resource) {
    return resource?.thumbnail || resource?.imageUrl || resource?.coverImage || resource?.cover || "";
}
function categoryGradient(category = "") {
    const key = category.toLowerCase();
    if (key.includes("stress") || key.includes("burnout"))
        return "from-amber-500/20 via-orange-500/12 to-rose-500/15";
    if (key.includes("sleep"))
        return "from-indigo-500/20 via-sky-500/12 to-cyan-500/15";
    if (key.includes("motivation") || key.includes("confidence"))
        return "from-violet-500/20 via-fuchsia-500/12 to-sky-500/15";
    if (key.includes("relationship") || key.includes("loneliness"))
        return "from-pink-500/20 via-violet-500/12 to-blue-500/15";
    if (key.includes("trauma") || key.includes("addiction"))
        return "from-emerald-500/20 via-teal-500/12 to-sky-500/15";
    if (key.includes("anxiety") || key.includes("depression"))
        return "from-blue-500/20 via-violet-500/12 to-emerald-500/15";
    if (key.includes("meditation") || key.includes("mindfulness"))
        return "from-purple-500/20 via-pink-500/12 to-indigo-500/15";
    return "from-primary/20 via-secondary/12 to-accent/15";
}
function categoryIcon(category = "") {
    const key = category.toLowerCase();
    if (key.includes("stress") || key.includes("burnout")) return Heart;
    if (key.includes("sleep")) return Clock;
    if (key.includes("motivation") || key.includes("confidence")) return Sparkles;
    if (key.includes("relationship") || key.includes("loneliness")) return Heart;
    if (key.includes("trauma") || key.includes("addiction")) return Heart;
    if (key.includes("anxiety") || key.includes("depression")) return Heart;
    if (key.includes("meditation") || key.includes("mindfulness")) return Sparkles;
    return BookOpen;
}
const defaultCategories = [
    "Anxiety",
    "Stress",
    "Sleep",
    "Burnout",
    "Depression",
    "Motivation",
    "Self Confidence",
    "Meditation",
    "Relationships",
    "Career Stress",
    "Student Pressure",
    "Loneliness",
    "Addiction Recovery",
    "Trauma Support",
    "General",
];
const defaultLanguages = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Marathi", "Bengali"];
const ResourceHub = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [resources, setResources] = useState([]);
    const [q, setQ] = useState("");
    const [type, setType] = useState("all");
    const [category, setCategory] = useState("all");
    const [language, setLanguage] = useState("all");
    const [tags, setTags] = useState([]);
    const [minDur, setMinDur] = useState("");
    const [maxDur, setMaxDur] = useState("");
    const [playingAudio, setPlayingAudio] = useState(null);
    const [activeTab, setActiveTab] = useState("all");
    const [showAllFilters, setShowAllFilters] = useState(false);
    const lastCategory = (localStorage.getItem("lastCategory") || "").trim();
    const selectedFilters = useMemo(() => ({
        q,
        type,
        category,
        language,
        tags,
        minDur: minDur ? Number(minDur) : undefined,
        maxDur: maxDur ? Number(maxDur) : undefined,
    }), [q, type, category, language, tags, minDur, maxDur]);
    useEffect(() => {
        void reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        const handle = setTimeout(() => {
            void reload();
        }, 500);
        return () => clearTimeout(handle);
    }, [q, type, category, language, minDur, maxDur, tags]);
    async function reload() {
        setLoading(true);
        try {
            const platformPromise = fetchResources(selectedFilters);
            const ytPromise = fetchYouTube(q, {
                type,
                category,
                language,
                tags,
                minDur: selectedFilters.minDur,
                maxDur: selectedFilters.maxDur,
                maxResults: 8,
            });
            const [platform, yt] = await Promise.all([platformPromise, ytPromise]);
            const merged = [...platform, ...(Array.isArray(yt) ? yt : [])];
            setResources(merged);
        }
        catch (e) {
            toast({
                variant: "destructive",
                title: "Failed to load resources",
                description: e?.message || "Please try again",
            });
        }
        finally {
            setLoading(false);
        }
    }
    function toggleTag(t) {
        setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    }
    const availableTags = useMemo(() => {
        const bag = new Set();
        for (const r of resources) {
            (r.tags || []).forEach((t) => bag.add(t));
        }
        ["motivation", "self confidence", "exam stress", "mindfulness", "sleep hygiene", "breathing", "grounding", "study", "relationships", "burnout"].forEach((t) => bag.add(t));
        return Array.from(bag).sort();
    }, [resources]);
    const recommended = useMemo(() => {
        if (!lastCategory)
            return [];
        return resources.filter((r) => r.category.toLowerCase().includes(lastCategory.toLowerCase())).slice(0, 6);
    }, [resources, lastCategory]);
    const videos = useMemo(() => resources.filter((r) => r.type === "video"), [resources]);
    const articles = useMemo(() => resources.filter((r) => r.type === "article" || r.type === "blog"), [resources]);
    const audiobooks = useMemo(() => resources.filter((r) => r.type === "audiobook"), [resources]);
    const audio = useMemo(() => resources.filter((r) => r.type === "audio"), [resources]);
    const pdfs = useMemo(() => resources.filter((r) => r.type === "pdf"), [resources]);
    function handlePlayAudio(resource) {
        if (playingAudio === resource.id) {
            setPlayingAudio(null);
        } else {
            setPlayingAudio(resource.id);
        }
    }
    return (<div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background via-secondary/8 to-accent/5">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-accent/8 blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </span>
                  <span className="text-xs uppercase tracking-[0.2em] font-semibold text-primary/70">Resource Library</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                  Psychoeducational
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Resource Hub</span>
                </h1>
                <p className="text-foreground/70 mt-3 text-base leading-relaxed max-w-xl">
                   Discover videos, articles, audiobooks, audio, PDFs, and blogs curated for your mental wellness journey — from stress and sleep to confidence and relationships.
                </p>
                <div className="flex flex-wrap gap-3 mt-5">
                  <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => document.getElementById("filter-section")?.scrollIntoView({ behavior: "smooth" })}>
                    <Search className="h-4 w-4" />
                    Browse Resources
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => navigate("/")}>
                    Back to Home
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Quick stat badges */}
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Videos", icon: Video, count: videos.length, color: "from-blue-500/15 to-blue-500/5 border-blue-500/20 text-blue-500" },
                  { label: "Articles", icon: FileText, count: articles.length, color: "from-amber-500/15 to-amber-500/5 border-amber-500/20 text-amber-500" },
                  { label: "Audiobooks", icon: Headphones, count: audiobooks.length, color: "from-violet-500/15 to-violet-500/5 border-violet-500/20 text-violet-500" },
                  { label: "Audio", icon: Volume2, count: audio.length, color: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20 text-emerald-500" },
                  { label: "PDFs", icon: File, count: pdfs.length, color: "from-rose-500/15 to-rose-500/5 border-rose-500/20 text-rose-500" },
                ].map((s) => (
                  <div key={s.label} className={`flex items-center gap-2 rounded-2xl border bg-gradient-to-br ${s.color} px-4 py-2.5`}>
                    <s.icon className="h-4 w-4" />
                    <div>
                      <p className="text-xs font-bold">{s.count}</p>
                      <p className="text-[10px] uppercase tracking-wide opacity-70">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-6 md:py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Filters */}
          <Card className="glass-card border-primary/10 shadow-md" id="filter-section">
            <CardHeader className="pb-0">
              <button type="button" onClick={() => setShowAllFilters(!showAllFilters)} className="flex w-full items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="h-5 w-5 text-primary" />
                  Filters & Search
                </CardTitle>
                <span className="text-xs text-foreground/50 flex items-center gap-1">
                  {showAllFilters ? "Less" : "More"}
                  {showAllFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </span>
              </button>
              <CardDescription>Search by keyword, filter by type, language, and category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-primary/70" />
                    Keyword
                  </label>
                  <div className="relative">
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g., breathing, exam stress, sleep..." className="pl-9 h-10 text-sm" />
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Type</label>
                  <Select value={type} onValueChange={(v) => setType(v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                       <SelectItem value="video">Videos</SelectItem>
                       <SelectItem value="article">Articles</SelectItem>
                       <SelectItem value="audiobook">Audiobooks</SelectItem>
                       <SelectItem value="audio">Audio</SelectItem>
                       <SelectItem value="pdf">PDFs</SelectItem>
                       <SelectItem value="blog">Blogs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Category</label>
                  <Select value={category} onValueChange={(v) => setCategory(v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {defaultCategories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium flex items-center gap-1.5">
                    <Languages className="h-3.5 w-3.5 text-primary/70" />
                    Language
                  </label>
                  <Select value={language} onValueChange={(v) => setLanguage(v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      {defaultLanguages.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {showAllFilters && (<div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-glass-border/30">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary/70" />
                      Duration range (min)
                    </label>
                    <div className="flex gap-2 items-center">
                      <Input type="number" min={0} value={minDur} onChange={(e) => setMinDur(e.target.value)} placeholder="Min" className="h-10" />
                      <span className="text-foreground/40">&ndash;</span>
                      <Input type="number" min={0} value={maxDur} onChange={(e) => setMaxDur(e.target.value)} placeholder="Max" className="h-10" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Quick Tags</label>
                    <ScrollArea className="h-10">
                      <div className="flex gap-2 pr-2">
                        {availableTags.map((t) => (<Badge key={t} onClick={() => toggleTag(t)} className={`cursor-pointer whitespace-nowrap transition ${tags.includes(t) ? "bg-primary text-primary-foreground shadow-sm" : "bg-foreground/8 text-foreground/70 hover:bg-foreground/15"}`}>
                            #{t}
                          </Badge>))}
                      </div>
                    </ScrollArea>
                    {tags.length > 0 && (<div className="text-xs text-foreground/60 flex flex-wrap gap-1 mt-1.5">
                        Active:{" "}
                        {tags.map((t, i) => (<span key={t} className="font-medium text-foreground/80">
                            {t}{i < tags.length - 1 ? "," : ""}
                          </span>))}
                      </div>)}
                  </div>
                </div>)}

              <div className="flex gap-2 pt-1">
                <Button onClick={reload} disabled={loading} size="sm" className="gap-1.5">
                  <Search className="h-4 w-4" />
                  Apply
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setQ(""); setType("all"); setCategory("all"); setLanguage("all"); setTags([]); setMinDur(""); setMaxDur(""); void reload(); }} disabled={loading} className="gap-1.5 text-foreground/60">
                  <Filter className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recommended */}
          {lastCategory && recommended.length > 0 && (<Card className="glass-card border-secondary/20 overflow-hidden shadow-md">
              <CardHeader className="border-b border-glass-border/30 bg-gradient-to-r from-secondary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/15">
                    <Bookmark className="h-4 w-4 text-secondary" />
                  </span>
                  Recommended for you
                </CardTitle>
                <CardDescription>Based on your recent conversation: <span className="font-medium text-foreground/80">{lastCategory}</span></CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ResourceGrid items={recommended} playingAudio={playingAudio} onPlayAudio={handlePlayAudio} />
              </CardContent>
            </Card>)}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full sm:w-auto gap-1 p-1 bg-background/80 border border-glass-border/30 rounded-2xl">
              <TabsTrigger value="all" className="rounded-xl data-[state=active]:shadow-sm gap-1.5">
                All
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/10">{resources.length}</span>
              </TabsTrigger>
              <TabsTrigger value="video" className="rounded-xl data-[state=active]:shadow-sm gap-1.5">
                <Video className="h-3.5 w-3.5" />
                Videos
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/10">{videos.length}</span>
              </TabsTrigger>
              <TabsTrigger value="article" className="rounded-xl data-[state=active]:shadow-sm gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Articles
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/10">{articles.length}</span>
              </TabsTrigger>
              <TabsTrigger value="audiobook" className="rounded-xl data-[state=active]:shadow-sm gap-1.5">
                <Headphones className="h-3.5 w-3.5" />
                Audiobooks
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/10">{audiobooks.length}</span>
              </TabsTrigger>
              <TabsTrigger value="audio" className="rounded-xl data-[state=active]:shadow-sm gap-1.5">
                <Volume2 className="h-3.5 w-3.5" />
                Audio
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/10">{audio.length}</span>
              </TabsTrigger>
              <TabsTrigger value="pdf" className="rounded-xl data-[state=active]:shadow-sm gap-1.5">
                <File className="h-3.5 w-3.5" />
                PDFs
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/10">{pdfs.length}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-5">
              <ResourceGrid items={resources} loading={loading} playingAudio={playingAudio} onPlayAudio={handlePlayAudio} />
            </TabsContent>

            {["video", "article", "audiobook", "audio", "pdf", "blog"].map((t) => (<TabsContent key={t} value={t} className="mt-5">
                <ResourceGrid items={resources.filter((r) => r.type === t)} loading={loading} typeLabel={t} playingAudio={playingAudio} onPlayAudio={handlePlayAudio} />
              </TabsContent>))}
          </Tabs>
        </section>
      </main>

      <Footer />
    </div>);
};

function ResourceGrid({ items, loading, typeLabel, playingAudio, onPlayAudio }) {
    if (loading) {
        return (<div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (<div key={i} className="rounded-2xl border border-glass-border/30 bg-background/60 overflow-hidden animate-pulse">
                <div className="aspect-video bg-foreground/5" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-foreground/10 rounded w-3/4" />
                  <div className="h-3 bg-foreground/8 rounded w-1/2" />
                  <div className="h-3 bg-foreground/8 rounded w-full" />
                </div>
              </div>))}
          </div>);
    }
    if (items.length === 0) {
        const iconMap = { video: Video, article: FileText, audiobook: Headphones, audio: Volume2, pdf: File, blog: FileText };
        const labelMap = { video: "videos", article: "articles", audiobook: "audiobooks", audio: "audio", pdf: "PDFs", blog: "blogs" };
        const IconComp = iconMap[typeLabel] || BookOpen;
        const label = labelMap[typeLabel] || "resources";
        return (<div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/5 mb-4">
              <IconComp className="h-8 w-8 text-foreground/25" />
            </span>
            <h3 className="text-lg font-semibold text-foreground/60">No {label} found</h3>
            <p className="text-sm text-foreground/50 mt-1 max-w-xs">Try adjusting your filters or search keywords.</p>
          </div>);
    }
    return (<div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => {
            if (r.type === "video") return <VideoCard key={r.id} resource={r} />;
            if (r.type === "audiobook") return <AudiobookCard key={r.id} resource={r} isPlaying={playingAudio === r.id} onPlay={() => onPlayAudio(r)} />;
            if (r.type === "audio") return <AudiobookCard key={r.id} resource={r} isPlaying={playingAudio === r.id} onPlay={() => onPlayAudio(r)} />;
            if (r.type === "pdf") return <ArticleCard key={r.id} resource={r} />;
            return <ArticleCard key={r.id} resource={r} />;
        })}
      </div>);
}

function VideoCard({ resource: r }) {
    return (<Card className="group overflow-hidden glass-card border-glass-border/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
        <div className="aspect-video bg-black/5 relative overflow-hidden">
          <VideoEmbed url={r.url} thumbnail={getResourceThumbnail(r)} title={r.title} />
          <div className="absolute top-2 left-2">
            <Badge className="border-white/10 bg-black/50 text-white backdrop-blur-sm gap-1">
              <Video className="h-3 w-3" />
              Video
            </Badge>
          </div>
          {typeof r.durationMin === "number" && r.durationMin > 0 && (<div className="absolute bottom-2 right-2">
              <Badge className="border-white/10 bg-black/50 text-white backdrop-blur-sm text-[10px]">
                <Clock className="h-3 w-3 mr-0.5" />
                {r.durationMin} min
              </Badge>
            </div>)}
        </div>
        <div className="p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2">{r.title}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 capitalize">{r.category}</Badge>
            <Badge className="text-[10px] px-2 py-0.5 bg-foreground/8 text-foreground/70">{r.language}</Badge>
          </div>
          {r.description && <p className="text-xs text-foreground/65 line-clamp-2 leading-relaxed">{r.description}</p>}
          {r.tags && r.tags.length > 0 && (<div className="flex flex-wrap gap-1.5 pt-0.5">
              {r.tags.slice(0, 4).map((t) => (<span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/8 text-foreground/60">
                  #{t}
                </span>))}
            </div>)}
          <Button asChild variant="outline" size="sm" className="w-full mt-1 h-9 text-xs gap-1.5 group/btn">
            <a href={r.url} target="_blank" rel="noreferrer">
              Watch Video
              <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition" />
            </a>
          </Button>
        </div>
      </Card>);
}

function resourceTypeMeta(type) {
  if (type === "pdf") return { icon: File, label: "PDF" };
  if (type === "blog") return { icon: FileText, label: "Blog" };
  if (type === "article") return { icon: FileText, label: "Article" };
  return { icon: FileText, label: type?.charAt(0).toUpperCase() + type?.slice(1) || "Resource" };
}

function ArticleCard({ resource: r }) {
    const thumb = getResourceThumbnail(r);
    const [imageFailed, setImageFailed] = useState(false);
    const { icon: TypeIcon, label: typeLabel } = resourceTypeMeta(r.type);
    return (<Card className="group overflow-hidden glass-card border-glass-border/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
        <div className="aspect-video relative overflow-hidden">
          {thumb && !imageFailed ? (<>
              <img src={thumb} alt={r.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" onError={() => setImageFailed(true)} />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <Badge className="border-white/10 bg-background/60 text-foreground backdrop-blur-sm gap-1 mb-1.5">
                  <TypeIcon className="h-3 w-3" />
                  {typeLabel}
                </Badge>
                <p className="text-xs font-semibold text-white/80 drop-shadow">{r.category || "Wellness"}</p>
              </div>
            </>) : (<div className={`absolute inset-0 bg-gradient-to-br ${categoryGradient(r.category)}`}>
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
              <div className="relative flex h-full flex-col justify-between p-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-background/40 text-primary backdrop-blur-sm">
                    <TypeIcon className="h-5 w-5" />
                  </span>
                  <Badge className="border-white/10 bg-background/50 text-foreground backdrop-blur-sm text-[10px]">{typeLabel}</Badge>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/60">{r.category || "Wellness"}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-foreground">{r.title}</h3>
                </div>
              </div>
            </div>)}
          {typeof r.durationMin === "number" && r.durationMin > 0 && (<div className="absolute top-2 right-2">
              <Badge className="border-white/10 bg-black/40 text-white backdrop-blur-sm text-[10px]">
                <Clock className="h-3 w-3 mr-0.5" />
                {r.durationMin} min
              </Badge>
            </div>)}
        </div>
        <div className="p-4 space-y-2.5">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2">{r.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 capitalize">{r.category}</Badge>
            <Badge className="text-[10px] px-2 py-0.5 bg-foreground/8 text-foreground/70">{r.language}</Badge>
          </div>
          {r.description && <p className="text-xs text-foreground/65 line-clamp-2 leading-relaxed">{r.description}</p>}
          {r.tags && r.tags.length > 0 && (<div className="flex flex-wrap gap-1.5 pt-0.5">
              {r.tags.slice(0, 4).map((t) => (<span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/8 text-foreground/60">
                  #{t}
                </span>))}
            </div>)}
          <div className="flex gap-2 mt-1">
            <Button asChild variant="outline" size="sm" className="flex-1 h-9 text-xs gap-1.5 group/btn">
              <a href={r.url} target="_blank" rel="noreferrer">
                Read Article
                <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition" />
              </a>
            </Button>
            {r.url?.toLowerCase().endsWith(".pdf") && (<Button asChild variant="outline" size="sm" className="h-9 text-xs">
                <a href={r.url} target="_blank" rel="noreferrer" download>Download</a>
              </Button>)}
          </div>
        </div>
      </Card>);
}

function AudiobookCard({ resource: r, isPlaying, onPlay }) {
    const audioRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };
        const onLoadedMeta = () => setDuration(audio.duration);
        const onEnded = () => { setProgress(0); setCurrentTime(0); onPlay(); };
        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("loadedmetadata", onLoadedMeta);
        audio.addEventListener("ended", onEnded);
        if (isPlaying) {
            audio.play().catch(() => {});
        } else {
            audio.pause();
        }
        return () => {
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("loadedmetadata", onLoadedMeta);
            audio.removeEventListener("ended", onEnded);
        };
    }, [isPlaying, onPlay]);
    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };
    const thumbnail = getResourceThumbnail(r);
    const [imageFailed, setImageFailed] = useState(false);
    return (<Card className={`group overflow-hidden glass-card border-glass-border/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ${isPlaying ? "ring-2 ring-violet-500/30 shadow-lg shadow-violet-500/10" : ""}`}>
        <div className="aspect-video relative overflow-hidden">
          {thumbnail && !imageFailed ? (<>
              <img src={thumbnail} alt={r.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" onError={() => setImageFailed(true)} />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
            </>) : (<div className={`absolute inset-0 bg-gradient-to-br ${categoryGradient(r.category)}`}>
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
            </div>)}

          {/* Center play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button type="button" onClick={onPlay} className={`flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 shadow-lg backdrop-blur-sm ${
              isPlaying ? "bg-violet-500/90 scale-110 shadow-violet-500/30" : "bg-background/70 hover:bg-background/90 hover:scale-110"
            }`}>
              {isPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="h-6 w-6 text-foreground ml-0.5" />}
            </button>
          </div>

          <div className="absolute top-2 left-2">
            <Badge className="border-white/10 bg-violet-500/60 text-white backdrop-blur-sm gap-1">
              <Headphones className="h-3 w-3" />
              Audiobook
            </Badge>
          </div>
          {typeof r.durationMin === "number" && r.durationMin > 0 && (<div className="absolute bottom-2 right-2">
              <Badge className="border-white/10 bg-black/40 text-white backdrop-blur-sm text-[10px]">
                <Clock className="h-3 w-3 mr-0.5" />
                {r.durationMin} min
              </Badge>
            </div>)}

          {/* Waveform visual when playing */}
          {isPlaying && (<div className="absolute bottom-3 left-3 right-3">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-white/70">
                <span>{formatTime(currentTime)}</span>
                <span>{duration ? formatTime(duration) : formatTime(r.durationMin * 60 || 0)}</span>
              </div>
            </div>)}
        </div>

        <div className="p-4 space-y-2.5">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2">{r.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 capitalize">{r.category}</Badge>
            <Badge className="text-[10px] px-2 py-0.5 bg-foreground/8 text-foreground/70">{r.language}</Badge>
          </div>
          {r.description && <p className="text-xs text-foreground/65 line-clamp-2 leading-relaxed">{r.description}</p>}

          {/* Player controls */}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onPlay} className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
              isPlaying ? "bg-violet-500/20 text-violet-500" : "bg-foreground/8 text-foreground/60 hover:bg-foreground/15"
            }`}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <div className="flex-1">
              <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${isPlaying ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" : "bg-foreground/20"}`}
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
            <span className="text-[10px] text-foreground/50 font-mono w-10 text-right">
              {isPlaying ? formatTime(currentTime) : formatTime(r.durationMin * 60 || 0)}
            </span>
          </div>

          {/* Hidden audio element */}
          <audio ref={audioRef} src={r.url} preload="metadata" />

          <Button asChild variant="outline" size="sm" className="w-full h-9 text-xs gap-1.5 group/btn">
            <a href={r.url} target="_blank" rel="noreferrer">
              <Volume2 className="h-3 w-3" />
              Open Audio
              <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition" />
            </a>
          </Button>
        </div>
      </Card>);
}

function VideoEmbed({ url, thumbnail, title }) {
    const id = getYoutubeId(url);
    if (!id) {
        return (<div className="w-full h-full flex items-center justify-center bg-foreground/5">
          <span className="text-xs text-foreground/60 px-4 text-center">Invalid YouTube URL</span>
        </div>);
    }
    const embed = `https://www.youtube.com/embed/${id}`;
    return (<iframe className="absolute inset-0 w-full h-full" src={embed} title={title || "YouTube video"} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen style={thumbnail ? { backgroundImage: `url(${thumbnail})`, backgroundSize: "cover" } : undefined} />);
}

export default ResourceHub;
