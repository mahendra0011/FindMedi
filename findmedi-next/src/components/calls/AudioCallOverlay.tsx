'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PhoneOff, Mic, MicOff, Volume2, VolumeX,
  Minimize2, Disc, User, ShieldCheck, Wifi, Headphones, ChevronDown,
  FileText, Save, X, Stethoscope
} from 'lucide-react';
import { useAudioCall } from '@/context/AudioCallContext';
import AudioWaveVisualizer from './AudioWaveVisualizer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

function formatTimer(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function AudioCallOverlay() {
  const {
    callState,
    activePeer,
    isCaller,
    isMuted,
    isSpeakerOn,
    audioDevices,
    selectedOutputId,
    callDuration,
    callQuality,
    isRecording,
    recordingDuration,
    clinicalNotes,
    setClinicalNotes,
    saveClinicalNotes,
    isMinimized,
    localStream,
    remoteStream,
    toggleMute,
    toggleSpeaker,
    setAudioOutput,
    toggleRecording,
    toggleMinimize,
    endCall,
  } = useAudioCall();

  const [showNotes, setShowNotes] = useState(false);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);

  // If call is idle, or minimized, or incoming ringing on recipient side, don't show full overlay
  if (callState === 'idle' || isMinimized || (!isCaller && callState === 'ringing')) {
    return null;
  }

  const getStatusText = () => {
    switch (callState) {
      case 'calling':
        return 'Calling...';
      case 'ringing':
        return 'Ringing...';
      case 'connecting':
        return 'Connecting audio...';
      case 'connected':
        return formatTimer(callDuration);
      case 'busy':
        return 'Line Busy';
      case 'timeout':
        return 'No Answer';
      case 'ended':
        return 'Call Ended';
      default:
        return '';
    }
  };

  const getQualityBadge = () => {
    switch (callQuality) {
      case 'good':
        return { label: 'HD Audio', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
      case 'fair':
        return { label: 'Good', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case 'poor':
        return { label: 'Weak Signal', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
      case 'reconnecting':
        return { label: 'Reconnecting...', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' };
      default:
        return { label: 'Encrypted', color: 'text-muted-foreground bg-muted border-border/50' };
    }
  };

  const qualityBadge = getQualityBadge();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-card/95 border border-border/60 p-7 shadow-2xl backdrop-blur-2xl text-foreground flex flex-col items-center justify-between min-h-[580px]"
        >
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar: Security & Minimize */}
          <div className="w-full flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border/40 text-[11px] font-medium text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>1-to-1 Audio WebRTC</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${qualityBadge.color}`}>
                <Wifi className="w-3 h-3" />
                {qualityBadge.label}
              </span>

              <button
                type="button"
                onClick={toggleMinimize}
                className="w-8 h-8 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all"
                title="Minimize Call"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center: Avatar & Sound Waves OR Clinical Notes Drawer */}
          {showNotes ? (
            <div className="w-full my-auto flex flex-col gap-2.5 relative z-10 p-2 bg-muted/40 rounded-2xl border border-border/50">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Stethoscope className="w-3.5 h-3.5 text-primary" /> In-Call Clinical Notes
                </span>
                <button
                  type="button"
                  onClick={() => setShowNotes(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <Textarea
                placeholder="Type symptoms, prescription dosage, or clinical remarks..."
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                className="min-h-[140px] text-xs bg-background/80 resize-none rounded-xl"
              />

              <Button
                size="sm"
                onClick={() => {
                  saveClinicalNotes();
                  setShowNotes(false);
                }}
                className="w-full h-8 text-xs gap-1.5 font-medium"
              >
                <Save className="w-3.5 h-3.5" /> Save to Call Record
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center my-auto w-full relative z-10">
              <div className="relative mb-6">
                {/* Animated Wave Rings */}
                {callState === 'connected' && (
                  <>
                    <div className="absolute -inset-4 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute -inset-8 rounded-full border border-primary/10 animate-pulse" style={{ animationDuration: '2s' }} />
                  </>
                )}
                {callState === 'calling' || callState === 'ringing' ? (
                  <div className="absolute -inset-3 rounded-full border border-amber-500/40 animate-ping" style={{ animationDuration: '2s' }} />
                ) : null}

                {/* Avatar Frame */}
                <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-card shadow-2xl bg-muted flex items-center justify-center">
                  {activePeer?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activePeer.avatar} alt={activePeer.name || 'Caller'} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-14 h-14 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Peer Name & Role */}
              <h2 className="text-2xl font-bold font-heading tracking-tight mb-1 text-foreground">
                {activePeer?.name || 'Patient'}
              </h2>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">
                {activePeer?.role ? activePeer.role.replace('_', ' ') : 'Patient'}
              </p>

              {/* Call State / Duration */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono text-sm font-semibold tracking-wider mb-4">
                {callState === 'connected' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
                <span>{getStatusText()}</span>
              </div>

              {/* Live Audio Wave Visualizer */}
              <div className="w-full max-w-[260px] h-14 flex items-center justify-center">
                <AudioWaveVisualizer
                  stream={remoteStream || localStream}
                  isMuted={isMuted}
                  active={callState === 'connected'}
                  barCount={16}
                />
              </div>

              {/* Recording Badge */}
              {isRecording && (
                <div className="flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold animate-pulse">
                  <Disc className="w-3.5 h-3.5" />
                  <span>Recording Audio ({formatTimer(recordingDuration)})</span>
                </div>
              )}
            </div>
          )}

          {/* Bottom Controls */}
          <div className="w-full flex flex-col items-center gap-4 relative z-10 pt-4">
            {/* Secondary Controls Bar: Speaker & Devices & Recording & Notes */}
            <div className="flex items-center gap-2 relative">
              {/* Speaker / Volume button */}
              <button
                type="button"
                onClick={toggleSpeaker}
                className={`p-3 rounded-2xl transition-all duration-200 border ${
                  isSpeakerOn
                    ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                    : 'bg-muted/80 text-muted-foreground border-border/50 hover:bg-muted'
                }`}
                title={isSpeakerOn ? 'Speakerphone ON' : 'Speakerphone OFF'}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {/* Audio Output Selector */}
              {audioDevices.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDeviceMenu(p => !p)}
                    className="flex items-center gap-1.5 px-3 py-3 rounded-2xl bg-muted/80 hover:bg-muted border border-border/50 text-xs text-foreground font-medium transition-all"
                    title="Select Audio Output Device"
                  >
                    <Headphones className="w-4 h-4 text-primary" />
                    <span className="max-w-[100px] truncate">
                      {audioDevices.find((d) => d.deviceId === selectedOutputId)?.label || 'Output'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                  {showDeviceMenu && (
                    <div className="absolute bottom-full mb-2 left-0 w-56 bg-card border border-border rounded-xl shadow-xl p-1 z-50">
                      <button
                        type="button"
                        onClick={() => { setAudioOutput('default'); setShowDeviceMenu(false); }}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors"
                      >
                        System Default
                      </button>
                      {audioDevices.map((dev) => (
                        <button
                          key={dev.deviceId}
                          type="button"
                          onClick={() => { setAudioOutput(dev.deviceId); setShowDeviceMenu(false); }}
                          className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors truncate"
                        >
                          {dev.label || `Device ${dev.deviceId.slice(0, 5)}...`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* In-Call Clinical Notes Button */}
              <button
                type="button"
                onClick={() => setShowNotes((p) => !p)}
                className={`p-3 rounded-2xl transition-all duration-200 border ${
                  showNotes
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/80 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
                }`}
                title="Document Clinical Notes"
              >
                <FileText className="w-5 h-5" />
              </button>

              {/* Call Recording Toggle */}
              {callState === 'connected' && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex items-center gap-1.5 px-3.5 py-3 rounded-2xl transition-all duration-200 border ${
                    isRecording
                      ? 'bg-destructive/15 text-destructive border-destructive/30 animate-pulse'
                      : 'bg-muted/80 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Record Call'}
                >
                  <Disc className="w-4 h-4" />
                  <span className="text-xs font-semibold">{isRecording ? 'Stop REC' : 'Record'}</span>
                </button>
              )}
            </div>

            {/* Primary Action Row: Mute & End Call */}
            <div className="flex items-center gap-6 mt-2">
              {/* Mic Mute / Unmute Button */}
              <button
                type="button"
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 border shadow-md active:scale-95 ${
                  isMuted
                    ? 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25'
                    : 'bg-muted hover:bg-muted/80 text-foreground border-border/60'
                }`}
                title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* End Call Button */}
              <button
                type="button"
                onClick={() => endCall()}
                className="w-16 h-16 rounded-full bg-destructive text-white hover:bg-destructive/90 flex items-center justify-center shadow-xl shadow-destructive/30 active:scale-90 transition-all duration-200"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
