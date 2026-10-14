import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../lib/axios";

const JoinRoomModal = ({ onClose }) => {
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axiosInstance.post(
        "/room/join",
        { roomId, password },
        { withCredentials: true }
      );

      navigate(`/room/${res.data.room.roomId}`);
    } catch (err) {
      console.error("Join room error:", err);
      setError(err.response?.data?.message || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
  <div className="bg-white dark:bg-base-100 p-8 rounded-2xl shadow-2xl w-[90%] max-w-md border border-gray-200 dark:border-neutral">
    <h2 className="text-2xl font-bold text-center mb-6 text-primary">
      🔗 Join a Room
    </h2>

    <form onSubmit={handleJoin} className="space-y-5">
      <input
        type="text"
        className="input input-bordered w-full text-sm"
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        required
      />
      <input
        type="password"
        className="input input-bordered w-full text-sm"
        placeholder="Password (if required)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          className="btn btn-ghost hover:bg-gray-100 dark:hover:bg-neutral"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary px-6"
          disabled={loading}
        >
          {loading ? "Joining..." : "Join"}
        </button>
      </div>
    </form>
  </div>
</div>

  );
};

export default JoinRoomModal;
