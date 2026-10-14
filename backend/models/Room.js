const mongoose=require("mongoose");

const roomSchema=new mongoose.Schema({
    roomName: {
      type: String,
      required: true,
      trim: true,
    },
    roomId: {
      type: String,
      required: true,
      unique: true, // for sharing via URL
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    code: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      enum: ["javascript", "python", "cpp", "java", "html", "css"],
      default: "javascript",
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      default: null, // hashed if set
    },
},{timestamps:true});

const Room=mongoose.model("Room", roomSchema);

module.exports=Room;