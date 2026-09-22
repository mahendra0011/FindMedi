import { useEffect, useMemo, useRef, useState } from "react";
import Navigation from "@/mind/components/Navigation";
import Footer from "@/mind/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Button } from "@/mind/components/ui/button";
import { Input } from "@/mind/components/ui/input";
import { Textarea } from "@/mind/components/ui/textarea";
import { Badge } from "@/mind/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/mind/components/ui/tabs";
import { ScrollArea } from "@/mind/components/ui/scroll-area";
import { useToast } from "@/mind/components/ui/use-toast";
import { Check, MessageCircle, Pencil, Plus, Send, ThumbsDown, ThumbsUp, Trash2, User, Users, X, ArrowLeft, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/mind/lib/api";
import { sanitizeInput } from "@/mind/lib/sanitize";
const CATEGORIES = ["General Wellness", "Exam Stress", "Sleep Issues", "Burnout", "Coping Strategies"];
const emergencyKeywords = ["suicide", "self-harm", "panic attack", "abuse"];
const hasEmergencyLanguage = (text) => emergencyKeywords.some((keyword) => String(text || "").toLowerCase().includes(keyword));
async function listPosts(category) {
    const q = category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
    const { data } = await api.get(`/api/peer/posts${q}`);
    return data;
}
async function createPost(params) {
    const { data } = await api.post(`/api/peer/posts`, params);
    return data;
}
async function updatePost(id, params) {
    const { data } = await api.patch(`/api/peer/posts/${encodeURIComponent(id)}`, params);
    return data;
}
async function deletePost(id, params) {
    const { data } = await api.delete(`/api/peer/posts/${encodeURIComponent(id)}`, { data: params });
    return data;
}
async function votePost(id, direction) {
    const { data } = await api.post(`/api/peer/posts/${encodeURIComponent(id)}/vote`, { direction });
    return data;
}
async function listComments(postId) {
    const { data } = await api.get(`/api/peer/comments?postId=${encodeURIComponent(postId)}`);
    return data;
}
async function createComment(params) {
    const { data } = await api.post(`/api/peer/comments`, params);
    return data;
}
function getOrCreateAnonUID() {
    const key = "peer_anon_uid";
    const existing = localStorage.getItem(key);
    if (existing)
        return existing;
    const uid = `anon_${Math.random().toString(36).slice(2)}${Date.now()}`;
    localStorage.setItem(key, uid);
    return uid;
}
function aliasFromUID(uid) {
    const animals = ["Panda", "Koala", "Sparrow", "Dolphin", "Otter", "Robin", "Fox", "Penguin", "Orchid", "Lotus"];
    const colors = ["Blue", "Green", "Amber", "Violet", "Teal", "Coral", "Indigo", "Rose", "Cyan", "Lime"];
    let seed = 0;
    for (let i = 0; i < uid.length; i++)
        seed = (seed * 31 + uid.charCodeAt(i)) % 100000;
    const animal = animals[seed % animals.length];
    const color = colors[(seed >> 4) % colors.length];
    const num = (seed % 9000) + 1000;
    return `${color} ${animal} #${num}`;
}
function aliasGradient(alias) {
    const grads = [
        "from-blue-500/20 to-violet-500/20 border-blue-500/25",
        "from-emerald-500/20 to-teal-500/20 border-emerald-500/25",
        "from-amber-500/20 to-rose-500/20 border-amber-500/25",
        "from-pink-500/20 to-purple-500/20 border-pink-500/25",
        "from-cyan-500/20 to-indigo-500/20 border-cyan-500/25",
    ];
    let seed = 0;
    for (let i = 0; i < alias.length; i++) seed = (seed * 13 + alias.charCodeAt(i)) % 1000;
    return grads[seed % grads.length];
}
const PeerSupport = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState("All");
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const uid = useMemo(() => getOrCreateAnonUID(), []);
    const alias = useMemo(() => aliasFromUID(uid), [uid]);
    const [postContent, setPostContent] = useState("");
    const postContentRef = useRef(null);
    const [editingPostId, setEditingPostId] = useState("");
    const [editingPostContent, setEditingPostContent] = useState("");
    const [selectedPost, setSelectedPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentContent, setCommentContent] = useState("");
    const ownerId = uid;
    const aliasGrad = useMemo(() => aliasGradient(alias), [alias]);

    // Emergency contact state
    const [emergencyContact, setEmergencyContact] = useState("");
    const [emergencySubmitted, setEmergencySubmitted] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const list = await listPosts(activeCategory === "All" ? undefined : activeCategory);
                if (!cancelled) {
                    setPosts(list);
                    if (selectedPost) {
                        const fresh = list.find((p) => p.id === selectedPost.id);
                        if (!fresh) {
                            setSelectedPost(null);
                            setComments([]);
                        }
                        else {
                            const cs = await listComments(selectedPost.id);
                            if (!cancelled)
                                setComments(cs);
                        }
                    }
                }
            }
            catch (e) {
                console.error(e);
            }
        }
        void load();
        const iv = setInterval(load, 2000);
        return () => {
            cancelled = true;
            clearInterval(iv);
        };
    }, [activeCategory, selectedPost]);

    async function reloadPosts() {
        setLoading(true);
        try {
            const list = await listPosts(activeCategory === "All" ? undefined : activeCategory);
            setPosts(list);
        }
        catch (e) {
            toast({ variant: "destructive", title: "Failed to load posts", description: e?.message || "" });
        }
        finally {
            setLoading(false);
        }
    }
    async function submitPost() {
        const content = postContent.trim();
        if (!content) {
            toast({ title: "Write something to share.", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            await createPost({ author_uid: uid, alias, category: (activeCategory === "All" ? "General Wellness" : activeCategory), content: sanitizeInput(content) });
            setPostContent("");
            setEmergencyContact("");
            setEmergencySubmitted(false);
            postContentRef.current?.focus();
            await reloadPosts();
            toast({ title: "Posted successfully" });
        }
        catch (e) {
            toast({ title: "Post failed", description: e?.message || "", variant: "destructive" });
        }
        finally {
            setLoading(false);
        }
    }
    function canManagePost(post) {
        return String(post?.author_uid || "") === String(ownerId || "");
    }
    function startEditPost(post) {
        if (!canManagePost(post))
            return;
        setEditingPostId(post.id);
        setEditingPostContent(post.content || "");
    }
    function cancelEditPost() {
        setEditingPostId("");
        setEditingPostContent("");
    }
    async function saveEditedPost(post) {
        const content = editingPostContent.trim();
        if (!content) {
            toast({ title: "Post content is required.", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            await updatePost(post.id, {
                author_uid: uid,
                category: post.category || (activeCategory === "All" ? "General Wellness" : activeCategory),
                content: sanitizeInput(content),
            });
            cancelEditPost();
            if (selectedPost?.id === post.id) {
                setSelectedPost((current) => (current ? { ...current, content } : current));
            }
            await reloadPosts();
            toast({ title: "Post updated" });
        }
        catch (e) {
            toast({ title: "Edit failed", description: e?.message || "", variant: "destructive" });
        }
        finally {
            setLoading(false);
        }
    }
    async function removePost(post) {
        if (!canManagePost(post))
            return;
        if (!window.confirm("Delete this post and its comments?"))
            return;
        setLoading(true);
        try {
            await deletePost(post.id, { author_uid: uid });
            if (selectedPost?.id === post.id) {
                setSelectedPost(null);
                setComments([]);
            }
            await reloadPosts();
            toast({ title: "Post deleted" });
        }
        catch (e) {
            toast({ title: "Delete failed", description: e?.message || "", variant: "destructive" });
        }
        finally {
            setLoading(false);
        }
    }
    async function openPost(p) {
        setSelectedPost(p);
        try {
            const cs = await listComments(p.id);
            setComments(cs);
        }
        catch (e) {
            toast({ title: "Failed to load comments", description: e?.message || "", variant: "destructive" });
        }
    }
    async function submitComment() {
        if (!selectedPost)
            return;
        const content = commentContent.trim();
        if (!content)
            return;
        setLoading(true);
        try {
            await createComment({ post_id: selectedPost.id, author_uid: uid, alias, content: sanitizeInput(content) });
            setCommentContent("");
            const cs = await listComments(selectedPost.id);
            setComments(cs);
            await reloadPosts();
        }
        catch (e) {
            toast({ title: "Comment failed", description: e?.message || "", variant: "destructive" });
        }
        finally {
            setLoading(false);
        }
    }
    async function vote(p, dir) {
        try {
            await votePost(p.id, dir);
            await reloadPosts();
        }
        catch (e) {
            toast({ title: "Vote failed", description: e?.message || "", variant: "destructive" });
        }
    }
    async function submitEmergencyContact() {
        const num = emergencyContact.trim();
        if (!num) return;
        setLoading(true);
        try {
            await api.post("/api/peer/emergency-contact", { author_uid: uid, alias, contact: sanitizeInput(num) });
            setEmergencySubmitted(true);
            toast({ title: "Contact submitted", description: "A support team member will reach out to you shortly." });
        }
        catch (e) {
            toast({ variant: "destructive", title: "Failed to submit", description: e?.message || "" });
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className="min-h-screen bg-background text-foreground theme-findmedi">
      <Navigation />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background via-secondary/8 to-accent/5">
          <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-secondary/8 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                    <Users className="h-4 w-4 text-primary" />
                  </span>
                  <span className="text-xs uppercase tracking-[0.2em] font-semibold text-primary/70">Safe Space</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                  Peer Support
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#3b82f6] to-[#8b5cf6]">Community</span>
                </h1>
                <p className="text-foreground/70 mt-3 text-base leading-relaxed max-w-xl">
                  Share experiences, ask for tips, and support each other — completely anonymous. Every voice matters here.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => postContentRef.current?.focus()}>
                    <Plus className="h-4 w-4" />
                    Share Something
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-foreground/60" onClick={() => navigate("/mind")}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Home
                  </Button>
                </div>
              </div>

              {/* Alias card */}
              <div className={`rounded-2xl border bg-gradient-to-br ${aliasGrad} backdrop-blur-sm p-4 min-w-48`}>
                <div className="text-[10px] uppercase tracking-wider text-foreground/50 mb-1">Your anonymous alias</div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/40 text-foreground">
                    <User className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{alias}</p>
                    <p className="text-[10px] text-foreground/50">Visible to everyone</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-6 md:py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="All" value={activeCategory} onValueChange={(v) => setActiveCategory(v)}>
            <div className="mb-6">
              <TabsList className="w-full sm:w-auto gap-1.5 p-1 bg-background/80 border border-glass-border/30 rounded-2xl flex-wrap">
                <TabsTrigger value="All" className="rounded-xl data-[state=active]:shadow-sm">All</TabsTrigger>
                {CATEGORIES.map((c) => (<TabsTrigger key={c} value={c} className="rounded-xl data-[state=active]:shadow-sm">
                    {c}
                  </TabsTrigger>))}
              </TabsList>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_minmax(360px,420px)] gap-6">

              {/* Posts column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Discussions
                  </h2>
                  <span className="text-xs text-foreground/50">{posts.length} post{posts.length !== 1 ? "s" : ""}</span>
                </div>

                <ScrollArea className="h-[65vh] pr-1">
                  <div className="space-y-3">
                    {posts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5 mb-3">
                          <MessageCircle className="h-7 w-7 text-foreground/25" />
                        </span>
                        <h3 className="font-semibold text-foreground/60">No posts yet</h3>
                        <p className="text-sm text-foreground/50 mt-1 max-w-xs">Be the first to share something in this category.</p>
                      </div>
                    ) : (posts.map((p) => {
                      const pGrad = aliasGradient(p.alias || "");
                      return (<div key={p.id} className={`group rounded-2xl border bg-background/60 backdrop-blur-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 ${
                        selectedPost?.id === p.id ? "border-primary/30 shadow-primary/5" : "border-glass-border/40"
                      }`}>
                          <div className="p-4 space-y-3">

                            {/* Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br ${pGrad} text-[11px] font-bold text-foreground/80`}>
                                  {(p.alias || "Anon").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold truncate">{p.alias}</span>
                                    {canManagePost(p) && <Badge className="h-5 text-[9px] px-1.5 bg-primary/12 text-primary border-primary/20">You</Badge>}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-foreground/50 mt-0.5">
                                    <span className="capitalize">{p.category}</span>
                                    <span>&middot;</span>
                                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Content / Edit */}
                            {editingPostId === p.id ? (
                              <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
                                <Textarea rows={5} value={editingPostContent} onChange={(e) => setEditingPostContent(e.target.value)} className="resize-none text-sm" placeholder="Update your post..." />
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" className="gap-1 h-8" onClick={cancelEditPost} disabled={loading}>
                                    <X className="h-3.5 w-3.5" /> Cancel
                                  </Button>
                                  <Button size="sm" className="gap-1 h-8" onClick={() => saveEditedPost(p)} disabled={loading || !editingPostContent.trim()}>
                                    <Check className="h-3.5 w-3.5" /> Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{p.content}</p>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => vote(p, "up")} className="flex items-center gap-1 rounded-lg border border-glass-border/30 px-2.5 py-1.5 text-xs hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-500 transition group/btn">
                                  <ThumbsUp className="h-3.5 w-3.5 group-hover/btn:scale-110 transition" />
                                  <span>{p.up || 0}</span>
                                </button>
                                <button type="button" onClick={() => vote(p, "down")} className="flex items-center gap-1 rounded-lg border border-glass-border/30 px-2.5 py-1.5 text-xs hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-500 transition group/btn">
                                  <ThumbsDown className="h-3.5 w-3.5 group-hover/btn:scale-110 transition" />
                                  <span>{p.down || 0}</span>
                                </button>
                                <button type="button" onClick={() => openPost(p)} className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition group/btn ${
                                  selectedPost?.id === p.id ? "bg-primary/10 border-primary/30 text-primary" : "border-glass-border/30 hover:bg-primary/5 hover:border-primary/20"
                                }`}>
                                  <MessageCircle className="h-3.5 w-3.5 group-hover/btn:scale-110 transition" />
                                  <span>{p.commentCount ?? 0}</span>
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {canManagePost(p) && editingPostId !== p.id && (<>
                                    <button type="button" onClick={() => startEditPost(p)} disabled={loading} className="flex items-center gap-1 rounded-lg border border-glass-border/30 px-2.5 py-1.5 text-xs hover:bg-blue-500/10 hover:border-blue-500/20 hover:text-blue-500 transition">
                                      <Pencil className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Edit</span>
                                    </button>
                                    <button type="button" onClick={() => removePost(p)} disabled={loading} className="flex items-center gap-1 rounded-lg border border-glass-border/30 px-2.5 py-1.5 text-xs hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-500 transition">
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Delete</span>
                                    </button>
                                  </>)}
                              </div>
                            </div>

                            {/* Inline comments */}
                            {selectedPost?.id === p.id && (<div className="mt-2 pt-3 border-t border-glass-border/30 space-y-3">
                                <div className="flex items-center gap-2">
                                  <MessageCircle className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-semibold">Comments</span>
                                  <span className="text-xs text-foreground/50">({comments.length})</span>
                                </div>
                                <div className="space-y-2.5">
                                  {comments.length === 0 ? (
                                    <p className="text-xs text-foreground/50 italic px-1">No comments yet. Be the first to reply.</p>
                                  ) : (comments.map((c) => {
                                    const cGrad = aliasGradient(c.alias || "");
                                    return (<div key={c.id} className="rounded-xl border border-glass-border/30 bg-background/40 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className={`flex h-6 w-6 items-center justify-center rounded-lg border bg-gradient-to-br ${cGrad} text-[8px] font-bold`}>
                                              {(c.alias || "Anon").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                                            </span>
                                            <span className="text-xs font-semibold">{c.alias}</span>
                                          </div>
                                          <span className="text-[10px] text-foreground/50">{new Date(c.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm mt-1.5 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                                      </div>);
                                  }))}
                                </div>
                                <div className="flex gap-2">
                                  <Input value={commentContent} onChange={(e) => setCommentContent(e.target.value)} placeholder="Write a supportive reply..." className="text-sm h-10" />
                                  <Button size="sm" onClick={submitComment} disabled={loading || !commentContent.trim()} className="gap-1.5 h-10">
                                    <Send className="h-3.5 w-3.5" />
                                    Reply
                                  </Button>
                                </div>
                              </div>)}
                          </div>
                        </div>);
                    }))}
                  </div>
                </ScrollArea>
              </div>

              {/* Create Post panel */}
              <div className="space-y-4">
                <Card className="glass-card border-primary/10 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12">
                        <Plus className="h-4 w-4 text-primary" />
                      </span>
                      Create a Post
                    </CardTitle>
                    <CardDescription>Your identity stays anonymous.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 rounded-xl border border-glass-border/30 bg-background/50 px-3 py-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 text-[9px] font-bold">
                        {alias.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-xs font-semibold">{alias}</p>
                        <p className="text-[10px] text-foreground/50">Posting anonymously</p>
                      </div>
                    </div>

                    <Textarea ref={postContentRef} rows={6} value={postContent} onChange={(e) => setPostContent(e.target.value)}
                      placeholder={`Share what's on your mind in ${activeCategory === "All" ? "General Wellness" : activeCategory}...`}
                      className="resize-none text-sm" />

                    {/* Emergency contact input */}
                    {hasEmergencyLanguage(postContent) && !emergencySubmitted && (
                      <div className="rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <Phone className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">Need someone to talk to?</p>
                            <p className="text-xs text-rose-500/70 mt-0.5">Share your phone or WhatsApp number. A support team member will reach out.</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="+91 98765 43210" className="flex-1 h-10 text-sm bg-background/60 border-rose-500/20 focus:border-rose-400/50 text-foreground placeholder:text-foreground/40" />
                          <Button size="sm" onClick={submitEmergencyContact} disabled={loading || !emergencyContact.trim()} className="h-10 bg-rose-500 hover:bg-rose-600 text-white gap-1.5">
                            <Send className="h-3.5 w-3.5" />
                            Send
                          </Button>
                        </div>
                      </div>
                    )}
                    {hasEmergencyLanguage(postContent) && emergencySubmitted && (
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Contact submitted. A support team member will reach out shortly.
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <Badge variant="secondary" className="text-xs">{activeCategory === "All" ? "General Wellness" : activeCategory}</Badge>
                      <Button onClick={submitPost} disabled={loading || !postContent.trim()} className="gap-1.5">
                        <Send className="h-4 w-4" />
                        Post
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick stats */}
                <div className="rounded-2xl border border-glass-border/30 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Community Stats</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Posts", value: posts.length, icon: MessageCircle },
                      { label: "Categories", value: CATEGORIES.length, icon: Users },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-background/50 border border-glass-border/30 p-3 text-center">
                        <s.icon className="h-4 w-4 mx-auto text-primary/60" />
                        <p className="text-lg font-bold mt-1">{s.value}</p>
                        <p className="text-[10px] text-foreground/50">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Tabs>
        </section>
      </main>

      <Footer />
    </div>);
};
export default PeerSupport;
