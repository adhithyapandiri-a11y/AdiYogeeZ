"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import TimeMachineView from "@/components/time-machine/TimeMachineView";

function TimeMachineContent() {
  const params = useParams();
  const repoId = Number(params?.id);

  return <TimeMachineView repoId={repoId} />;
}

export default function WorkspaceTimeMachinePage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-xs text-slate-500">Loading Codebase Time Machine...</div>}>
      <TimeMachineContent />
    </Suspense>
  );
}
