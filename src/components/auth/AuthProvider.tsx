
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      console.warn('Supabase environment variables are missing. Auth is disabled.');
      if (mounted) {
        setError('Supabase is not configured.');
        setLoading(false);
      }
      return () => {
        mounted = false;
      };
    }

    const client = supabase;

    // Get initial session with error handling
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await client.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setError(error.message);
        } else if (mounted) {
          setUser(session?.user ?? null);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes with error handling
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setError(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      const error = new Error('Supabase is not configured.');
      setError(error.message);
      throw error;
    }
    const client = supabase;
    setError(null);
    const { error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      const error = new Error('Supabase is not configured.');
      setError(error.message);
      throw error;
    }
    const client = supabase;
    setError(null);
    const { error } = await client.auth.signUp({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      throw error;
    }
  };

  const signOut = async () => {
    if (!supabase) {
      const error = new Error('Supabase is not configured.');
      setError(error.message);
      throw error;
    }
    const client = supabase;
    setError(null);
    const { error } = await client.auth.signOut();
    if (error) {
      setError(error.message);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Gracefully handle missing AuthProvider context by returning default values
    console.warn('useAuth must be used within an AuthProvider. Falling back to default values.');
    return {
      user: null,
      loading: false,
      error: null,
      signIn: async () => {
        throw new Error('AuthProvider not available. Cannot sign in.');
      },
      signUp: async () => {
        throw new Error('AuthProvider not available. Cannot sign up.');
      },
      signOut: async () => {
        throw new Error('AuthProvider not available. Cannot sign out.');
      },
    };
  }
  return context;
}
