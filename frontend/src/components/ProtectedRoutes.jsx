import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";

export default function ProtectedRoutes({ children }) {
    if (!isAuthenticated()) {
        return <Navigate to={"/login"} replace />;
    } else {
        return children;
    }
}