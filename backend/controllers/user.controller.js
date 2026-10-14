const User=require("../models/User");
const jwt=require("jsonwebtoken");

const generateToken=(userid)=>{
    return jwt.sign({userId:userid},process.env.JWT_SECRET_KEY,{
        expiresIn:"7d",
    })
}

async function signup(req,res) {
    try {
        const {email,username,password}=req.body;

        if(!email || !username || !password){
            return res.status(400).json({ message: "All fields are required" });
        }

        if(password.length<6){
            return res.status(400).json({message:"Password must be atleast 6 characters"});
        }
        const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if(!emailRegex.test(email)){
            return res.status(400).json({message:"Invalid email format"});
        }

        const existingUser=await User.findOne({email});
        if(existingUser){
            return res.status(409).json({ message: "Email already exists" });
        }

        const newUser=await User.create({
            email,
            username,
            password
        });

        const token=generateToken(newUser._id);

        res.cookie("jwt",token,{
            maxAge:7*24*60*60*1000,
            httpOnly:true,  //prevents XSS attacks,
            sameSite:"Lax",  //prevents CSRF attacks
            secure:false
        })

        res.status(201).json({success:true,user:newUser});

    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Server error" });
    }
}

async function login(req,res){
    try {
        const {email,password}=req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user=await User.findOne({email});
        if(!user){
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isPasswordCorrect=await user.matchPassword(password);
        if(!isPasswordCorrect){
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token=generateToken(user._id);

        res.cookie("jwt",token,{
            maxAge:7*24*60*60*1000,
            httpOnly:true,  //prevents XSS attacks,
            sameSite:"Lax",  //prevents CSRF attacks
            secure:false
        })

        res.status(200).json({success:true,user:{
            _id:user._id,
            username:user.username,
            email:user.email,
        }})
    } catch (error) {
        console.log("Error in login controller",error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

async function logout(req,res){
    res.clearCookie("jwt");
    res.status(200).json({success:true,message:"Logout successful"})
}

module.exports={signup,login,logout};
