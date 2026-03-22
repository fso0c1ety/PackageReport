"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
    Box,
    Dialog,
    Typography,
    Avatar,
    Button,
    IconButton,
} from "@mui/material";
import CallEndIcon from "@mui/icons-material/CallEnd";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";

import io from "socket.io-client";
import { DEFAULT_SERVER_URL, getAvatarUrl } from "./apiUrl";

type CallContextType = {
    startCall: (targetId: string, isVideo: boolean, otherUser?: any) => Promise<void>;
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
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Call state
    const [socket, setSocket] = useState<any>(null);
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [activeCall, setActiveCall] = useState<any>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);

    // WebRTC refs
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

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

        newSocket.on('call_offer', async (data) => {
            setIncomingCall(data);
        });

        newSocket.on('call_answer', async (data) => {
            console.log("Received call answer", data);
            if (peerConnection.current) {
                try {
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                } catch (e) { console.error("Error setting remote desc:", e); }
            }
        });

        newSocket.on('call_ice_candidate', async (data) => {
            if (peerConnection.current) {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) { console.error("Error adding ice candidate:", e); }
            }
        });

        const handleCallTerminated = () => {
            endCallLocally();
        };

        newSocket.on('call_end', handleCallTerminated);
        newSocket.on('call_reject', handleCallTerminated);

        setSocket(newSocket);
        return () => {
            newSocket.disconnect();
        };
    }, [currentUser]);

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    const initializePeerConnection = (targetUserId: string) => {
        const pc = new RTCPeerConnection(iceServers);
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                setSocket((currentSocket: any) => {
                    currentSocket?.emit('call_ice_candidate', { targetId: targetUserId, candidate: event.candidate });
                    return currentSocket;
                });
            }
        };
        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };
        peerConnection.current = pc;
        return pc;
    };

    const endCallLocally = () => {
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

            await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
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
        if (localVideoRef.current && localStream && activeCall?.isVideo) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, activeCall]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream && activeCall?.isVideo) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, activeCall]);

    return (
        <CallContext.Provider value={{ startCall }}>
            {children}

            {/* Incoming Call Dialog */}
            <Dialog open={!!incomingCall && !activeCall} onClose={rejectCall}>
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
            {activeCall && (
                <Box sx={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    bgcolor: activeCall.isVideo ? '#000' : 'background.default',
                    zIndex: 9999, display: 'flex', flexDirection: 'column'
                }}>
                    <Box sx={{ flexGrow: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        
                        {/* Remote Video OR Remote Avatar */}
                        {activeCall.isVideo ? (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <Box sx={{ 
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                animation: 'pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1)'
                            }}>
                                <Avatar 
                                    src={getAvatarUrl(activeCall?.callerAvatar, activeCall?.callerName)} 
                                    sx={{ width: 150, height: 150, border: '4px solid', borderColor: 'primary.main', mb: 2 }} 
                                />
                                <Typography variant="h5" fontWeight={600}>{activeCall?.callerName || 'Connected'}</Typography>
                                <Typography variant="caption" color="text.secondary">Audio Call in progress...</Typography>
                            </Box>
                        )}

                        {/* Local Video OR Local Avatar (Picture-in-Picture style) */}
                        <Box sx={{
                            position: 'absolute', bottom: 20, right: 20,
                            width: activeCall.isVideo ? 150 : 80, 
                            height: activeCall.isVideo ? 200 : 80, 
                            bgcolor: activeCall.isVideo ? '#222' : 'transparent',
                            borderRadius: activeCall.isVideo ? 2 : '50%',
                            overflow: 'hidden',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            border: activeCall.isVideo ? '2px solid rgba(255,255,255,0.1)' : 'none'
                        }}>
                            {activeCall.isVideo ? (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                                />
                            ) : (
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
        </CallContext.Provider>
    );
};
