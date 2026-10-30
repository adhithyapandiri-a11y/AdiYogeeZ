"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import { getRepository } from "@/lib/api";
import { Repository } from "@/lib/types";

function DashboardContent() {
  const params = useParams();
  const router = useRouter();
  const repoId = Number(params?.id);

  const [repo, setRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repoId || isNaN(repoId)) return;
    getRepository(repoId)
      .then((data) => {
        setRepo(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load repo:", err);
        setLoading(false);
      });
  }, [repoId]);

  if (loading || !repo) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
        <span>Loading repository intelligence overview...</span>
      </div>
    );
  }

  return (
    <DashboardOverview
      repo={repo}
      onSelectQuestion={(q) => {
        router.push(`/workspace/${repoId}/chat`);
      }}
    />
  );
}

export default function WorkspaceDashboardPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-xs text-slate-500">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
