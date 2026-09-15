import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSocket, joinRoom } from '@/lib/socket';
import api, { getServerOrigin } from '@/lib/axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Search, Send, Paperclip, Smile, Mic, X, Phone, Video, MoreVertical, Ban,
  ArrowLeft, ChevronDown, Check, CheckCheck, Clock, AlertCircle, Pin,
  Copy, Forward, Trash2, Star, Reply, Pencil, Info, ShieldAlert, ImageIcon,
  FileText, Link2, Lock, BellOff, CheckSquare, Settings as SettingsIcon,
  User as UserIcon, MessageCircle, WifiOff
} from 'lucide-react';
import ChatList from './ChatList';
import MessageBubble from './MessageBubble';
import ChatSettingsPanel from './ChatSettingsPanel';
import ChatInfoPanel from './ChatInfoPanel';
import EmojiPicker from './EmojiPicker';
import MediaViewer from './MediaViewer';
import VoiceRecorder from './VoiceRecorder';
import {
  DEFAULT_CHAT_PREFS, readChatPrefs, writeChatPrefs, readDrafts, saveDraft,
  enqueueMessage, dequeueMessage, readQueue, writeQueue, messagePreview,
  wallpaperCss, readConversationWallpapers, setConversationWallpaper,
} from '@/lib/chatPrefs';

const mediaUrl = (u) => (String(u || '').startsWith('http') ? u : `${getServerOrigin()}${u}`);
const uid = (v) => (v == null ? '' : (typeof v === 'object' ? String(v._id || v.userId || '') : String(v)));

export default function ChatDashboard() {
  const { user } = useAuth();
  const meId = uid(user?.id || user?._id);

  // ── Core lists ──
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Active conversation ──
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadDividerId, setUnreadDividerId] = useState(null);
  const [gallery, setGallery] = useState({ media: [], links: [], files: [], voice: [] });
  const [starred, setStarred] = useState([]);

  // ── Composer ──
  const [draftText, setDraftText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editMessage, setEditMessage] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // ── Realtime indicators ──
  const [typingUsers, setTypingUsers] = useState({});
  const [recordingUsers, setRecordingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const [connected, setConnected] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);

  // ── Selection / forward ──
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [forwardMessageIds, setForwardMessageIds] = useState(null);

  // ── Panels / dialogs ──
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [reactionDetails, setReactionDetails] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [messageInfo, setMessageInfo] = useState(null);

  // ── Prefs & privacy ──
  const [prefs, setPrefsState] = useState(DEFAULT_CHAT_PREFS);
  const [privacy, setPrivacy] = useState({});
  const [theme, setTheme] = useState('system');
  const [storage, setStorage] = useState(null);
  const [backup, setBackup] = useState({});
  const [backupRunning, setBackupRunning] = useState(false);
  const [pinSet, setPinSet] = useState(false);

  const setPrefs = useCallback((patch) => {
    setPrefsState((p) => {
      const next = typeof patch === 'function' ? patch(p) : { ...p, ...patch };
      writeChatPrefs(next);
      return next;
    });
  }, []);

  const setPrivacyField = useCallback(async (key, value) => {
    const prev = privacy;
    setPrivacy((p) => ({ ...p, [key]: value }));
    try {
      const { data } = await api.put('/chat/privacy', { [key]: value });
      setPrivacy(data);
      setBackup(data.backup || {});
    } catch (err) {
      setPrivacy(prev);
      toast.error(err.response?.data?.message || 'Setting save nahi hui');
    }
  }, [privacy]);

  const refreshConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data);
    } catch { toast.error('Conversations load nahi hui'); }
  }, []);

  const refreshSideData = useCallback(async () => {
    try {
      const [c, r, b, rep, st] = await Promise.all([
        api.get('/chat/contacts'),
        api.get('/chat/conversations/requests'),
        api.get('/chat/blocked'),
        api.get('/chat/report/my'),
        api.get('/chat/starred'),
      ]);
      setContacts(c.data);
      setRequests(r.data);
      setBlocked(b.data);
      setReports(rep.data);
      setStarred(st.data);
    } catch { /* non-fatal */ }
  }, []);

  const refreshPrivacy = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/privacy');
      setPrivacy(data);
      setPinSet(Boolean(data.appLockPinSet));
      setBackup(data.backup || {});
      try { setTheme(JSON.parse(localStorage.getItem('medicore_settings') || '{}').theme || 'system'); } catch { /* keep */ }
    } catch { /* non-fatal */ }
  }, []);

  const refreshStorage = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/storage-usage');
      setStorage(data);
    } catch { /* non-fatal */ }
  }, []);

  /*__DERIVED_HERE__*/
  /* ── Derived ── */
  const activeConv = useMemo(
    () => conversations.find((c) => uid(c._id) === uid(selectedId)) || null,
    [conversations, selectedId]
  );
  const peer = useMemo(() => {
    const list = activeConv?.participants || [];
    const other = list.find((p) => uid(p._id || p) !== meId) || null;
    return other ? {
      ...other,
      _id: uid(other._id || other),
      isOnline: onlineUsers[uid(other._id || other)]?.isOnline ?? other.isOnline,
      lastActive: onlineUsers[uid(other._id || other)]?.lastActive || other.lastActive,
    } : null;
  }, [activeConv, meId, onlineUsers]);

  const tables = useMemo(() => ({
    typing: Object.keys(typingUsers[uid(selectedId)] || {}).length > 0,
    recording: Object.keys(recordingUsers[uid(selectedId)] || {}).length > 0,
  }), [typingUsers, recordingUsers, selectedId]);

  const pinnedMsg = useMemo(
    () => messages.find((m) => m._id === (activeConv?.pinnedMessageId || activeConv?.pinnedMessage?._id)) || null,
    [messages, activeConv]
  );

  const grouped = useMemo(() => {
    const out = [];
    let lastDay = '';
    messages.forEach((m) => {
      const day = new Date(m.createdAt).toDateString();
      if (day !== lastDay) {
        out.push({ kind: 'day', label: format(new Date(m.createdAt), 'dd MMM yyyy'), id: `d-${day}` });
        lastDay = day;
      }
      out.push({ kind: 'msg', message: m });
    });
    return out;
  }, [messages]);

  /* ── Boot: prefs + server data ── */
  useEffect(() => {
    setPrefsState(readChatPrefs());
    refreshPrivacy();
    refreshConversations();
    refreshSideData();
    refreshStorage();
  }, [refreshPrivacy, refreshConversations, refreshSideData, refreshStorage]);

  /* ── Socket.IO: presence, realtime messages, typing/recording, sync ── */
  /* ── Refs, drafts, offline queue flush ── */
  const scrollRef = useRef(null);
  const selectedIdRef = useRef(null);
  const replyToRef = useRef(null);
  const typingTimerRef = useRef(null);
  const [drafts, setDrafts] = useState({});

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { replyToRef.current = replyTo; }, [replyTo]);
  useEffect(() => { setDrafts(readDrafts()); }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  /** Reconnect / boot par offline queue ke messages server ko bhejta hai */
  const flushQueue = useCallback(async () => {
    const queue = readQueue(meId);
    if (!queue.length) return;
    let sent = 0;
    for (const item of queue) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const { data } = await api.post('/chat/messages', item.payload);
        setMessages((prev) => prev.map((m) => (m._id === item.clientGeneratedId ? data : m)));
        dequeueMessage(meId, item.clientGeneratedId);
        sent += 1;
      } catch (err) {
        if (err.response) {
          // permanent rejection — queue se hatao, failed mark karo
          setMessages((prev) => prev.map((m) => (m._id === item.clientGeneratedId ? { ...m, status: 'failed' } : m)));
          dequeueMessage(meId, item.clientGeneratedId);
        }
        // network error → item queue me hi rahega, agli flush me retry
      }
    }
    setQueuedCount(readQueue(meId).length);
    if (sent > 0) toast.success(`${sent} pending message bhej diye gaye`);
  }, [meId]);

  /** Draft update + typing indicator emit (2.5s debounce stop) */
  const updateDraft = useCallback((convId, text) => {
    setDraftText(text);
    saveDraft(convId, text);
    setDrafts(readDrafts());
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    const socket = getSocket();
    socket.emit('chat:typing', { conversationId: convId, isTyping: Boolean(text) });
    typingTimerRef.current = setTimeout(() => {
      socket.emit('chat:typing', { conversationId: convId, isTyping: false });
    }, 2500);
  }, []);

  useEffect(() => {
    if (!meId) return undefined;
    const socket = getSocket();
    const cleanupJoin = joinRoom('chat:join', meId);

    const onConnect = () => {
      setConnected(true);
      socket.emit('chat:presence', { online: true });
      socket.emit('chat:sync', { since: Date.now() - 60000 }); // reconnect → missed events
      flushQueue();
      refreshConversations();
    };
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('chat:receive_message', (msg) => {
      if (!msg?._id) return;
      // Mere hi doosre device se aaya (multi-device sync) — local optimistic replace
      setMessages((prev) => {
        if (!prev.some((m) => m._id === msg._id)) return prev;
        return prev.map((m) => (m._id === msg._id ? msg : m));
      });
      setConversations((prev) => prev.map((c) => (uid(c._id) === uid(msg.conversationId)
        ? { ...c, lastMessage: { content: msg.content, type: msg.type, createdAt: msg.createdAt } }
        : c)));
      if (selectedIdRef.current === uid(msg.conversationId)) {
        api.put(`/chat/messages/read/${msg.conversationId}`).catch(() => {});
      }
    });

    socket.on('chat:read', ({ conversationId, userId }) => {
      if (uid(userId) === meId) return;
      setMessages((prev) => prev.map((m) => (uid(m.conversationId) === uid(conversationId)
        ? { ...m, readCount: Math.max(m.readCount || 0, 1) } : m)));
    });

    socket.on('chat:delivered', ({ conversationId, userId }) => {
      if (uid(userId) === meId) return;
      setMessages((prev) => prev.map((m) => (uid(m.conversationId) === uid(conversationId)
        ? { ...m, deliveredCount: Math.max(m.deliveredCount || 0, 1) } : m)));
    });

    socket.on('chat:reaction', (msg) => {
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? { ...m, ...msg } : m)));
    });
    socket.on('chat:message_edited', (msg) => {
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? { ...m, ...msg } : m)));
    });
    socket.on('chat:message_deleted', ({ messageId, deletedForEveryone }) => {
      setMessages((prev) => (deletedForEveryone
        ? prev.filter((m) => m._id !== messageId)
        : prev.map((m) => (m._id === messageId ? { ...m, deletedForEveryone: true, content: '' } : m))));
    });
    socket.on('chat:pinned_message', ({ conversationId, messageId }) => {
      setConversations((prev) => prev.map((c) => (uid(c._id) === uid(conversationId)
        ? { ...c, pinnedMessageId: messageId } : c)));
    });

    socket.on('chat:typing', ({ conversationId, userId, isTyping }) => {
      if (uid(userId) === meId) return;
      setTypingUsers((prev) => {
        const conv = { ...(prev[conversationId] || {}) };
        if (isTyping) conv[userId] = Date.now();
        else delete conv[userId];
        return { ...prev, [conversationId]: conv };
      });
    });

    socket.on('chat:recording', ({ conversationId, userId, isRecording }) => {
      if (uid(userId) === meId) return;
      setRecordingUsers((prev) => {
        const conv = { ...(prev[conversationId] || {}) };
        if (isRecording) conv[userId] = Date.now();
        else delete conv[userId];
        return { ...prev, [conversationId]: conv };
      });
    });

    socket.on('chat:presence', ({ userId, isOnline, lastActive }) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: { isOnline, lastActive } }));
    });

    socket.on('chat:conversation_updated', () => refreshConversations());
    socket.on('chat:new_message_notification', () => {
      refreshConversations();
      refreshSideData();
    });
    socket.on('chat:message_request', () => {
      refreshSideData();
      toast.info('New message request');
    });

    return () => {
      cleanupJoin();
      socket.emit('chat:presence', { online: false });
      ['connect', 'disconnect', 'chat:receive_message', 'chat:read', 'chat:delivered',
        'chat:reaction', 'chat:message_edited', 'chat:message_deleted', 'chat:pinned_message',
        'chat:typing', 'chat:recording', 'chat:presence', 'chat:conversation_updated',
        'chat:new_message_notification', 'chat:message_request'].forEach((e) => socket.off(e));
    };
  }, [meId, flushQueue, refreshConversations, refreshSideData]);

  /* ── Conversation open ── */
  const openConversation = useCallback(async (id) => {
    setSelectedId(id);
    setSelectionMode(false); setSelectedMessages([]);
    setReplyTo(null); setEditMessage(null); setShowInfo(false);
    setDraftText(readDrafts()[id] || '');
    setLoadingMessages(true);
    try {
      const [m, g] = await Promise.all([
        api.get(`/chat/messages/${id}`),
        api.get(`/chat/messages/${id}/media`),
      ]);
      setMessages(m.data);
      setGallery(g.data || { media: [], links: [], files: [], voice: [] });
      api.put(`/chat/messages/read/${id}`).catch(() => {});
      api.put(`/chat/messages/delivered/${id}`).catch(() => {});
      setConversations((prev) => prev.map((c) => (uid(c._id) === uid(id) ? { ...c, unread: 0 } : c)));
      requestAnimationFrame(() => scrollToBottom(false));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Messages load nahi hue');
    } finally { setLoadingMessages(false); }
  }, [scrollToBottom]);

  /* ── Send (optimistic + offline queue) ── */
  const sendMessage = useCallback(async ({ text = '', type = 'text', attachments = [] } = {}) => {
    const convId = selectedIdRef.current;
    if (!convId || (!text.trim() && !attachments.length)) return;
    const clientGeneratedId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const replySnapshot = replyToRef.current;
    setMessages((prev) => [...prev, {
      _id: clientGeneratedId, clientGeneratedId, conversationId: convId,
      sender: { _id: meId, name: user?.name || '', avatar: user?.avatar || '' },
      type, content: text, attachments, replyTo: replySnapshot,
      mine: true, status: 'sending', reactions: [], starred: false,
      deliveredCount: 0, readCount: 0, createdAt: new Date().toISOString(),
    }]);
    requestAnimationFrame(() => scrollToBottom());

    const payload = { conversationId: convId, type, content: text, attachments, replyTo: replySnapshot?._id || null, clientGeneratedId };
    setReplyTo(null);
    saveDraft(convId, ''); setDraftText(''); setDrafts(readDrafts());
    getSocket().emit('chat:typing', { conversationId: convId, isTyping: false });

    if (!connected) {
      enqueueMessage(meId, payload);
      setQueuedCount(readQueue(meId).length);
      setMessages((prev) => prev.map((m) => (m._id === clientGeneratedId ? { ...m, status: 'queued' } : m)));
      toast.info('Offline — queue me hai, internet aane par bhej denge');
      return;
    }
    try {
      const { data } = await api.post('/chat/messages', payload);
      setMessages((prev) => prev.map((m) => (m._id === clientGeneratedId ? data : m)));
      refreshConversations();
    } catch (err) {
      if (!err.response) {
        enqueueMessage(meId, payload);
        setQueuedCount(readQueue(meId).length);
        setMessages((prev) => prev.map((m) => (m._id === clientGeneratedId ? { ...m, status: 'queued' } : m)));
      } else {
        toast.error(err.response?.data?.message || 'Message send nahi hua');
        setMessages((prev) => prev.map((m) => (m._id === clientGeneratedId ? { ...m, status: 'failed' } : m)));
      }
    }
  }, [meId, user, connected, scrollToBottom, refreshConversations]);

  /* ── Attachments (image/video/doc) + voice ── */
  const uploadDataUrl = useCallback(async (dataUrl, name) => {
    const { data } = await api.post('/chat/upload', { dataUrl, name });
    return data; // { url, name, size, mimetype }
  }, []);

  const handleFilesPicked = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(0.15);
    try {
      const uploaded = [];
      for (const file of files) {
        if (file.size > 25 * 1024 * 1024) { toast.error(`${file.name} 25MB se bada hai`); continue; }
        const dataUrl = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(file);
        });
        setUploading(0.5);
        // eslint-disable-next-line no-await-in-loop
        const meta = await uploadDataUrl(dataUrl, file.name);
        uploaded.push(meta);
      }
      setUploading(false);
      if (!uploaded.length) return;
      const first = uploaded[0];
      const type = first.mimetype?.startsWith('image/') ? 'image'
        : first.mimetype?.startsWith('video/') ? 'video'
          : first.mimetype?.startsWith('audio/') ? 'audio' : 'file';
      await sendMessage({ text: draftText.trim(), type, attachments: uploaded });
    } catch (err) {
      setUploading(false);
      toast.error(err.response?.data?.message || 'Upload fail');
    }
  }, [uploadDataUrl, sendMessage, draftText]);

  const handleVoiceSend = useCallback(async ({ dataUrl, duration }) => {
    setUploading(0.4);
    try {
      const meta = await uploadDataUrl(dataUrl, `voice-${Date.now()}.webm`);
      setUploading(false);
      await sendMessage({ type: 'voice', attachments: [{ ...meta, duration }] });
    } catch (err) {
      setUploading(false);
      toast.error(err.response?.data?.message || 'Voice message fail');
    }
  }, [uploadDataUrl, sendMessage]);

  /* ── Message actions ── */
  const handleReact = useCallback(async (messageId, emoji) => {
    setMessages((prev) => prev.map((m) => (m._id === messageId
      ? { ...m, myReaction: m.myReaction === emoji ? null : emoji } : m)));
    try { await api.post(`/chat/messages/${messageId}/reactions`, { emoji }); }
    catch { toast.error('Reaction save nahi hua'); }
  }, []);

  const handleEditSubmit = useCallback(async (messageId, content) => {
    try {
      const { data } = await api.put(`/chat/messages/${messageId}`, { content });
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, ...data, edited: true } : m)));
      setEditMessage(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Edit fail'); }
  }, []);

  const handleDelete = useCallback(async (messageId, scope) => {
    try {
      await api.delete(`/chat/messages/${messageId}`, { params: { scope } });
      setMessages((prev) => (scope === 'everyone'
        ? prev.map((m) => (m._id === messageId ? { ...m, deletedForEveryone: true, content: '', attachments: [] } : m))
        : prev.filter((m) => m._id !== messageId)));
    } catch (err) { toast.error(err.response?.data?.message || 'Delete fail'); }
  }, []);

  const handleStar = useCallback(async (messageId, current) => {
    setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, starred: !current } : m)));
    try { await api.put(`/chat/messages/${messageId}/star`, { starred: !current }); refreshSideData(); }
    catch { toast.error('Star update fail'); }
  }, [refreshSideData]);

  const handlePin = useCallback(async (messageId) => {
    const convId = selectedIdRef.current;
    if (!convId) return;
    try {
      await api.put(`/chat/${convId}/pin-message`, { messageId });
      setConversations((prev) => prev.map((c) => (uid(c._id) === uid(convId) ? { ...c, pinnedMessageId: messageId } : c)));
      toast.success(messageId ? 'Message pinned' : 'Unpinned');
    } catch (err) { toast.error(err.response?.data?.message || 'Pin fail'); }
  }, []);

  const handleCopy = useCallback((message) => {
    const text = message.content || (message.attachments || []).map((a) => a.url).join('\n');
    navigator.clipboard?.writeText(text).then(() => toast.success('Copied')).catch(() => {});
  }, []);

  const handleForward = useCallback(async (targetConvId) => {
    if (!forwardMessageIds?.length) return;
    try {
      await api.post('/chat/messages/forward', { messageIds: forwardMessageIds, conversationId: targetConvId });
      toast.success('Message forward ho gaya');
      setForwardMessageIds(null); setSelectedMessages([]); setSelectionMode(false);
      refreshConversations();
    } catch (err) { toast.error(err.response?.data?.message || 'Forward fail'); }
  }, [forwardMessageIds, refreshConversations]);

  const handleRetry = useCallback((message) => {
    sendMessage({ text: message.content, type: message.type, attachments: message.attachments });
    setMessages((prev) => prev.filter((m) => m._id !== message._id));
  }, [sendMessage]);

  const openMessageInfo = useCallback(async (message) => {
    try {
      const { data } = await api.get(`/chat/messages/${message._id}/info`);
      setMessageInfo({ message, info: data });
    } catch { setMessageInfo({ message, info: null }); }
  }, []);

  const openReactionDetails = useCallback(async (message) => {
    try {
      const { data } = await api.get(`/chat/messages/${message._id}/reactions`);
      setReactionDetails({ message, reactions: data });
    } catch { /* ignore */ }
  }, []);

  const reportMessage = useCallback(async (message) => {
    try {
      await api.post('/chat/report', {
        reportedUserId: uid(peer?.id || peer?._id), messageId: message._id,
        conversationId: selectedIdRef.current, reason: 'other', details: 'Reported from chat',
      });
      toast.success('Report bhej diya');
      refreshSideData();
    } catch (err) { toast.error(err.response?.data?.message || 'Report fail'); }
  }, [peer, refreshSideData]);

  /* ── Conversation actions ── */
  const convAction = useCallback(async (action, value) => {
    const convId = selectedIdRef.current;
    if (!convId) return;
    try {
      await api.put(`/chat/settings/${convId}`, { action, value });
      await refreshConversations();
    } catch (err) { toast.error(err.response?.data?.message || 'Action fail'); }
  }, [refreshConversations]);

  const markUnread = useCallback(async (convId) => {
    try {
      await api.put(`/chat/messages/mark-unread/${convId}`);
      setConversations((prev) => prev.map((c) => (uid(c._id) === uid(convId) ? { ...c, unread: Math.max(1, c.unread || 0) } : c)));
    } catch { /* ignore */ }
  }, []);

  const clearChat = useCallback(async () => {
    const convId = selectedIdRef.current;
    if (!convId) return;
    try {
      await api.delete(`/chat/${convId}/clear`);
      setMessages([]);
      toast.success('Chat clear ho gayi (sirf aapke liye)');
    } catch (err) { toast.error(err.response?.data?.message || 'Clear fail'); }
  }, []);

  const deleteChat = useCallback(async () => {
    const convId = selectedIdRef.current;
    if (!convId) return;
    try {
      await api.delete(`/chat/${convId}`);
      setConversations((prev) => prev.filter((c) => uid(c._id) !== uid(convId)));
      setSelectedId(null); setMessages([]);
      toast.success('Chat delete ho gayi');
    } catch (err) { toast.error(err.response?.data?.message || 'Delete fail'); }
  }, []);

  const exportChat = useCallback(() => {
    if (!messages.length) { toast.error('Export ke liye messages nahi hain'); return; }
    const lines = messages.map((m) => {
      const who = m.mine ? (user?.name || 'Me') : (peer?.name || 'Contact');
      const when = new Date(m.createdAt).toLocaleString();
      const body = m.deletedForEveryone ? '[deleted]' : (m.content || (m.attachments || []).map((a) => a.url).join(' '));
      return `[${when}] ${who}: ${body}`;
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chat-${peer?.name || 'export'}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [messages, user, peer]);

  const respondRequest = useCallback(async (conv, action) => {
    try {
      await api.put(`/chat/conversations/${conv._id}/request`, { action });
      refreshSideData(); refreshConversations();
      toast.success(action === 'accept' ? 'Request accept ho gayi' : 'Request hata di');
    } catch (err) { toast.error(err.response?.data?.message || 'Action fail'); }
  }, [refreshSideData, refreshConversations]);

  const startChat = useCallback(async (contact) => {
    try {
      const targetId = uid(contact.user?._id || contact.user?.id || contact._id);
      const { data } = await api.post('/chat/conversations', { targetUserId: targetId });
      await refreshConversations();
      await openConversation(data._id);
    } catch (err) { toast.error(err.response?.data?.message || 'Chat start nahi hui'); }
  }, [refreshConversations, openConversation]);

  const searchInChat = useCallback(async (q) => {
    const convId = selectedIdRef.current;
    if (!convId || !q) return [];
    try {
      const { data } = await api.get(`/chat/messages/${convId}/search`, { params: { q } });
      return data || [];
    } catch { return []; }
  }, []);

  const jumpToMessage = useCallback((messageId) => {
    setHighlightId(messageId);
    const el = document.getElementById(`msg-${messageId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightId(null), 2200);
  }, []);

  const runBackup = useCallback(async () => {
    setBackupRunning(true);
    try {
      const { data } = await api.post('/chat/backup/run');
      setBackup((b) => ({ ...b, lastBackupAt: data.at }));
      toast.success('Backup complete');
    } catch (err) { toast.error(err.response?.data?.message || 'Backup fail'); }
    finally { setBackupRunning(false); }
  }, []);

  const setAppPin = useCallback(async (pin, currentPin) => {
    try {
      await api.post('/chat/privacy/app-lock/pin', { pin, currentPin });
      setPinSet(true);
      toast.success('PIN set ho gaya');
      return true;
    } catch (err) { toast.error(err.response?.data?.message || 'PIN set fail'); return false; }
  }, []);

  const onThemeChange = useCallback((next) => {
    setTheme(next);
    try {
      const stored = JSON.parse(localStorage.getItem('medicore_settings') || '{}');
      localStorage.setItem('medicore_settings', JSON.stringify({ ...stored, theme: next }));
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', next === 'dark' || (next === 'system' && prefersDark));
    } catch { /* ignore */ }
  }, []);

  const requestDesktopPermission = useCallback(() => {
    try { Notification?.requestPermission?.(); } catch { /* ignore */ }
  }, []);

  const unblockUser = useCallback(async (userId) => {
    const conv = conversations.find((c) => uid((c.participants || []).find((p) => uid(p._id || p) !== meId)?._id) === uid(userId));
    if (!conv) { toast.error('Conversation nahi mili'); return; }
    try {
      await api.put(`/chat/settings/${conv._id}`, { action: 'block', value: false });
      refreshSideData(); refreshConversations();
      toast.success('Unblock ho gaya');
    } catch (err) { toast.error(err.response?.data?.message || 'Unblock fail'); }
  }, [conversations, meId, refreshSideData, refreshConversations]);

  /* ── Wallpaper apply ── */
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    const convWall = readConversationWallpapers()[uid(selectedId)] || prefs.wallpaper;
    const css = wallpaperCss(convWall, isDark);
    const el = document.getElementById('chat-wallpaper');
    if (el) el.style.cssText = css;
  }, [selectedId, prefs.wallpaper, theme]);

  /* ── Draft autosave (local + server) ── */
  useEffect(() => {
    if (!selectedIdRef.current) return undefined;
    const convId = selectedIdRef.current;
    const t = setTimeout(() => {
      if (draftText) api.put(`/chat/${convId}/draft`, { text: draftText }).catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [draftText, selectedId]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowEmoji(false); setViewer(null); setMessageInfo(null); setReactionDetails(null); setForwardMessageIds(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && selectedIdRef.current) {
        e.preventDefault(); setShowInfo(true);
      }
      if (e.key === 'ArrowUp' && !draftText && messages.length && !editMessage) {
        const last = [...messages].reverse().find((m) => m.mine && !m.deletedForEveryone);
        if (last) { e.preventDefault(); setEditMessage({ _id: last._id, content: last.content }); setDraftText(last.content); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draftText, messages, editMessage]);

  const sendCurrent = useCallback(() => {
    if (editMessage) { handleEditSubmit(editMessage._id, draftText.trim()); setDraftText(''); return; }
    sendMessage({ text: draftText.trim() });
  }, [editMessage, draftText, handleEditSubmit, sendMessage]);

  const onComposerKeyDown = (e) => {
    const enterSends = prefs.sendWithEnter !== false;
    if (e.key === 'Enter' && !e.shiftKey && enterSends) { e.preventDefault(); sendCurrent(); }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-[520px] -m-4 sm:-m-6 bg-background overflow-hidden">
      <div className={`${selectedId ? 'hidden md:flex' : 'flex'} flex-shrink-0 h-full`}>
        <ChatList
          conversations={conversations.map((c) => ({ ...c, me: meId }))}
          contacts={contacts}
          requests={requests}
          filter={filter}
          setFilter={setFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          typingUsers={typingUsers}
          recordingUsers={recordingUsers}
          drafts={drafts}
          selectedId={selectedId}
          onOpen={(c) => openConversation(c._id)}
          onTogglePin={(c) => api.put(`/chat/settings/${c._id}`, { action: 'pin', value: !c.pinned }).then(refreshConversations)}
          onToggleMute={(c) => api.put(`/chat/settings/${c._id}`, { action: 'mute', value: !c.muted }).then(refreshConversations)}
          onToggleArchive={(c) => api.put(`/chat/settings/${c._id}`, { action: 'archive', value: !c.archived }).then(refreshConversations)}
          onDeleteChat={(c) => api.delete(`/chat/${c._id}`).then(() => {
            setConversations((p) => p.filter((x) => uid(x._id) !== uid(c._id)));
            if (uid(selectedId) === uid(c._id)) setSelectedId(null);
            toast.success('Chat delete ho gayi');
          })}
          onMarkUnread={(c) => markUnread(c._id)}
          onNewChat={startChat}
          onAcceptRequest={(r) => respondRequest(r, 'accept')}
          onDeclineRequest={(r, action) => respondRequest(r, action)}
          onOpenSettings={() => setShowSettings(true)}
          hidePreviewsInLocked={privacy.hideLockedNotifications !== false}
        />
      </div>

      <div className={`flex-1 flex-col min-w-0 h-full ${selectedId ? 'flex' : 'hidden md:flex'}`}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 text-muted-foreground">
            <MessageCircle className="w-14 h-14 mb-4 opacity-30" />
            <p className="text-base font-medium text-foreground">Select a chat to start messaging</p>
            <p className="text-[13px] mt-1">Doctor ↔ patient ke beech secure 1-to-1 chat</p>
          </div>
        ) : (
          <>
            {/*__RENDER_HDR__*/}
            <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border bg-card">
              <button onClick={() => setSelectedId(null)} className="md:hidden p-1.5 rounded-full hover:bg-muted text-muted-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setShowInfo(true)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center overflow-hidden">
                    {peer?.avatar ? <img src={peer.avatar} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 opacity-60" />}
                  </div>
                  {peer?.isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold truncate">{peer?.name || 'Chat'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {tables.recording ? 'recording audio…'
                      : tables.typing ? 'typing…'
                        : peer?.isOnline ? 'Online'
                          : peer?.lastActive ? `Last seen ${format(new Date(peer.lastActive), 'dd MMM, HH:mm')}`
                            : 'Offline'}
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-0.5">
                {selectionMode ? (
                  <>
                    <button onClick={() => setForwardMessageIds(selectedMessages)} disabled={!selectedMessages.length} className="px-2.5 py-1.5 rounded-lg bg-muted text-[11px] font-medium disabled:opacity-50">
                      Forward
                    </button>
                    <button
                      onClick={async () => {
                        if (!selectedMessages.length) return;
                        await api.post('/chat/messages/bulk-delete', { messageIds: selectedMessages });
                        setMessages((p) => p.filter((m) => !selectedMessages.includes(m._id)));
                        setSelectedMessages([]); setSelectionMode(false);
                        toast.success('Deleted');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-medium"
                    >
                      Delete
                    </button>
                    <button onClick={() => { setSelectionMode(false); setSelectedMessages([]); }} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setSelectionMode(true)} className="p-2 rounded-full hover:bg-muted text-muted-foreground hidden sm:block" title="Select messages">
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowInfo(true)} className="p-2 rounded-full hover:bg-muted text-muted-foreground" title="Chat info">
                      <Info className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-muted text-muted-foreground" title="Chat settings">
                      <SettingsIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {!connected && (
              <div className="px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] flex items-center gap-1.5 justify-center">
                <WifiOff className="w-3.5 h-3.5" /> Offline — messages queue honge{queuedCount ? ` (${queuedCount} pending)` : ''}
              </div>
            )}

            {pinnedMsg && (
              <div className="px-3 py-1.5 bg-muted/60 border-b border-border flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <button onClick={() => jumpToMessage(pinnedMsg._id)} className="text-[11px] truncate flex-1 text-left">
                  {pinnedMsg.content || messagePreview(pinnedMsg) || 'Pinned message'}
                </button>
                <button onClick={() => handlePin(null)} className="text-muted-foreground text-[11px] hover:text-foreground">Unpin</button>
              </div>
            )}

            <div id="chat-wallpaper" ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll relative">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">Loading…</div>
              ) : !messages.length ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">No messages yet — say hello 👋</div>
              ) : (
                <div className="py-3">
                  {grouped.map((item) => (item.kind === 'day' ? (
                    <DateSeparator key={item.id} label={item.label} />
                  ) : (
                    <div key={item.message._id} id={`msg-${item.message._id}`}>
                      <MessageBubble
                        message={item.message}
                        isMine={item.message.mine || uid(item.message.sender) === meId}
                        prefs={prefs}
                        peerName={peer?.name || 'Contact'}
                        onReply={(m) => { setReplyTo(m); setEditMessage(null); }}
                        onReact={(m, emoji) => handleReact(m._id, emoji)}
                        onEdit={(m) => { setEditMessage({ _id: m._id, content: m.content }); setDraftText(m.content); }}
                        onDelete={(m, scope) => handleDelete(m._id, scope)}
                        onStar={(m) => handleStar(m._id, m.starred)}
                        onPin={(m) => handlePin(uid(m._id) === uid(pinnedMsg?._id) ? null : m._id)}
                        onForward={(m) => setForwardMessageIds([m._id])}
                        onCopy={handleCopy}
                        onInfo={openMessageInfo}
                        onReport={reportMessage}
                        onRetry={handleRetry}
                        onOpenMedia={(att, all) => {
                          const list = all || [att];
                          setViewer({ items: list.map((a) => ({ ...a, url: mediaUrl(a.url) })), index: Math.max(0, list.findIndex((a) => a.url === att.url)) });
                        }}
                        onJumpToReply={(id) => id && jumpToMessage(id)}
                        onShowReactions={openReactionDetails}
                        selectionMode={selectionMode}
                        selected={selectedMessages.includes(item.message._id)}
                        onToggleSelect={(m) => {
                          setSelectionMode(true);
                          setSelectedMessages((p) => (p.includes(m._id) ? p.filter((x) => x !== m._id) : [...p, m._id]));
                        }}
                        highlight={highlightId === item.message._id}
                      />
                    </div>
                  )))}
                </div>
              )}

              <button
                onClick={() => scrollToBottom()}
                className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
                title="Scroll to bottom"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <div className="border-t border-border bg-card">
              {(replyTo || editMessage) && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
                  {editMessage ? <Pencil className="w-4 h-4 text-primary" /> : <Reply className="w-4 h-4 text-primary" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-primary">
                      {editMessage ? 'Editing message' : `Replying to ${uid(replyTo?.sender) === meId ? 'yourself' : (peer?.name || 'Contact')}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {(editMessage?.content || replyTo?.content || messagePreview(replyTo) || '').slice(0, 120)}
                    </p>
                  </div>
                  <button
                    onClick={() => { setReplyTo(null); setEditMessage(null); setDraftText(''); }}
                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {uploading !== false && (
                <div className="px-3 py-1.5 text-[11px] text-muted-foreground flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" /> Uploading…
                </div>
              )}

              <div className="flex items-end gap-1.5 p-2.5 relative">
                <button onClick={() => setShowEmoji((v) => !v)} className="p-2 rounded-full hover:bg-muted text-muted-foreground flex-shrink-0" title="Emoji / Stickers / GIF">
                  <Smile className="w-5 h-5" />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-muted text-muted-foreground flex-shrink-0" title="Attach image / video / document">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleFilesPicked(e.target.files); e.target.value = ''; }}
                />

                {recordingVoice ? (
                  <VoiceRecorder
                    onSend={handleVoiceSend}
                    onCancel={() => {
                      setRecordingVoice(false);
                      getSocket().emit('chat:recording', { conversationId: selectedId, isRecording: false });
                    }}
                    onRecordingChange={(on) => getSocket().emit('chat:recording', { conversationId: selectedId, isRecording: on })}
                  />
                ) : (
                  <>
                    <textarea
                      value={draftText}
                      onChange={(e) => updateDraft(selectedId, e.target.value)}
                      onKeyDown={onComposerKeyDown}
                      placeholder="Type a message…"
                      rows={1}
                      className="flex-1 resize-none bg-muted/50 border border-border rounded-2xl px-3.5 py-2 text-[13.5px] max-h-32 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    {draftText.trim() || editMessage ? (
                      <button onClick={sendCurrent} className="p-2.5 rounded-full bg-primary text-primary-foreground flex-shrink-0" title="Send">
                        <Send className="w-[18px] h-[18px]" />
                      </button>
                    ) : (
                      <button onClick={() => setRecordingVoice(true)} className="p-2 rounded-full hover:bg-muted text-muted-foreground flex-shrink-0" title="Record voice message">
                        <Mic className="w-5 h-5" />
                      </button>
                    )}
                  </>
                )}

                {showEmoji && (
                  <div className="absolute bottom-[64px] left-2 z-40">
                    <EmojiPicker
                      onPickEmoji={(emoji) => updateDraft(selectedId, `${draftText}${emoji}`)}
                      onPickSticker={(s) => { sendMessage({ text: s }); setShowEmoji(false); }}
                      onPickGif={(url) => { sendMessage({ text: url }); setShowEmoji(false); }}
                      onClose={() => setShowEmoji(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Info panel ── */}
      <ChatInfoPanel
        open={showInfo && Boolean(selectedId)}
        onClose={() => setShowInfo(false)}
        peer={peer}
        conversation={{ ...(activeConv || {}), wallpaper: readConversationWallpapers()[uid(selectedId)] }}
        media={gallery.media || []}
        links={gallery.links || []}
        files={gallery.files || []}
        starred={starred}
        onToggle={convAction}
        onOpenMedia={(items, index) => setViewer({ items: (items || []).map((a) => ({ ...a, url: mediaUrl(a.url) })), index: index || 0 })}
        onJump={jumpToMessage}
        onClearChat={clearChat}
        onDeleteChat={deleteChat}
        onBlock={() => convAction('block', !(activeConv?.blocked))}
        onReport={() => reportMessage(messages[messages.length - 1] || {})}
        onExport={exportChat}
        onWallpaper={(value) => {
          setConversationWallpaper(uid(selectedId), value);
          setPrefs({ wallpaper: value });
          convAction('wallpaper', value);
        }}
        onSearch={searchInChat}
        onUnstar={(m) => handleStar(m._id, true)}
      />

      {/* ── Settings panel ── */}
      <ChatSettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        privacy={privacy}
        setPrivacyField={setPrivacyField}
        prefs={prefs}
        setPrefs={setPrefs}
        theme={theme}
        onThemeChange={onThemeChange}
        blocked={blocked}
        onUnblock={unblockUser}
        reports={reports}
        storage={storage}
        backup={backup}
        setBackup={(patch) => setBackup((b) => ({ ...b, ...patch }))}
        onRunBackup={runBackup}
        backupRunning={backupRunning}
        pinSet={pinSet}
        onSetPin={setAppPin}
        onLogoutAll={() => toast.info('Account settings se logout-all karein')}
        onRequestDesktopPermission={requestDesktopPermission}
        locks={conversations.filter((c) => c.locked).map((c) => ({ ...c, other: (c.participants || []).find((p) => uid(p._id || p) !== meId) }))}
        onOpenLocked={(c) => { setShowSettings(false); openConversation(c._id); }}
        onClearAllDrafts={() => {
          Object.keys(readDrafts()).forEach((k) => saveDraft(k, ''));
          setDrafts({}); setDraftText('');
        }}
        onClearCache={() => { toast.success('Cache saaf ho gaya'); refreshStorage(); }}
      />

      {/* ── Media viewer ── */}
      {viewer && (
        <MediaViewer
          items={viewer.items}
          index={viewer.index}
          onClose={() => setViewer(null)}
          onSendToChat={() => setViewer(null)}
        />
      )}

      {/* ── Reaction details ── */}
      {reactionDetails && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReactionDetails(null)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-sm chat-pop-enter">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Reactions</h3>
              <button onClick={() => setReactionDetails(null)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 max-h-72 overflow-y-auto scrollbar-thin">
              {reactionDetails.reactions?.length ? reactionDetails.reactions.map((r, i) => (
                <div key={`${r.user?._id || i}-${i}`} className="flex items-center gap-3 py-2">
                  <span className="text-lg">{r.emoji}</span>
                  <span className="text-[13px] flex-1 truncate">{r.user?.name || 'User'}{r.mine ? ' (you)' : ''}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {r.at ? new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              )) : <p className="text-[12px] text-muted-foreground text-center py-6">No reactions</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Message info ── */}
      {messageInfo && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMessageInfo(null)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-sm chat-pop-enter">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Message info</h3>
              <button onClick={() => setMessageInfo(null)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-[12px]">
              <div className="bg-muted/50 rounded-lg p-3">
                {messageInfo.message.content || messagePreview(messageInfo.message)}
              </div>
              <p className="flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-muted-foreground" />
                Sent: {new Date(messageInfo.message.createdAt).toLocaleString()}
              </p>
              <p className="flex items-center gap-2">
                <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
                Delivered: {(messageInfo.message.deliveredCount || 0) > 0 ? 'Yes' : 'Pending'}
              </p>
              <p className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-sky-500" />
                Read: {(messageInfo.message.readCount || 0) > 0 ? 'Yes' : 'Not yet'}
              </p>
              {messageInfo.message.edited && (
                <p className="flex items-center gap-2"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Edited message</p>
              )}
              {messageInfo.message.starred && (
                <p className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-amber-500" /> Starred</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Forward picker ── */}
      {forwardMessageIds && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setForwardMessageIds(null)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-sm chat-pop-enter">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Forward to…</h3>
              <button onClick={() => setForwardMessageIds(null)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto scrollbar-thin">
              {conversations.filter((c) => uid(c._id) !== uid(selectedId)).length === 0 && (
                <p className="text-[12px] text-muted-foreground text-center py-8">
                  Forward karne ke liye koi doosra chat nahi hai
                </p>
              )}
              {conversations.filter((c) => uid(c._id) !== uid(selectedId)).map((c) => {
                const other = (c.participants || []).find((p) => uid(p._id || p) !== meId) || {};
                return (
                  <button
                    key={c._id}
                    onClick={() => handleForward(c._id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center overflow-hidden">
                      {other.avatar ? <img src={other.avatar} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4 opacity-60" />}
                    </div>
                    <span className="text-[13px] font-medium truncate flex-1">{other.name || 'Chat'}</span>
                    <Forward className="w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
