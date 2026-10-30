"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import SettingsView from "@/components/settings/SettingsView";
import { getRepository } from "@/lib/api";
import { Repository } from "@/lib/types";

function SettingsContent() {
  const params = useParams();
  const repoId = Number(params?.id);

  const [repo, setRepo] = useState<Repository | null>(null);

  useEffect(() => {
    if (!repoId || isNaN(repoId)) return;
    getRepository(repoId).then(setRepo).catch(console.error);
  }, [repoId]);

  if (!repo) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
        <span>Loading settings...</span>
      </div>
    );
  }

  return <SettingsView repo={repo} />;
}

export default function WorkspaceSettingsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-xs text-slate-500">Loading Settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
