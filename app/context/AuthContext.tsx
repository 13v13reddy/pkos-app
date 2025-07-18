// app/context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Buffer } from 'buffer';
import { deriveKeyFromPassword, EncryptedData, encryptData, decryptData } from '../../lib/crypto';

interface AuthContextType {
  sessionKey: CryptoKey | null;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  encrypt: (plaintext: string) => Promise<EncryptedData | null>;
  decrypt: (encrypted: EncryptedData) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const saltBuffer = Buffer.from(data.salt, 'base64');
    const key = await deriveKeyFromPassword(password, saltBuffer);
    
    setSessionKey(key);
    setUserEmail(email);
    router.push('/dashboard');
  };

  const logout = () => {
    setSessionKey(null);
    setUserEmail(null);
    router.push('/login');
  };

  const encrypt = async (plaintext: string): Promise<EncryptedData | null> => {
    if (!sessionKey) return null;
    return await encryptData(plaintext, sessionKey);
  };

  const decrypt = async (encrypted: EncryptedData): Promise<string | null> => {
    if (!sessionKey) return null;
    // Add a try-catch block here because decryption can fail if the key is wrong (i.e., wrong password)
    try {
        return await decryptData(encrypted, sessionKey);
    } catch (e) {
        console.error("Decryption failed. This can happen with a wrong password.", e);
        // In a real app, you might want to handle this more gracefully
        throw new Error("Decryption failed. Incorrect master password?");
    }
  };

  return (
    <AuthContext.Provider value={{ sessionKey, userEmail, login, logout, encrypt, decrypt }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}