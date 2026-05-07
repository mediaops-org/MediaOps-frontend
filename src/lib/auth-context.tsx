import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User, AuthState, LoginInput, RegisterInput } from "./auth-types";
import apiFetch from './api';

interface AuthContextType extends AuthState {
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isProUser: false,
  });
  const navigate = useNavigate();

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await apiFetch('/api/users/me');
      if (response.ok) {
        const user = await response.json();
        setState({ 
          user, 
          isAuthenticated: true, 
          isLoading: false,
          isProUser: user.plan === 'pro'
        });
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false, isProUser: false });
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setState({ user: null, isAuthenticated: false, isLoading: false, isProUser: false });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (data: LoginInput) => {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }); 

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Invalid credentials');
    }

    const body = await response.json();
    if (body.data?.token) localStorage.setItem('token', body.data.token);

    await fetchUser();
    navigate({ to: '/' });
  };

  const register = async (data: RegisterInput) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...registerData } = data;
    const response = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
    }); 

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const body = await response.json();
    if (body.data?.token) localStorage.setItem('token', body.data.token);

    await fetchUser();
    navigate({ to: '/' });
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('token');
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      navigate({ to: "/login" });
    }
  };

  const forgotPassword = async (email: string) => {
    const response = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }); 

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send reset email");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        forgotPassword,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
