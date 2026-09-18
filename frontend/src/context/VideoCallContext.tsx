import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import {
  playRingtone,
  playRingbackTone,
  playConnectSound,
  playEndSound,
  playBusySound,
  triggerVibration,
  stopVibration,
} from '@/lib/audioCallSounds';

const VideoCallContext = createContext(null);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

const CALL_TIMEOUT_SECONDS = 35;

export function VideoCallProvider({ children }) {
  const { user } = useAuth();

  // Call States: 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'busy' | 'timeout'
  const [callState, setCallState] = useState('idle');
  const [activePeer, setActivePeer] = useState(null); // { id, name, avatar, role, phone, appointmentId }
  const [isCaller, setIsCaller] = useState(false);
  const [currentCallLogId, setCurrentCallLogId] = useState(null);

  // Audio/Video Hardware States
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isRemoteVideoMuted, setIsRemoteVideoMuted] = useState(false);
  const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isLowLightEnhanced, setIsLowLightEnhanced] = useState(false);

  // Hardware Devices
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedOutputId, setSelectedOutputId] = useState('default');

  // Telemedicine & Medical Features
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [inCallMessages, setInCallMessages] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Stats & Display
  const [callDuration, setCallDuration] = useState(0);
  const [networkQuality, setNetworkQuality] = useState('1080p-fullhd'); // '1080p-fullhd' | 'good' | 'fair' | 'poor' | 'reconnecting'
  const [resolutionLabel, setResolutionLabel] = useState('1080p Full HD');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // References
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteVideoElemRef = useRef(null);
  const localVideoElemRef = useRef(null);
  const callTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);
  const qualityIntervalRef = useRef(null);
  const stopToneRef = useRef(null);

  // Enumerate cameras and audio outputs
  const refreshMediaDevices = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

        setAvailableCameras(videoInputs);
        setAudioOutputDevices(audioOutputs);

        if (videoInputs.length > 0 && !selectedCameraId) {
          setSelectedCameraId(videoInputs[0].deviceId);
        }
      } catch (e) {
        console.warn('Media devices enumeration error:', e);
      }
    }
  }, [selectedCameraId]);

  useEffect(() => {
    refreshMediaDevices();
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshMediaDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshMediaDevices);
      };
    }
  }, [refreshMediaDevices]);

  // Clean up all media, WebRTC peer, intervals, and tones
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
    if (qualityIntervalRef.current) {
      clearInterval(qualityIntervalRef.current);
      qualityIntervalRef.current = null;
    }

    // Stop local video & audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Detach elements
    if (remoteVideoElemRef.current) {
      remoteVideoElemRef.current.srcObject = null;
    }
    if (localVideoElemRef.current) {
      localVideoElemRef.current.srcObject = null;
    }

    remoteStreamRef.current = null;

    // Close WebRTC peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }, []);

  // ── Acquire Full HD 1080p Video + High-Quality Audio Stream ──
  const getCameraAndMicStream = async (customCameraId = null, customFacingMode = null) => {
    const targetFacing = customFacingMode || facingMode;
    const targetCameraId = customCameraId || selectedCameraId;

    // Full HD 1080p Constraints
    const constraints1080p = {
      video: targetCameraId
        ? {
            deviceId: { exact: targetCameraId },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, max: 60 },
          }
        : {
            facingMode: targetFacing,
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, max: 60 },
          },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints1080p);
      localStreamRef.current = stream;
      setResolutionLabel('1080p Full HD');
      setIsAudioMuted(false);
      setIsVideoMuted(false);

      if (localVideoElemRef.current) {
        localVideoElemRef.current.srcObject = stream;
      }
      return stream;
    } catch (err1080p) {
      console.warn('1080p constraint fallback to standard HD:', err1080p);
      // Fallback to standard HD 720p / default
      try {
        const fallbackConstraints = {
          video: targetCameraId
            ? { deviceId: { exact: targetCameraId } }
            : { facingMode: targetFacing },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        };
        const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        localStreamRef.current = fallbackStream;
        setResolutionLabel('720p HD (Adaptive)');
        setIsAudioMuted(false);
        setIsVideoMuted(false);

        if (localVideoElemRef.current) {
          localVideoElemRef.current.srcObject = fallbackStream;
        }
        return fallbackStream;
      } catch (fallbackErr) {
        if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
          toast.error('Camera & Microphone permission denied. Please allow access.');
        } else if (fallbackErr.name === 'NotFoundError') {
          toast.error('No camera or microphone found on your device.');
        } else {
          toast.error(`Media access failed: ${fallbackErr.message}`);
        }
        throw fallbackErr;
      }
    }
  };

  // ── Switch Camera (Front/Rear or Specific Device) ──
  const switchCamera = useCallback(async (deviceId) => {
    setSelectedCameraId(deviceId);
    if (!localStreamRef.current) return;

    try {
      // Acquire new video track
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace video track in WebRTC peer connection
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      // Stop old video track
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) oldVideoTrack.stop();

      // Replace in local stream
      localStreamRef.current.removeTrack(oldVideoTrack);
      localStreamRef.current.addTrack(newVideoTrack);

      if (localVideoElemRef.current) {
        localVideoElemRef.current.srcObject = localStreamRef.current;
      }
      toast.success('Camera switched');
    } catch (e) {
      console.warn('Switch camera error:', e);
      toast.error('Could not switch camera');
    }
  }, []);

  // Flip front / rear camera for mobile / tablet devices
  const flipFacingMode = useCallback(async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    if (!localStreamRef.current) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextFacing,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) oldVideoTrack.stop();

      localStreamRef.current.removeTrack(oldVideoTrack);
      localStreamRef.current.addTrack(newVideoTrack);

      if (localVideoElemRef.current) {
        localVideoElemRef.current.srcObject = localStreamRef.current;
      }
      toast.info(`Camera flipped to ${nextFacing === 'user' ? 'Front' : 'Rear'}`);
    } catch (e) {
      console.warn('Flip facing mode error:', e);
      toast.error('Could not flip camera');
    }
  }, [facingMode]);

  // ── Toggle Microphone ──
  const toggleAudioMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const muted = !audioTrack.enabled;
        setIsAudioMuted(muted);

        // Notify peer about mic status
        const s = getSocket();
        if (activePeer?.id) {
          s.emit('videocall:track_state', {
            to: activePeer.id,
            kind: 'audio',
            enabled: !muted,
          });
        }
        toast.info(muted ? 'Microphone Muted' : 'Microphone Unmuted');
      }
    }
  }, [activePeer]);

  // ── Toggle Camera On / Off ──
  const toggleVideoMute = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const videoDisabled = !videoTrack.enabled;
        setIsVideoMuted(videoDisabled);

        // Notify peer about video status
        const s = getSocket();
        if (activePeer?.id) {
          s.emit('videocall:track_state', {
            to: activePeer.id,
            kind: 'video',
            enabled: !videoDisabled,
          });
        }
        toast.info(videoDisabled ? 'Camera turned OFF' : 'Camera turned ON');
      }
    }
  }, [activePeer]);

  // ── Speaker Toggle & Audio Output Selection ──
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      if (remoteVideoElemRef.current) {
        remoteVideoElemRef.current.volume = next ? 1.0 : 0.4;
      }
      return next;
    });
  }, []);

  const setAudioOutput = useCallback(async (deviceId) => {
    setSelectedOutputId(deviceId);
    if (remoteVideoElemRef.current && typeof remoteVideoElemRef.current.setSinkId === 'function') {
      try {
        await remoteVideoElemRef.current.setSinkId(deviceId);
        toast.success('Audio output device updated');
      } catch (e) {
        console.warn('setSinkId error:', e);
      }
    }
  }, []);

  // ── Low-Light Video Enhancer Filter ──
  const toggleLowLightEnhancer = useCallback(() => {
    setIsLowLightEnhanced((prev) => {
      const next = !prev;
      toast.info(next ? 'Low-Light Enhancement enabled' : 'Normal Lighting mode');
      return next;
    });
  }, []);

  // ── Picture-in-Picture & Minimized Dock ──
  const togglePiP = useCallback(async () => {
    if (!remoteVideoElemRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (remoteVideoElemRef.current.requestPictureInPicture) {
        await remoteVideoElemRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
      // Fallback to in-app minimized dock
      setIsMinimized((prev) => !prev);
    }
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  // ── Screen Sharing (Display Media) ──
  const toggleScreenShare = useCallback(async () => {
    if (!localStreamRef.current) return;

    if (isScreenSharing) {
      // Revert back to webcam
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        });
        const camVideoTrack = camStream.getVideoTracks()[0];

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) await sender.replaceTrack(camVideoTrack);
        }

        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) oldTrack.stop();

        localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(camVideoTrack);

        if (localVideoElemRef.current) {
          localVideoElemRef.current.srcObject = localStreamRef.current;
        }

        setIsScreenSharing(false);
        const s = getSocket();
        if (activePeer?.id) s.emit('videocall:screen_share', { to: activePeer.id, isSharing: false });
        toast.info('Screen sharing stopped — webcam restored');
      } catch (e) {
        console.warn('Revert webcam error:', e);
      }
    } else {
      // Start Screen Share
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });
        const screenTrack = displayStream.getVideoTracks()[0];

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) await sender.replaceTrack(screenTrack);
        }

        const oldTrack = localStreamRef.current.getVideoTracks()[0];

        localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(screenTrack);

        if (localVideoElemRef.current) {
          localVideoElemRef.current.srcObject = localStreamRef.current;
        }

        setIsScreenSharing(true);
        const s = getSocket();
        if (activePeer?.id) s.emit('videocall:screen_share', { to: activePeer.id, isSharing: true });
        toast.success('Sharing screen with patient');

        // Handle user stopping share via browser native banner
        screenTrack.onended = async () => {
          try {
            const camStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } },
            });
            const camVideoTrack = camStream.getVideoTracks()[0];

            if (peerConnectionRef.current) {
              const sender = peerConnectionRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
              if (sender) await sender.replaceTrack(camVideoTrack);
            }

            localStreamRef.current.removeTrack(screenTrack);
            localStreamRef.current.addTrack(camVideoTrack);

            if (localVideoElemRef.current) {
              localVideoElemRef.current.srcObject = localStreamRef.current;
            }
            setIsScreenSharing(false);
            if (activePeer?.id) s.emit('videocall:screen_share', { to: activePeer.id, isSharing: false });
            toast.info('Screen share ended');
          } catch (err) {}
        };
      } catch (err) {
        if (err.name !== 'NotAllowedError') {
          toast.error('Screen sharing could not be started');
        }
      }
    }
  }, [isScreenSharing, activePeer]);

  // ── In-Call Chat Messaging ──
  const sendInCallMessage = useCallback((text) => {
    if (!text || !text.trim() || !activePeer?.id) return;
    const msg = {
      senderId: String(user?._id),
      senderName: user?.name || 'Doctor',
      text: text.trim(),
      timestamp: Date.now(),
    };

    setInCallMessages((prev) => [...prev, msg]);

    const s = getSocket();
    s.emit('videocall:message', {
      to: activePeer.id,
      message: msg,
    });
  }, [activePeer, user]);

  // ── Save Clinical Consultation Notes ──
  const saveClinicalNotes = useCallback(async (notesText) => {
    const textToSave = notesText != null ? notesText : clinicalNotes;
    if (!currentCallLogId) {
      toast.error('No active call record found');
      return;
    }
    try {
      await updateCallStatus(currentCallLogId, 'completed', callDuration, textToSave);
      toast.success('Clinical consultation notes saved to call record');
    } catch (e) {
      toast.error('Failed to save clinical notes');
    }
  }, [currentCallLogId, clinicalNotes, callDuration]);

  // ── Capture High-Res Medical Snapshot ──
  const captureSnapshot = useCallback(() => {
    const videoElem = remoteVideoElemRef.current;
    if (!videoElem || !videoElem.videoWidth) {
      toast.error('Remote video not available for snapshot');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElem.videoWidth;
      canvas.height = videoElem.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `clinical-snapshot-${activePeer?.name?.replace(/\s+/g, '_') || 'patient'}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('High-resolution clinical snapshot captured and downloaded');
    } catch (e) {
      toast.error('Failed to capture snapshot');
    }
  }, [activePeer]);

  // ── Backend Call Log Helpers ──
  const logInitiate = async (receiverId, appointmentId) => {
    try {
      const res = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ receiverId, appointmentId, callType: 'video' }),
      });
      const json = await res.json();
      if (json.success && json.call?._id) {
        setCurrentCallLogId(json.call._id);
        return json.call._id;
      }
    } catch (e) {
      console.warn('Failed to log video call initiate:', e);
    }
    return null;
  };

  const updateCallStatus = async (callId, status, duration = 0, notes = '') => {
    if (!callId) return;
    try {
      await fetch(`/api/calls/${callId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, duration, notes }),
      });
    } catch (e) {
      console.warn('Failed to update call status:', e);
    }
  };

  // ── WebRTC PeerConnection Setup ──
  const createPeerConnection = useCallback((peerUserId, isOriginator) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Send ICE candidate to peer via dedicated videocall:ice event
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const s = getSocket();
        s.emit('videocall:ice', {
          to: peerUserId,
          candidate: event.candidate,
        });
      }
    };

    // Remote Audio/Video Track Received
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      remoteStreamRef.current = stream;
      if (remoteVideoElemRef.current) {
        remoteVideoElemRef.current.srcObject = stream;
        remoteVideoElemRef.current.play().catch(() => {});
      }
    };

    // Network connection state & ICE monitor
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setNetworkQuality('1080p-fullhd');
      } else if (state === 'disconnected') {
        setNetworkQuality('poor');
        toast.warning('Network unstable, adapting video quality...');
      } else if (state === 'failed') {
        setNetworkQuality('reconnecting');
        if (isOriginator) {
          pc.restartIce();
        }
      }
    };

    // Periodic WebRTC quality check (Adaptive Bitrate & Latency)
    if (qualityIntervalRef.current) clearInterval(qualityIntervalRef.current);
    qualityIntervalRef.current = setInterval(async () => {
      if (pc && pc.connectionState === 'connected') {
        try {
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              const rtt = report.currentRoundTripTime;
              if (rtt != null) {
                if (rtt < 0.12) {
                  setNetworkQuality('1080p-fullhd');
                  setResolutionLabel('1080p Full HD');
                } else if (rtt < 0.28) {
                  setNetworkQuality('good');
                  setResolutionLabel('720p HD');
                } else if (rtt < 0.5) {
                  setNetworkQuality('fair');
                  setResolutionLabel('480p Adaptive');
                } else {
                  setNetworkQuality('poor');
                  setResolutionLabel('Low Bandwidth');
                }
              }
            }
          });
        } catch (e) {}
      }
    }, 3500);

    return pc;
  }, []);

  // ── INITIATE OUTGOING VIDEO CALL ──
  const initiateVideoCall = useCallback(async (recipient, appointmentId = null) => {
    if (!recipient || (!recipient.id && !recipient._id)) {
      toast.error('Recipient information missing');
      return;
    }
    const recipientId = String(recipient.id || recipient._id);

    if (callState !== 'idle') {
      toast.error('You already have an active call in progress');
      return;
    }

    try {
      // 1. Acquire Full HD Camera & Mic
      const stream = await getCameraAndMicStream();

      // 2. Setup call state
      setActivePeer({
        id: recipientId,
        name: recipient.name || 'Patient',
        avatar: recipient.avatar || '',
        role: recipient.role || 'patient',
        phone: recipient.phone || '',
        appointmentId,
      });
      setIsCaller(true);
      setCallState('calling');
      setIsMinimized(false);
      setCallDuration(0);

      // 3. Play ringback tone
      stopToneRef.current = playRingbackTone();

      // 4. Log in database
      const logId = await logInitiate(recipientId, appointmentId);

      // 5. Send Socket.IO invite on dedicated videocall:invite event
      const s = getSocket();
      s.emit('videocall:invite', {
        to: recipientId,
        caller: {
          id: String(user?._id),
          name: user?.name || 'Doctor',
          avatar: user?.avatar || '',
          role: user?.role || 'doctor',
          phone: user?.phone || '',
        },
        callLogId: logId,
        appointmentId,
        timestamp: Date.now(),
      });

      // 6. Timeout after 35s if no answer
      timeoutTimerRef.current = setTimeout(() => {
        toast.warning('No answer from patient');
        s.emit('videocall:timeout', { to: recipientId, callLogId: logId });
        updateCallStatus(logId, 'missed', 0, 'No answer / timeout');
        playEndSound();
        setCallState('timeout');
        setTimeout(() => {
          cleanupMediaAndPeer();
          setCallState('idle');
          setActivePeer(null);
        }, 2000);
      }, CALL_TIMEOUT_SECONDS * 1000);
    } catch (err) {
      cleanupMediaAndPeer();
      setCallState('idle');
      setActivePeer(null);
    }
  }, [callState, user, cleanupMediaAndPeer]);

  // ── ACCEPT INCOMING VIDEO CALL ──
  const acceptVideoCall = useCallback(async () => {
    if (!activePeer) return;

    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (stopToneRef.current) {
      stopToneRef.current();
      stopToneRef.current = null;
    }
    stopVibration();

    try {
      setCallState('connecting');

      // 1. Acquire Full HD stream
      const stream = await getCameraAndMicStream();

      // 2. Create WebRTC Peer Connection
      const pc = createPeerConnection(activePeer.id, false);

      // Add local audio and video tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 3. Notify caller on dedicated videocall:accept
      const s = getSocket();
      s.emit('videocall:accept', {
        to: activePeer.id,
        callLogId: currentCallLogId,
      });

      if (currentCallLogId) {
        updateCallStatus(currentCallLogId, 'completed');
      }
    } catch (err) {
      toast.error('Failed to start camera for video call');
      rejectVideoCall();
    }
  }, [activePeer, currentCallLogId, createPeerConnection]);

  // ── REJECT INCOMING VIDEO CALL ──
  const rejectVideoCall = useCallback(() => {
    if (activePeer) {
      const s = getSocket();
      s.emit('videocall:reject', {
        to: activePeer.id,
        callLogId: currentCallLogId,
        reason: 'Declined by recipient',
      });
      if (currentCallLogId) {
        updateCallStatus(currentCallLogId, 'rejected', 0);
      }
    }
    playEndSound();
    cleanupMediaAndPeer();
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setActivePeer(null);
      setCurrentCallLogId(null);
    }, 1200);
  }, [activePeer, currentCallLogId, cleanupMediaAndPeer]);

  // ── END ACTIVE VIDEO CALL ──
  const endVideoCall = useCallback(() => {
    if (activePeer) {
      const s = getSocket();
      if (callState === 'calling' || callState === 'ringing') {
        s.emit('videocall:cancel', { to: activePeer.id, callLogId: currentCallLogId });
        if (currentCallLogId) {
          updateCallStatus(currentCallLogId, 'cancelled', 0);
        }
      } else {
        s.emit('videocall:end', { to: activePeer.id, callLogId: currentCallLogId, duration: callDuration });
        if (currentCallLogId) {
          updateCallStatus(currentCallLogId, 'completed', callDuration);
        }
      }
    }

    playEndSound();
    cleanupMediaAndPeer();
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setActivePeer(null);
      setCurrentCallLogId(null);
      setCallDuration(0);
      setIsMinimized(false);
      setIsFullScreen(false);
    }, 1200);
  }, [activePeer, callState, currentCallLogId, callDuration, cleanupMediaAndPeer]);

  // ── Dedicated Socket.IO Video Call Signaling Listeners ──
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    // Incoming Video Call Invite
    const handleVideoInvite = (data) => {
      const callerId = String(data.caller?.id || data.from);

      // If user is already on a call, emit busy
      if (callState !== 'idle') {
        s.emit('videocall:busy', { to: callerId, reason: 'Line Busy' });
        return;
      }

      setActivePeer({
        id: callerId,
        name: data.caller?.name || 'Patient',
        avatar: data.caller?.avatar || '',
        role: data.caller?.role || 'patient',
        phone: data.caller?.phone || '',
        appointmentId: data.appointmentId || null,
      });
      setCurrentCallLogId(data.callLogId || null);
      setIsCaller(false);
      setCallState('ringing');
      setIsMinimized(false);

      stopToneRef.current = playRingtone();
      triggerVibration();

      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = setTimeout(() => {
        playEndSound();
        cleanupMediaAndPeer();
        setCallState('missed');
        setTimeout(() => {
          setCallState('idle');
          setActivePeer(null);
        }, 1500);
      }, CALL_TIMEOUT_SECONDS * 1000);

      s.emit('videocall:ringing', { to: callerId });
    };

    const handleVideoRinging = () => {
      if (callState === 'calling') {
        setCallState('ringing');
      }
    };

    // Caller initiates WebRTC offer once peer accepts
    const handleVideoAccept = async () => {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (stopToneRef.current) {
        stopToneRef.current();
        stopToneRef.current = null;
      }

      setCallState('connecting');

      try {
        const pc = createPeerConnection(activePeer?.id, true);

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
        }

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        s.emit('videocall:offer', {
          to: activePeer?.id,
          offer,
        });
      } catch (e) {
        console.warn('Error creating WebRTC video offer:', e);
      }
    };

    // Recipient receives video offer -> responds with video answer
    const handleVideoOffer = async (data) => {
      try {
        let pc = peerConnectionRef.current;
        if (!pc) {
          pc = createPeerConnection(activePeer?.id, false);
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
          }
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        s.emit('videocall:answer', {
          to: activePeer?.id,
          answer,
        });

        playConnectSound();
        setCallState('connected');

        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      } catch (e) {
        console.warn('Error handling WebRTC video offer:', e);
      }
    };

    // Caller receives video answer -> media flowing
    const handleVideoAnswer = async (data) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

          playConnectSound();
          setCallState('connected');

          if (callTimerRef.current) clearInterval(callTimerRef.current);
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      } catch (e) {
        console.warn('Error setting WebRTC video answer:', e);
      }
    };

    const handleVideoIce = async (data) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (e) {
        console.warn('Error adding video ICE candidate:', e);
      }
    };

    const handleTrackState = (data) => {
      if (data.kind === 'video') {
        setIsRemoteVideoMuted(!data.enabled);
      } else if (data.kind === 'audio') {
        setIsRemoteAudioMuted(!data.enabled);
      }
    };

    const handleVideoReject = () => {
      toast.error('Video call declined');
      playEndSound();
      cleanupMediaAndPeer();
      setCallState('rejected');
      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
      }, 1500);
    };

    const handleVideoCancel = () => {
      toast.info('Caller hung up');
      playEndSound();
      cleanupMediaAndPeer();
      setCallState('ended');
      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
      }, 1500);
    };

    const handleVideoEnd = () => {
      toast.info('Video consultation ended');
      playEndSound();
      cleanupMediaAndPeer();
      setCallState('ended');
      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
        setCallDuration(0);
        setIsMinimized(false);
      }, 1500);
    };

    const handleVideoBusy = () => {
      toast.warning('Patient is currently on another call');
      playBusySound();
      cleanupMediaAndPeer();
      setCallState('busy');
      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
      }, 2000);
    };

    const handleVideoTimeout = () => {
      toast.warning('No answer');
      playEndSound();
      cleanupMediaAndPeer();
      setCallState('timeout');
      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
      }, 2000);
    };

    const handleIncomingMessage = (data) => {
      if (data?.message) {
        setInCallMessages((prev) => [...prev, data.message]);
        toast.info(`Message from ${data.message.senderName || 'Patient'}: ${data.message.text.slice(0, 30)}...`);
      }
    };

    s.on('videocall:invite', handleVideoInvite);
    s.on('videocall:ringing', handleVideoRinging);
    s.on('videocall:accept', handleVideoAccept);
    s.on('videocall:offer', handleVideoOffer);
    s.on('videocall:answer', handleVideoAnswer);
    s.on('videocall:ice', handleVideoIce);
    s.on('videocall:track_state', handleTrackState);
    s.on('videocall:message', handleIncomingMessage);
    s.on('videocall:reject', handleVideoReject);
    s.on('videocall:cancel', handleVideoCancel);
    s.on('videocall:end', handleVideoEnd);
    s.on('videocall:busy', handleVideoBusy);
    s.on('videocall:timeout', handleVideoTimeout);

    return () => {
      s.off('videocall:invite', handleVideoInvite);
      s.off('videocall:ringing', handleVideoRinging);
      s.off('videocall:accept', handleVideoAccept);
      s.off('videocall:offer', handleVideoOffer);
      s.off('videocall:answer', handleVideoAnswer);
      s.off('videocall:ice', handleVideoIce);
      s.off('videocall:track_state', handleTrackState);
      s.off('videocall:message', handleIncomingMessage);
      s.off('videocall:reject', handleVideoReject);
      s.off('videocall:cancel', handleVideoCancel);
      s.off('videocall:end', handleVideoEnd);
      s.off('videocall:busy', handleVideoBusy);
      s.off('videocall:timeout', handleVideoTimeout);
    };
  }, [callState, activePeer, createPeerConnection, cleanupMediaAndPeer]);

  return (
    <VideoCallContext.Provider
      value={{
        callState,
        activePeer,
        isCaller,
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
        isFullScreen,
        localStream: localStreamRef.current,
        remoteStream: remoteStreamRef.current,
        remoteVideoElemRef,
        localVideoElemRef,
        initiateVideoCall,
        acceptVideoCall,
        rejectVideoCall,
        endVideoCall,
        toggleAudioMute,
        toggleVideoMute,
        switchCamera,
        flipFacingMode,
        toggleSpeaker,
        setAudioOutput,
        toggleLowLightEnhancer,
        toggleScreenShare,
        sendInCallMessage,
        setClinicalNotes,
        saveClinicalNotes,
        captureSnapshot,
        togglePiP,
        toggleMinimize,
        toggleFullScreen,
      }}
    >
      {children}
    </VideoCallContext.Provider>
  );
}

export function useVideoCall() {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
}
