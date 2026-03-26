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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { useRouter } from "next/navigation";
import io from "socket.io-client";
import { DEFAULT_SERVER_URL, getAvatarUrl, getApiUrl, authenticatedFetch } from "./apiUrl";

type CallContextType = {
    startCall: (targetId: string, isVideo: boolean, otherUser?: any) => Promise<void>;
    showIncomingCall: (data: any) => void; 
};

const CallContext = createContext<CallContextType | null>(null);

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
    const [socket, setSocket] = useState<any>(null);
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [activeCall, setActiveCall] = useState<any>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);

    // Timing and Log State
    const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | null>(null);
    const [connectedAt, setConnectedAt] = useState<number | null>(null);
    const [callDuration, setCallDuration] = useState<number>(0);
    const [autoAcceptProcessed, setAutoAcceptProcessed] = useState(false);

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

    // Effect for Socket.io signaling
    useEffect(() => {
        if (!currentUser) return;
        const newSocket = io(DEFAULT_SERVER_URL, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            console.log('[CallContext] Connected to socket, registering user:', currentUser.id);
            newSocket.emit('register_user', currentUser.id);
        });

        newSocket.on('call_offer', (data) => {
            console.log("Received call offer", data);
            setIncomingCall(data);
            iceCandidatesQueue.current = []; // Reset queue for new call
        });

        newSocket.on('call_answer', async (data) => {
            console.log("Received call answer", data);
            setCallStatus('connected');
            setConnectedAt(Date.now());
            if (peerConnection.current) {
                try {
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                    await processIceCandidatesQueue();
                } catch (e) { console.error("Error setting remote desc:", e); }
            }
        });

        newSocket.on('call_ice_candidate', async (data) => {
            console.log("[WebRTC] Received ICE candidate");
            if (peerConnection.current && peerConnection.current.remoteDescription) {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) { console.error("Error adding ice candidate:", e); }
            } else {
                console.log("[WebRTC] Queuing ICE candidate (remoteDescription not set)");
                iceCandidatesQueue.current.push(data.candidate);
            }
        });

        const handleCallTerminated = () => {
            endCallLocally();
        };

        newSocket.on('call_end', handleCallTerminated);
        newSocket.on('call_reject', (data) => {
            console.log("Call rejected by other user");
            setIncomingCall(null);
            setActiveCall(null);
            setCallStatus(null);
        });

        newSocket.on('duplicate_session_check', () => {
            console.log("[Socket] Duplicate session detected on server");
            setIsDuplicateSession(true);
        });

        newSocket.on('force_logout', () => {
            console.warn("[Socket] Forced logout by another device");
            handleCancelTakeover(); // Re-use logout logic
            alert("You have been signed out because you logged in on another device.");
        });

        setSocket(newSocket);
        return () => {
            newSocket.disconnect();
        };
    }, [currentUser]);

    const handleConfirmTakeover = () => {
        if (socket && currentUser) {
            socket.emit('confirm_takeover', currentUser.id);
            setIsDuplicateSession(false);
        }
    };

    const handleCancelTakeover = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setCurrentUser(null);
        setIsDuplicateSession(false);
        router.push("/login");
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
                setSocket((currentSocket: any) => {
                    currentSocket?.emit('call_ice_candidate', { targetId: targetUserId, candidate: event.candidate });
                    return currentSocket;
                });
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
        setCallStatus(null);
        setConnectedAt(null);
        setCallDuration(0);
    };

    const startCall = async (targetId: string, isVideo: boolean, otherUser?: any) => {
        if (!targetId || !currentUser) return;
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

            socket?.emit('call_offer', {
                targetId: targetId,
                callerId: currentUser.id,
                callerName: currentUser.name,
                callerAvatar: currentUser.avatar,
                isVideo,
                offer
            });
        } catch (err) {
            console.error("Failed to start call", err);
            alert("Could not access camera/microphone.");
        }
    };

    const acceptCall = async () => {
        if (!incomingCall) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: incomingCall.isVideo, audio: true });
            setLocalStream(stream);
            setActiveCall({
                userId: incomingCall.callerId,
                isVideo: incomingCall.isVideo,
                isCaller: false,
                callerAvatar: incomingCall.callerAvatar,
                callerName: incomingCall.callerName
            });

            const pc = initializePeerConnection(incomingCall.callerId);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            setCallStatus('connected');
            setConnectedAt(Date.now());

            await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
            await processIceCandidatesQueue();
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket?.emit('call_answer', {
                targetId: incomingCall.callerId,
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
        if (incomingCall && socket) {
            socket.emit('call_reject', { targetId: incomingCall.callerId });
        }
        setIncomingCall(null);
    };

    const showIncomingCall = (data: any) => {
        if (!data || activeCallRef.current) return;
        console.log("[CallContext] Manual showIncomingCall triggered:", data);
        setIncomingCall({
            callerId: data.callerId,
            callerName: data.callerName || 'Incoming Call',
            callerAvatar: data.callerAvatar,
            isVideo: data.isVideo === 'true' || data.isVideo === true,
            offer: data.offer || null // Might be null if just a push ping
        });
    };

    useEffect(() => {
        if (incomingCall && !autoAcceptProcessed && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('autoAccept') === 'true') {
                console.log("[CallContext] Auto-accepting call based on URL parameter");
                setAutoAcceptProcessed(true);
                acceptCall();
                
                // Cleanup URL
                const url = new URL(window.location.href);
                url.searchParams.delete('autoAccept');
                window.history.replaceState({}, '', url.pathname + url.search);
            }
        }
    }, [incomingCall, autoAcceptProcessed]);

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
        if (activeCall && socket) {
            socket.emit('call_end', { targetId: activeCall.userId });
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

    const toggleVideo = () => {
        if (localStream && activeCall?.isVideo) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoMuted(!videoTrack.enabled);
            }
        }
    };

    useEffect(() => {
        console.log("[CallContext] Local stream update:", !!localStream);
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        console.log("[CallContext] Remote stream update. Tracks:", remoteStream?.getTracks().length);
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            
            // Critical for some browsers: unmuted remote audio requires a user gesture or specific handling
            const playPromise = remoteVideoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("[WebRTC] Auto-play was prevented. Remote audio might be silent until user interacts.", error);
                    // To handle this, we could show an "Unmute" button, but usually the "Accept" click handles it.
                });
            }
        }
    }, [remoteStream]);

    return (
        <CallContext.Provider value={{ startCall, showIncomingCall }}>
            {children}

            {/* Hidden ringtone audio — plays on incoming call */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio ref={ringAudioRef} src="/ringtone.wav" loop preload="auto" style={{ display: 'none' }} />

            {/* Redesigned Incoming Call Overlay - Premium Experience */}
            <Dialog 
                fullScreen 
                open={!!incomingCall && !activeCall} 
                onClose={rejectCall}
                PaperProps={{
                    sx: {
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                        color: 'white',
                    }
                }}
            >
                <Box sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    py: 12,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Dynamic Background Ripples */}
                    <Box sx={{ position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0 }}>
                        <div className="ring-ripple" style={{ width: 250, height: 250 }}></div>
                        <div className="ring-ripple" style={{ width: 250, height: 250 }}></div>
                        <div className="ring-ripple" style={{ width: 250, height: 250 }}></div>
                    </Box>

                    {/* Caller Info */}
                    <Box sx={{ textAlign: 'center', zIndex: 1, px: 4 }}>
                        <Avatar 
                            src={getAvatarUrl(incomingCall?.callerAvatar, incomingCall?.callerName)} 
                            className="animate-pulse-custom"
                            sx={{ 
                                width: 140, 
                                height: 140, 
                                mx: 'auto', 
                                mb: 3, 
                                border: '4px solid rgba(255,255,255,0.2)',
                                boxShadow: '0 0 40px rgba(99, 102, 241, 0.4)'
                            }} 
                        />
                        <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {incomingCall?.callerName}
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.9rem', fontWeight: 600 }}>
                            {incomingCall?.isVideo ? 'Incoming Video Call' : 'Incoming Audio Call'}
                        </Typography>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ 
                        display: 'flex', 
                        gap: 6, 
                        zIndex: 1, 
                        width: '100%', 
                        justifyContent: 'center',
                        pb: 4
                    }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <IconButton 
                                onClick={rejectCall} 
                                sx={{ 
                                    bgcolor: '#ef4444', 
                                    color: 'white', 
                                    width: 80, 
                                    height: 80, 
                                    mb: 1,
                                    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
                                    transition: 'transform 0.2s',
                                    '&:hover': { bgcolor: '#dc2626', transform: 'scale(1.1)' } 
                                }}
                            >
                                <CallEndIcon sx={{ fontSize: 32 }} />
                            </IconButton>
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, opacity: 0.8 }}>Decline</Typography>
                        </Box>

                        <Box sx={{ textAlign: 'center' }}>
                            <IconButton 
                                onClick={acceptCall} 
                                sx={{ 
                                    bgcolor: '#22c55e', 
                                    color: 'white', 
                                    width: 80, 
                                    height: 80, 
                                    mb: 1,
                                    boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
                                    transition: 'transform 0.2s',
                                    '&:hover': { bgcolor: '#16a34a', transform: 'scale(1.1)' } 
                                }}
                            >
                                {incomingCall?.isVideo ? <VideocamIcon sx={{ fontSize: 32 }} /> : <LocalPhoneIcon sx={{ fontSize: 32 }} />}
                            </IconButton>
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, opacity: 0.8 }}>Accept</Typography>
                        </Box>
                    </Box>
                </Box>
            </Dialog>

            {/* Active Call Overlay */}
            {activeCall && (
                <Box sx={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    bgcolor: activeCall.isVideo ? '#000' : 'background.default',
                    zIndex: 9999, display: 'flex', flexDirection: 'column'
                }}>
                    <Box sx={{ flexGrow: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        
                        {/* Remote Stream Element (Always mounted for stability) */}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            style={{ 
                                width: '100%', height: '100%', objectFit: 'cover',
                                display: activeCall.isVideo ? 'block' : 'none'
                            }}
                        />

                        {/* Remote Avatar (Shown for Audio or Ringing) */}
                        {!activeCall.isVideo && (
                            <Box sx={{ 
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                animation: callStatus === 'ringing' ? 'pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1)' : 'none',
                                position: 'absolute'
                            }}>
                                <Avatar 
                                    src={getAvatarUrl(activeCall?.callerAvatar, activeCall?.callerName)} 
                                    sx={{ width: 150, height: 150, border: '4px solid', borderColor: 'primary.main', mb: 2 }} 
                                />
                                <Typography variant="h5" fontWeight={600}>{activeCall?.callerName || 'Connected'}</Typography>
                                {callStatus === 'ringing' ? (
                                    <Typography variant="caption" color="text.secondary">Ringing...</Typography>
                                ) : (
                                    <Typography variant="subtitle1" fontWeight={700} color="primary.main">{formatDuration(callDuration)}</Typography>
                                )}
                            </Box>
                        )}

                        {/* Local Stream Element (PIcture-in-Picture) */}
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

                    {/* Controls */}
                    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', gap: 3, bgcolor: activeCall.isVideo ? 'rgba(0,0,0,0.8)' : 'background.paper', borderTop: activeCall.isVideo ? 'none' : '1px solid', borderColor: 'divider' }}>
                        <IconButton onClick={toggleAudio} sx={{ bgcolor: isAudioMuted ? 'rgba(255,0,0,0.2)' : 'rgba(255,255,255,0.1)', color: isAudioMuted ? '#ef4444' : (activeCall.isVideo ? '#fff' : 'text.primary'), p: 2, '&:hover': { bgcolor: isAudioMuted ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,255,0.2)' } }}>
                            {isAudioMuted ? <MicOffIcon /> : <MicIcon />}
                        </IconButton>
                        {activeCall.isVideo && (
                            <IconButton onClick={toggleVideo} disabled={!activeCall?.isVideo} sx={{ bgcolor: isVideoMuted ? 'rgba(255,0,0,0.2)' : 'rgba(255,255,255,0.1)', color: isVideoMuted ? '#ef4444' : '#fff', p: 2, '&:hover': { bgcolor: isVideoMuted ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,255,0.2)' } }}>
                                {isVideoMuted ? <VideocamOffIcon /> : <VideocamIcon />}
                            </IconButton>
                        )}
                        <IconButton onClick={endCall} sx={{ bgcolor: '#ef4444', color: '#fff', p: 2, '&:hover': { bgcolor: '#dc2626' } }}>
                            <CallEndIcon />
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
