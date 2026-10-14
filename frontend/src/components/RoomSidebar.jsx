import axios from "axios";
import React from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../lib/axios";

const RoomSidebar = ({ participants, room, user }) => {
  const roomId = room.roomId;
  const navigate = useNavigate();

  const handleLeaveRoom = async () => {
    try {
      await axiosInstance.post(
        "/room/leave",
        { roomId },
        { withCredentials: true }
      );
      navigate("/dashboard");
    } catch (err) {
      console.error("Leave room failed", err);
    }
  };

  const handleCloseRoom = async () => {
    try {
      await axiosInstance.post(
        "/room/close",
        { roomId },
        { withCredentials: true }
      );
      navigate("/dashboard");
    } catch (err) {
      console.error("Close room failed", err);
    }
  };

  return (
    <div className="w-64 bg-base-200 p-4 border-r border-base-300">
      <div className="flex flex-col h-full justify-between">
        {/* Top section with participants */}
        <div>
          <h2 className="font-bold mb-3 text-lg">👥 Participants</h2>
          <ul className="space-y-2 text-sm">
            {participants.map((p, index) => (
              <li
                key={p.socketId || p.userId || index}
                className="truncate flex items-center gap-2 text-left"
              >
                <span className="text-green-500">●</span>
                {p.username}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom Buttons */}
        <div className="mt-4 space-y-2">
          <button
            onClick={handleLeaveRoom}
            className="w-full h-12 rounded-md font-semibold text-white bg-red-500 hover:bg-red-600 shadow"
          >
            Leave Room
          </button>

          {room?.owner?._id === user?._id && (
            <button
              onClick={handleCloseRoom}
              className="w-full h-12 rounded-md font-semibold text-white bg-red-500 hover:bg-red-600 shadow"
            >
              Close Room
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomSidebar;
