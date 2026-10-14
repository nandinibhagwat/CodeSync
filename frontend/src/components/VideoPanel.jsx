// src/components/VideoPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useSocket } from "../context/SocketContext";

const VideoBox = ({
  isCurrentUser,
  username,
  localVideoRef,
  micOn,
  cameraOn,
  toggleMic,
  toggleCamera,
  remoteStream,
}) => {
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (!isCurrentUser && remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isCurrentUser]);

  return (
    <div className="relative min-w-[150px] h-[100px] bg-black rounded-lg flex items-center justify-center text-white text-sm overflow-hidden">
      <span className="absolute top-1 left-1 text-xs text-gray-300">
        {isCurrentUser ? "You" : username}
      </span>

      {isCurrentUser ? (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover rounded"
        />
      ) : remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover rounded"
        />
      ) : (
        <div className="text-xs opacity-50">Waiting for stream...</div>
      )}

      {isCurrentUser && (
        <div className="absolute bottom-1 right-1 flex gap-2">
          <button
            onClick={toggleMic}
            className="bg-white text-black rounded p-1 text-xs hover:bg-gray-100"
          >
            {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          </button>
          <button
            onClick={toggleCamera}
            className="bg-white text-black rounded p-1 text-xs hover:bg-gray-100"
          >
            {cameraOn ? <Video size={16} /> : <VideoOff size={16} />}
          </button>
        </div>
      )}
    </div>
  );
};

const VideoPanel = ({ participants = [] }) => {
  const { user } = useAuth();
  // Both the local preview and every peer connection share this exact
  // stream object (set up once in RoomPage via startLocalStream()).
  // Previously this component called getUserMedia() a second time on
  // its own, so the mic/camera buttons here toggled tracks on a
  // *different* stream than the one actually being sent to peers.
  const { localStream, remoteStreams, hasLocalStream } = useSocket();

  const localVideoRef = useRef(null);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    if (hasLocalStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream.current;
    }
  }, [hasLocalStream, localStream]);

  const toggleMic = () => {
    if (!localStream.current) return;
    const enabled = !micOn;
    localStream.current.getAudioTracks().forEach((track) => (track.enabled = enabled));
    setMicOn(enabled);
  };

  const toggleCamera = () => {
    if (!localStream.current) return;
    const enabled = !cameraOn;
    localStream.current.getVideoTracks().forEach((track) => (track.enabled = enabled));
    setCameraOn(enabled);
  };

  return (
    <div className="w-full bg-base-200 border-t border-base-300 p-2 flex gap-4 overflow-x-auto">
      {/* Deduplicate by _id so a user with two tabs still shows one tile.
          Both sessions share the same camera — the stream that arrived last
          is already the one stored in remoteStreams[userId]. */}
      {participants
        .filter((p, i, arr) => arr.findIndex((q) => q._id === p._id) === i)
        .map((p) => (
        <VideoBox
          key={p._id}
          isCurrentUser={p._id === user._id}
          username={p.username}
          localVideoRef={localVideoRef}
          micOn={micOn}
          cameraOn={cameraOn}
          toggleMic={toggleMic}
          toggleCamera={toggleCamera}
          remoteStream={remoteStreams[p._id]}
        />
      ))}
    </div>
  );
};

export default VideoPanel;
