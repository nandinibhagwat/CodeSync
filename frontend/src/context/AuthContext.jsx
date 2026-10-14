import { createContext, useContext, useEffect, useState } from "react";
import PageLoader from "../components/PageLoader";
import axios from "axios";
import axiosInstance from "../lib/axios";

const AuthContext=createContext();

export const useAuth=()=>useContext(AuthContext);

export function AuthProvider({children}){
    const [user,setUser]=useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(()=>{
        async function fetchUser(){
            try {
                const res=await axiosInstance.get("/user/me",{
                    withCredentials:true,
                })
                if(res.data.success) setUser(res.data.user);
            } catch (error) {
                setUser(null);
            }finally{
                setLoading(false)
            }
        }
        fetchUser();
    },[])

    if(loading) return <PageLoader/>;

    return(
        <AuthContext.Provider value={{user,setUser}}>
            {children}
        </AuthContext.Provider>
    )
}