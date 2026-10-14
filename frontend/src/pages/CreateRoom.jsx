import React from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import PageLoader from '../components/PageLoader';
import axios from 'axios';
import toast from "react-hot-toast";
import axiosInstance from '../lib/axios';

const CreateRoom = () => {

    const [roomName,setRoomName]=useState("");
    const [language,setLanguage]=useState("javascript");
    const [isPrivate,setIsPrivate]=useState(false);
    const [password,setPassword]=useState("");
    const [loading,setLoading]=useState(false);

    const navigate=useNavigate();

    async function handleSubmit(e){
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axiosInstance.post(
                "/room/create",
                {
                    roomName,
                    language,
                    isPrivate,
                    password: isPrivate ? password : null,
                },
                { withCredentials: true }
            );

            const { roomId } = res.data.room;
            toast.success("Room created successfully!");
            navigate(`/room/${roomId}`);
        } catch (err) {
            console.error("Error creating room:", err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Create a Room</h2>

        <label className="block mb-2 font-semibold">Room Name</label>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          required
          className="w-full border p-2 rounded mb-4"
        />

        <label className="block mb-2 font-semibold">Language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full border p-2 rounded mb-4"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
        </select>

        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={() => setIsPrivate(!isPrivate)}
            className="mr-2"
          />
          <span>Private Room</span>
        </div>

        {isPrivate && (
          <>
            <label className="block mb-2 font-semibold">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={isPrivate}
              className="w-full border p-2 rounded mb-4"
            />
          </>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Create Room
        </button>
      </form>
    </div>
  )
}

export default CreateRoom
