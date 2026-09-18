/**
 * Chat UI preferences (client-side, device local) + shared chat helpers.
 *
 * Server-side privacy/notification prefs ChatPrivacy collection me rehte hain
 * (/api/chat/privacy). Jo cheezein purely visual hain (wallpaper, bubble style,
 * font size, density, animations) unhe localStorage me rakhte hain taaki
 * theme/layout change bina network round-trip ke instantly apply ho jaye.
 */

const KEY = 'findmedi_chat_prefs';
const LEGACY_KEY = 'medicore_chat_prefs';

export const DEFAULT_CHAT_PREFS = {
  wallpaper: 'default',
  bubbleStyle: 'rounded',   // rounded | classic | compact
  density: 'comfortable',   // comfortable | compact
  fontScale: 100,           // 80 – 150 (%)
  animations: true,
  reduceMotion: false,
  sendWithEnter: true,
  quickReaction: '❤️',
  notificationSoundName: 'default',
  hideLockedPreviews: true,
};

export function readChatPrefs() {
  try {
    const raw = typeof localStorage !== 'undefined' ? (localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY)) : null;
    return raw ? { ...DEFAULT_CHAT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_CHAT_PREFS };
  } catch {
    return { ...DEFAULT_CHAT_PREFS };
  }
}

export function writeChatPrefs(patch = {}) {
  const next = { ...readChatPrefs(), ...patch };
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* storage full / private mode — UI still works for this session */ }
  return next;
}

/** Chat wallpaper presets. CSS value bubble container par lagti hai. */
export const WALLPAPERS = [
  { value: 'default', label: 'Default', css: 'linear-gradient(160deg, hsl(var(--muted)/0.55), hsl(var(--background)))' },
  { value: 'mint', label: 'Mint', css: 'linear-gradient(160deg,#e7f7f0,#f7fdfa)' },
  { value: 'sky', label: 'Sky', css: 'linear-gradient(160deg,#e6f1fb,#fbfdff)' },
  { value: 'lilac', label: 'Lilac', css: 'linear-gradient(160deg,#efe9fb,#fdfcff)' },
  { value: 'sand', label: 'Sand', css: 'linear-gradient(160deg,#faf3e6,#fffdf8)' },
  { value: 'dusk', label: 'Dusk', css: 'linear-gradient(160deg,#232a3b,#111726)' },
  { value: 'plain', label: 'Plain', css: 'hsl(var(--background))' },
];

export const wallpaperCss = (value) =>
  (WALLPAPERS.find((w) => w.value === value) || WALLPAPERS[0]).css;

/** Per-conversation wallpaper override (device local). */
const WALLPAPER_KEY = 'findmedi_chat_wallpapers';
const LEGACY_WALLPAPER_KEY = 'medicore_chat_wallpapers';

export function readConversationWallpapers() {
  try {
    return JSON.parse((localStorage.getItem(WALLPAPER_KEY) || localStorage.getItem(LEGACY_WALLPAPER_KEY)) || '{}');
  } catch {
    return {};
  }
}

export function setConversationWallpaper(conversationId, value) {
  const all = readConversationWallpapers();
  if (!value || value === 'default') delete all[conversationId];
  else all[conversationId] = value;
  try { localStorage.setItem(WALLPAPER_KEY, JSON.stringify(all)); } catch { /* ignore */ }
  return all;
}

// ─── Per-conversation drafts (offline queue se alag) ────────────────────────
const DRAFT_KEY = 'findmedi_chat_drafts';
const LEGACY_DRAFT_KEY = 'medicore_chat_drafts';

export function readDrafts() {
  try { return JSON.parse((localStorage.getItem(DRAFT_KEY) || localStorage.getItem(LEGACY_DRAFT_KEY)) || '{}'); } catch { return {}; }
}

export function saveDraft(conversationId, text) {
  const all = readDrafts();
  if (text) all[conversationId] = text;
  else delete all[conversationId];
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(all)); } catch { /* ignore */ }
  return all;
}

// ─── Offline message queue ─────────────────────────────────────────────────
// Internet jaane par bheja gaya message yahan queue hota hai aur reconnect
// hone par socket emit se pehle HTTP se flush hota hai (duplicate-safe via
// clientGeneratedId — server isi id ko message par store karta hai).
const QUEUE_KEY = 'findmedi_chat_queue';
const LEGACY_QUEUE_KEY = 'medicore_chat_queue';

export function readQueue(userId) {
  try { return JSON.parse((localStorage.getItem(`${QUEUE_KEY}_${userId}`) || localStorage.getItem(`${LEGACY_QUEUE_KEY}_${userId}`)) || '[]'); } catch { return []; }
}

export function writeQueue(userId, items) {
  try {
    localStorage.setItem(`${QUEUE_KEY}_${userId}`, JSON.stringify(items));
  } catch { /* ignore */ }
  return items;
}

export function enqueueMessage(userId, payload) {
  const items = readQueue(userId);
  items.push(payload);
  return writeQueue(userId, items);
}

export function dequeueMessage(userId, clientGeneratedId) {
  return writeQueue(userId, readQueue(userId).filter((i) => i.clientGeneratedId !== clientGeneratedId));
}

// ─── Shared formatting helpers ─────────────────────────────────────────────
export function formatBytes(bytes = 0) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function formatDuration(seconds = 0) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const LINK_REGEX = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
const SUSPICIOUS_HOSTS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rb.gy', 'shorturl.at'];

export function isSuspiciousLink(url = '') {
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
    const riskyTld = /\.(zip|mov|top|xyz|click|link|country|gq|tk|ml|cf|work)$/.test(host);
    return SUSPICIOUS_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)) || riskyTld;
  } catch {
    return false;
  }
}

/** Text ko React-safe segments me todo: links + **bold** _italic_ ~~strike~~ `code` */
export function parseRichText(text = '') {
  const nodes = [];
  const pattern = /(\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~|`[^`]+`|https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push({ type: 'text', value: text.slice(last, match.index) });
    const token = match[0];
    if (token.startsWith('**')) nodes.push({ type: 'bold', value: token.slice(2, -2) });
    else if (token.startsWith('~~')) nodes.push({ type: 'strike', value: token.slice(2, -2) });
    else if (token.startsWith('`')) nodes.push({ type: 'code', value: token.slice(1, -1) });
    else if (token.startsWith('_')) nodes.push({ type: 'italic', value: token.slice(1, -1) });
    else nodes.push({ type: 'link', value: token });
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push({ type: 'text', value: text.slice(last) });
  return nodes;
}

/** Emoji-shortcut + message text ki ek matching description (chat list preview). */
export function messagePreview(msg) {
  if (!msg) return '';
  if (msg.deletedForEveryone) return '🚫 This message was deleted';
  switch (msg.type) {
    case 'image': return '📷 Photo';
    case 'video': return '🎥 Video';
    case 'audio': return '🎵 Audio';
    case 'voice': return '🎙️ Voice message';
    case 'file': return `📄 ${msg.attachments?.[0]?.name || 'Document'}`;
    default: return msg.content || '';
  }
}

export function initialsOf(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';
}

export const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

/** Emoji picker data — WhatsApp/Telegram jaisa grouped, searchable (unicode aware). */
export const EMOJI_GROUPS = [
  { key: 'smileys', label: 'Smileys', emojis: ['😀', '😃', '', '😁', '😆', '', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😗', '', '😚', '😋', '😜', '🤪', '😝', '🤗', '🤔', '🤨', '😐', '😑', '😶', '', '😏', '😴', '😪', '😌', '😔', '😞', '😢', '😭', '😤', '😠', '😡', '🤬', '😱', '', '😰', '😥', '', '🥶', '😵', '🤯', '🤒', '🤕', '🤢', '🤮', '', '🤧', '🥳', '🥺', '', '😎', '🤓', '🧐'] },
  { key: 'gestures', label: 'Gestures', emojis: ['👍', '👎', '', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '💪', '', '🫶', '👏', '🙌', '🤲', '🫡', '🖕'] },
  { key: 'hearts', label: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '', '💔', '❣️', '💕', '💞', '', '💗', '💖', '', '💝', '💟', '♥️', ''] },
  { key: 'health', label: 'Health', emojis: ['🩺', '💊', '💉', '🩹', '', '🧬', '🧪', '🔬', '', '🚑', '‍⚕️', '👨‍️', '👩‍⚕️', '🦷', '', '🫁', '🧠', '🦴', '👁️', '🩻', '🛌', '', '🧴', ''] },
  { key: 'objects', label: 'Objects', emojis: ['📷', '🎥', '📹', '🎙️', '📞', '📱', '💻', '️', '️', '🖱️', '📄', '📁', '📎', '🔗', '📌', '📍', '📊', '📈', '️', '', '', '🔔', '🔕', '', '🔒', '🔓', '', '💰', '💳', '⭐', '📝', '✏️', '️', '✅', '❌', '⚠️', '', '❗'] },
  { key: 'nature', label: 'Nature', emojis: ['☀️', '🌤️', '⛅', '🌧️', '⛈️', '️', '🔥', '💧', '🌈', '🌸', '🌹', '🌻', '🌷', '🍀', '🌱', '🌳', '🐶', '🐱', '🐾', '🦋', '🐝'] },
  { key: 'food', label: 'Food', emojis: ['🍎', '🍌', '🍊', '🍇', '🍓', '🥭', '🍍', '🥥', '🥗', '🍲', '🍛', '🫖', '☕', '', '🥛', '🍰', '', '🍫', '🍪', '🥣'] },
  { key: 'travel', label: 'Travel', emojis: ['✈️', '🚗', '🚕', '🛵', '🚲', '🚌', '🚆', '🚇', '⛽', '🗺️', '🏖️', '🏔️', '🏨', '', '🏢', '', '🌉'] },
];

export function searchEmoji(query = '') {
  const q = query.trim().toLowerCase();
  if (!q) return EMOJI_GROUPS;
  return EMOJI_GROUPS
    .map((g) => ({ ...g, emojis: g.emojis.filter((e) => g.label.toLowerCase().includes(q) || e.includes(q)) }))
    .filter((g) => g.emojis.length);
}

export const STICKER_PACKS = [
  { label: 'Care', stickers: ['🩺 Take care!', '💊 Time for your dose', '💧 Stay hydrated', '🛌 Take rest', '✅ All good'] },
  { label: 'Reactions', stickers: ['👍 Got it, doctor', '🙏 Thank you!', '😊 Feeling better', '⏰ Running late', '📄 Reports attached'] },
  { label: 'Quick', stickers: ['📍 Sharing my location', '📞 Please call me', '🕐 See you at the clinic', '💰 Fee paid', '🎉 Recovery complete'] },
];
