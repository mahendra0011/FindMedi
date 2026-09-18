import { motion } from 'framer-motion';
import { PhoneOff, Mic, MicOff, Maximize2, User, Disc } from 'lucide-react';
import { useAudioCall } from '@/context/AudioCallContext';

function formatTimer(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function AudioCallMinimized() {
  const {
    callState,
    activePeer,
    isMinimized,
    callDuration,
    isMuted,
    isRecording,
    toggleMute,
    endCall,
    toggleMinimize,
  } = useAudioCall();

  if (!isMinimized || callState === 'idle' || !activePeer) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[9998] flex items-center gap-3 px-4 py-3 rounded-2xl bg-card/95 border border-border/80 shadow-2xl backdrop-blur-xl"
    >
      {/* Mini Avatar */}
      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted border border-primary/30 flex items-center justify-center flex-shrink-0">
        {activePeer.avatar ? (
          <img src={activePeer.avatar} alt={activePeer.name} className="w-full h-full object-cover" />
        ) : (
          <User className="w-5 h-5 text-muted-foreground" />
        )}
        {callState === 'connected' && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
        )}
      </div>

      {/* Info & Timer */}
      <div className="min-w-[90px]">
        <p className="text-xs font-bold text-foreground truncate max-w-[110px]">
          {activePeer.name}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          <span>{callState === 'connected' ? formatTimer(callDuration) : 'Connecting...'}</span>
          {isRecording && (
            <span className="flex items-center gap-0.5 text-destructive text-[10px] animate-pulse">
              <Disc className="w-2.5 h-2.5" /> REC
            </span>
          )}
        </div>
      </div>

      {/* Quick Controls */}
      <div className="flex items-center gap-1.5 pl-1 border-l border-border/60">
        <button
          type="button"
          onClick={toggleMute}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isMuted ? 'bg-destructive/10 text-destructive' : 'bg-muted hover:bg-muted/80 text-foreground'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={endCall}
          className="w-8 h-8 rounded-full bg-destructive text-white hover:bg-destructive/90 flex items-center justify-center transition-all shadow-sm active:scale-95"
          title="End Call"
        >
          <PhoneOff className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={toggleMinimize}
          className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-all"
          title="Expand Call"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
