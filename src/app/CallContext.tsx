"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
    Box,
    Dialog,
    Typography,
    Avatar,
    Button,
    IconButton,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import CallEndIcon from "@mui/icons-material/CallEnd";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import HearingIcon from "@mui/icons-material/Hearing";
import PictureInPictureAltIcon from "@mui/icons-material/PictureInPictureAlt";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { useRouter } from "next/navigation";
import { getAvatarUrl, getApiUrl, authenticatedFetch, navigateToAppRoute } from "./apiUrl";
import { supabase } from "../lib/supabase";

type CallContextType = {
    startCall: (targetId: string, isVideo: boolean, otherUser?: any) => Promise<void>;
    showIncomingCall: (data: any) => void; 
};

const CallContext = createContext<CallContextType | null>(null);
const INCOMING_CALL_STORAGE_KEY = "sm_pending_incoming_call";
const INCOMING_CALL_MAX_AGE_MS = 90 * 1000;

function parseMaybeJson(value: any) {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function normalizeIncomingCallData(data: any) {
    if (!data) return null;

    const parsedOffer = parseMaybeJson(data.offer);
    const validOffer = parsedOffer && typeof parsedOffer === "object" && parsedOffer.type && parsedOffer.sdp
        ? parsedOffer
        : null;

    const receivedAt = Number(data.receivedAt || data.sentAt || Date.now());

    return {
        callerId: data.callerId || data.senderId || null,
        callerName: data.callerName || data.title || "Incoming Call",
        callerAvatar: data.callerAvatar || null,
        isVideo: data.isVideo === 'true' || data.isVideo === true,
        offer: validOffer,
        callId: data.callId || null,
        receivedAt,
    };
}

export const useCallContext = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error("useCallContext must be used within a CallProvider");
    }
    return context;
};

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isDuplicateSession, setIsDuplicateSession] = useState(false);

    // Call state
    const [signalingReady, setSignalingReady] = useState(false);
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [activeCall, setActiveCall] = useState<any>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [isCallMinimized, setIsCallMinimized] = useState(false);
    const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

    // Timing and Log State
    const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | null>(null);
    const [connectedAt, setConnectedAt] = useState<number | null>(null);
    const [callDuration, setCallDuration] = useState<number>(0);

    // Refs for stale closures in socket handlers
    const activeCallRef = useRef<any>(null);
    const callStatusRef = useRef<any>(null);
    const callDurationRef = useRef<number>(0);

    useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
    useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callStatus === 'connected' && connectedAt) {
            interval = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - connectedAt) / 1000));
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [callStatus, connectedAt]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // WebRTC refs
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const ringAudioRef = useRef<HTMLAudioElement | null>(null);
    const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const signalingChannelRef = useRef<any>(null);

    const processIceCandidatesQueue = async () => {
        if (!peerConnection.current || !peerConnection.current.remoteDescription) return;
        console.log(`[WebRTC] Processing ${iceCandidatesQueue.current.length} queued ICE candidates`);
        while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) { console.error("[WebRTC] Error adding queued ICE candidate:", e); }
            }
        }
    };
    
    useEffect(() => {
        const checkQueue = async () => {
            if (peerConnection.current?.remoteDescription) {
                await processIceCandidatesQueue();
            }
        };
        const interval = setInterval(checkQueue, 1000);
        return () => clearInterval(interval);
    }, [activeCall]);

    useEffect(() => {
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const parsed = JSON.parse(userStr);
                setCurrentUser(parsed);
                console.log("[CallContext] Current user loaded:", parsed.id);
            }
        } catch (err) {
            console.error("[CallContext] Failed to parse user from localStorage", err);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const rawIncomingCall = localStorage.getItem(INCOMING_CALL_STORAGE_KEY);
            if (!rawIncomingCall) return;

            const restoredCall = normalizeIncomingCallData(JSON.parse(rawIncomingCall));
            if (!restoredCall) {
                localStorage.removeItem(INCOMING_CALL_STORAGE_KEY);
                return;
            }

            if (Date.now() - restoredCall.receivedAt > INCOMING_CALL_MAX_AGE_MS) {
                localStorage.removeItem(INCOMING_CALL_STORAGE_KEY);
                return;
            }

            setIncomingCall((prev: any) => prev || restoredCall);
        } catch (err) {
            console.error("[CallContext] Failed to restore pending incoming call", err);
            localStorage.removeItem(INCOMING_CALL_STORAGE_KEY);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            if (incomingCall) {
                localStorage.setItem(INCOMING_CALL_STORAGE_KEY, JSON.stringify(incomingCall));
            } else {
                localStorage.removeItem(INCOMING_CALL_STORAGE_KEY);
            }
        } catch (err) {
            console.error("[CallContext] Failed to persist incoming call state", err);
        }
    }, [incomingCall]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleBeforeUnload = () => {
            const currentCall = activeCallRef.current;
            const channel = signalingChannelRef.current;

            if (currentCall?.userId && channel) {
                try {
                    void channel.send({
                        type: 'broadcast',
                        event: 'call_end',
                        payload: { targetId: currentCall.userId }
                    });
                } catch (err) {
                    console.warn('[CallContext] Failed to notify remote peer during unload', err);
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    const sendSignal = async (event: string, payload: any) => {
        const channel = signalingChannelRef.current;
        if (!channel) {
            console.warn(`[CallContext] Signaling channel not ready for ${event}`);
            return;
        }

        const result = await channel.send({
            type: 'broadcast',
            event,
            payload
        });

        if (result !== 'ok') {
            console.warn(`[CallContext] Failed to send ${event}`, result);
        }
    };

    // Effect for Supabase Realtime signaling
    useEffect(() => {
        if (!currentUser) return;

        const channel = supabase
            .channel('webrtc-signaling', {
                config: {
                    broadcast: { self: false }
                }
            })
            .on('broadcast', { event: 'call_offer' }, async ({ payload }) => {
                if (payload?.targetId !== currentUser.id) return;
                console.log("Received call offer", payload);

                const normalizedOffer = normalizeIncomingCallData(payload);
                const currentActiveCall = activeCallRef.current;
                const isRenegotiation = !!currentActiveCall
                    && !!peerConnection.current
                    && currentActiveCall.userId === normalizedOffer?.callerId
                    && !!normalizedOffer?.offer;

                if (isRenegotiation) {
                    try {
                        setActiveCall((prev: any) => prev ? ({
                            ...prev,
                            isVideo: normalizedOffer?.isVideo || prev.isVideo,
                            callerAvatar: normalizedOffer?.callerAvatar || prev.callerAvatar,
                            callerName: normalizedOffer?.callerName || prev.callerName,
                        }) : prev);
                        await peerConnection.current!.setRemoteDescription(new RTCSessionDescription(normalizedOffer!.offer));
                        await processIceCandidatesQueue();
                        const answer = await peerConnection.current!.createAnswer();
                        await peerConnection.current!.setLocalDescription(answer);
                        await sendSignal('call_answer', {
                            targetId: normalizedOffer!.callerId,
                            answer,
                        });
                    } catch (err) {
                        console.error("[WebRTC] Failed to handle renegotiation offer", err);
                    }
                    return;
                }

                setIncomingCall((prev: any) => ({
                    ...(prev || {}),
                    ...(payload || {}),
                    // Never downgrade a previously valid offer with a missing one.
                    offer: payload?.offer || prev?.offer || null,
                }));
                iceCandidatesQueue.current = [];
            })
            .on('broadcast', { event: 'call_answer' }, async ({ payload }) => {
                if (payload?.targetId !== currentUser.id) return;
                console.log("Received call answer", payload);
                if (callStatusRef.current !== 'connected') {
                    setCallStatus('connected');
                    setConnectedAt(Date.now());
                }
                if (peerConnection.current) {
                    try {
                        if (!payload?.answer?.type || !payload?.answer?.sdp) {
                            console.warn("[WebRTC] Received invalid call answer payload", payload);
                            return;
                        }
                        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
                        await processIceCandidatesQueue();
                    } catch (e) { console.error("Error setting remote desc:", e); }
                }
            })
            .on('broadcast', { event: 'call_ice_candidate' }, async ({ payload }) => {
                if (payload?.targetId !== currentUser.id) return;
                console.log("[WebRTC] Received ICE candidate");
                if (peerConnection.current && peerConnection.current.remoteDescription) {
                    try {
                        await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    } catch (e) { console.error("Error adding ice candidate:", e); }
                } else {
                    console.log("[WebRTC] Queuing ICE candidate (remoteDescription not set)");
                    iceCandidatesQueue.current.push(payload.candidate);
                }
            })
            .on('broadcast', { event: 'call_end' }, ({ payload }) => {
                if (payload?.targetId !== currentUser.id) return;
                endCallLocally();
            })
            .on('broadcast', { event: 'call_reject' }, ({ payload }) => {
                if (payload?.targetId !== currentUser.id) return;
                console.log("Call rejected by other user");
                setIncomingCall(null);
                setActiveCall(null);
                setCallStatus(null);
            });

        signalingChannelRef.current = channel;
        channel.subscribe((status: string) => {
            const isReady = status === 'SUBSCRIBED';
            setSignalingReady(isReady);
            if (isReady) {
                console.log('[CallContext] Connected to Supabase signaling, user:', currentUser.id);
            }
        });

        return () => {
            setSignalingReady(false);
            signalingChannelRef.current = null;
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    const handleConfirmTakeover = () => {
        setIsDuplicateSession(false);
    };

    const handleCancelTakeover = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setCurrentUser(null);
        setIsDuplicateSession(false);
        navigateToAppRoute("/login", router);
    };

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    const initializePeerConnection = (targetUserId: string) => {
        console.log("[WebRTC] Initializing PeerConnection for:", targetUserId);
        const pc = new RTCPeerConnection(iceServers);
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("[WebRTC] ICE Candidate generated");
                void sendSignal('call_ice_candidate', { targetId: targetUserId, candidate: event.candidate });
            }
        };
        pc.ontrack = (event) => {
            console.log(`[WebRTC] Remote track received: ${event.track.kind}`, event.streams[0]?.id);
            
            setRemoteStream((prev) => {
                // If we already have a stream, try to add this track to it
                if (prev) {
                    console.log("[WebRTC] Adding track to existing remote stream");
                    // We need a NEW stream object to trigger a React re-render, or just use the event stream
                    if (event.streams && event.streams[0]) return event.streams[0];
                    
                    const newStream = new MediaStream(prev.getTracks());
                    if (!newStream.getTracks().find(t => t.id === event.track.id)) {
                        newStream.addTrack(event.track);
                    }
                    return newStream;
                }
                
                // If no previous stream, use the one from the event or create a new one
                if (event.streams && event.streams[0]) return event.streams[0];
                return new MediaStream([event.track]);
            });
        };
        pc.onicecandidateerror = (event) => {
            console.error("[WebRTC] ICE Candidate Error:", event);
        };
        pc.onconnectionstatechange = () => {
            console.log("[WebRTC] Connection state changed:", pc.connectionState);
            if (pc.connectionState === 'failed') {
                console.error("[WebRTC] P2P Connection failed. This usually means a TURN server is required for this network.");
            }
        };
        pc.oniceconnectionstatechange = () => {
            console.log("[WebRTC] ICE connection state changed:", pc.iceConnectionState);
        };
        peerConnection.current = pc;
        return pc;
    };

    const applyAudioOutputPreference = async (speakerEnabled: boolean) => {
        const mediaElement = remoteVideoRef.current as (HTMLMediaElement & { setSinkId?: (deviceId: string) => Promise<void> }) | null;
        if (!mediaElement || typeof mediaElement.setSinkId !== 'function' || !navigator.mediaDevices?.enumerateDevices) {
            return false;
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const outputs = devices.filter((device) => device.kind === 'audiooutput');
            if (!outputs.length) return false;

            const matches = (device: MediaDeviceInfo, pattern: RegExp) => pattern.test((device.label || '').toLowerCase());
            const preferredDevice = speakerEnabled
                ? outputs.find((device) => matches(device, /speaker|default|headphone|headset|usb/))
                    || outputs.find((device) => device.deviceId === 'default')
                    || outputs[0]
                : outputs.find((device) => matches(device, /communications|earpiece|bluetooth/))
                    || outputs.find((device) => device.deviceId === 'communications')
                    || outputs[0];

            await mediaElement.setSinkId(preferredDevice.deviceId || 'default');
            return true;
        } catch (err) {
            console.warn("[CallContext] Could not change audio output route", err);
            return false;
        }
    };

    const toggleSpeaker = async () => {
        const nextSpeakerState = !isSpeakerOn;
        const changed = await applyAudioOutputPreference(nextSpeakerState);
        if (!changed) {
            console.info("[CallContext] Speaker routing is controlled by the device on this platform.");
        }
        setIsSpeakerOn(nextSpeakerState);
    };

    const endCallLocally = () => {
        const callerData = activeCallRef.current;
        const currentStatus = callStatusRef.current;
        const duration = callDurationRef.current;

        if (callerData && callerData.isCaller) {
            const timeStr = formatDuration(duration);
            const logMsg = currentStatus === 'connected'
                ? `${callerData.isVideo ? '🎥 Video' : '📞 Audio'} Call - ${timeStr}`
                : `❌ Missed ${callerData.isVideo ? 'Video' : 'Audio'} Call`;
            
            try {
                authenticatedFetch(getApiUrl(`chats/${callerData.userId}`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: logMsg })
                });
            } catch (err) { console.error("Failed to log call", err); }
        }

        setLocalStream((prevStream) => {
            if (prevStream) prevStream.getTracks().forEach(track => track.stop());
            return null;
        });
        setRemoteStream(null);
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setIncomingCall(null);
        setActiveCall(null);
        setIsAudioMuted(false);
        setIsVideoMuted(false);
        setIsSpeakerOn(true);
        setIsCallMinimized(false);
        setHasRemoteVideo(false);
        setCallStatus(null);
        setConnectedAt(null);
        setCallDuration(0);
    };

    const startCall = async (targetId: string, isVideo: boolean, otherUser?: any) => {
        if (!targetId || !currentUser || !signalingReady) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            setLocalStream(stream);

            let calculatedAvatar = "";
            let calculatedName = "";
            if (otherUser) {
                calculatedAvatar = otherUser.avatar;
                calculatedName = otherUser.name;
            }

            setCallStatus('ringing');
            setCallDuration(0);
            setConnectedAt(null);

            setActiveCall({
                userId: targetId,
                isVideo: isVideo,
                isCaller: true,
                callerAvatar: calculatedAvatar,
                callerName: calculatedName
            });

            const pc = initializePeerConnection(targetId);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const callId = `${currentUser.id}-${targetId}-${Date.now()}`;
            const sentAt = Date.now();

            await sendSignal('call_offer', {
                targetId: targetId,
                callerId: currentUser.id,
                callerName: currentUser.name,
                callerAvatar: currentUser.avatar,
                isVideo,
                offer,
                callId,
                sentAt,
            });

            // Trigger fallback push notification for devices not actively connected to Supabase RT
            try {
                void authenticatedFetch(getApiUrl(`chats/${targetId}/call-notification`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        callerName: currentUser.name,
                        callerAvatar: currentUser.avatar,
                        isVideo,
                        offer,
                        callId,
                        sentAt,
                    })
                });
            } catch (notifyErr) {
                console.error("[WebRTC] Failed to send push notification alert", notifyErr);
            }
        } catch (err) {
            console.error("Failed to start call", err);
            alert("Could not access camera/microphone.");
        }
    };

    const acceptCall = async () => {
        if (!incomingCall) return;
        try {
            const normalizedIncomingCall = normalizeIncomingCallData(incomingCall);
            const offer = normalizedIncomingCall?.offer;
            const hasValidOffer = !!offer && typeof offer === 'object' && !!offer.type && !!offer.sdp;
            if (!hasValidOffer) {
                console.warn("[WebRTC] Cannot accept call yet: missing/invalid SDP offer", incomingCall);
                alert("Call signal is still syncing. Please tap Accept again in a moment.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: normalizedIncomingCall.isVideo, audio: true });
            setLocalStream(stream);
            setActiveCall({
                userId: normalizedIncomingCall.callerId,
                isVideo: normalizedIncomingCall.isVideo,
                isCaller: false,
                callerAvatar: normalizedIncomingCall.callerAvatar,
                callerName: normalizedIncomingCall.callerName
            });

            const pc = initializePeerConnection(normalizedIncomingCall.callerId);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            setCallStatus('connected');
            setConnectedAt(Date.now());

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            await processIceCandidatesQueue();
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await sendSignal('call_answer', {
                targetId: normalizedIncomingCall.callerId,
                answer
            });
            setIncomingCall(null);
        } catch (err) {
            console.error("Failed to accept call", err);
            alert("Could not access camera/microphone.");
            rejectCall();
        }
    };

    const rejectCall = () => {
        if (incomingCall) {
            void sendSignal('call_reject', { targetId: incomingCall.callerId });
        }
        setIncomingCall(null);
    };

    const showIncomingCall = (data: any) => {
        if (!data || activeCallRef.current) return;

        const normalizedIncomingCall = normalizeIncomingCallData(data);
        if (!normalizedIncomingCall) return;

        console.log("[CallContext] Manual showIncomingCall triggered:", normalizedIncomingCall);
        setIncomingCall((prev: any) => ({
            ...(prev || {}),
            ...normalizedIncomingCall,
            // If the push payload has no SDP offer yet, keep the existing one from realtime.
            offer: normalizedIncomingCall.offer || prev?.offer || null,
            receivedAt: normalizedIncomingCall.receivedAt || prev?.receivedAt || Date.now(),
        }));
    };

    useEffect(() => {
        if (incomingCall && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('autoAccept') === 'true') {
                console.log("[CallContext] Incoming call opened from a notification; keeping the decision dialog visible.");
                const url = new URL(window.location.href);
                url.searchParams.delete('autoAccept');
                window.history.replaceState({}, '', url.pathname + url.search);
            }
        }
    }, [incomingCall]);

    // Play/stop ringtone when incomingCall changes
    useEffect(() => {
        if (incomingCall && !activeCall) {
            // Play ringtone loop
            if (ringAudioRef.current) {
                ringAudioRef.current.currentTime = 0;
                ringAudioRef.current.volume = 0.8;
                ringAudioRef.current.play().catch(() => {});
            }
            // Auto-stop ring after 60 seconds (unanswered)
            ringTimeoutRef.current = setTimeout(() => {
                stopRing();
            }, 60000);
        } else {
            stopRing();
        }
        return () => {
            if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
        };
    }, [incomingCall, activeCall]);

    const stopRing = () => {
        if (ringAudioRef.current) {
            ringAudioRef.current.pause();
            ringAudioRef.current.currentTime = 0;
        }
        if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
        }
    };

    const endCall = () => {
        if (activeCall) {
            void sendSignal('call_end', { targetId: activeCall.userId });
        }
        endCallLocally();
    };

    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioMuted(!audioTrack.enabled);
            }
        }
    };

    const enableCamera = async () => {
        if (!activeCall || !currentUser) return;

        try {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const videoTrack = cameraStream.getVideoTracks()[0];
            if (!videoTrack) return;

            const existingAudioTracks = localStream?.getAudioTracks() || [];
            localStream?.getVideoTracks().forEach((track) => track.stop());
            const updatedStream = new MediaStream([...existingAudioTracks, videoTrack]);
            setLocalStream(updatedStream);
            setActiveCall((prev: any) => prev ? ({ ...prev, isVideo: true }) : prev);
            setIsVideoMuted(false);

            const pc = peerConnection.current;
            if (pc) {
                const existingVideoSender = pc.getSenders().find((sender) => sender.track?.kind === 'video');
                if (existingVideoSender) {
                    await existingVideoSender.replaceTrack(videoTrack);
                } else {
                    pc.addTrack(videoTrack, updatedStream);
                }

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await sendSignal('call_offer', {
                    targetId: activeCall.userId,
                    callerId: currentUser.id,
                    callerName: currentUser.name,
                    callerAvatar: currentUser.avatar,
                    isVideo: true,
                    offer,
                    callId: activeCall.callId || `${currentUser.id}-${activeCall.userId}-${Date.now()}`,
                    sentAt: Date.now(),
                });
            }
        } catch (err) {
            console.error("Failed to enable camera", err);
            alert("Could not turn on the camera.");
        }
    };

    const toggleVideo = async () => {
        if (!activeCall) return;

        if (!activeCall.isVideo || !localStream?.getVideoTracks()[0]) {
            await enableCamera();
            return;
        }

        const videoTrack = localStream.getVideoTracks()[0];
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
    };

    useEffect(() => {
        console.log("[CallContext] Local stream update:", !!localStream);
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, isCallMinimized]);

    useEffect(() => {
        console.log("[CallContext] Remote stream update. Tracks:", remoteStream?.getTracks().length);
        setHasRemoteVideo(!!remoteStream?.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled));

        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            void applyAudioOutputPreference(isSpeakerOn);
            
            // Critical for some browsers: unmuted remote audio requires a user gesture or specific handling
            const playPromise = remoteVideoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("[WebRTC] Auto-play was prevented. Remote audio might be silent until user interacts.", error);
                    // To handle this, we could show an "Unmute" button, but usually the "Accept" click handles it.
                });
            }
        }
    }, [remoteStream, isSpeakerOn, isCallMinimized]);

    useEffect(() => {
        if (activeCall) {
            setIsCallMinimized(false);
        }
    }, [activeCall?.userId]);

    return (
        <CallContext.Provider value={{ startCall, showIncomingCall }}>
            {children}

            {/* Hidden ringtone audio — plays on incoming call */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio ref={ringAudioRef} src="/ringtone.wav" loop preload="auto" style={{ display: 'none' }} />

            {activeCall && isCallMinimized && (
                <>
                    <video ref={remoteVideoRef} autoPlay playsInline style={{ display: 'none' }} />
                    <video ref={localVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
                </>
            )}

            {/* Reverted to Old Incoming Call Dialog design as requested */}
            <Dialog open={!!incomingCall && !activeCall} onClose={() => {}} disableEscapeKeyDown>
                <Box sx={{ p: 4, textAlign: 'center', minWidth: 300 }}>
                    <Avatar src={getAvatarUrl(incomingCall?.callerAvatar, incomingCall?.callerName)} sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }} />
                    <Typography variant="h6">{incomingCall?.callerName}</Typography>
                    <Typography color="text.secondary" sx={{ mb: 4 }}>
                        Incoming {incomingCall?.isVideo ? 'Video' : 'Audio'} Call...
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button variant="contained" color="error" onClick={rejectCall} startIcon={<CallEndIcon />}>
                            Decline
                        </Button>
                        <Button variant="contained" color="success" onClick={acceptCall} startIcon={incomingCall?.isVideo ? <VideocamIcon /> : <LocalPhoneIcon />}>
                            Accept
                        </Button>
                    </Box>
                </Box>
            </Dialog>

            {/* Active Call Overlay */}
            {activeCall && !isCallMinimized && (
                <Box sx={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    bgcolor: activeCall.isVideo ? '#000' : 'background.default',
                    zIndex: 9999, display: 'flex', flexDirection: 'column'
                }}>
                    <Box sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        right: 16,
                        zIndex: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                    }}>
                        <Box sx={{
                            px: 2,
                            py: 1,
                            borderRadius: 999,
                            bgcolor: activeCall.isVideo ? 'rgba(0, 0, 0, 0.45)' : 'action.selected'
                        }}>
                            <Typography variant="subtitle1" fontWeight={700} color={activeCall.isVideo ? '#fff' : 'text.primary'}>
                                {activeCall?.callerName || 'Connected'}
                            </Typography>
                            <Typography variant="caption" color={activeCall.isVideo ? 'rgba(255,255,255,0.78)' : 'text.secondary'}>
                                {callStatus === 'ringing' ? 'Ringing...' : formatDuration(callDuration)}
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => setIsCallMinimized(true)}
                            sx={{
                                bgcolor: activeCall.isVideo ? 'rgba(0, 0, 0, 0.45)' : 'action.selected',
                                color: activeCall.isVideo ? '#fff' : 'text.primary'
                            }}
                        >
                            <PictureInPictureAltIcon />
                        </IconButton>
                    </Box>

                    <Box sx={{ flexGrow: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            style={{
                                width: '100%', height: '100%', objectFit: 'cover',
                                display: activeCall.isVideo && hasRemoteVideo ? 'block' : 'none'
                            }}
                        />

                        {(!activeCall.isVideo || !hasRemoteVideo) && (
                            <Box sx={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                animation: callStatus === 'ringing' ? 'pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1)' : 'none',
                                position: 'absolute'
                            }}>
                                <Avatar
                                    src={getAvatarUrl(activeCall?.callerAvatar, activeCall?.callerName)}
                                    sx={{ width: 150, height: 150, border: '4px solid', borderColor: 'primary.main', mb: 2 }}
                                />
                                <Typography variant="h5" fontWeight={600} color={activeCall.isVideo ? '#fff' : 'text.primary'}>
                                    {activeCall?.callerName || 'Connected'}
                                </Typography>
                                {callStatus === 'ringing' ? (
                                    <Typography variant="caption" color={activeCall.isVideo ? 'rgba(255,255,255,0.78)' : 'text.secondary'}>Ringing...</Typography>
                                ) : (
                                    <Typography variant="subtitle1" fontWeight={700} color={activeCall.isVideo ? 'rgba(255,255,255,0.9)' : 'primary.main'}>{formatDuration(callDuration)}</Typography>
                                )}
                            </Box>
                        )}

                        <Box sx={{
                            position: 'absolute', bottom: 20, right: 20,
                            width: activeCall.isVideo ? 150 : 80,
                            height: activeCall.isVideo ? 200 : 80,
                            bgcolor: activeCall.isVideo ? '#222' : 'transparent',
                            borderRadius: activeCall.isVideo ? 2 : '50%',
                            overflow: 'hidden',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            border: activeCall.isVideo ? '2px solid rgba(255,255,255,0.1)' : 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{
                                    width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)',
                                    display: activeCall.isVideo ? 'block' : 'none'
                                }}
                            />
                            {!activeCall.isVideo && (
                                <Avatar
                                    src={getAvatarUrl(currentUser?.avatar, currentUser?.name)}
                                    sx={{ width: '100%', height: '100%', border: '3px solid', borderColor: 'background.paper' }}
                                />
                            )}
                        </Box>
                    </Box>

                    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap', bgcolor: activeCall.isVideo ? 'rgba(0,0,0,0.8)' : 'background.paper', borderTop: activeCall.isVideo ? 'none' : '1px solid', borderColor: 'divider' }}>
                        <IconButton onClick={() => { void toggleSpeaker(); }} sx={{ bgcolor: isSpeakerOn ? 'primary.main' : 'action.selected', color: isSpeakerOn ? 'white' : (activeCall.isVideo ? '#fff' : 'text.primary'), p: 2, '&:hover': { bgcolor: isSpeakerOn ? 'primary.dark' : (activeCall.isVideo ? 'rgba(255,255,255,0.2)' : 'action.hover') } }}>
                            {isSpeakerOn ? <VolumeUpIcon /> : <HearingIcon />}
                        </IconButton>
                        <IconButton onClick={toggleAudio} sx={{ bgcolor: isAudioMuted ? 'rgba(255,0,0,0.2)' : 'rgba(255,255,255,0.1)', color: isAudioMuted ? '#ef4444' : (activeCall.isVideo ? '#fff' : 'text.primary'), p: 2, '&:hover': { bgcolor: isAudioMuted ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,255,0.2)' } }}>
                            {isAudioMuted ? <MicOffIcon /> : <MicIcon />}
                        </IconButton>
                        <IconButton onClick={() => { void toggleVideo(); }} sx={{ bgcolor: isVideoMuted ? 'rgba(255,0,0,0.2)' : 'rgba(255,255,255,0.1)', color: isVideoMuted ? '#ef4444' : (activeCall.isVideo ? '#fff' : 'text.primary'), p: 2, '&:hover': { bgcolor: isVideoMuted ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,255,0.2)' } }}>
                            {!activeCall.isVideo ? <VideocamIcon color="primary" /> : isVideoMuted ? <VideocamOffIcon /> : <VideocamIcon />}
                        </IconButton>
                        <IconButton onClick={endCall} sx={{ bgcolor: '#ef4444', color: '#fff', p: 2, '&:hover': { bgcolor: '#dc2626' } }}>
                            <CallEndIcon />
                        </IconButton>
                    </Box>
                </Box>
            )}

            {activeCall && isCallMinimized && (
                <Box sx={{
                    position: 'fixed',
                    right: 16,
                    bottom: 16,
                    zIndex: 10000,
                    width: 272,
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden'
                }}>
                    <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Avatar src={getAvatarUrl(activeCall?.callerAvatar, activeCall?.callerName)} />
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                            <Typography variant="subtitle2" fontWeight={700} noWrap>
                                {activeCall?.callerName || 'Active Call'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {callStatus === 'ringing' ? 'Ringing...' : formatDuration(callDuration)}
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setIsCallMinimized(false)}>
                            <OpenInFullIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                        <IconButton size="small" onClick={() => { void toggleSpeaker(); }} sx={{ bgcolor: isSpeakerOn ? 'primary.main' : 'action.selected', color: isSpeakerOn ? 'white' : 'text.primary', '&:hover': { bgcolor: isSpeakerOn ? 'primary.dark' : 'action.hover' } }}>
                            {isSpeakerOn ? <VolumeUpIcon fontSize="small" /> : <HearingIcon fontSize="small" />}
                        </IconButton>
                        <IconButton size="small" onClick={toggleAudio} sx={{ bgcolor: 'action.selected' }}>
                            {isAudioMuted ? <MicOffIcon color="error" fontSize="small" /> : <MicIcon fontSize="small" />}
                        </IconButton>
                        <IconButton size="small" onClick={() => { void toggleVideo(); }} sx={{ bgcolor: 'action.selected' }}>
                            {!activeCall.isVideo ? <VideocamIcon color="primary" fontSize="small" /> : isVideoMuted ? <VideocamOffIcon color="error" fontSize="small" /> : <VideocamIcon fontSize="small" />}
                        </IconButton>
                        <IconButton size="small" onClick={endCall} sx={{ bgcolor: '#ef4444', color: 'white', '&:hover': { bgcolor: '#d32f2f' } }}>
                            <CallEndIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
            )}

            {/* Duplicate Session Dialog */}
            <Dialog 
                open={isDuplicateSession} 
                onClose={() => {}} // Disallow closing without choice
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 4, bgcolor: 'background.paper', p: 1 }
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
                    <WarningAmberIcon color="warning" />
                    Session Conflict
                </DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        This account is already active on another device/browser. Do you want to log in here and close the other session?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button 
                        onClick={handleCancelTakeover} 
                        variant="outlined" 
                        color="inherit"
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        Stay on other device
                    </Button>
                    <Button 
                        onClick={handleConfirmTakeover} 
                        variant="contained" 
                        color="primary"
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        Log in here
                    </Button>
                </DialogActions>
            </Dialog>
        </CallContext.Provider>
    );
};
