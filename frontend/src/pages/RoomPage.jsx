import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PageLoader from '../components/PageLoader';
import CodeEditor from '../components/CodeEditor';
import AiSidebar from '../components/AiSidebar';
import RoomSidebar from '../components/RoomSidebar';
import { Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-hot-toast';
import VideoPanel from '../components/VideoPanel';
import axiosInstance from '../lib/axios';

const RoomPage = () => {  
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const { user } = useAuth();
  const {socket,callUser,startLocalStream } = useSocket();
  const [participants, setParticipants] = useState([]);

  const saveCodeToServer=async()=>{
    try {
        await axiosInstance.patch(`/room/${roomId}/save`,
            {code},
            {withCredentials:true}
        )
    } catch (error) {
        console.error("Auto-save failed",error);
    }
  }
  useEffect(()=>{
    const interval=setInterval(()=>{
        if(code) saveCodeToServer();
    },1000);

    return ()=>clearInterval(interval);
  },[code]);

  useEffect(() => {
    if (!roomId || roomId === ":") {
      toast.error("Invalid room ID");
      window.location.href = "/dashboard"; // or use navigate()
    }
    async function fetchRoom() {
      try {
        const res = await axiosInstance.get(`/room/${roomId}`, {
          withCredentials: true,
        });
        setRoom(res.data.room);
        setCode(res.data.room.code || '');
      } catch (error) {
        console.error('Error fetching room:', error);
        toast.error('Failed to load room');
      } finally {
        setLoading(false);
      }
    }
    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    if (!socket || !roomId || !user) return;

    startLocalStream();

    socket.emit('join-room', {
      roomId,
      user: { _id: user._id, username: user.username, socketId: socket.id },
    });

    socket.on('room-users', (users) => {
      setParticipants(users);
    });

    socket.on('code-update', (incomingCode) => {
      if (incomingCode !== code) {
        setCode(incomingCode);
      }
    });

    return () => {
      socket.emit('leave-room', { roomId, userId: user._id });
      socket.off('code-update');
      socket.off('room-users');
    };
  }, [socket, roomId, user]);

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        if (socket) {
            socket.emit("code-change", { roomId, code: newCode });
        } else {
            console.warn("Socket is not connected yet");
        }
    };

  if (loading || !room) return <PageLoader />;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-base-200 p-4 border-b border-base-300">
        <h2 className="text-2xl font-bold text-center text-primary mb-4">
          {room.roomName}
        </h2>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Room ID:</span>
            <span className="font-mono">{room.roomId}</span>
            <button
              className="btn btn-xs btn-outline"
              onClick={() => {
                navigator.clipboard.writeText(room.roomId);
                toast.success('Room ID copied to clipboard');
              }}
            >
              Copy ID
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold">Share Link:</span>
            <span className="font-mono truncate max-w-[200px]">
              {`${window.location.origin}/room/${room.roomId}`}
            </span>
            <button
              className="btn btn-xs btn-outline"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/room/${room.roomId}`
                );
                toast.success('Share link copied');
              }}
            >
              Copy Link
            </button>
          </div>

          <div className="hidden md:block text-gray-500">
            Language: {room.language}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        <RoomSidebar participants={participants} room={room} user={user}  />

        <div className="flex-1 relative overflow-hidden flex flex-col">
          <div className="flex-1">
            <CodeEditor
            language={room.language}
            code={code}
            setCode={handleCodeChange}
            />
          </div>

            {/* Video Panel at Bottom */}
            <div className="border-t border-base-300 bg-base-100 p-2">
                <VideoPanel participants={participants} />
            </div>

          {/* AI Assistant Button */}
          <button
            className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 shadow-xl z-50"
            onClick={() => setAiOpen(true)}
          >
            <Bot />
          </button>

          {/* AI Sidebar */}
          {aiOpen && <AiSidebar onClose={() => setAiOpen(false)} />}
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
