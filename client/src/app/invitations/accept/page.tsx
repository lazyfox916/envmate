 'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { API_URL } from '@/lib/api';

export default function InvitationAcceptPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const { isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // attempt auto-accept if already authenticated
    if (!authLoading && isAuthenticated && token) {
      handleAccept();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, token]);

  const handleAccept = async () => {
    if (!token) return;
    setStatus('loading');

    try {
      const accessToken = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/v1/invitations/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({ token }),
        credentials: 'include',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setMessage('Invitation accepted — you have been added to the team. Redirecting...');
        // refresh user to pick up new membership
        await refreshUser();
        setTimeout(() => router.push('/teams'), 1500);
        return;
      }

      setStatus('error');
      setMessage(data.error || 'Failed to accept invitation');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Network error');
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold mb-4">Accept Invitation</h1>

        {!isAuthenticated ? (
          <div>
            <p className="mb-4">You must be signed in to accept this invitation.</p>
            <div className="flex space-x-3">
              <Link
                href={`/login?next=${encodeURIComponent(`/invitations/accept?token=${token}`)}`}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md"
              >
                Sign in
              </Link>
              <Link
                href={`/register?next=${encodeURIComponent(`/invitations/accept?token=${token}`)}`}
                className="px-4 py-2 bg-gray-100 rounded-md"
              >
                Register
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">You will be redirected back after signing in.</p>
            <div className="mt-4 flex justify-end">
              <button onClick={handleAccept} className="px-4 py-2 bg-green-600 text-white rounded-md">Accept</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-4">Token: <span className="font-mono text-sm">{token}</span></p>
            <div className="flex justify-end">
              <button onClick={handleAccept} disabled={status === 'loading'} className="px-4 py-2 bg-green-600 text-white rounded-md">
                {status === 'loading' ? 'Accepting...' : 'Accept Invitation'}
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className={`mt-4 p-3 rounded ${status === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
