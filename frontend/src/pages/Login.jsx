import React, { useState } from 'react'
import { useNavigate,Link } from 'react-router-dom'
import PageLoader from '../components/PageLoader';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../lib/axios';


const Login = () => {
    const { setUser } = useAuth();
    const navigate=useNavigate();

    const[formData,setFormData]=useState({
        email:"",
        password:"",
    });

    const[error,setError]=useState("");
    const[loading,setLoading]=useState(false);

    const handleChange=(e)=>{
        setFormData((prev)=>({
            ...prev,
            [e.target.name]:e.target.value,
        }));
    };

    const handleSubmit=async(e)=>{
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
        const res = await axiosInstance.post(
            "/user/login",
            formData,
            { withCredentials: true }
        );

        if (res.data.success) {
            setUser(res.data.user);
            navigate("/dashboard");
        }
        } catch (err) {
            setError(
            err.response?.data?.message || "Login failed. Please try again."
        );
        } finally {
            setLoading(false); 
        }
    }
    if (loading) return <PageLoader />;
return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Log In</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            Log In
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
