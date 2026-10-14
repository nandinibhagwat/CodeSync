import React from 'react'
import { useAuth } from '../context/AuthContext'
import PageLoader from './PageLoader';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({children}) => {
    const {user}=useAuth();

    if(!user){
        return <Navigate to="/login" replace/>
    }

    return children;
}

export default ProtectedRoute
