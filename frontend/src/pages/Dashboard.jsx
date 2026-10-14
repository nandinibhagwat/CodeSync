import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios';
import PageLoader from '../components/PageLoader';
import { Link } from 'react-router-dom';
import JoinRoom from "../components/JoinRoom";
import axiosInstance from '../lib/axios';

const Dashboard = () => {
    const {user}=useAuth();
    const [rooms,setRooms]=useState([]);
    const [loading,setLoading]=useState(true);
    const [showJoinModal, setShowJoinModal] = useState(false);

    useEffect(()=>{
        async function fetchRooms(){
            try {
                const res=await axiosInstance.get("/room/my-rooms",{
                    withCredentials:true,
                });
                setRooms(res.data.rooms);
            } catch (error) {
                console.error("Error fetching rooms:",error);
            }finally{
                setLoading(false);
            }
        }
        fetchRooms();
    },[]);

    if(loading) return <PageLoader/>;

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Welcome, {user.username} 👋
      </h1>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Your Rooms</h2>
        <div className="flex items-center gap-4">
          <Link
            to="/create-room"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Create Room
          </Link>

          <button className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 btn btn-outline" onClick={() => setShowJoinModal(true)}>
            🔗 Join Room
          </button>
        </div>
        {showJoinModal && <JoinRoom onClose={() => setShowJoinModal(false)} />}

      </div>

      {rooms.length === 0 ? (
        <p className="text-gray-600">You haven't joined or created any rooms yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <Link
              key={room._id}
              to={`/room/${room.roomId}`}
              className="bg-white p-4 rounded-xl shadow hover:shadow-md transition"
            >
              <h3 className="text-lg font-bold">{room.roomName}</h3>
              <p className="text-sm text-gray-500">Language: {room.language}</p>
              <p className="text-sm text-gray-500">
                Created by: {room.owner?.username || "Unknown"}
              </p>
              <p className="text-sm text-gray-500">
                {room.isPrivate ? "🔒 Private" : "🌐 Public"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard
