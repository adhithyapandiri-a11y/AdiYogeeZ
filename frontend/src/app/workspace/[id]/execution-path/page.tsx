"use client";

import React, { useState, Suspense } from "react";
import { useParams } from "next/navigation";
import ExecutionPathVisualizer from "@/components/execution-path/ExecutionPathVisualizer";
import CodeViewerModal from "@/components/common/CodeViewerModal";

function ExecutionPathContent() {
  const params = useParams();
  const repoId = Number(params?.id);

  const [activeCodeFile, setActiveCodeFile] = useState<string | null>(null);

  return (
    <>
      <ExecutionPathVisualizer
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

export default function WorkspaceExecutionPathPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-xs text-slate-500">Loading Execution Path...</div>}>
      <ExecutionPathContent />
    </Suspense>
  );
}
