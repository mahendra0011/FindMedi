import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Paperclip, Reply, Trash2, Smile, X, MessageCircle } from "lucide-react";
import { Button } from "@/mind/components/ui/button";
import { Input } from "@/mind/components/ui/input";
import { Textarea } from "@/mind/components/ui/textarea";
import { Badge } from "@/mind/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { api } from "@/mind/lib/api";
import { getRealtimeSocket } from "@/mind/lib/socket";
import { useToast } from "@/hooks/use-toast";

type Props = { peerId: string; peerName?: string; onClose?: () => void };

export default function SecureChatPanel({ peerId, peerName, onClose }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const markRead = useCallback(async (list: any[]) => {
    const unread = list.filter((m) => m.unread && m.id);
    for (const m of unread.slice(0, 20)) {
      try { await api.patch(`/api/messages/${m.id}/read`); } catch { /* ignore */ }
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!peerId) return;
    try {
      const { data } = await api.get(`/api/messages?peer=${encodeURIComponent(peerId)}`);
      const list = Array.isArray(data) ? data.slice().reverse() : [];
      setMessages(list);
      if (list.length) markRead(list);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        toast({ title: "Chat locked", description: "Book this counsellor before using secure chat." });
      } else {
        toast({ variant: "destructive", title: "Chat load failed", description: e?.message || "" });
      }
      setMessages([]);
    } finally { setLoading(false); }
  }, [peerId, toast, markRead]);

  useEffect(() => { setLoading(true); fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) return undefined;
    const handler = (msg: any) => {
      if (!msg) return;
      if (msg?.deleted) {
        setMessages((cur) => cur.filter((m) => String(m.id) !== String(msg.id) && String(m._id) !== String(msg.id)));
        return;
      }
      const fid = String(msg.fromId || msg.from || "");
      const tid = String(msg.toId || msg.to || "");
      const pid = String(peerId || "");
      if (pid && fid !== pid && tid !== pid) return;
      fetchMessages();
    };
    socket.on("message:new", handler);
    return () => { socket.off("message:new", handler); };
  }, [fetchMessages, peerId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !peerId) return;
    setSending(true);
    try {
      await api.post("/api/messages", { to: peerId, text: text.trim(), replyTo: replyTo?.id || replyTo?._id || undefined });
      setText("");
      setReplyTo(null);
      await fetchMessages();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Send failed", description: e?.response?.data?.error || e?.message || "" });
    } finally { setSending(false); }
  };

  const react = async (msgId: string, emoji: string) => {
    try { await api.post(`/api/messages/${msgId}/reactions`, { emoji }); fetchMessages(); } catch { /* ignore */ }
  };

  if (!peerId) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center text-foreground/50">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Select a conversation to start secure chat.</p>
          <p className="text-xs mt-1">Requires a confirmed booking with the peer.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card flex flex-col h-[520px] overflow-hidden">
      <CardHeader className="border-b border-glass-border/40 py-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageCircle className="h-4 w-4" />
          </span>
          {peerName || peerId}
          <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400">Secure</Badge>
        </CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        )}
      </CardHeader>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 chat-scrollbar bg-background/40">
        {loading ? (
          <p className="text-center text-xs text-foreground/40 py-8">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-foreground/40 py-8">No messages yet — say hello securely. Messages are end-to-end for booked pairs.</p>
        ) : messages.map((m) => {
          const isPeer = String(m.fromId || "") === String(peerId) || (m.direction === "received");
          return (
          <div key={m.id || m._id} className={`group flex flex-col ${isPeer ? "items-start" : "items-end"}`}>
            {m.replyTo && (
              <div className="text-[11px] text-foreground/45 border-l-2 border-primary/30 pl-2 mb-1 max-w-[80%] truncate">
                ↩ {m.replyTo?.text || "Replied message"}
              </div>
            )}
            <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm border ${isPeer ? "bg-background/80 border-glass-border/40" : "bg-primary text-primary-foreground border-primary/30"}`}>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.text}</p>
              {m.fileUrl && (
                <a href={m.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs underline">
                  <Paperclip className="h-3 w-3" /> {m.fileName || "Attachment"}
                </a>
              )}
              {m.fileType && <span className="block text-[10px] opacity-60 mt-1">{m.fileType}</span>}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-foreground/40">{m.createdAt ? new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}{m.edited ? " · edited" : ""}</span>
              <button type="button" onClick={() => setReplyTo(m)} className="opacity-0 group-hover:opacity-100 h-5 w-5 grid place-items-center rounded hover:bg-foreground/10"><Reply className="h-3 w-3" /></button>
              <button type="button" onClick={() => react(m.id || m._id, "❤️")} className="opacity-0 group-hover:opacity-100 h-5 w-5 grid place-items-center rounded hover:bg-foreground/10"><Smile className="h-3 w-3" /></button>
              {m.canEdit && (
                <button type="button" onClick={() => {
                  const next = window.prompt("Edit message", m.text);
                  if (next && next.trim() && next.trim() !== m.text) {
                    api.patch(`/api/messages/${m.id}`, { text: next.trim() }).then(() => fetchMessages()).catch(() => {});
                  }
                }} className="opacity-0 group-hover:opacity-100 h-5 w-5 grid place-items-center rounded hover:bg-foreground/10 text-[10px]">✎</button>
              )}
              {m.reactions?.length > 0 && (
                <span className="flex gap-0.5">
                  {m.reactions.map((r: any, i: number) => (
                    <span key={i} className="text-[11px] bg-foreground/10 rounded-full px-1">{r.emoji}</span>
                  ))}
                </span>
              )}
              {m.canDelete && (
                <button type="button" onClick={async () => { try { await api.delete(`/api/messages/${m.id || m._id}`); fetchMessages(); } catch {} }} className="opacity-0 group-hover:opacity-100 h-5 w-5 grid place-items-center rounded hover:bg-rose-500/10 text-rose-400"><Trash2 className="h-3 w-3" /></button>
              )}
            </div>
          </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {replyTo && (
        <div className="px-3 py-2 border-t border-glass-border/30 bg-primary/5 flex items-center justify-between text-xs">
          <span className="truncate">Replying to: {String(replyTo.text || "").slice(0, 80)}</span>
          <button type="button" onClick={() => setReplyTo(null)} className="h-6 w-6 grid place-items-center rounded hover:bg-foreground/10"><X className="h-3 w-3" /></button>
        </div>
      )}

      <div className="p-3 border-t border-glass-border/30 bg-background/60 flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a secure message… (Enter to send)"
          rows={1}
          className="min-h-[40px] max-h-[100px] resize-none flex-1"
        />
        <Button onClick={send} disabled={!text.trim() || sending} size="icon" className="h-10 w-10 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
