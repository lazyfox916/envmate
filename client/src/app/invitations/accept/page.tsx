import { Suspense } from "react";
import InvitationAcceptClient from "./InvitationAcceptClient";

function InvitationAcceptFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
      Loading...
    </div>
  );
}

export default function InvitationAcceptPage() {
  return (
    <Suspense fallback={<InvitationAcceptFallback />}>
      <InvitationAcceptClient />
    </Suspense>
  );
}