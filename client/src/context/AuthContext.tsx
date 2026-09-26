import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { API_BASE_URL } from '../config/env';
import { User, AuthService } from '../services/auth.service';
import { ApiService } from '../services/api';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      if (token) await AuthService.logout();
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setUser(null);
      setTokenState(null);
    }
  }, [token]);

  const login = useCallback((newToken: string, newUser: User) => {
    setTokenState(newToken);
    setUser(newUser);
  }, []);

  const setToken = useCallback((newToken: string) => {
    setTokenState(newToken);
  }, []);

  // Initialize API service to have access to token and logout mechanism
  useEffect(() => {
    ApiService.initialize(
      () => token,
      () => logout() // Force logout on unauthenticated
    );
  }, [token, logout]);

  // Listen for silent token refreshes
  useEffect(() => {
    const handleTokenRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<{ token: string }>;
      setTokenState(customEvent.detail.token);
    };
    
    window.addEventListener('auth:token-refreshed', handleTokenRefreshed);
    return () => window.removeEventListener('auth:token-refreshed', handleTokenRefreshed);
  }, []);

  // Initial session restoration
  useEffect(() => {
    const attemptRestore = async () => {
      try {
        // We do not have the access token in localStorage, but we can attempt to get /me
        // Wait, without an access token, /me will fail with 401. 
        // But our ApiService fetch wrapper will catch the 401 and try to hit /refresh
        // automatically because of the HttpOnly cookie!
        
        // Let's manually hit /refresh to get the access token first if we don't have one
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const newToken = data.data.accessToken;
          setTokenState(newToken);
          
          // Now fetch user details
          // ApiService now has the token via the effect above (or we just manually fetch /me here)
          const headers = new Headers({ Authorization: `Bearer ${newToken}` });
          const meResponse = await fetch(`${API_BASE_URL}/auth/me`, { headers });
          if (meResponse.ok) {
            const meData = await meResponse.json();
            setUser(meData.data.user);
          }
        }
      } catch (error) {
        // Silent fail, user is just not logged in
        console.log('No active session found.');
      } finally {
        setIsLoading(false);
      }
    };

    attemptRestore();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
