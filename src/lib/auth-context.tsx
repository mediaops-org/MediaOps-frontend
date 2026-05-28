import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User, AuthState, LoginInput, RegisterInput } from "./auth-types";
import apiFetch from './api';

function normalizeUser(payload: any): User {
  const raw = payload?.user ?? payload?.data?.user ?? payload?.data ?? payload ?? {};
  const plan = raw.plan === 'pro' ? 'pro' : 'free';

  return {
    ...raw,
    avatar: raw.avatar ?? raw.avatarUrl,
    plan,
  };
}

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
      const response = await apiFetch('/api/users/me');
      if (response.ok) {
        const body = await response.json();
        const user = normalizeUser(body);
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          isProUser: user.plan === 'pro',
        });
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false, isProUser: false });
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setState({ user: null, isAuthenticated: false, isLoading: false, isProUser: false });
    }
  }, []);

  const persistAuthToken = (body: any) => {
    const token = body?.token ?? body?.data?.token;
    if (token) localStorage.setItem('token', token);
  };

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (data: LoginInput) => {
    const payload = data.identifier.includes('@')
      ? { email: data.identifier, password: data.password }
      : { handle: data.identifier, password: data.password };

    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }); 

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Invalid credentials');
    }

    const body = await response.json();
    persistAuthToken(body);

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
    persistAuthToken(body);

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
      setState({ user: null, isAuthenticated: false, isLoading: false, isProUser: false });
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
