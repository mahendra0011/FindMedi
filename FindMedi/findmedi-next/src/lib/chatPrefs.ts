/**
 * Chat UI preferences (client-side, device local) + shared chat helpers.
 */

const KEY = 'medicore_chat_prefs';

export interface ChatPrefs {
  wallpaper?: string;
  bubbleStyle?: 'rounded' | 'classic' | 'compact';
  density?: 'comfortable' | 'compact';
  fontScale?: number;
  animations?: boolean;
  reduceMotion?: boolean;
  sendWithEnter?: boolean;
  quickReaction?: string;
  notificationSoundName?: string;
  hideLockedPreviews?: boolean;
  accent?: string;
  customWallpaper?: string;
  highContrast?: boolean;
  mediaQuality?: string;
  desktopNotifications?: boolean;
  savedMessages?: unknown[];
  autoDownloadWifi?: Record<string, boolean>;
  autoDownloadMobile?: Record<string, boolean>;
  autoDownloadRoaming?: Record<string, boolean>;
  [key: string]: unknown;
}

export const DEFAULT_CHAT_PREFS: ChatPrefs = {
  wallpaper: 'default',
  bubbleStyle: 'rounded',
  density: 'comfortable',
  fontScale: 100,
  animations: true,
  reduceMotion: false,
  sendWithEnter: true,
  quickReaction: '❤️',
  notificationSoundName: 'default',
  hideLockedPreviews: true,
};

export function readChatPrefs(): ChatPrefs {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    return raw ? { ...DEFAULT_CHAT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_CHAT_PREFS };
  } catch {
    return { ...DEFAULT_CHAT_PREFS };
  }
}

export function writeChatPrefs(patch: Partial<ChatPrefs> = {}): ChatPrefs {
  const next = { ...readChatPrefs(), ...patch };
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full / private mode */
  }
  return next;
}

/** Chat wallpaper presets */
export const WALLPAPERS = [
  { value: 'default', label: 'Default', css: 'linear-gradient(160deg, hsl(var(--muted)/0.55), hsl(var(--background)))' },
  { value: 'mint', label: 'Mint', css: 'linear-gradient(160deg,#e7f7f0,#f7fdfa)' },
  { value: 'sky', label: 'Sky', css: 'linear-gradient(160deg,#e6f1fb,#fbfdff)' },
  { value: 'lilac', label: 'Lilac', css: 'linear-gradient(160deg,#efe9fb,#fdfcff)' },
  { value: 'sand', label: 'Sand', css: 'linear-gradient(160deg,#faf3e6,#fffdf8)' },
  { value: 'dusk', label: 'Dusk', css: 'linear-gradient(160deg,#232a3b,#111726)' },
  { value: 'plain', label: 'Plain', css: 'hsl(var(--background))' },
];

export const wallpaperCss = (value?: string, _isDark?: boolean): string => {
  void _isDark;
  return (WALLPAPERS.find((w) => w.value === value) || WALLPAPERS[0] || { css: '' }).css;
};

const WALLPAPER_KEY = 'medicore_chat_wallpapers';

export function readConversationWallpapers(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(WALLPAPER_KEY) || '{}');
  } catch {
    return {};
  }
}

export function setConversationWallpaper(conversationId: string, value: string): Record<string, string> {
  const all = readConversationWallpapers();
  if (!value || value === 'default') delete all[conversationId];
  else all[conversationId] = value;
  try {
    localStorage.setItem(WALLPAPER_KEY, JSON.stringify(all));
  } catch {}
  return all;
}

const DRAFT_KEY = 'medicore_chat_drafts';

export function readDrafts(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveDraft(conversationId: string, text: string): Record<string, string> {
  const all = readDrafts();
  if (text) all[conversationId] = text;
  else delete all[conversationId];
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
  } catch {}
  return all;
}

const QUEUE_KEY = 'medicore_chat_queue';

export interface QueuedMessage {
  clientGeneratedId: string;
  [key: string]: unknown;
}

export function readQueue(userId: string): QueuedMessage[] {
  try {
    return JSON.parse(localStorage.getItem(`${QUEUE_KEY}_${userId}`) || '[]');
  } catch {
    return [];
  }
}

export function writeQueue(userId: string, items: QueuedMessage[]): QueuedMessage[] {
  try {
    localStorage.setItem(`${QUEUE_KEY}_${userId}`, JSON.stringify(items));
  } catch {}
  return items;
}

export function enqueueMessage(userId: string, payload: QueuedMessage): QueuedMessage[] {
  const items = readQueue(userId);
  items.push(payload);
  return writeQueue(userId, items);
}

export function dequeueMessage(userId: string, clientGeneratedId: string): QueuedMessage[] {
  return writeQueue(userId, readQueue(userId).filter((i) => i.clientGeneratedId !== clientGeneratedId));
}

export function formatBytes(bytes = 0): string {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function formatDuration(seconds = 0): string {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const LINK_REGEX = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
const SUSPICIOUS_HOSTS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rb.gy', 'shorturl.at'];

export function isSuspiciousLink(url = ''): boolean {
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
    const riskyTld = /\.(zip|mov|top|xyz|click|link|country|gq|tk|ml|cf|work)$/.test(host);
    return SUSPICIOUS_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)) || riskyTld;
  } catch {
    return false;
  }
}

export interface ParsedNode {
  type: 'text' | 'bold' | 'strike' | 'code' | 'italic' | 'link';
  value: string;
}

export function parseRichText(text = ''): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~|`[^`]+`|https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
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

export interface MessagePreviewItem {
  type?: string;
  content?: string;
  deletedForEveryone?: boolean;
  attachments?: Array<{ name?: string }>;
}

export function messagePreview(msg?: MessagePreviewItem): string {
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

export function initialsOf(name = ''): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';
}

export const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

export const EMOJI_GROUPS = [
  { key: 'smileys', label: 'Smileys', emojis: ['😀', '😃', '😁', '😆', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😗', '😚', '😋', '😜', '🤪', '😝', '🤗', '🤔', '🤨', '😐', '😑', '😶', '😏', '😴', '😪', '😌', '😔', '😞', '😢', '😭', '😤', '😠', '😡', '🤬', '😱', '😰', '😥', '🥶', '😵', '🤯', '🤒', '🤕', '🤢', '🤮', '🤧', '🥳', '🥺', '😎', '🤓', '🧐'] },
  { key: 'gestures', label: 'Gestures', emojis: ['👍', '👎', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '💪', '🫶', '👏', '🙌', '🤲', '🫡', '🖕'] },
  { key: 'hearts', label: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💗', '💖', '💝', '💟', '♥️'] },
  { key: 'health', label: 'Health', emojis: ['🩺', '💊', '💉', '🩹', '🧬', '🧪', '🔬', '🚑', '🦷', '🫁', '🧠', '🦴', '👁️', '🩻', '🛌', '🧴'] },
  { key: 'objects', label: 'Objects', emojis: ['📷', '🎥', '📹', '🎙️', '📞', '📱', '💻', '🖱️', '📄', '📁', '📎', '🔗', '📌', '📍', '📊', '📈', '🔔', '🔕', '🔒', '🔓', '💰', '💳', '⭐', '📝', '✏️', '✅', '❌', '⚠️', '❗'] },
  { key: 'nature', label: 'Nature', emojis: ['☀️', '🌤️', '⛅', '🌧️', '⛈️', '🔥', '💧', '🌈', '🌸', '🌹', '🌻', '🌷', '🍀', '🌱', '🌳', '🐶', '🐱', '🐾', '🦋', '🐝'] },
  { key: 'food', label: 'Food', emojis: ['🍎', '🍌', '🍊', '🍇', '🍓', '🥭', '🍍', '🥥', '🥗', '🍲', '🍛', '🫖', '☕', '🥛', '🍰', '🍫', '🍪', '🥣'] },
  { key: 'travel', label: 'Travel', emojis: ['✈️', '🚗', '🚕', '🛵', '🚲', '🚌', '🚆', '🚇', '⛽', '🗺️', '🏖️', '🏔️', '🏨', '🏢', '🌉'] },
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
