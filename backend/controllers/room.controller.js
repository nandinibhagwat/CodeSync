const Room=require("../models/Room");
const {v4:uuidv4}=require("uuid");
const bcrypt=require("bcrypt");

async function createRoom(req,res){
    try {
        const {roomName,language,isPrivate,password}=req.body;
        const owner=req.user._id;

        if(!roomName){
            return res.status(400).json({ message: "Room name is required" });
        }

        const roomId=uuidv4();

        let hashedPassword=null;
        if(isPrivate && password){
            const salt=await bcrypt.genSalt(10);
            hashedPassword=await bcrypt.hash(password,salt);
        }

        const newRoom=await Room.create({
            roomName,
            roomId,
            owner,
            language,
            isPrivate,
            password:hashedPassword,
            participants:[{user:owner}]
        })

        res.status(201).json({
      success: true,
      room: {
        roomName: newRoom.roomName,
        roomId: newRoom.roomId,
        language: newRoom.language,
        isPrivate: newRoom.isPrivate,
        owner: newRoom.owner,
        createdAt: newRoom.createdAt,
      },
    });
    } catch (error) {
        console.error("Create room error:", error);
        res.status(500).json({ message: "Server error" });
    }

}

async function joinRoom(req,res){
    try {
        const {roomId,password}=req.body;
        const userId=req.user._id;

        const room=await Room.findOne({roomId});
        if(!room){
            return res.status(404).json({ message: "Room not found" });
        }
        if(room.isPrivate){
            if(!password){
                return res.status(401).json({ message: "Password required for private room" });
            }
            const isPasswordCorrect=await bcrypt.compare(password,room.password);
            if(!isPasswordCorrect){
                return res.status(403).json({ message: "Incorrect password" });
            }
        }
        
        //check if user already joined
        const alreadyParticipant=room.participants.some(
            (p)=>p.user.toString()===userId.toString()
        );
        if(!alreadyParticipant){
            room.participants.push({user:userId});
            await room.save();
        }
        return res.status(200).json({
            success: true,
            room: {
                roomName: room.roomName,
                roomId: room.roomId,
                owner: room.owner,
                language: room.language,
                isPrivate: room.isPrivate,
                participants: room.participants.length,
            },
        });
    } catch (error) {
        console.error("Join room error:", error);
    res.status(500).json({ message: "Server error" });
    }
}

async function leaveRoom(req,res){
    try {
        const {roomId}=req.body;
        const userId=req.user._id;

        const room=await Room.findOne({roomId});

        if(room){
            room.participants=room.participants.filter(
                (p)=>p.user.toString()!=userId.toString()
            );
            await room.save();

            if (room.participants.length === 0) {
                await Room.deleteOne({ _id: room._id });
            }
        }
        return res.status(200).json({
            success: true,
            message: "Left room (if joined)",
            redirectTo: "/rooms",
        });
    } catch (error) {
        console.error("Leave room error:", error);
        res.status(500).json({ message: "Server error" });
    }
}

async function getRoomDetails(req,res){
    try {
        const {roomId}=req.params;
        const userId=req.user._id;

        const room=await Room.findOne({roomId})
        .populate("owner","username email")
        .populate("participants.user","username email")

        if(!room){
            return res.status(404).json({ message: "Room not found" });
        }

        const isParticipant = room.participants.some(
            (p) => p.user._id.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({ message: "You are not a participant of this room" });
        }

        return res.status(200).json({
            success: true,
            room: {
                roomName: room.roomName,
                roomId: room.roomId,
                language: room.language,
                code: room.code,
                isPrivate: room.isPrivate,
                owner: room.owner,
                participants: room.participants,
                createdAt: room.createdAt,
            },
        });
    } catch (error) {
        console.error("Get room details error:", error);
        res.status(500).json({ message: "Server error" });
    }
}


async function getUserRooms(req, res) {
  try {
    const userId = req.user._id;


    const rooms = await Room.find({
      $or: [
        { owner: userId },
        { "participants.user": userId }
      ]
    })
    .sort({ updatedAt: -1 }) // most recently updated first
    .select("_id roomName roomId language isPrivate owner createdAt");

    res.status(200).json({
      success: true,
      rooms,
    });
  } catch (error) {
    console.error("Error fetching user rooms:", error);
    res.status(500).json({ message: "Server error" });
  }
}

async function saveCode(req, res) {
  try {
    const { roomId, code } = req.body;
    const userId = req.user._id;

    if (!roomId || typeof code !== "string") {
      return res.status(400).json({ message: "roomId and code are required" });
    }

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isParticipant = room.participants.some(
      (p) => p.user.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "You are not a participant in this room" });
    }

    room.code = code;
    await room.save();

    return res.status(200).json({ success: true, message: "Code saved" });
  } catch (error) {
    console.error("Save code error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

async function saveRoomCode(req,res){
    try {
        const {roomId}=req.params;
        const {code}=req.body;
        const userId=req.user._id;

        if(!code) return res.status(400).json({ message: "Code is required" });

        const room=await Room.findOne({roomId});
        if (!room) return res.status(404).json({ message: "Room not found" });

        const isParticipant = room.participants.some(
            (p) => p.user.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({ message: "You are not a participant in this room" });
        }

        room.code=code;
        await room.save();

        res.status(200).json({ success: true, message: "Code saved" });
    } catch (error) {
        console.error("Save code error:", error);
        res.status(500).json({ message: "Server error" });
    }
}

async function closeRoom(req, res) {
  const { roomId } = req.body;
  const userId = req.user._id;

  const room = await Room.findOne({ roomId });
  if (!room) return res.status(404).json({ message: "Room not found" });

  if (room.owner.toString() !== userId.toString()) {
    return res.status(403).json({ message: "Only the owner can close the room" });
  }

  await Room.deleteOne({ roomId });

  res.status(200).json({ success: true, message: "Room closed successfully" });
}



module.exports = { createRoom,joinRoom,leaveRoom,getRoomDetails,getUserRooms,saveCode,saveRoomCode,closeRoom };