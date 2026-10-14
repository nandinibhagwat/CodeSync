// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import PageLoader from "../components/PageLoader";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

const useProvideSocket = () => {
  const socketRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const { user } = useAuth();

  const peerConnections = useRef({}); // peerSocketId -> RTCPeerConnection
  const socketIdToUserId = useRef({}); // peerSocketId -> mongo user _id
  const localStream = useRef(null);

  const attachLocalTracks = (peer) => {
    if (!localStream.current) return;
    localStream.current.getTracks().forEach((track) => {
      peer.addTrack(track, localStream.current);
    });
  };

  const closePeer = (peerSocketId) => {
    const peer = peerConnections.current[peerSocketId];
    if (!peer) return;
    peer.close();
    delete peerConnections.current[peerSocketId];

    const userId = socketIdToUserId.current[peerSocketId] || peerSocketId;
    setRemoteStreams((prev) => {
      if (!(userId in prev)) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const createPeerConnection = (peerSocketId) => {
    if (peerConnections.current[peerSocketId]) {
      return peerConnections.current[peerSocketId];
    }

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          to: peerSocketId,
          candidate: event.candidate,
        });
      }
    };

    peer.ontrack = (event) => {
      const userId = socketIdToUserId.current[peerSocketId] || peerSocketId;
      setRemoteStreams((prev) => ({ ...prev, [userId]: event.streams[0] }));
    };

    peer.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(peer.connectionState)) {
        closePeer(peerSocketId);
      }
    };

    peerConnections.current[peerSocketId] = peer;
    return peer;
  };

  // The newcomer always calls the people already in the room. Only one
  // side ever creates an offer per pair, which avoids two peers racing
  // to call createOffer() at the same time ("glare").
  const callPeer = async (peerSocketId) => {
    const peer = createPeerConnection(peerSocketId);
    attachLocalTracks(peer);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socketRef.current.emit("offer", { to: peerSocketId, offer });
  };

  const handleOffer = async ({ from, offer }) => {
    const peer = createPeerConnection(from);
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    attachLocalTracks(peer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socketRef.current.emit("answer", { to: from, answer });
  };

  const handleAnswer = async ({ from, answer }) => {
    const peer = peerConnections.current[from];
    if (peer) await peer.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleIceCandidate = ({ from, candidate }) => {
    const peer = peerConnections.current[from];
    if (peer && candidate) {
      peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    }
  };

  useEffect(() => {
    if (!user?._id) {
      socketRef.current = null;
      setIsReady(false);
      return;
    }

    const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:4000", {
      transports: ["websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect_error", (err) => console.error("Socket connection rejected:", err.message));

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsReady(true);
    });

    // Keep socketId -> userId current so incoming media tracks (which
    // only carry a socket id) can be attributed to the right participant.
    // Also drop any peer connection for someone who's no longer listed.
    socket.on("room-users", (users) => {
      const map = {};
      users.forEach((u) => {
        map[u.socketId] = u._id;
      });
      socketIdToUserId.current = map;

      const stillPresent = new Set(users.map((u) => u.socketId));
      Object.keys(peerConnections.current).forEach((peerSocketId) => {
        if (!stillPresent.has(peerSocketId)) closePeer(peerSocketId);
      });
    });

    socket.on("existing-peers", (peers) => {
      peers.forEach((peer) => callPeer(peer.socketId));
    });

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      Object.keys(peerConnections.current).forEach(closePeer);
      socket.disconnect();
      socketRef.current = null;
      setIsReady(false);
    };
  }, [user?._id]);

  const startLocalStream = async () => {
    if (localStream.current) return localStream.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // Off by default for privacy; VideoPanel's mic/camera buttons flip these.
      stream.getTracks().forEach((track) => (track.enabled = false));
      localStream.current = stream;
      setHasLocalStream(true);
      return stream;
    } catch (error) {
      console.error("Media access error:", error);
      return null;
    }
  };

  return {
    socket: socketRef.current,
    localStream,
    remoteStreams,
    hasLocalStream,
    startLocalStream,
    isReady,
  };
};

export const SocketProvider = ({ children }) => {
  const socketValue = useProvideSocket();
  const { user } = useAuth();

  if (user && !socketValue.isReady) return <PageLoader />;

  return (
    <SocketContext.Provider value={socketValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
