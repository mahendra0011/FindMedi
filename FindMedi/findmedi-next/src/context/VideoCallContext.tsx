'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { playRingbackTone, playConnectSound, playEndSound, playBusySound, stopVibration } from '@/lib/audioCallSounds';

export type VideoCallState = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'busy' | 'timeout';

export interface ActiveVideoPeer {
  id: string;
  name?: string;
  avatar?: string;
  role?: string;
  phone?: string;
  appointmentId?: string;
}

export interface InCallMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface VideoCallContextValue {
  callState: VideoCallState;
  activePeer: ActiveVideoPeer | null;
  isCaller: boolean;
  currentCallLogId: string | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isRemoteVideoMuted: boolean;
  isRemoteAudioMuted: boolean;
  isSpeakerOn: boolean;
  isLowLightEnhanced: boolean;
  availableCameras: MediaDeviceInfo[];
  selectedCameraId: string;
  facingMode: 'user' | 'environment';
  audioOutputDevices: MediaDeviceInfo[];
  selectedOutputId: string;
  isScreenSharing: boolean;
  inCallMessages: InCallMessage[];
  clinicalNotes: string;
  callDuration: number;
  networkQuality: string;
  resolutionLabel: string;
  isMinimized: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (peer: ActiveVideoPeer, metadata?: Record<string, unknown>) => Promise<void>;
  initiateCall: (peer: ActiveVideoPeer, appointmentId?: string) => Promise<void>;
  initiateVideoCall: (peer: ActiveVideoPeer, appointmentId?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  acceptVideoCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  rejectVideoCall: (reason?: string) => void;
  endCall: (reason?: string) => void;
  endVideoCall: (reason?: string) => void;
  toggleAudio: () => void;
  toggleAudioMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  toggleLowLight: () => void;
  toggleMinimize: () => void;
  sendInCallMessage: (text: string) => void;
  setClinicalNotes: (notes: string) => void;
  saveClinicalNotes: () => Promise<void>;
  setAudioOutput: (deviceId: string) => Promise<void>;
}

const VideoCallContext = createContext<VideoCallContextValue | null>(null);

const CALL_TIMEOUT_SECONDS = 35;

export function VideoCallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [callState, setCallState] = useState<VideoCallState>('idle');
  const [activePeer, setActivePeer] = useState<ActiveVideoPeer | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [currentCallLogId] = useState<string | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isRemoteVideoMuted] = useState(false);
  const [isRemoteAudioMuted] = useState(false);
  const [isSpeakerOn] = useState(true);
  const [isLowLightEnhanced, setIsLowLightEnhanced] = useState(false);

  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState('default');

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [inCallMessages, setInCallMessages] = useState<InCallMessage[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState('');

  const [callDuration, setCallDuration] = useState(0);
  const [networkQuality] = useState('1080p-fullhd');
  const [resolutionLabel] = useState('1080p Full HD');
  const [isMinimized, setIsMinimized] = useState(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopToneRef = useRef<(() => void) | null>(null);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAvailableCameras(devices.filter((d) => d.kind === 'videoinput'));
        setAudioOutputDevices(devices.filter((d) => d.kind === 'audiooutput'));
      } catch (e) {
        console.warn('Devices enumeration error:', e);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchVideoDevices = async () => {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          if (active) {
            setAvailableCameras(devices.filter((d) => d.kind === 'videoinput'));
            setAudioOutputDevices(devices.filter((d) => d.kind === 'audiooutput'));
          }
        } catch (e) {
          console.warn('Devices enumeration error:', e);
        }
      }
    };

    void fetchVideoDevices();

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => {
        active = false;
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }
    return () => {
      active = false;
    };
  }, [refreshDevices]);

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
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    remoteStreamRef.current = null;
    setRemoteStream(null);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted((prev) => !prev);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoMuted((prev) => !prev);
    }
  }, []);

  const switchCamera = useCallback(async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    toast.info(`Switched camera to ${nextMode}`);
  }, [facingMode]);

  const toggleScreenShare = useCallback(async () => {
    setIsScreenSharing((prev) => !prev);
    toast.info('Screen share toggled');
  }, []);

  const toggleLowLight = useCallback(() => {
    setIsLowLightEnhanced((prev) => !prev);
    toast.info(`Low-light enhancement ${!isLowLightEnhanced ? 'enabled' : 'disabled'}`);
  }, [isLowLightEnhanced]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const sendInCallMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const msg: InCallMessage = {
      id: Date.now().toString(),
      sender: user?.name || 'Me',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setInCallMessages((prev) => [...prev, msg]);
  }, [user]);

  const saveClinicalNotes = useCallback(async () => {
    toast.success('Clinical notes saved');
  }, []);

  const setAudioOutput = useCallback(async (deviceId: string) => {
    setSelectedOutputId(deviceId);
  }, []);

  const endCall = useCallback((reason = 'Video call ended') => {
    cleanupMediaAndPeer();
    playEndSound();
    setCallState('idle');
    setActivePeer(null);
    setIsCaller(false);
    setIsMinimized(false);
    setIsScreenSharing(false);
    setCallDuration(0);
    toast.info(reason);
  }, [cleanupMediaAndPeer]);

  const rejectCall = useCallback((reason = 'Video call rejected') => {
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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      setCallState('connected');
      callTimerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } catch (e) {
      console.error(e);
      toast.error('Failed to access camera and microphone');
      endCall('Permission denied');
    }
  }, [activePeer, endCall]);

  const startCall = useCallback(async (peer: ActiveVideoPeer, _metadata?: Record<string, unknown>) => {
    void _metadata;
    try {
      setActivePeer(peer);
      setIsCaller(true);
      setCallState('calling');
      stopToneRef.current = playRingbackTone();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      timeoutTimerRef.current = setTimeout(() => {
        playBusySound();
        endCall('User is busy or unavailable');
      }, CALL_TIMEOUT_SECONDS * 1000);
    } catch (e) {
      console.error(e);
      toast.error('Failed to access camera and microphone');
      setCallState('idle');
      setActivePeer(null);
    }
  }, [endCall]);

  return (
    <VideoCallContext.Provider
      value={{
        callState,
        activePeer,
        isCaller,
        currentCallLogId,
        isAudioMuted,
        isVideoMuted,
        isRemoteVideoMuted,
        isRemoteAudioMuted,
        isSpeakerOn,
        isLowLightEnhanced,
        availableCameras,
        selectedCameraId,
        facingMode,
        audioOutputDevices,
        selectedOutputId,
        isScreenSharing,
        inCallMessages,
        clinicalNotes,
        callDuration,
        networkQuality,
        resolutionLabel,
        isMinimized,
        localStream,
        remoteStream,
        startCall,
        initiateCall: (peer: ActiveVideoPeer, appointmentId?: string) =>
          startCall(peer, appointmentId ? { appointmentId } : undefined),
        initiateVideoCall: (peer: ActiveVideoPeer, appointmentId?: string) =>
          startCall(peer, appointmentId ? { appointmentId } : undefined),
        acceptCall,
        acceptVideoCall: acceptCall,
        rejectCall,
        rejectVideoCall: rejectCall,
        endCall,
        endVideoCall: endCall,
        toggleAudio,
        toggleAudioMute: toggleAudio,
        toggleVideo,
        switchCamera,
        toggleScreenShare,
        toggleLowLight,
        toggleMinimize,
        sendInCallMessage,
        setClinicalNotes,
        saveClinicalNotes,
        setAudioOutput,
      }}
    >
      {children}
    </VideoCallContext.Provider>
  );
}

export function useVideoCall() {
  const context = useContext(VideoCallContext);
  if (!context) {
    return {
      callState: 'idle' as VideoCallState,
      activePeer: null,
      isCaller: false,
      currentCallLogId: null,
      isAudioMuted: false,
      isVideoMuted: false,
      isRemoteVideoMuted: false,
      isRemoteAudioMuted: false,
      isSpeakerOn: true,
      isLowLightEnhanced: false,
      availableCameras: [],
      selectedCameraId: '',
      facingMode: 'user' as const,
      audioOutputDevices: [],
      selectedOutputId: 'default',
      isScreenSharing: false,
      inCallMessages: [],
      clinicalNotes: '',
      callDuration: 0,
      networkQuality: '1080p-fullhd',
      resolutionLabel: '1080p Full HD',
      isMinimized: false,
      localStream: null,
      remoteStream: null,
      startCall: async () => {},
      initiateCall: async () => {},
      initiateVideoCall: async () => {},
      acceptCall: async () => {},
      acceptVideoCall: async () => {},
      rejectCall: () => {},
      rejectVideoCall: () => {},
      endCall: () => {},
      endVideoCall: () => {},
      toggleAudio: () => {},
      toggleAudioMute: () => {},
      toggleVideo: () => {},
      switchCamera: async () => {},
      toggleScreenShare: async () => {},
      toggleLowLight: () => {},
      toggleMinimize: () => {},
      sendInCallMessage: () => {},
      setClinicalNotes: () => {},
      saveClinicalNotes: async () => {},
      setAudioOutput: async () => {},
    };
  }
  return context;
}
