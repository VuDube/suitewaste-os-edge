import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { api } from '@/lib/api-client';
import type { User } from '@shared/types';
export function useAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  // Zustand Zero-Tolerance: Primitive selectors only
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const setUser = useAuthStore(s => s.setUser);
  const logout = useAuthStore(s => s.logout);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['me', token],
    queryFn: async () => {
      const activeToken = token || localStorage.getItem('token');
      if (!activeToken) throw new Error('No token');
      return api<User>('/api/auth/me', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
    },
    // Only run if we have a token but maybe not a full user object yet
    enabled: !!(token || localStorage.getItem('token')),
    retry: (failureCount, err: any) => {
      if (err?.status === 401) return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000,
  });
  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data, setUser]);
  useEffect(() => {
    if (isError) {
      const errStatus = (error as any)?.status;
      // Specifically target 401 Unauthorized or missing token errors
      if (errStatus === 401 || !localStorage.getItem('token')) {
        logout();
        queryClient.clear();
        if (location.pathname !== '/login') {
          navigate('/login', { 
            replace: true, 
            state: { from: location.pathname, reason: 'session_expired' } 
          });
        }
      }
    }
  }, [isError, error, logout, navigate, location.pathname, queryClient]);
  return { user, token, isAuthenticated, isLoading };
}