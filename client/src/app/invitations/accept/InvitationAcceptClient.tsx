"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";

export default function InvitationAcceptClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const { isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleAccept = async () => {
    if (!token) {
      setStatus("error");
      setMessage("Invitation token is missing.");
      return;
    }

    setStatus("loading");

    try {
      const accessToken = localStorage.getItem("accessToken");

      const res = await fetch(`${API_URL}/api/v1/invitations/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ token }),
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setMessage("Invitation accepted — you have been added to the team. Redirecting...");
        await refreshUser();
        setTimeout(() => router.push("/teams"), 1500);
        return;
      }

      setStatus("error");
      setMessage(data.error || "Failed to accept invitation");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Network error");
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      handleAccept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, token]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
        <h1 className="text-xl font-semibold mb-4 text-white">Accept Invitation</h1>

        {!isAuthenticated ? (
          <div>
            <p className="mb-4 text-slate-300">
              You must be signed in to accept this invitation.
            </p>

            <div className="flex space-x-3">
              <Link
                href={`/login?next=${encodeURIComponent(`/invitations/accept?token=${token}`)}`}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Sign in
              </Link>

              <Link
                href={`/register?next=${encodeURIComponent(`/invitations/accept?token=${token}`)}`}
                className="px-4 py-2 bg-slate-700 text-slate-100 rounded-md hover:bg-slate-600"
              >
                Register
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              You will be redirected back after signing in.
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-slate-300 w-full break-words">
              Token: <span className="font-mono text-sm text-slate-200">{token}</span>
            </p>

            <div className="flex justify-end">
              <button
                onClick={handleAccept}
                disabled={status === "loading"}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {status === "loading" ? "Accepting..." : "Accept Invitation"}
              </button>
            </div>
          </div>
        )}

        {message && (
          <div
            className={`mt-4 p-3 rounded ${
              status === "error"
                ? "bg-red-900/30 text-red-200 border border-red-700/50"
                : "bg-green-900/30 text-green-200 border border-green-700/50"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}