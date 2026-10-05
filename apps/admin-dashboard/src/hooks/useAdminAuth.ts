import { useState, useEffect, useCallback } from 'react';
import { api } from '@nammabus/api-client';
import { UserProfile, UserRole } from '@nammabus/shared-types';

export function useAdminAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  // Initialize session from storage
  useEffect(() => {
    try {
      const stored = api.getStoredUser();
      if (stored) {
        if (stored.role === UserRole.ADMIN) {
          setUser(stored);
          setIsForbidden(false);
        } else {
          setUser(stored);
          setIsForbidden(true);
        }
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
    }
  }, []);

  const login = useCallback(async (email: string, password?: string) => {
    setAuthLoading(true);
    setAuthError(null);
    setIsForbidden(false);

    try {
      // Validate inputs
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        throw new Error('Please provide an administrator email address.');
      }
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }

      const res = await api.auth.login({ email: trimmedEmail, password });
      
      // Strict role check: Only ADMIN role is authorized
      if (res.user.role !== UserRole.ADMIN) {
        setUser(res.user);
        setIsForbidden(true);
        throw new Error('Access Denied: Administrator privileges are required to access this portal.');
      }

      setUser(res.user);
      setIsForbidden(false);
      return res.user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setIsForbidden(false);
      setAuthError(null);
    }
  }, []);

  return {
    user,
    isAuthenticated: !!user && user.role === UserRole.ADMIN,
    isAdmin: user?.role === UserRole.ADMIN,
    isForbidden,
    authLoading,
    authError,
    login,
    logout,
  };
}
