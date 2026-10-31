"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ChatInterface from "@/components/chat/ChatInterface";
import CodeViewerModal from "@/components/common/CodeViewerModal";
import { getRepository } from "@/lib/api";
import { Repository } from "@/lib/types";

function ChatContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const repoId = Number(params?.id);
  const initialQuery = searchParams.get("q") || undefined;

  const [repo, setRepo] = useState<Repository | null>(null);
  const [activeCodeFile, setActiveCodeFile] = useState<string | null>(null);
  const [activeCodeLines, setActiveCodeLines] = useState<{ start?: number; end?: number }>({});

  useEffect(() => {
    if (!repoId || isNaN(repoId)) return;
    getRepository(repoId).then(setRepo).catch(console.error);
  }, [repoId]);

  return (
    <>
      <ChatInterface
        repoId={repoId}
        repoName={repo ? `${repo.owner}/${repo.name}` : "Repository"}
        initialQuery={initialQuery}
        onOpenCitation={(filePath, startLine, endLine) => {
          setActiveCodeFile(filePath);
          setActiveCodeLines({ start: startLine, end: endLine });
        }}
      />

      <CodeViewerModal
        repoId={repoId}
        filePath={activeCodeFile}
        targetLineStart={activeCodeLines.start}
        targetLineEnd={activeCodeLines.end}
        onClose={() => setActiveCodeFile(null)}
      />
    </>
  );
}

export default function WorkspaceChatPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-xs text-slate-500">Loading RepoMind AI...</div>}>
      <ChatContent />
    </Suspense>
  );
}
