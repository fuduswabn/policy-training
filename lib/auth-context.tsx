import React, { createContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from 'convex/react';
import { api } from './config';
import type { Id } from './config';

export interface User {
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'employee';
  companyId?: Id<'companies'>;
  companyName?: string;
  subscriptionStatus?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'employee' | 'manager' | 'admin', companyName?: string, inviteCode?: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<string>;
  signOut: () => Promise<void>;
  restoreUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children?: any }) {
  const [user, setUser] = useState<User | null>(null);
  const loading = false;

  const signInMutation = useMutation(api.users.signIn);
  const signUpMutation = useMutation(api.users.signUp);
  const requestPasswordResetMutation = useMutation(api.users.requestPasswordReset);
  const resetPasswordMutation = useMutation(api.users.resetPassword);
  const currentUser = useQuery(
    api.users.getCurrentUser,
    user?.userId ? { userId: user.userId as Id<'users'> } : 'skip'
  );

  useEffect(() => {
    if (!currentUser) return;

    setUser((previousUser: User | null) => {
      if (!previousUser) return previousUser;

      const nextSubscriptionStatus = currentUser.subscriptionStatus ?? previousUser.subscriptionStatus;
      const userChanged =
        previousUser.email !== currentUser.email ||
        previousUser.fullName !== currentUser.fullName ||
        previousUser.role !== currentUser.role ||
        previousUser.companyId !== currentUser.companyId ||
        previousUser.companyName !== currentUser.companyName ||
        previousUser.subscriptionStatus !== nextSubscriptionStatus;

      if (!userChanged) return previousUser;

      const refreshedUser: User = {
        ...previousUser,
        email: currentUser.email,
        fullName: currentUser.fullName,
        role: currentUser.role,
        companyId: currentUser.companyId,
        companyName: currentUser.companyName,
        subscriptionStatus: nextSubscriptionStatus,
      };

      AsyncStorage.setItem('user', JSON.stringify(refreshedUser));
      return refreshedUser;
    });
  }, [currentUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await signInMutation({ email, password });
    const userData: User = {
      userId: result.userId,
      email: result.email,
      fullName: result.fullName,
      role: result.role,
      companyId: result.companyId,
      companyName: result.companyName,
      subscriptionStatus: result.subscriptionStatus,
    };
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  }, [signInMutation]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    role: 'employee' | 'manager' | 'admin',
    companyName?: string,
    inviteCode?: string
  ) => {
    const result = await signUpMutation({
      email,
      password,
      fullName,
      role,
      companyName,
      inviteCode,
    });
    const userData: User = {
      userId: result.userId,
      email: result.email,
      fullName: result.fullName,
      role: result.role,
      companyId: result.companyId,
      subscriptionStatus: result.subscriptionStatus,
    };
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  }, [signUpMutation]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const result = await requestPasswordResetMutation({ email });
    return result.message;
  }, [requestPasswordResetMutation]);

  const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    const result = await resetPasswordMutation({ email, code, newPassword });
    return result.message;
  }, [resetPasswordMutation]);

  const signOut = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem('user');
  }, []);

  const restoreUser = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to restore user:', e);
    }
  }, []);

  useEffect(() => {
    void restoreUser();
  }, [restoreUser]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    setUser((prev: User | null) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, requestPasswordReset, resetPassword, signOut, restoreUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

const missingAuthContext: AuthContextType = {
  user: null,
  loading: true,
  signIn: async () => {
    throw new Error('Authentication is still loading. Please try again.');
  },
  signUp: async () => {
    throw new Error('Authentication is still loading. Please try again.');
  },
  requestPasswordReset: async () => {
    throw new Error('Authentication is still loading. Please try again.');
  },
  resetPassword: async () => {
    throw new Error('Authentication is still loading. Please try again.');
  },
  signOut: async () => undefined,
  restoreUser: async () => undefined,
  updateUser: async () => undefined,
};

export function useAuth() {
  const context = React.useContext(AuthContext);
  return context ?? missingAuthContext;
}
