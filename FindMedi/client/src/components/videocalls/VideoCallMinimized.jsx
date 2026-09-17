import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoCall } from '@/context/VideoCallContext';

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function VideoCallMinimized() {
  const {
    callState,
    activePeer,
    callDuration,
    isMinimized,
    isAudioMuted,
    isVideoMuted,
    remoteStream,
    toggleMinimize,
    endVideoCall,
    toggleAudioMute,
  } = useVideoCall();

  const miniVideoRef = useRef(null);

  // Position coordinates for draggable floating widget
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  useEffect(() => {
    if (remoteStream && miniVideoRef.current) {
      miniVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: pos.x,
      posY: pos.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const dx = dragRef.current.mouseX - e.clientX;
      const dy = dragRef.current.mouseY - e.clientY;
      setPos({
        x: Math.max(12, Math.min(window.innerWidth - 260, dragRef.current.posX + dx)),
        y: Math.max(12, Math.min(window.innerHeight - 180, dragRef.current.posY + dy)),
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

  if (!isMinimized || callState === 'idle') return null;

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{ right: `${pos.x}px`, bottom: `${pos.y}px` }}
      className="fixed z-[10000] w-64 rounded-2xl overflow-hidden bg-neutral-900/95 border border-white/20 shadow-2xl backdrop-blur-xl text-white select-none cursor-grab active:cursor-grabbing group"
    >
      {/* Mini Video Container */}
      <div className="relative w-full h-36 bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={miniVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Top Info Bar */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-emerald-400 font-semibold">{formatDuration(callDuration)}</span>
          </div>

          <div className="flex items-center gap-1 pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMinimize}
              title="Expand Full Screen"
              className="w-7 h-7 rounded-lg bg-black/60 hover:bg-neutral-800 text-white p-0"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Patient Name pill */}
        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-semibold text-white truncate max-w-[140px]">
          {activePeer?.name || 'Patient'}
        </div>
      </div>

      {/* Floating Bottom Quick Bar */}
      <div className="p-2 flex items-center justify-between bg-neutral-900 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleAudioMute}
            title={isAudioMuted ? 'Unmute' : 'Mute'}
            className={`w-8 h-8 rounded-full ${
              isAudioMuted ? 'bg-red-500/20 text-red-400' : 'text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
        </div>

        <Button
          size="sm"
          variant="destructive"
          onClick={endVideoCall}
          className="h-8 px-3 rounded-full bg-red-600 hover:bg-red-700 text-xs font-semibold gap-1"
        >
          <PhoneOff className="w-3.5 h-3.5" /> End
        </Button>
      </div>
    </div>
  );
}
