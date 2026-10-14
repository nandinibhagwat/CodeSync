const mongoose=require("mongoose");
const bcrypt = require("bcrypt"); 

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,           
  },
  username: {
    type: String,
    required: true,             
  },
  password: {
    type: String,
    required: true,
  },
}, { timestamps: true })  

userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();

    try{
        const salt=await bcrypt.genSalt(10);
        this.password=await bcrypt.hash(this.password,salt);
        next();
    }catch(error){
        next(error);
    }
})

userSchema.methods.matchPassword=async function (enteredPassword){

    const isPasswordCorrect=await bcrypt.compare(enteredPassword,this.password);
    return isPasswordCorrect;

}

const User=mongoose.model("User",userSchema);   


module.exports = User;