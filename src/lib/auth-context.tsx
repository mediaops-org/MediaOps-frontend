import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User, AuthState, LoginInput, RegisterInput } from "./auth-types";
import apiFetch from './api';
import { mockLogin } from './mock-data';

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
      const response = await apiFetch('/api/auth/me');
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
    // Extract the identifier (email or handle) and password from the payload
    const identifier = (data as any).email || (data as any).handle || (data as any).identifier;
    const password = data.password;
    const mockUser = mockLogin(identifier, password);
    
    if (mockUser) {
      // Mock login successful 
      const mockToken = 'mock_token_' + mockUser.id;
      localStorage.setItem('token', mockToken);
      setState({ 
        user: mockUser, 
        isAuthenticated: true, 
        isLoading: false,
        isProUser: mockUser.plan === 'pro'
      });
      navigate({ to: '/' });
      return;
    }

    // If mock login fails, try the real backend
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
