"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

export type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";

interface JwtPayload {
  userId: string;
  role: UserRole;
  exp?: number;
  iat?: number;
}

export function useAuth() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const token = Cookies.get("token");
      if (token) {
        const decoded = jwtDecode<JwtPayload>(token);
        setRole(decoded.role);
        setUserId(decoded.userId);

        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed.username) setUsername(parsed.username);
          } catch {
            // ignore json parse error
          }
        }
      } else {
        setRole(null);
        setUserId(null);
        setUsername(null);
      }
    } catch {
      setRole(null);
      setUserId(null);
      setUsername(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = () => {
    Cookies.remove("token");
    localStorage.removeItem("user");
    setRole(null);
    setUserId(null);
    setUsername(null);
    window.location.href = "/login";
  };

  return {
    role,
    userId,
    username,
    isLoading,
    isAuthenticated: !!role,
    isAdmin: role === "ADMIN",
    isOperator: role === "OPERATOR",
    isViewer: role === "VIEWER",
    canManage: role === "ADMIN" || role === "OPERATOR",
    logout,
  };
}