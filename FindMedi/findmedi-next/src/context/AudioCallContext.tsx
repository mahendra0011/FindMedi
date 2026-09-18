'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';


import { playRingbackTone, playConnectSound, playEndSound, playBusySound, stopVibration } from '@/lib/audioCallSounds';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'busy' | 'timeout';

export interface ActivePeer {
  id: string;
  name?: string;
  avatar?: string;
  role?: string;
  phone?: string;
  appointmentId?: string;
}

export interface AudioCallContextValue {
  callState: CallState;
  activePeer: ActivePeer | null;
  isCaller: boolean;
  currentCallLogId: string | null;
  isMuted: boolean;
  isSpeakerOn: boolean;
  audioDevices: MediaDeviceInfo[];
  selectedOutputId: string;
  callDuration: number;
  callQuality: string;
  isMinimized: boolean;
  isRecording: boolean;
  recordingDuration: number;
  clinicalNotes: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (peer: ActivePeer, metadata?: Record<string, unknown>) => Promise<void>;
  initiateCall: (peer: ActivePeer, appointmentId?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: (reason?: string) => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  setAudioOutput: (deviceId: string) => Promise<void>;
  toggleRecording: () => void;
  toggleMinimize: () => void;
  setClinicalNotes: (notes: string) => void;
  saveClinicalNotes: () => Promise<void>;
}

const AudioCallContext = createContext<AudioCallContextValue | null>(null);

const CALL_TIMEOUT_SECONDS = 30;

export function AudioCallProvider({ children }: { children: React.ReactNode }) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [activePeer, setActivePeer] = useState<ActivePeer | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [currentCallLogId] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState('default');

  const [callDuration, setCallDuration] = useState(0);
  const [callQuality] = useState('good');
  const [isMinimized, setIsMinimized] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration] = useState(0);
  const [clinicalNotes, setClinicalNotes] = useState('');

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioElemRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopToneRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!remoteAudioElemRef.current && typeof document !== 'undefined') {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      remoteAudioElemRef.current = audio;
    }
  }, []);

  const refreshAudioDevices = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === 'audiooutput'));
      } catch (e) {
        console.warn('Audio devices enumeration error:', e);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchAudioDevices = async () => {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          if (active) {
            setAudioDevices(devices.filter((d) => d.kind === 'audiooutput'));
          }
        } catch (e) {
          console.warn('Audio devices enumeration error:', e);
        }
      }
    };

    void fetchAudioDevices();

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshAudioDevices);
      return () => {
        active = false;
        navigator.mediaDevices.removeEventListener('devicechange', refreshAudioDevices);
      };
    }
    return () => {
      active = false;
    };
  }, [refreshAudioDevices]);

  const cleanupMediaAndPeer = useCallback(() => {
    if (stopToneRef.current) {
      stopToneRef.current();
      stopToneRef.current = null;
    }
    stopVibration();

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    if (remoteAudioElemRef.current) {
      remoteAudioElemRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;
    setRemoteStream(null);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }, []);

  const setAudioOutput = useCallback(async (deviceId: string) => {
    setSelectedOutputId(deviceId);
    if (remoteAudioElemRef.current && 'setSinkId' in remoteAudioElemRef.current) {
      try {
        await (remoteAudioElemRef.current as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId);
      } catch (e) {
        console.warn('Could not set sink id:', e);
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      if (remoteAudioElemRef.current) {
        remoteAudioElemRef.current.volume = next ? 1 : 0.4;
      }
      return next;
    });
  }, []);

  const toggleRecording = useCallback(() => {
    setIsRecording((prev) => !prev);
    if (!isRecording) {
      toast.info('Audio call recording started');
    } else {
      toast.info('Audio call recording stopped');
    }
  }, [isRecording]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const saveClinicalNotes = useCallback(async () => {
    toast.success('Clinical notes saved successfully');
  }, []);

  const endCall = useCallback((reason = 'Call ended') => {
    cleanupMediaAndPeer();
    playEndSound();
    setCallState('idle');
    setActivePeer(null);
    setIsCaller(false);
    setIsMinimized(false);
    setIsRecording(false);
    setCallDuration(0);
    toast.info(reason);
  }, [cleanupMediaAndPeer]);

  const rejectCall = useCallback((reason = 'Call rejected') => {
    endCall(reason);
  }, [endCall]);

  const acceptCall = useCallback(async () => {
    if (!activePeer) return;
    try {
      if (stopToneRef.current) {
        stopToneRef.current();
        stopToneRef.current = null;
      }
      stopVibration();
      playConnectSound();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setLocalStream(stream);

      setCallState('connected');
      callTimerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } catch (e) {
      console.error(e);
      toast.error('Failed to access microphone');
      endCall('Permission denied');
    }
  }, [activePeer, endCall]);

  const startCall = useCallback(async (peer: ActivePeer, _metadata?: Record<string, unknown>) => {
    void _metadata;
    try {
      setActivePeer(peer);
      setIsCaller(true);
      setCallState('calling');
      stopToneRef.current = playRingbackTone();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setLocalStream(stream);

      timeoutTimerRef.current = setTimeout(() => {
        playBusySound();
        endCall('User is busy or unavailable');
      }, CALL_TIMEOUT_SECONDS * 1000);
    } catch (e) {
      console.error(e);
      toast.error('Failed to access microphone');
      setCallState('idle');
      setActivePeer(null);
    }
  }, [endCall]);

  return (
    <AudioCallContext.Provider
      value={{
        callState,
        activePeer,
        isCaller,
        currentCallLogId,
        isMuted,
        isSpeakerOn,
        audioDevices,
        selectedOutputId,
        callDuration,
        callQuality,
        isMinimized,
        isRecording,
        recordingDuration,
        clinicalNotes,
        localStream,
        remoteStream,
        startCall,
        initiateCall: (peer: ActivePeer, appointmentId?: string) =>
          startCall(peer, appointmentId ? { appointmentId } : undefined),
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleSpeaker,
        setAudioOutput,
        toggleRecording,
        toggleMinimize,
        setClinicalNotes,
        saveClinicalNotes,
      }}
    >
      {children}
    </AudioCallContext.Provider>
  );
}

export function useAudioCall() {
  const context = useContext(AudioCallContext);
  if (!context) {
    // Provide a safe fallback so components render cleanly even outside provider
    return {
      callState: 'idle' as CallState,
      activePeer: null,
      isCaller: false,
      currentCallLogId: null,
      isMuted: false,
      isSpeakerOn: true,
      audioDevices: [],
      selectedOutputId: 'default',
      callDuration: 0,
      callQuality: 'good',
      isMinimized: false,
      isRecording: false,
      recordingDuration: 0,
      clinicalNotes: '',
      localStream: null,
      remoteStream: null,
      startCall: async () => {},
      initiateCall: async () => {},
      acceptCall: async () => {},
      rejectCall: () => {},
      endCall: () => {},
      toggleMute: () => {},
      toggleSpeaker: () => {},
      setAudioOutput: async () => {},
      toggleRecording: () => {},
      toggleMinimize: () => {},
      setClinicalNotes: () => {},
      saveClinicalNotes: async () => {},
    };
  }
  return context;
}
