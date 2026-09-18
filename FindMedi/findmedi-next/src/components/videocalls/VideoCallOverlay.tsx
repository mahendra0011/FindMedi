'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Minimize2, Maximize2, Volume2, VolumeX, Sparkles, SwitchCamera, ShieldCheck, Wifi, RefreshCw, Monitor, FileText, MessageSquare, Send, X, Save, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useVideoCall } from '@/context/VideoCallContext';

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function VideoCallOverlay() {
  const {
    callState,
    activePeer,
    isAudioMuted,
    isVideoMuted,
    isRemoteVideoMuted,
    isRemoteAudioMuted,
    isSpeakerOn,
    isLowLightEnhanced,
    isScreenSharing,
    inCallMessages,
    clinicalNotes,
    availableCameras,
    selectedCameraId,
    facingMode,
    audioOutputDevices,
    selectedOutputId,
    callDuration,
    networkQuality,
    resolutionLabel,
    isMinimized,
    localStream,
    remoteStream,
    endVideoCall,
    toggleAudioMute,
    switchCamera,
    toggleScreenShare,
    toggleLowLight,
    toggleMinimize,
    sendInCallMessage,
    setClinicalNotes,
    saveClinicalNotes,
    setAudioOutput,
  } = useVideoCall();

  const remoteVideoElemRef = useRef<HTMLVideoElement | null>(null);
  const localVideoElemRef = useRef<HTMLVideoElement | null>(null);

  // Self-preview drag coordinates
  const [selfPos, setSelfPos] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  // Self-preview resize size: 'normal' (200px) | 'large' (320px)
  const [selfSize, setSelfSize] = useState<'normal' | 'large'>('normal');

  // Telemedicine Drawer State: null | 'notes' | 'chat'
  const [drawerTab, setDrawerTab] = useState<'notes' | 'chat' | null>(null);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  // Auto-scroll chat drawer
  useEffect(() => {
    if (drawerTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [inCallMessages, drawerTab]);

  // Attach streams to video elements when active
  useEffect(() => {
    if (localStream && localVideoElemRef.current) {
      localVideoElemRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoElemRef.current) {
      remoteVideoElemRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Drag handlers for moveable self-preview
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: selfPos.x,
      posY: selfPos.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = dragStartRef.current.mouseX - e.clientX;
      const dy = dragStartRef.current.mouseY - e.clientY;
      setSelfPos({
        x: Math.max(12, Math.min(window.innerWidth - 220, dragStartRef.current.posX + dx)),
        y: Math.max(12, Math.min(window.innerHeight - 260, dragStartRef.current.posY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && e.touches[0]) {
      setIsDragging(true);
      dragStartRef.current = {
        mouseX: e.touches[0].clientX,
        mouseY: e.touches[0].clientY,
        posX: selfPos.x,
        posY: selfPos.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1 || !e.touches[0]) return;
    const dx = dragStartRef.current.mouseX - e.touches[0].clientX;
    const dy = dragStartRef.current.mouseY - e.touches[0].clientY;
    setSelfPos({
      x: Math.max(12, Math.min(window.innerWidth - 180, dragStartRef.current.posX + dx)),
      y: Math.max(12, Math.min(window.innerHeight - 240, dragStartRef.current.posY + dy)),
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendInCallMessage(chatInput);
    setChatInput('');
  };

  const isVisible = callState !== 'idle' && !isMinimized;
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[9999] bg-black text-white select-none overflow-hidden flex flex-col font-sans"
      >
        {/* ── REMOTE VIDEO (MAIN VIEWPORT) ── */}
        <div className="relative flex-1 w-full h-full bg-neutral-950 flex items-center justify-center overflow-hidden">
          {/* Main Remote Video Stream */}
          <video
            ref={remoteVideoElemRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-all duration-300 ${
              isLowLightEnhanced ? 'brightness-125 contrast-105 saturate-110' : ''
            } ${callState !== 'connected' || isRemoteVideoMuted ? 'opacity-0' : 'opacity-100'}`}
          />

          {/* Screen Sharing Active Banner */}
          {isScreenSharing && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-cyan-500/90 text-neutral-950 font-semibold text-xs px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2">
              <Monitor className="w-4 h-4 animate-pulse" />
              You are sharing your screen with the patient
            </div>
          )}

          {/* Fallback Screen when Remote Video is Off or Connecting */}
          {(callState !== 'connected' || isRemoteVideoMuted) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 p-6">
              <motion.div
                animate={callState === 'calling' || callState === 'ringing' || callState === 'connecting' ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative mb-6"
              >
                {activePeer?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activePeer.avatar}
                    alt={activePeer.name || 'Peer'}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-cyan-500/40 shadow-2xl shadow-cyan-500/20"
                  />
                ) : (
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-cyan-600 to-teal-800 flex items-center justify-center text-4xl md:text-5xl font-bold border-4 border-cyan-500/30 shadow-2xl">
                    {activePeer?.name?.charAt(0) || 'P'}
                  </div>
                )}
                {callState === 'connected' && isRemoteVideoMuted && (
                  <span className="absolute bottom-1 right-1 bg-neutral-900/90 border border-neutral-700 text-amber-400 p-2 rounded-full shadow-lg">
                    <VideoOff className="w-5 h-5" />
                  </span>
                )}
              </motion.div>

              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-wide">
                {activePeer?.name || 'Patient'}
              </h2>
              <p className="text-sm md:text-base text-neutral-400 capitalize mt-1">
                {activePeer?.role === 'patient' ? 'Patient Video Consultation' : activePeer?.role || 'Patient'}
              </p>

              {/* Connecting States Status Notice */}
              <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                {callState === 'calling' && (
                  <span className="text-cyan-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                    Calling patient...
                  </span>
                )}
                {callState === 'ringing' && (
                  <span className="text-cyan-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    Patient device ringing...
                  </span>
                )}
                {callState === 'connecting' && (
                  <span className="text-teal-400 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Connecting Full HD 1080p stream...
                  </span>
                )}
                {callState === 'connected' && isRemoteVideoMuted && (
                  <span className="text-amber-400 flex items-center gap-2 bg-neutral-900/80 px-3 py-1.5 rounded-full border border-neutral-800">
                    <VideoOff className="w-4 h-4" />
                    Patient turned camera OFF (Audio active)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Remote Audio Muted Alert badge */}
          {callState === 'connected' && isRemoteAudioMuted && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg">
              <MicOff className="w-3.5 h-3.5" />
              Patient is muted
            </div>
          )}
        </div>

        {/* ── TOP FLOATING CONTROL BAR ── */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-30">
          {/* Caller Details & Duration */}
          <div className="flex items-center gap-3 bg-neutral-900/80 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-2xl shadow-xl pointer-events-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                <span>{activePeer?.name || 'Patient'}</span>
                {callState === 'connected' && (
                  <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                    {formatDuration(callDuration)}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                <span>1-to-1 Video Call</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3" /> Encrypted E2E
                </span>
              </div>
            </div>
          </div>

          {/* Telemedicine Top Shortcuts & Controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="hidden sm:flex items-center gap-2 bg-neutral-900/80 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl shadow-xl text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-cyan-300 font-mono font-bold tracking-wide">
                {resolutionLabel}
              </span>
              <span className="text-neutral-500">|</span>
              <span className="text-neutral-300 flex items-center gap-1 text-[11px]">
                <Wifi className="w-3 h-3 text-emerald-400" />
                {networkQuality === '1080p-fullhd' ? '1080p' : networkQuality}
              </span>
            </div>

            {/* In-Call Clinical Notes Drawer Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerTab(drawerTab === 'notes' ? null : 'notes')}
              className={`h-10 px-3 rounded-xl border-white/10 text-xs gap-1.5 ${
                drawerTab === 'notes' ? 'bg-cyan-600 text-white' : 'bg-neutral-900/80 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">Clinical Notes</span>
            </Button>

            {/* In-Call Chat Drawer Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerTab(drawerTab === 'chat' ? null : 'chat')}
              className={`h-10 px-3 rounded-xl border-white/10 text-xs gap-1.5 relative ${
                drawerTab === 'chat' ? 'bg-cyan-600 text-white' : 'bg-neutral-900/80 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline">In-Call Chat</span>
              {inCallMessages.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-2 right-2" />
              )}
            </Button>

            {/* Minimize / Floating Dock Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMinimize}
              title="Minimize to floating window"
              className="w-10 h-10 rounded-xl bg-neutral-900/80 border-white/10 hover:bg-neutral-800 text-white"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── MOVEABLE / DRAGGABLE SELF-PREVIEW WINDOW ── */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            right: `${drawerTab ? selfPos.x + 360 : selfPos.x}px`,
            bottom: `${selfPos.y + 90}px`,
          }}
          className={`absolute z-40 rounded-2xl overflow-hidden border-2 shadow-2xl transition-all cursor-grab active:cursor-grabbing backdrop-blur-md select-none group ${
            isVideoMuted ? 'border-amber-500/50 bg-neutral-900' : 'border-white/20 bg-black'
          } ${selfSize === 'large' ? 'w-64 h-48 md:w-80 md:h-60' : 'w-40 h-32 md:w-52 md:h-36'}`}
        >
          {/* Local Video Stream */}
          <video
            ref={localVideoElemRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' && !isScreenSharing ? '-scale-x-100' : ''} ${
              isLowLightEnhanced ? 'brightness-125 contrast-105 saturate-110' : ''
            } ${isVideoMuted ? 'opacity-0' : 'opacity-100'}`}
          />

          {/* Camera Muted State for Self Preview */}
          {isVideoMuted && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 p-2 text-center">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-amber-400 mb-1">
                <VideoOff className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-neutral-300">Camera Off</span>
            </div>
          )}

          {/* Overlay controls on self preview */}
          <div className="absolute top-1.5 inset-x-1.5 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                switchCamera();
              }}
              title="Flip Front / Rear Camera"
              className="pointer-events-auto p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-white border border-white/10"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelfSize(selfSize === 'normal' ? 'large' : 'normal');
              }}
              title="Toggle Size"
              className="pointer-events-auto p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-white border border-white/10"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="absolute bottom-1.5 left-2 pointer-events-none">
            <span className="text-[10px] font-semibold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-neutral-300">
              {isScreenSharing ? 'Sharing Screen' : 'You'} {isAudioMuted && '(Muted)'}
            </span>
          </div>
        </div>

        {/* ── TELEMEDICINE SLIDE-OVER DRAWER (Clinical Notes & In-Call Chat) ── */}
        <AnimatePresence>
          {drawerTab && (
            <motion.div
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="absolute top-20 right-4 bottom-24 w-80 sm:w-96 rounded-3xl bg-neutral-900/95 border border-white/15 backdrop-blur-2xl shadow-2xl z-40 flex flex-col overflow-hidden text-white"
            >
              {/* Drawer Header */}
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDrawerTab('notes')}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                      drawerTab === 'notes' ? 'bg-cyan-500/20 text-cyan-400' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Clinical Notes
                  </button>
                  <button
                    onClick={() => setDrawerTab('chat')}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                      drawerTab === 'chat' ? 'bg-cyan-500/20 text-cyan-400' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    In-Call Chat
                    {inCallMessages.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setDrawerTab(null)}
                  className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab 1: Clinical Notes */}
              {drawerTab === 'notes' && (
                <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-cyan-400" /> Live Examination Notes
                    </span>
                    <Badge variant="outline" className="text-[10px] border-white/10 text-neutral-300">
                      Encrypted
                    </Badge>
                  </div>

                  <Textarea
                    placeholder="Document patient symptoms, blood pressure, diagnosis, medications or follow-up instructions..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="flex-1 min-h-[160px] bg-neutral-950/80 border-white/10 text-xs rounded-xl p-3 text-neutral-100 placeholder:text-neutral-500 resize-none focus:border-cyan-500/50"
                  />

                  <Button
                    size="sm"
                    onClick={() => saveClinicalNotes()}
                    className="w-full h-9 bg-cyan-600 hover:bg-cyan-700 text-white text-xs gap-1.5 rounded-xl font-medium shadow-md shadow-cyan-600/20"
                  >
                    <Save className="w-3.5 h-3.5" /> Save to Consultation History
                  </Button>
                </div>
              )}

              {/* Tab 2: In-Call Live Chat */}
              {drawerTab === 'chat' && (
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5">
                    {inCallMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 p-4">
                        <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
                        <p className="text-xs">No messages yet.</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Send medicine names, dosage, or links.</p>
                      </div>
                    ) : (
                      inCallMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.sender === 'Me' ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[10px] text-neutral-400 mb-0.5">{msg.sender}</span>
                          <div
                            className={`p-2.5 rounded-2xl max-w-[85%] text-xs ${
                              msg.sender === 'Me' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-neutral-800 text-neutral-200 rounded-bl-none'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 flex items-center gap-2 bg-neutral-950/60">
                    <Input
                      placeholder="Type medicine name or note..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="h-9 text-xs bg-neutral-900 border-white/10 rounded-xl"
                    />
                    <Button type="submit" size="icon" className="h-9 w-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BOTTOM FLOATING GLASS CONTROL DOCK ── */}
        <div className="absolute bottom-6 inset-x-0 flex justify-center items-center pointer-events-none z-30 px-4">
          <div className="pointer-events-auto bg-neutral-900/90 backdrop-blur-2xl border border-white/15 px-3.5 sm:px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 sm:gap-3">
            {/* Microphone Mute Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleAudioMute}
              title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-0 transition-all ${
                isAudioMuted
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-2 ring-red-500/50'
                  : 'bg-neutral-800/80 text-white hover:bg-neutral-700'
              }`}
            >
              {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            {/* Video Camera Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={switchCamera}
              title="Camera switch"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-0 bg-neutral-800/80 text-white hover:bg-neutral-700"
            >
              <Video className="w-5 h-5" />
            </Button>

            {/* Screen Share Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleScreenShare}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-0 transition-all ${
                isScreenSharing
                  ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 ring-2 ring-cyan-400/50'
                  : 'bg-neutral-800/80 text-white hover:bg-neutral-700'
              }`}
            >
              <Monitor className="w-5 h-5" />
            </Button>

            {/* Camera Switcher Menu */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowCameraMenu(p => !p)}
                title="Select Camera Device"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-800/80 text-white hover:bg-neutral-700 border-0"
              >
                <SwitchCamera className="w-5 h-5" />
              </Button>
              {showCameraMenu && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 bg-neutral-900 text-white border border-neutral-800 rounded-xl shadow-2xl p-2 z-50">
                  <p className="text-[11px] text-neutral-400 px-2 py-1 font-semibold">Available Cameras</p>
                  <button
                    type="button"
                    onClick={() => { switchCamera(); setShowCameraMenu(false); }}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-neutral-800 flex items-center gap-2"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" /> Flip to {facingMode === 'user' ? 'Rear' : 'Front'}
                  </button>
                  {availableCameras.map((cam, idx) => (
                    <button
                      key={cam.deviceId || idx}
                      type="button"
                      onClick={() => { setShowCameraMenu(false); }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-neutral-800 truncate ${
                        selectedCameraId === cam.deviceId ? 'text-cyan-400 font-semibold' : ''
                      }`}
                    >
                      {cam.label || `Camera ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Low-Light Enhancer Filter */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleLowLight}
              title={isLowLightEnhanced ? 'Disable Low-Light Enhancement' : 'Enhance Low-Light Video'}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-0 transition-all ${
                isLowLightEnhanced
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 ring-2 ring-amber-400/50'
                  : 'bg-neutral-800/80 text-white hover:bg-neutral-700'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </Button>

            {/* Speaker Output Selector */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowAudioMenu(p => !p)}
                title="Audio Output / Speaker"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-800/80 text-white hover:bg-neutral-700 border-0"
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
              {showAudioMenu && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 bg-neutral-900 text-white border border-neutral-800 rounded-xl shadow-2xl p-2 z-50">
                  <p className="text-[11px] text-neutral-400 px-2 py-1 font-semibold">Audio Output Device</p>
                  <button
                    type="button"
                    onClick={() => { setAudioOutput('default'); setShowAudioMenu(false); }}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-neutral-800"
                  >
                    System Default
                  </button>
                  {audioOutputDevices.map((dev, idx) => (
                    <button
                      key={dev.deviceId || idx}
                      type="button"
                      onClick={() => { setAudioOutput(dev.deviceId); setShowAudioMenu(false); }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-neutral-800 truncate ${
                        selectedOutputId === dev.deviceId ? 'text-cyan-400 font-semibold' : ''
                      }`}
                    >
                      {dev.label || `Speaker ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* END VIDEO CALL BUTTON */}
            <Button
              variant="destructive"
              size="icon"
              onClick={() => endVideoCall()}
              title="End Video Call"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/30 font-semibold transition-transform hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
