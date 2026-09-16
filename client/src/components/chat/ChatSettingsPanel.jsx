import React, { useEffect, useState } from 'react';
import {
  X, Lock, Shield, Bell, Palette, HardDrive, ShieldAlert, KeyRound, Cloud, Eye,
  Accessibility, Info, User as UserIcon, MessageSquare, ChevronRight, Check,
  Trash2, Ban, Flag, Loader2, Mic, Phone as PhoneIcon,
} from 'lucide-react';
import api from '@/lib/axios';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { WALLPAPERS, wallpaperCss } from '@/lib/chatPrefs';

/* ───────────────────────────── generic rows ───────────────────────────── */

export function SectionCard({ title, description, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      {title && (
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function Row({ icon: Icon, title, description, children, danger }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 ${danger ? 'text-red-600 dark:text-red-400' : ''}`}>
      {Icon && <Icon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium leading-snug">{title}</p>
        {description && <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

/** iOS-style segmented control (enum settings ke liye) */
export function Segmented({ value, options, onChange, className = '' }) {
  return (
    <div className={`flex bg-muted rounded-full p-0.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          title={o.title || o.label}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
            value === o.value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ToggleRow({ icon, title, description, checked, onChange, disabled }) {
  return (
    <Row icon={icon} title={title} description={description}>
      <Switch checked={Boolean(checked)} onCheckedChange={onChange} disabled={disabled} />
    </Row>
  );
}

export function SelectRow({ icon, title, description, value, options, onChange }) {
  return (
    <Row icon={icon} title={title} description={description}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-muted border border-border rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Row>
  );
}

/* ───────────────────────────── appearance ───────────────────────────── */

const ACCENT_OPTIONS = [
  { value: 'emerald', color: '#059669' },
  { value: 'blue', color: '#2563eb' },
  { value: 'violet', color: '#7c3aed' },
  { value: 'rose', color: '#e11d48' },
  { value: 'amber', color: '#d97706' },
];

export function AppearanceSettings({ prefs, setPrefs, theme, onThemeChange, privacy, setPrivacyField }) {
  const appearance = privacy.appearance || {};

  const update = (patch) => {
    setPrefs(patch);
    const serverPatch = {};
    if (patch.wallpaper !== undefined) serverPatch.wallpaper = patch.wallpaper;
    if (patch.bubbleStyle !== undefined) serverPatch.bubbleStyle = patch.bubbleStyle;
    if (patch.density !== undefined) serverPatch.density = patch.density;
    if (patch.animations !== undefined) serverPatch.animations = patch.animations;
    if (patch.reduceMotion !== undefined) serverPatch.reduceMotion = patch.reduceMotion;
    if (patch.fontScale !== undefined) serverPatch.fontScale = patch.fontScale;
    if (Object.keys(serverPatch).length) setPrivacyField('appearance', { ...appearance, ...serverPatch });
  };

  const onCustomWallpaper = (file) => {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => update({ customWallpaper: fr.result, wallpaper: 'custom' });
    fr.readAsDataURL(file);
  };

  return (
    <>
      <SectionCard title="Theme" description="Chat ka overall look — poore app par apply hota hai.">
        <SegmentedRow
          title="Theme"
          value={theme || 'system'}
          onChange={(v) => { onThemeChange(v); setPrivacyField('appearance', { ...appearance, theme: v }); }}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
        <Row title="Accent colour" description="Outgoing bubbles aur highlights ka rang.">
          <div className="flex items-center gap-1.5">
            {ACCENT_OPTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => { update({ accent: a.value }); setPrivacyField('appearance', { ...appearance, accent: a.value }); }}
                style={{ background: a.color }}
                className={`w-6 h-6 rounded-full flex items-center justify-center ${prefs.accent === a.value ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : ''}`}
                title={a.value}
              >
                {prefs.accent === a.value && <Check className="w-3 h-3 text-white" />}
              </button>
            ))}
          </div>
        </Row>
      </SectionCard>

      <SectionCard title="Chat wallpaper & bubbles" description="Default, preset wallpaper ya apni image upload karein.">
        <Row title="Wallpaper" description="Sirf aapko dikhta hai (device-level).">
          <div className="flex flex-wrap gap-1.5 justify-end max-w-[190px]">
            {WALLPAPERS.map((w) => (
              <button
                key={w.value}
                onClick={() => update({ wallpaper: w.value })}
                style={{ background: w.css }}
                className={`w-9 h-9 rounded-lg border ${prefs.wallpaper === w.value ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
                title={w.label}
              />
            ))}
            <label className={`w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer text-[10px] ${prefs.wallpaper === 'custom' ? 'border-primary ring-2 ring-primary/30' : 'border-border'} bg-muted`}>
              {prefs.customWallpaper ? (
                <img src={prefs.customWallpaper} alt="custom" className="w-full h-full object-cover rounded-lg" />
              ) : '＋'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onCustomWallpaper(e.target.files?.[0])} />
            </label>
          </div>
        </Row>
        <SegmentedRow
          title="Bubble style"
          value={prefs.bubbleStyle}
          onChange={(v) => update({ bubbleStyle: v })}
          options={[
            { value: 'rounded', label: 'Rounded' },
            { value: 'classic', label: 'Classic' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
        <SegmentedRow
          title="Density"
          value={prefs.density}
          onChange={(v) => update({ density: v })}
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
      </SectionCard>

      <SectionCard title="Text & animation">
        <Row title="Font size" description={`${prefs.fontScale}% — messages ka text size`}>
          <div className="w-[150px] flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">A</span>
            <Slider
              value={[prefs.fontScale]}
              min={80}
              max={150}
              step={5}
              onValueChange={([v]) => update({ fontScale: v })}
            />
            <span className="text-[15px] font-semibold text-muted-foreground">A</span>
          </div>
        </Row>
        <ToggleRow title="Animations" description="Message animations, bubble pop aur transitions." checked={prefs.animations} onChange={(v) => update({ animations: v })} />
        <ToggleRow title="Reduce motion" description="Accessibility — motion sensitivity ke liye." checked={prefs.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
        <ToggleRow title="High contrast" description="Borders aur text contrast badhata hai." checked={prefs.highContrast} onChange={(v) => setPrefs({ highContrast: v })} />
      </SectionCard>
    </>
  );
}

/* ───────────────────────────── storage & data ───────────────────────────── */

const AUTO_DOWNLOAD_GROUPS = [
  { key: 'wifi', label: 'Wi-Fi', localKey: 'autoDownloadWifi' },
  { key: 'mobileData', label: 'Mobile data', localKey: 'autoDownloadMobile' },
  { key: 'roaming', label: 'Roaming', localKey: 'autoDownloadRoaming' },
];

const MEDIA_KINDS = [
  { key: 'photos', label: 'Photos' },
  { key: 'audio', label: 'Audio' },
  { key: 'videos', label: 'Videos' },
  { key: 'documents', label: 'Documents' },
];

function humanBytes(bytes = 0) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export function StorageSettings({ storage, prefs, setPrefs, setPrivacyField, privacy, onClearCache }) {
  const localKeyMap = {
    wifi: 'autoDownloadWifi',
    mobileData: 'autoDownloadMobile',
    roaming: 'autoDownloadRoaming',
  };

  const setAuto = (group, kind, value) => {
    const localKey = localKeyMap[group];
    const next = { ...(prefs[localKey] || {}), [kind]: value };
    setPrefs({ [localKey]: next });
    const serverAuto = { ...(privacy.autoDownload || {}) };
    serverAuto[group] = next;
    setPrivacyField('autoDownload', serverAuto);
  };

  return (
    <>
      <SectionCard title="Storage usage" description="Chat me exchange hue media ka total size.">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-muted/60 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground">Total media</p>
            <p className="text-lg font-semibold">{humanBytes(storage?.totalBytes || 0)}</p>
          </div>
          <div className="bg-muted/60 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground">Media messages</p>
            <p className="text-lg font-semibold">{storage?.messagesWithMedia || 0}</p>
          </div>
        </div>
        {storage?.byType && (
          <div className="space-y-1.5">
            {Object.entries(storage.byType).map(([type, bytes]) => (
              <div key={type} className="flex items-center gap-2 text-[12px]">
                <span className="w-20 capitalize text-muted-foreground">{type}</span>
                <span className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <span
                    className="block h-full bg-primary"
                    style={{ width: `${storage.totalBytes ? Math.max(2, (bytes / storage.totalBytes) * 100) : 0}%` }}
                  />
                </span>
                <span className="w-16 text-right font-medium">{humanBytes(bytes)}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClearCache} className="w-full mt-3 px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 text-[12px] font-medium">
          Clear cache
        </button>
      </SectionCard>

      <SectionCard title="Media auto-download" description="Network ke hisaab se control karein ki media khud download ho ya na ho.">
        {AUTO_DOWNLOAD_GROUPS.map((g) => (
          <div key={g.key} className="py-2 border-b border-border last:border-0">
            <p className="text-[12px] font-semibold mb-1.5">{g.label}</p>
            <div className="flex flex-wrap gap-3">
              {MEDIA_KINDS.map((k) => (
                <label key={k.key} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Switch
                    checked={Boolean((prefs[g.localKey] || {})[k.key])}
                    onCheckedChange={(v) => setAuto(g.key, k.key, v)}
                  />
                  {k.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Media quality" description="Upload/compress quality — HD ya original bade size ke hote hain.">
        <SegmentedRow
          title="Upload quality"
          value={prefs.mediaQuality || 'standard'}
          onChange={(v) => { setPrefs({ mediaQuality: v }); setPrivacyField('mediaQuality', v); }}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'hd', label: 'HD' },
            { value: 'original', label: 'Original' },
          ]}
        />
        <ToggleRow
          title="Auto-delete downloaded media"
          description="Storage bachane ke liye purani downloaded files hata deta hai."
          checked={Boolean(privacy.autoDeleteDownloaded)}
          onChange={(v) => setPrivacyField('autoDeleteDownloaded', v)}
        />
      </SectionCard>
    </>
  );
}

/** Segmented control wali row (enum settings ke liye) */
export function SegmentedRow({ icon, title, description, value, options, onChange }) {
  return (
    <Row icon={icon} title={title} description={description}>
      <Segmented value={value} options={options} onChange={onChange} />
    </Row>
  );
}

/* ───────────────────────────── backup ───────────────────────────── */

export function BackupSettings({ backup = {}, setBackup, onRunBackup, running }) {
  return (
    <SectionCard title="Chat backup" description="Messages ka server-side backup — restore se chat history wapas milti hai.">
      <ToggleRow
        title="Backup enabled"
        description={backup.lastBackupAt ? `Last backup: ${new Date(backup.lastBackupAt).toLocaleString()}` : 'Abhi tak koi backup nahi'}
        checked={Boolean(backup.enabled)}
        onChange={(v) => setBackup({ enabled: v })}
      />
      <SelectRow
        title="Backup frequency"
        value={backup.frequency || 'off'}
        onChange={(v) => setBackup({ frequency: v, enabled: v !== 'off' })}
        options={[
          { value: 'off', label: 'Off' },
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
      />
      <ToggleRow
        title="Include videos"
        description="Video files bhi backup me shaamil karein (bada size)."
        checked={Boolean(backup.includeVideos)}
        onChange={(v) => setBackup({ includeVideos: v })}
      />
      <ToggleRow
        title="Encrypted backup"
        description="Backup ko encryption ke saath store karein."
        checked={backup.encrypted !== false}
        onChange={(v) => setBackup({ encrypted: v })}
      />
      <Row title="Backup now" description="Turant manual backup trigger karein.">
        <button
          onClick={onRunBackup}
          disabled={running}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium disabled:opacity-60 flex items-center gap-1.5"
        >
          {running && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {running ? 'Backing up…' : 'Run backup'}
        </button>
      </Row>
    </SectionCard>
  );
}

/* ──────────────────────────── privacy ──────────────────────────── */

const AUDIENCE_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'contacts', label: 'My contacts' },
  { value: 'nobody', label: 'Nobody' },
];

export function PrivacySettings({ privacy, setPrivacyField, blocked = [], onUnblock, reports = [] }) {
  return (
    <>
      <SectionCard title="Last seen & online" description="Kaun aapka last seen aur online status dekh sakta hai.">
        <SegmentedRow
          icon={Eye}
          title="Last seen"
          description={privacy.lastSeen === 'nobody' ? 'Koi bhi nahi dekh sakta' : undefined}
          value={privacy.lastSeen}
          onChange={(v) => setPrivacyField('lastSeen', v)}
          options={AUDIENCE_OPTIONS}
        />
        <SegmentedRow
          title="Online status"
          description={privacy.lastSeen === 'nobody' ? 'Last seen Nobody hai — online bhi wahi follow karta hai' : undefined}
          value={privacy.online}
          onChange={(v) => setPrivacyField('online', v)}
          options={AUDIENCE_OPTIONS}
        />
        <SegmentedRow
          icon={UserIcon}
          title="Profile photo"
          value={privacy.profilePhoto}
          onChange={(v) => setPrivacyField('profilePhoto', v)}
          options={AUDIENCE_OPTIONS}
        />
        <SegmentedRow
          title="About"
          value={privacy.about}
          onChange={(v) => setPrivacyField('about', v)}
          options={AUDIENCE_OPTIONS}
        />
      </SectionCard>

      <SectionCard title="Read receipts & activity" description="Ye settings doosre users ke ticks/indicators control karti hain.">
        <ToggleRow
          icon={Check}
          title="Read receipts"
          description="Off karne par aapko bhi doosron ke blue ticks nahi dikhenge."
          checked={privacy.readReceipts}
          onChange={(v) => setPrivacyField('readReceipts', v)}
        />
        <ToggleRow
          icon={MessageSquare}
          title="Typing indicator"
          description="Type karte waqt doosre ko 'typing…' dikhega."
          checked={privacy.typingIndicator}
          onChange={(v) => setPrivacyField('typingIndicator', v)}
        />
        <ToggleRow
          icon={Mic}
          title="Recording indicator"
          description="Voice record karte waqt indicator dikhana."
          checked={privacy.recordingIndicator}
          onChange={(v) => setPrivacyField('recordingIndicator', v)}
        />
        <ToggleRow
          icon={Shield}
          title="Screenshot protection"
          description="Sensitive media par screenshot / screen-record protection (jahan platform support kare)."
          checked={privacy.screenshotProtection}
          onChange={(v) => setPrivacyField('screenshotProtection', v)}
        />
      </SectionCard>

      <SectionCard title="Calls" description="Voice / video call privacy.">
        <SegmentedRow
          icon={PhoneIcon}
          title="Who can call me"
          value={privacy.callsPrivacy}
          onChange={(v) => setPrivacyField('callsPrivacy', v)}
          options={AUDIENCE_OPTIONS}
        />
        <ToggleRow
          title="Silence unknown callers"
          description="Jinhe contacts me nahi rakha, unki calls silent ring karengi."
          checked={privacy.silenceUnknownCallers}
          onChange={(v) => setPrivacyField('silenceUnknownCallers', v)}
        />
      </SectionCard>

      <SectionCard title="Message requests" description="Unknown sender ke messages — accept karne se pehle inbox me nahi aate.">
        <ToggleRow
          icon={ShieldAlert}
          title="Message requests"
          description="Unknown senders ki requests alag section me dikhengi."
          checked={privacy.messageRequestsEnabled}
          onChange={(v) => setPrivacyField('messageRequestsEnabled', v)}
        />
        <SelectRow
          title="Unknown senders policy"
          value={privacy.requestPolicy}
          onChange={(v) => setPrivacyField('requestPolicy', v)}
          options={[
            { value: 'ask', label: 'Ask me (request)' },
            { value: 'accept', label: 'Allow directly' },
            { value: 'block', label: 'Block new senders' },
          ]}
        />
      </SectionCard>

      <SectionCard title="Blocked users" description={`${blocked.length} blocked user${blocked.length === 1 ? '' : 's'}`}>
        {blocked.length === 0 && <p className="text-[12px] text-muted-foreground py-2">Abhi koi user blocked nahi hai.</p>}
        {blocked.map((b) => (
          <Row key={b._id} icon={Ban} title={b.name || 'User'} description={b.role}>
            <button
              onClick={() => onUnblock?.(b._id)}
              className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[11px] font-medium"
            >
              Unblock
            </button>
          </Row>
        ))}
      </SectionCard>

      <SectionCard title="My reports" description="Aapne jo report kiya, uska status.">
        {reports.slice(0, 6).map((r) => (
          <Row
            key={r._id}
            icon={Flag}
            title={`Reported ${r.reportedUserId?.name || 'user'}`}
            description={`${r.reason} · ${r.status} · ${new Date(r.createdAt).toLocaleDateString()}`}
          />
        ))}
        {!reports.length && <p className="text-[12px] text-muted-foreground py-2">Aapne abhi tak kuch report nahi kiya.</p>}
      </SectionCard>
    </>
  );
}

/* ──────────────────────── chats behaviour ──────────────────────── */

export function ChatsSettings({ privacy, setPrivacyField, prefs, setPrefs, locks = [], onOpenLocked, onClearAllDrafts }) {
  return (
    <>
      <SectionCard title="Chat behaviour">
        <SelectRow
          icon={MessageSquare}
          title="Enter key"
          description="Enter dabane par message send ho ya new line."
          value={privacy.enterKeyBehaviour}
          onChange={(v) => { setPrivacyField('enterKeyBehaviour', v); setPrefs({ sendWithEnter: v === 'send' }); }}
          options={[
            { value: 'send', label: 'Send message' },
            { value: 'newline', label: 'New line' },
          ]}
        />
        <ToggleRow
          title="Media visibility in gallery"
          description="Chat media phone gallery me dikhe."
          checked={privacy.mediaVisibilityInGallery}
          onChange={(v) => setPrivacyField('mediaVisibilityInGallery', v)}
        />
        <ToggleRow
          title="Keep archived chats unmuted"
          description="Archive karne par bhi notifications aate rahein."
          checked={privacy.keepArchivedUnmuted}
          onChange={(v) => setPrivacyField('keepArchivedUnmuted', v)}
        />
        <ToggleRow
          title="Auto-archive inactive chats"
          description="30 din se inactive chats khud archive ho jaayen."
          checked={privacy.autoArchiveInactive}
          onChange={(v) => setPrivacyField('autoArchiveInactive', v)}
        />
        <Row title="Saved messages" description="Star kiye hue messages ek jagah.">
          <span className="text-[12px] font-medium">{prefs.savedMessages?.length || 0}</span>
        </Row>
        <Row title="Clear all drafts" description="Chat list se draft previews hata dein.">
          <button onClick={onClearAllDrafts} className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[11px] font-medium">
            Clear
          </button>
        </Row>
      </SectionCard>

      <SectionCard title="Locked chats" description="Chat lock se chat list me preview hide ho jata hai aur PIN maangta hai.">
        {locks.length === 0 && <p className="text-[12px] text-muted-foreground py-2">Koi chat locked nahi hai.</p>}
        {locks.map((c) => (
          <Row key={c._id} icon={Lock} title={c.other?.name || 'Chat'} description="Locked">
            <button onClick={() => onOpenLocked?.(c)} className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[11px] font-medium">
              Open
            </button>
          </Row>
        ))}
      </SectionCard>
    </>
  );
}

/* ─────────────────────── notifications ─────────────────────── */

export function NotificationsSettings({ privacy, setPrivacyField, prefs, setPrefs, onRequestDesktopPermission }) {
  const desktopPermission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

  return (
    <>
      <SectionCard title="Message notifications">
        <ToggleRow icon={Bell} title="Notifications" description="Chat ke saare notifications ka master switch." checked={privacy.notificationsEnabled} onChange={(v) => setPrivacyField('notificationsEnabled', v)} />
        <ToggleRow title="Message notifications" description="Naye message par notify karein." checked={privacy.messageNotifications} onChange={(v) => setPrivacyField('messageNotifications', v)} disabled={!privacy.notificationsEnabled} />
        <ToggleRow title="Call notifications" description="Voice/video call par notify karein." checked={privacy.callNotifications} onChange={(v) => setPrivacyField('callNotifications', v)} disabled={!privacy.notificationsEnabled} />
        <ToggleRow title="Reaction notifications" description="Message par reaction aane par notify karein." checked={privacy.reactionNotifications} onChange={(v) => setPrivacyField('reactionNotifications', v)} disabled={!privacy.notificationsEnabled} />
      </SectionCard>

      <SectionCard title="Alerts & preview">
        <ToggleRow title="Show preview" description="Notification me message text dikhayein." checked={privacy.notificationPreview} onChange={(v) => setPrivacyField('notificationPreview', v)} />
        <ToggleRow title="Sound" description="Notification par sound bajayein." checked={privacy.notificationSound} onChange={(v) => setPrivacyField('notificationSound', v)} />
        <ToggleRow title="Vibration" description="Mobile par vibrate karein." checked={privacy.notificationVibration} onChange={(v) => setPrivacyField('notificationVibration', v)} />
        <ToggleRow title="Badge count" description="App icon par unread count dikhayein." checked={privacy.notificationBadge} onChange={(v) => setPrivacyField('notificationBadge', v)} />
        <ToggleRow
          title="Desktop notifications"
          description={desktopPermission === 'granted' ? 'Browser notifications enabled' : 'Browser permission chahiye'}
          checked={privacy.desktopNotifications}
          onChange={(v) => { setPrivacyField('desktopNotifications', v); setPrefs({ desktopNotifications: v }); if (v) onRequestDesktopPermission?.(); }}
        />
        <SelectRow
          title="Notification tone"
          value={prefs.notificationSoundName}
          onChange={(v) => setPrefs({ notificationSoundName: v })}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'chime', label: 'Chime' },
            { value: 'pop', label: 'Pop' },
            { value: 'none', label: 'Silent' },
          ]}
        />
      </SectionCard>
    </>
  );
}

/* ───────────────────── account & security ──────────────────── */

export function AccountSecuritySettings({ privacy, setPrivacyField, pinSet, onSetPin, onLogoutAll, user }) {
  const [pin, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [saving, setSaving] = useState(false);

  const savePin = async () => {
    if (!/^\d{4,8}$/.test(pin)) { toast.error('PIN 4–8 digits ka hona chahiye'); return; }
    if (pin !== confirmPin) { toast.error('PINs match nahi kar rahe'); return; }
    setSaving(true);
    const ok = await onSetPin?.(pin, pinSet ? currentPin : undefined);
    setSaving(false);
    if (ok) { setPinValue(''); setConfirmPin(''); setCurrentPin(''); }
  };

  return (
    <>
      <SectionCard title="Profile">
        <Row icon={UserIcon} title={user?.name || 'User'} description={`${user?.role || ''} · ${user?.uhid || user?.email || ''}`} />
        <Row title="Change password" description="Account settings page par jaayein.">
          <a href="#/settings" className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[11px] font-medium">Open</a>
        </Row>
      </SectionCard>

      <SectionCard title="App lock" description="Chat khulte waqt PIN maangta hai — phone kisi aur ne use kiya to privacy safe rahe.">
        <ToggleRow
          icon={Lock}
          title="App lock"
          description={pinSet ? 'PIN set hai' : 'Pehle PIN set karein'}
          checked={privacy.appLockEnabled}
          onChange={(v) => setPrivacyField('appLockEnabled', v)}
          disabled={!pinSet}
        />
        <SelectRow
          icon={KeyRound}
          title="Auto-lock after"
          value={privacy.appLockScope}
          onChange={(v) => setPrivacyField('appLockScope', v)}
          options={[
            { value: 'always', label: 'Immediately' },
            { value: '1min', label: 'After 1 minute' },
            { value: '30min', label: 'After 30 minutes' },
            { value: 'never', label: 'Never (manual only)' },
          ]}
        />
        <ToggleRow title="Biometric unlock" description="Jahan supported ho, fingerprint / Face unlock use karein." checked={privacy.appLockBiometric} onChange={(v) => setPrivacyField('appLockBiometric', v)} />
        <ToggleRow title="Hide locked chat notifications" description="Locked chats ke notification content chhupayein." checked={privacy.hideLockedNotifications} onChange={(v) => setPrivacyField('hideLockedNotifications', v)} />

        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {pinSet && (
            <input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              placeholder="Current PIN"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-[13px]"
            />
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPinValue(e.target.value)}
              placeholder="New PIN (4–8 digits)"
              className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-[13px]"
            />
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Confirm PIN"
              className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-[13px]"
            />
          </div>
          <button
            onClick={savePin}
            disabled={saving}
            className="w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium disabled:opacity-60"
          >
            {saving ? 'Saving…' : (pinSet ? 'Change PIN' : 'Set PIN')}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Security">
        <Row icon={KeyRound} title="Two-factor authentication" description="Account ke liye extra security layer.">
          <a href="#/settings" className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[11px] font-medium">Manage</a>
        </Row>
        <Row icon={Shield} title="Active sessions" description="Saare devices se logout karein (chori hone par turant).">
          <button onClick={onLogoutAll} className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-medium">
            Logout all
          </button>
        </Row>
      </SectionCard>
    </>
  );
}

/* ─────────────────────── accessibility ─────────────────────── */

export function AccessibilitySettings({ prefs, setPrefs, privacy, setPrivacyField }) {
  const set = (patch) => {
    setPrefs(patch);
    const serverPatch = {};
    if (patch.fontScale !== undefined) serverPatch.fontScale = patch.fontScale;
    if (patch.reduceMotion !== undefined) serverPatch.reduceMotion = patch.reduceMotion;
    if (patch.animations !== undefined) serverPatch.animations = patch.animations;
    if (Object.keys(serverPatch).length) setPrivacyField('appearance', { ...(privacy.appearance || {}), ...serverPatch });
  };

  return (
    <>
      <SectionCard title="Text & readability">
        <Row title="Font size" description={`${prefs.fontScale}% — chat text ka size`}>
          <div className="w-[150px] flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">A</span>
            <Slider value={[prefs.fontScale]} min={80} max={150} step={5} onValueChange={([v]) => set({ fontScale: v })} />
            <span className="text-[15px] font-semibold text-muted-foreground">A</span>
          </div>
        </Row>
        <SegmentedRow
          title="Density"
          value={prefs.density}
          onChange={(v) => set({ density: v })}
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
      </SectionCard>

      <SectionCard title="Motion & contrast">
        <ToggleRow title="Reduce motion" description="Animations kam karein — motion sensitivity ke liye." checked={prefs.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
        <ToggleRow title="Animations" description="Chat transitions aur bubble animations." checked={prefs.animations} onChange={(v) => set({ animations: v })} disabled={prefs.reduceMotion} />
        <ToggleRow title="High contrast" description="Borders aur text contrast badhayein." checked={prefs.highContrast} onChange={(v) => setPrefs({ highContrast: v })} />
      </SectionCard>

      <SectionCard title="Keyboard shortcuts" description="Desktop par ye shortcuts kaam karte hain.">
        {[
          ['Ctrl / ⌘ + K', 'Search chats'],
          ['Ctrl / ⌘ + F', 'Search in conversation'],
          ['Esc', 'Close viewer / menu'],
          ['Enter', privacy.enterKeyBehaviour === 'send' ? 'Send message' : 'New line'],
          ['Shift + Enter', privacy.enterKeyBehaviour === 'send' ? 'New line' : 'Send message'],
        ].map(([keys, desc]) => (
          <Row key={keys} title={keys} description={desc} />
        ))}
      </SectionCard>
    </>
  );
}

/* ──────────────────────────── about ─────────────────────────── */

export function AboutSection() {
  return (
    <>
      <SectionCard title="FindMedi Chat" description="Secure 1-to-1 messaging between doctors and patients.">
        <Row icon={Info} title="Version" description="Chat module v2.0" />
        <Row icon={Shield} title="Privacy by design" description="Chat sirf doctor–patient ke beech hi hoti hai." />
      </SectionCard>
      <SectionCard title="Legal & help">
        <Row title="Terms of service">
          <a href="#/terms" className="text-[12px] text-primary font-medium">Open</a>
        </Row>
        <Row title="Privacy policy">
          <a href="#/privacy" className="text-[12px] text-primary font-medium">Open</a>
        </Row>
        <Row title="Help centre / Support">
          <a href="#/support" className="text-[12px] text-primary font-medium">Open</a>
        </Row>
      </SectionCard>
    </>
  );
}

/* ────────────────────────── safety ──────────────────────── */

export function SafetySettings({ blocked = [], onUnblock, reports = [], privacy, setPrivacyField }) {
  return (
    <>
      <SectionCard title="Blocking" description="Blocked user na message bhej sakta, na call kar sakta.">
        {blocked.length === 0 && <p className="text-[12px] text-muted-foreground py-2">Koi user blocked nahi hai.</p>}
        {blocked.map((b) => (
          <Row key={b._id} icon={Ban} title={b.name || 'User'} description={b.role}>
            <button onClick={() => onUnblock?.(b._id)} className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-[11px] font-medium">
              Unblock
            </button>
          </Row>
        ))}
      </SectionCard>

      <SectionCard title="Unknown senders" description="Message requests se spam aur unknown logon ko control karein.">
        <SelectRow
          title="New sender policy"
          value={privacy.requestPolicy}
          onChange={(v) => setPrivacyField('requestPolicy', v)}
          options={[
            { value: 'ask', label: 'Ask me (request)' },
            { value: 'accept', label: 'Allow directly' },
            { value: 'block', label: 'Block new senders' },
          ]}
        />
        <ToggleRow
          title="Restrict unknown senders"
          description="Unke messages requests section me jaayenge."
          checked={privacy.messageRequestsEnabled}
          onChange={(v) => setPrivacyField('messageRequestsEnabled', v)}
        />
      </SectionCard>

      <SectionCard title="Safety tips">
        <Row icon={ShieldAlert} title="Suspicious links" description="Suspicious link par amber warning milti hai — bina verify kiye click na karein." />
        <Row icon={Flag} title="Report" description="Kisi bhi message par long-press → Report message. Moderation team review karti hai." />
        <Row icon={Shield} title="Never share OTP" description="Koi bhi doctor ya staff OTP nahi maangta. OTP share na karein." />
      </SectionCard>

      <SectionCard title="My reports" description="Aapke reports ka status.">
        {reports.slice(0, 8).map((r) => (
          <Row
            key={r._id}
            icon={Flag}
            title={`Reported ${r.reportedUserId?.name || 'user'}`}
            description={`${r.reason} · ${r.status} · ${new Date(r.createdAt).toLocaleDateString()}`}
          />
        ))}
        {!reports.length && <p className="text-[12px] text-muted-foreground py-2">Aapne abhi tak kuch report nahi kiya.</p>}
      </SectionCard>
    </>
  );
}

/* ─────────────────── main settings panel (export) ─────────────────── */

const SECTIONS = [
  { key: 'privacy', label: 'Privacy', icon: Lock },
  { key: 'chats', label: 'Chats', icon: MessageSquare },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'storage', label: 'Storage & Data', icon: HardDrive },
  { key: 'safety', label: 'Safety', icon: ShieldAlert },
  { key: 'account', label: 'Account & Security', icon: KeyRound },
  { key: 'backup', label: 'Backup', icon: Cloud },
  { key: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { key: 'about', label: 'About', icon: Info },
];

export default function ChatSettingsPanel({
  open, onClose, user, privacy = {}, setPrivacyField, prefs = {}, setPrefs,
  theme, onThemeChange, blocked = [], onUnblock, reports = [], storage,
  backup = {}, setBackup, onRunBackup, backupRunning, pinSet, onSetPin,
  onLogoutAll, onRequestDesktopPermission, locks = [], onOpenLocked,
  onClearAllDrafts, onClearCache, initialSection = 'privacy',
}) {
  const [section, setSection] = useState(initialSection);

  useEffect(() => { setSection(initialSection); }, [initialSection]);

  if (!open) return null;

  const shared = { privacy, setPrivacyField, prefs, setPrefs };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end chat-pop-enter">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:w-[420px] bg-background border-l border-border h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold">Chat Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold overflow-hidden">
            {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : (user?.name?.[0] || 'U')}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {(user?.role || '').replace('_', ' ')} · {user?.uhid || user?.email || ''}
            </p>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 py-2 border-b border-border">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                section === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
          {section === 'privacy' && <PrivacySettings {...shared} blocked={blocked} onUnblock={onUnblock} reports={reports} />}
          {section === 'chats' && (
            <ChatsSettings {...shared} locks={locks} onOpenLocked={onOpenLocked} onClearAllDrafts={onClearAllDrafts} />
          )}
          {section === 'notifications' && (
            <NotificationsSettings {...shared} onRequestDesktopPermission={onRequestDesktopPermission} />
          )}
          {section === 'appearance' && <AppearanceSettings {...shared} theme={theme} onThemeChange={onThemeChange} />}
          {section === 'storage' && <StorageSettings {...shared} storage={storage} onClearCache={onClearCache} />}
          {section === 'safety' && <SafetySettings {...shared} blocked={blocked} onUnblock={onUnblock} reports={reports} />}
          {section === 'account' && (
            <AccountSecuritySettings {...shared} user={user} pinSet={pinSet} onSetPin={onSetPin} onLogoutAll={onLogoutAll} />
          )}
          {section === 'backup' && (
            <BackupSettings backup={backup} setBackup={setBackup} onRunBackup={onRunBackup} running={backupRunning} />
          )}
          {section === 'accessibility' && <AccessibilitySettings {...shared} />}
          {section === 'about' && <AboutSection />}
        </div>
      </div>
    </div>
  );
}
