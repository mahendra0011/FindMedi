import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { motion } from 'framer-motion';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface EmergencyVideoRoomProps {
  room: string;
  identity?: string;
  onClose: () => void;
}

export default function EmergencyVideoRoom({ room, identity, onClose }: EmergencyVideoRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<'connecting' | 'live' | 'unavailable' | 'error'>('connecting');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let roomObj: Room | null = null;

    (async () => {
      try {
        const res = await api.post('/video/token', { room, identity });
        const livekitUrl: string | undefined =
          res?.url || (import.meta as any).env?.VITE_LIVEKIT_URL || undefined;
        if (!res?.token || !livekitUrl) {
          if (!cancelled) setStatus('unavailable');
          return;
        }
        roomObj = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = roomObj;
        roomObj.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
            track.attach(remoteVideoRef.current);
          }
        });
        roomObj.on(RoomEvent.TrackUnsubscribed, (track) => track.detach());
        await roomObj.connect(livekitUrl, res.token);
        await roomObj.localParticipant.enableCameraAndMicrophone();
        const videoPub = roomObj.localParticipant.getTrackPublication(Track.Source.Camera);
        const videoTrack = videoPub?.videoTrack;
        if (videoTrack && localVideoRef.current) videoTrack.attach(localVideoRef.current);
        if (!cancelled) setStatus('live');
      } catch (err: any) {
        if (!cancelled) {
          setStatus('error');
          toast.error(err?.message || 'Video room failed — use call fallback');
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        roomObj?.disconnect();
      } catch { /* noop */ }
      roomRef.current = null;
    };
  }, [room, identity]);

  const toggleMute = async () => {
    try {
      await roomRef.current?.localParticipant.setMicrophoneEnabled(muted);
      setMuted(!muted);
    } catch { /* noop */ }
  };

  const toggleVideo = async () => {
    try {
      await roomRef.current?.localParticipant.setCameraEnabled(videoOff);
      setVideoOff(!videoOff);
    } catch { /* noop */ }
  };

  const leave = () => {
    try {
      roomRef.current?.disconnect();
    } catch { /* noop */ }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 text-white select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-4 sm:p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm sm:text-base">🎥 Emergency Video Triage</h3>
          <span className="text-[11px] font-mono text-slate-400">Room #{room.slice(-6)}</span>
        </div>

        {status === 'connecting' && (
          <div className="aspect-video rounded-2xl bg-black/60 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            <p className="text-xs text-slate-400">Connecting secure video…</p>
          </div>
        )}

        {status === 'unavailable' && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
            Video media is not configured on this server right now. Please use the Call button (audio fallback) — your consultation continues without interruption.
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-200">
            Could not join video. Check connection and retry, or fall back to the phone call option.
          </div>
        )}

        {(status === 'live' || status === 'connecting') && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/70 border border-white/10">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <span className="absolute bottom-1.5 left-2 text-[10px] font-bold bg-black/60 px-2 py-0.5 rounded-full">Doctor</span>
            </div>
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/70 border border-white/10">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <span className="absolute bottom-1.5 left-2 text-[10px] font-bold bg-black/60 px-2 py-0.5 rounded-full">You</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2.5 pt-1">
          <Button type="button" size="icon" variant="outline" onClick={toggleMute} className="rounded-full w-11 h-11" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button type="button" size="icon" variant="outline" onClick={toggleVideo} className="rounded-full w-11 h-11" aria-label={videoOff ? 'Camera on' : 'Camera off'}>
            {videoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </Button>
          <Button type="button" onClick={leave} className="rounded-full h-11 px-6 bg-red-600 hover:bg-red-700 font-bold text-xs gap-1.5">
            <PhoneOff className="w-4 h-4" /> End
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
