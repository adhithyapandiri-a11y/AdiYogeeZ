"use client";

import React, { useState, Suspense } from "react";
import { useParams } from "next/navigation";
import ImpactAnalyzerView from "@/components/impact/ImpactAnalyzerView";
import CodeViewerModal from "@/components/common/CodeViewerModal";

function ImpactContent() {
  const params = useParams();
  const repoId = Number(params?.id);

  const [activeCodeFile, setActiveCodeFile] = useState<string | null>(null);

  return (
    <>
      <ImpactAnalyzerView
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

export default function WorkspaceImpactPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-xs text-slate-500">Loading Impact Analyzer...</div>}>
      <ImpactContent />
    </Suspense>
  );
}
