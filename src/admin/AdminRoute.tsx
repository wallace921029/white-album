import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { Spinner } from '@/components/ui/spinner';

import { API_BASE } from '@/lib/api';

interface User {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'member';
  createdAt: string;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      const user = res.data.user as User;
      if (user && user.role === 'admin') {
        setIsAdmin(true);
      }
      setLoading(false);
    })
    .catch(() => {
      setLoading(false);
    });
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
