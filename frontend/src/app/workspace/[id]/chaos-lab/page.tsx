"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import ChaosLabView from "@/components/chaos/ChaosLabView";

export default function WorkspaceChaosLabPage() {
  const params = useParams();
  const repoId = Number(params?.id);

  return (
    <Suspense fallback={
      <div className="w-full h-96 flex items-center justify-center font-mono text-xs text-slate-400">
        Loading API Chaos Lab...
      </div>
    }>
      <ChaosLabView repoId={repoId} />
    </Suspense>
  );
}
