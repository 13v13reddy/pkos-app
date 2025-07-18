// app/setup-recovery/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateRecoveryCodes, hashRecoveryCode } from '../../lib/crypto';
import { useAuth } from '../context/AuthContext';

export default function SetupRecoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [codes, setCodes] = useState<string[]>([]);
  const [hasSaved, setHasSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract credentials passed from registration page
  const email = searchParams.get('email');
  const password = searchParams.get('password');

  useEffect(() => {
    // This page is useless without the credentials, redirect if they're missing.
    if (!email || !password) {
      router.push('/register');
    } else {
      setCodes(generateRecoveryCodes());
    }
  }, [email, password, router]);

  const handleConfirmAndFinish = async () => {
    if (!hasSaved) {
      setError('Please check the box to confirm you have saved your codes.');
      return;
    }
    if (!email || !password) return;

    setIsLoading(true);
    setError('');

    try {
      // Hash all the generated codes on the client
      const hashes = await Promise.all(codes.map(code => hashRecoveryCode(code)));

      // Send the hashes to the server for storage
      const response = await fetch('/api/auth/store-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, hashes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to secure recovery codes.');
      }

      // Automatically log the user in and proceed to the dashboard
      await login(email, password);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!email || !password) {
    return null; // Don't render anything if credentials are not present
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Save Your Recovery Codes</h2>
        <p className="text-sm text-center text-gray-600">
          This is the **only** way to recover your account if you forget your master password.
          Store these codes somewhere safe and private.
        </p>
        
        <div className="grid grid-cols-2 gap-4 p-4 font-mono text-center bg-gray-100 border rounded-md">
          {codes.map(code => <span key={code}>{code}</span>)}
        </div>

        <div className="pt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={hasSaved}
              onChange={() => setHasSaved(!hasSaved)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-900">I have saved these codes in a secure place.</span>
          </label>
        </div>

        <div>
          <button
            onClick={handleConfirmAndFinish}
            disabled={!hasSaved || isLoading}
            className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Securing...' : 'Finish Setup & Login'}
          </button>
        </div>
        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}