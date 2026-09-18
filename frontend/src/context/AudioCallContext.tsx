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

const AudioCallContext = createContext(null);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

const CALL_TIMEOUT_SECONDS = 30;

export function AudioCallProvider({ children }) {
  const { user } = useAuth();

  // Call States: 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'busy' | 'timeout'
  const [callState, setCallState] = useState('idle');
  const [activePeer, setActivePeer] = useState(null); // { id, name, avatar, role, phone, appointmentId }
  const [isCaller, setIsCaller] = useState(false);
  const [currentCallLogId, setCurrentCallLogId] = useState(null);

  // Audio Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedOutputId, setSelectedOutputId] = useState('default');

  // Stats & Timers
  const [callDuration, setCallDuration] = useState(0);
  const [callQuality, setCallQuality] = useState('good'); // 'good' | 'fair' | 'poor' | 'reconnecting'
  const [isMinimized, setIsMinimized] = useState(false);

  // Call Recording & Clinical Notes
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [clinicalNotes, setClinicalNotes] = useState('');

  // References
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteAudioElemRef = useRef(null);
  const callTimerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);
  const qualityIntervalRef = useRef(null);
  const stopToneRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingAudioCtxRef = useRef(null);

  // Create remote audio element on mount
  useEffect(() => {
    if (!remoteAudioElemRef.current) {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      remoteAudioElemRef.current = audio;
    }
  }, []);

  // Fetch available audio output devices (bluetooth, wired, speaker)
  const refreshAudioDevices = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter((d) => d.kind === 'audiooutput');
        setAudioDevices(outputs);
      } catch (e) {
        console.warn('Audio devices enumeration error:', e);
      }
    }
  }, []);

  useEffect(() => {
    refreshAudioDevices();
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshAudioDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshAudioDevices);
      };
    }
  }, [refreshAudioDevices]);

  // Clean up all media, connections, timers, and tones
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
    if (qualityIntervalRef.current) {
      clearInterval(qualityIntervalRef.current);
      qualityIntervalRef.current = null;
    }

    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (recordingAudioCtxRef.current && recordingAudioCtxRef.current.state !== 'closed') {
      try {
        recordingAudioCtxRef.current.close();
      } catch (e) {}
    }

    // Stop local audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Stop remote audio element
    if (remoteAudioElemRef.current) {
      remoteAudioElemRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;

    // Close WebRTC peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }, []);

  // Set selected audio output (Earpiece / Speaker / Headset)
  const setAudioOutput = useCallback(async (deviceId) => {
    setSelectedOutputId(deviceId);
    if (remoteAudioElemRef.current && typeof remoteAudioElemRef.current.setSinkId === 'function') {
      try {
        await remoteAudioElemRef.current.setSinkId(deviceId);
        toast.success(`Audio output changed`);
      } catch (err) {
        console.warn('setSinkId error:', err);
      }
    }
  }, []);

  // Toggle speaker phone
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      if (remoteAudioElemRef.current) {
        remoteAudioElemRef.current.volume = next ? 1.0 : 0.4;
      }
      return next;
    });
  }, []);

  // Toggle mic mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        toast.info(!audioTrack.enabled ? 'Microphone Muted' : 'Microphone Unmuted');
      }
    }
  }, []);

  // ── Call Log Backend Helpers ──
  const logInitiate = async (receiverId, appointmentId) => {
    try {
      const res = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ receiverId, appointmentId }),
      });
      const json = await res.json();
      if (json.success && json.call?._id) {
        setCurrentCallLogId(json.call._id);
        return json.call._id;
      }
    } catch (e) {
      console.warn('Failed to log call initiate:', e);
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

  const saveClinicalNotes = useCallback(async (notesText) => {
    const textToSave = notesText != null ? notesText : clinicalNotes;
    if (!currentCallLogId) {
      toast.error('No active call record found');
      return;
    }
    try {
      await updateCallStatus(currentCallLogId, 'completed', callDuration, textToSave);
      toast.success('Clinical consultation notes saved to audio call record');
    } catch (e) {
      toast.error('Failed to save clinical notes');
    }
  }, [currentCallLogId, clinicalNotes, callDuration]);

  const uploadRecordingBlob = async (callId, blob, duration) => {
    if (!callId || !blob) return;
    try {
      const formData = new FormData();
      formData.append('audio', blob, `recording-${callId}.webm`);
      formData.append('duration', String(duration));
      await fetch(`/api/calls/${callId}/recording`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      toast.success('Call audio recording saved to history');
    } catch (e) {
      console.warn('Failed to upload call recording:', e);
    }
  };

  // Acquire clean audio stream with Echo Cancellation, Noise Suppression, and AGC
  const getMicrophoneStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false, // Strict audio only
      });
      localStreamRef.current = stream;
      setIsMuted(false);
      return stream;
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Microphone permission was denied. Please allow mic access in your browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error('No microphone detected on your device.');
      } else {
        toast.error(`Microphone error: ${err.message}`);
      }
      throw err;
    }
  };

  // Start combined call recording (mixes both local doctor voice & remote patient voice)
  const startRecording = useCallback(() => {
    if (callState !== 'connected') {
      toast.error('You can only record an active connected call');
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      recordingAudioCtxRef.current = ctx;

      const dest = ctx.createMediaStreamDestination();

      if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
        const localSource = ctx.createMediaStreamSource(localStreamRef.current);
        localSource.connect(dest);
      }

      if (remoteStreamRef.current && remoteStreamRef.current.getAudioTracks().length > 0) {
        const remoteSource = ctx.createMediaStreamSource(remoteStreamRef.current);
        remoteSource.connect(dest);
      }

      const recorder = new MediaRecorder(dest.stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0 && currentCallLogId) {
          uploadRecordingBlob(currentCallLogId, blob, recordingDuration);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      toast.info('Call recording started');
    } catch (e) {
      console.warn('Recording initiation failed:', e);
      toast.error('Could not start call recording');
    }
  }, [callState, currentCallLogId, recordingDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      toast.success('Call recording finished');
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Create WebRTC Peer Connection with event listeners
  const createPeerConnection = useCallback((peerUserId, isOriginator) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // ICE Candidate handler -> sends to peer via Socket.IO
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const s = getSocket();
        s.emit('call:ice', {
          to: peerUserId,
          candidate: event.candidate,
        });
      }
    };

    // Remote Audio Stream Received
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      remoteStreamRef.current = stream;
      if (remoteAudioElemRef.current) {
        remoteAudioElemRef.current.srcObject = stream;
        remoteAudioElemRef.current.play().catch(() => {});
      }
    };

    // Monitor Connection State & Network Quality
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setCallQuality('good');
      } else if (state === 'disconnected') {
        setCallQuality('poor');
        toast.warning('Network unstable, trying to reconnect audio...');
      } else if (state === 'failed') {
        setCallQuality('reconnecting');
        // Trigger ICE restart on network switch (Wi-Fi <-> 4G/5G)
        if (isOriginator) {
          pc.restartIce();
        }
      }
    };

    // Periodic WebRTC stats check
    if (qualityIntervalRef.current) clearInterval(qualityIntervalRef.current);
    qualityIntervalRef.current = setInterval(async () => {
      if (pc && pc.connectionState === 'connected') {
        try {
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              const rtt = report.currentRoundTripTime;
              if (rtt != null) {
                if (rtt < 0.15) setCallQuality('good');
                else if (rtt < 0.35) setCallQuality('fair');
                else setCallQuality('poor');
              }
            }
          });
        } catch (e) {}
      }
    }, 4000);

    return pc;
  }, []);

  // ── INITIATE OUTGOING AUDIO CALL ──
  const initiateCall = useCallback(async (recipient, appointmentId = null) => {
    if (!recipient || !recipient.id && !recipient._id) {
      toast.error('Recipient information is missing');
      return;
    }
    const recipientId = String(recipient.id || recipient._id);

    if (callState !== 'idle') {
      toast.error('You already have an active call in progress');
      return;
    }

    try {
      // 1. Get local mic stream
      const stream = await getMicrophoneStream();

      // 2. Setup state
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

      // 5. Send Socket.IO invite
      const s = getSocket();
      s.emit('call:invite', {
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

      // 6. Timeout after 30s if no answer
      timeoutTimerRef.current = setTimeout(() => {
        toast.warning('No answer from patient');
        s.emit('call:timeout', { to: recipientId, callLogId: logId });
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

  // ── ACCEPT INCOMING CALL ──
  const acceptCall = useCallback(async () => {
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

      // 1. Acquire mic stream
      const stream = await getMicrophoneStream();

      // 2. Create WebRTC Peer Connection
      const pc = createPeerConnection(activePeer.id, false);

      // Add local audio tracks to connection
      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

      // 3. Notify caller that call was accepted
      const s = getSocket();
      s.emit('call:accept', {
        to: activePeer.id,
        callLogId: currentCallLogId,
      });

      // Update call log
      if (currentCallLogId) {
        updateCallStatus(currentCallLogId, 'completed');
      }
    } catch (err) {
      toast.error('Failed to connect audio call');
      rejectCall();
    }
  }, [activePeer, currentCallLogId, createPeerConnection]);

  // ── REJECT INCOMING CALL ──
  const rejectCall = useCallback(() => {
    if (activePeer) {
      const s = getSocket();
      s.emit('call:reject', {
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

  // ── END ACTIVE OR OUTGOING CALL ──
  const endCall = useCallback(() => {
    if (activePeer) {
      const s = getSocket();
      if (callState === 'calling' || callState === 'ringing') {
        s.emit('call:cancel', { to: activePeer.id, callLogId: currentCallLogId });
        if (currentCallLogId) {
          updateCallStatus(currentCallLogId, 'cancelled', 0);
        }
      } else {
        s.emit('call:end', { to: activePeer.id, callLogId: currentCallLogId, duration: callDuration });
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
      setIsRecording(false);
      setIsMinimized(false);
    }, 1200);
  }, [activePeer, callState, currentCallLogId, callDuration, cleanupMediaAndPeer]);

  // Toggle minimize/floating mode
  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  // ── Socket.IO Signaling Listener ──
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    // Incoming Call Invite
    const handleCallInvite = (data) => {
      const callerId = String(data.caller?.id || data.from);

      // If user is already in another call, reply busy immediately
      if (callState !== 'idle') {
        s.emit('call:busy', { to: callerId, reason: 'Line Busy' });
        return;
      }

      setActivePeer({
        id: callerId,
        name: data.caller?.name || 'Caller',
        avatar: data.caller?.avatar || '',
        role: data.caller?.role || 'patient',
        phone: data.caller?.phone || '',
        appointmentId: data.appointmentId || null,
      });
      setCurrentCallLogId(data.callLogId || null);
      setIsCaller(false);
      setCallState('ringing');
      setIsMinimized(false);

      // Play ringing chime + vibrate device
      stopToneRef.current = playRingtone();
      triggerVibration();

      // Recipient auto-timeout if not answered within 30s
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

      // Inform caller that phone is ringing
      s.emit('call:ringing', { to: callerId });
    };

    // Caller receives Ringing acknowledgment
    const handleCallRinging = () => {
      if (callState === 'calling') {
        setCallState('ringing');
      }
    };

    // Recipient accepted call -> Caller creates Offer SDP and starts audio exchange
    const handleCallAccept = async (data) => {
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
          offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(offer);

        s.emit('call:offer', {
          to: activePeer?.id,
          offer,
        });
      } catch (e) {
        console.warn('Error creating WebRTC offer:', e);
      }
    };

    // Recipient receives Offer SDP -> sets remote description & responds with Answer SDP
    const handleCallOffer = async (data) => {
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

        s.emit('call:answer', {
          to: activePeer?.id,
          answer,
        });

        // Connected!
        playConnectSound();
        setCallState('connected');

        // Start call duration timer
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      } catch (e) {
        console.warn('Error handling WebRTC offer:', e);
      }
    };

    // Caller receives Answer SDP -> sets remote description & audio is officially flowing
    const handleCallAnswer = async (data) => {
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
        console.warn('Error setting WebRTC answer:', e);
      }
    };

    // Candidate exchange (ICE)
    const handleCallIce = async (data) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (e) {
        console.warn('Error adding ICE candidate:', e);
      }
    };

    // Call Rejected
    const handleCallReject = () => {
      toast.error('Call declined');
      playEndSound();
      cleanupMediaAndPeer();
      setCallState('rejected');
      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
      }, 1500);
    };

    // Call Cancelled before answer
    const handleCallCancel = () => {
      toast.info('Caller hung up');
      playEndSound();
      cleanupMediaAndPeer();
      setCallState('ended');
      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
      }, 1500);
    };

    // Call Ended by peer
    const handleCallEnd = () => {
      toast.info('Call ended');
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

    // Line Busy
    const handleCallBusy = () => {
      toast.warning('Patient is currently on another call');
      playBusySound();
      cleanupMediaAndPeer();
      setCallState('busy');
      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
      }, 2000);
    };

    // Timeout
    const handleCallTimeout = () => {
      toast.warning('No answer');
      playEndSound();
      cleanupMediaAndPeer();
      setCallState('timeout');
      setTimeout(() => {
        setCallState('idle');
        setActivePeer(null);
      }, 2000);
    };

    s.on('call:invite', handleCallInvite);
    s.on('call:ringing', handleCallRinging);
    s.on('call:accept', handleCallAccept);
    s.on('call:offer', handleCallOffer);
    s.on('call:answer', handleCallAnswer);
    s.on('call:ice', handleCallIce);
    s.on('call:reject', handleCallReject);
    s.on('call:cancel', handleCallCancel);
    s.on('call:end', handleCallEnd);
    s.on('call:busy', handleCallBusy);
    s.on('call:timeout', handleCallTimeout);

    return () => {
      s.off('call:invite', handleCallInvite);
      s.off('call:ringing', handleCallRinging);
      s.off('call:accept', handleCallAccept);
      s.off('call:offer', handleCallOffer);
      s.off('call:answer', handleCallAnswer);
      s.off('call:ice', handleCallIce);
      s.off('call:reject', handleCallReject);
      s.off('call:cancel', handleCallCancel);
      s.off('call:end', handleCallEnd);
      s.off('call:busy', handleCallBusy);
      s.off('call:timeout', handleCallTimeout);
    };
  }, [callState, activePeer, createPeerConnection, cleanupMediaAndPeer]);

  return (
    <AudioCallContext.Provider
      value={{
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
        isMinimized,
        localStream: localStreamRef.current,
        remoteStream: remoteStreamRef.current,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        clinicalNotes,
        setClinicalNotes,
        saveClinicalNotes,
        toggleMute,
        toggleSpeaker,
        setAudioOutput,
        toggleRecording,
        toggleMinimize,
      }}
    >
      {children}
    </AudioCallContext.Provider>
  );
}

export function useAudioCall() {
  const context = useContext(AudioCallContext);
  if (!context) {
    throw new Error('useAudioCall must be used within an AudioCallProvider');
  }
  return context;
}
