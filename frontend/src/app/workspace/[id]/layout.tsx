"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import CodeViewerModal from "@/components/common/CodeViewerModal";
import ConnectRepoModal from "@/components/common/ConnectRepoModal";
import { getRepository } from "@/lib/api";
import { Repository } from "@/lib/types";

function WorkspaceInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const repoId = Number(params?.id);

  const [repo, setRepo] = useState<Repository | undefined>(undefined);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  // Global Code Viewer Modal State
  const [codeViewerFile, setCodeViewerFile] = useState<string | null>(null);
  const [codeViewerLines, setCodeViewerLines] = useState<{
    start?: number;
    end?: number;
  }>({});

  useEffect(() => {
    if (!repoId || isNaN(repoId)) return;
    getRepository(repoId)
      .then(setRepo)
      .catch((err) => console.error("Error fetching repository:", err));
  }, [repoId]);

  return (
    <div className="min-h-screen flex flex-col bg-[#101010] text-[#E8E4D3]">
      {/* Navbar */}
      <Navbar
        currentRepo={repo}
        onSelectRepo={(r) => router.push(`/workspace/${r.id}`)}
        onOpenConnectModal={() => setConnectModalOpen(true)}
      />

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar repoId={repoId} repo={repo} />
        <main className="min-w-0 flex-1 flex flex-col overflow-hidden relative">
          {children}
        </main>
      </div>

      {/* Global Code Viewer Modal */}
      <CodeViewerModal
        repoId={repoId}
        filePath={codeViewerFile}
        targetLineStart={codeViewerLines.start}
        targetLineEnd={codeViewerLines.end}
        onClose={() => setCodeViewerFile(null)}
      />

      {/* Connect New Repo Modal */}
      <ConnectRepoModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={(newId) => router.push(`/workspace/${newId}`)}
      />
    </div>
  );
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#101010] flex items-center justify-center text-xs text-[#E8E4D3]">
          Loading RepoMind Workspace...
        </div>
      }
    >
      <WorkspaceInner>{children}</WorkspaceInner>
    </Suspense>
  );
}
