"use client";

import React, { useState, Suspense } from "react";
import { useParams } from "next/navigation";
import ContributionAssistantView from "@/components/contribution/ContributionAssistantView";
import CodeViewerModal from "@/components/common/CodeViewerModal";

function ContributionContent() {
  const params = useParams();
  const repoId = Number(params?.id);

  const [activeCodeFile, setActiveCodeFile] = useState<string | null>(null);

  return (
    <>
      <ContributionAssistantView
        repoId={repoId}
        onOpenCode={(filePath) => setActiveCodeFile(filePath)}
      />

      <CodeViewerModal
        repoId={repoId}
        filePath={activeCodeFile}
        onClose={() => setActiveCodeFile(null)}
      />
    </>
  );
}

export default function WorkspaceContributionPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-xs text-slate-500">Loading Contribution Assistant...</div>}>
      <ContributionContent />
    </Suspense>
  );
}
