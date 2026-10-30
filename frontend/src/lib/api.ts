import {
  Repository,
  RepoFile,
  FileContentResponse,
  ChatMessage,
  ObsidianGraphData,
  NodeDetails,
  ExecutionPathResponse,
  RepoCommit,
  CommitDiffResponse,
  GitHubIssue,
  ContributionRoadmap,
  ImpactAnalysisResponse,
  ProjectStructureResponse,
  DependencyMapResponse,
  FeatureFlowResponse,
  EdgeDetails
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function connectRepo(url: string): Promise<{ status: string; repo_id: number; repo?: Repository; message?: string }> {
  const res = await fetch(`${API_BASE}/repos/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to connect repository" }));
    throw new Error(err.detail || "Failed to connect repository");
  }
  return res.json();
}

export async function getRepositories(): Promise<Repository[]> {
  const res = await fetch(`${API_BASE}/repos`);
  if (!res.ok) throw new Error("Failed to fetch repositories");
  return res.json();
}

export async function getRepository(repoId: number): Promise<Repository> {
  const res = await fetch(`${API_BASE}/repos/${repoId}`);
  if (!res.ok) throw new Error("Failed to fetch repository");
  return res.json();
}

export async function getRepoFiles(repoId: number): Promise<RepoFile[]> {
  const res = await fetch(`${API_BASE}/repos/${repoId}/files`);
  if (!res.ok) throw new Error("Failed to fetch repository files");
  return res.json();
}

export async function getFileContent(repoId: number, path: string): Promise<FileContentResponse> {
  const res = await fetch(`${API_BASE}/repos/${repoId}/file-content?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error("Failed to fetch file content");
  return res.json();
}

export async function queryChat(
  repoId: number, 
  query: string, 
  conversationId?: number
): Promise<{
  conversation_id: number;
  answer: string;
  citations: Array<{ file_path: string; start_line: number; end_line: number }>;
  retrieved_sources: any[];
}> {
  const res = await fetch(`${API_BASE}/chat/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repository_id: repoId, query, conversation_id: conversationId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Query failed" }));
    throw new Error(err.detail || "Query failed");
  }
  return res.json();
}

export async function getChatHistory(conversationId: number): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE}/chat/history/${conversationId}`);
  if (!res.ok) return [];
  return res.json();
}

// Architecture Explorer 3-View API Calls
export async function getProjectStructure(repoId: number): Promise<ProjectStructureResponse> {
  const res = await fetch(`${API_BASE}/architecture/project-structure/${repoId}`);
  if (!res.ok) throw new Error("Failed to fetch project structure");
  return res.json();
}

export async function getDependencyMap(
  repoId: number,
  level: string = "files",
  selectedModule?: string
): Promise<DependencyMapResponse> {
  let url = `${API_BASE}/architecture/dependency-map/${repoId}?level=${encodeURIComponent(level)}`;
  if (selectedModule) {
    url += `&selected_module=${encodeURIComponent(selectedModule)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch dependency map");
  return res.json();
}

export async function getFeatureFlow(
  repoId: number,
  workflowQuery?: string
): Promise<FeatureFlowResponse> {
  const res = await fetch(`${API_BASE}/architecture/feature-flow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_id: repoId, workflow_query: workflowQuery })
  });
  if (!res.ok) throw new Error("Failed to fetch feature flow");
  return res.json();
}

export async function getEdgeDetails(
  repoId: number,
  source: string,
  target: string,
  relType?: string
): Promise<EdgeDetails> {
  let url = `${API_BASE}/architecture/edge-details/${repoId}?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`;
  if (relType) {
    url += `&rel_type=${encodeURIComponent(relType)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch edge details");
  return res.json();
}

export async function getObsidianGraph(repoId: number): Promise<ObsidianGraphData> {
  const res = await fetch(`${API_BASE}/architecture/obsidian/${repoId}`);
  if (!res.ok) throw new Error("Failed to fetch obsidian graph");
  return res.json();
}

export async function getArchitectureFlow(repoId: number): Promise<{ nodes: any[]; edges: any[] }> {
  const res = await fetch(`${API_BASE}/architecture/flow/${repoId}`);
  if (!res.ok) throw new Error("Failed to fetch architecture flow");
  return res.json();
}

export async function getNodeDetails(repoId: number, path: string): Promise<NodeDetails> {
  const res = await fetch(`${API_BASE}/architecture/node-details/${repoId}?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error("Failed to fetch node details");
  return res.json();
}

export async function getExecutionPathSymbols(repoId: number): Promise<Array<{ name: string; symbol_type: string; file_path: string }>> {
  const res = await fetch(`${API_BASE}/execution-path/symbols/${repoId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function traceExecutionPath(repoId: number, symbol: string): Promise<ExecutionPathResponse> {
  const res = await fetch(`${API_BASE}/execution-path/trace/${repoId}?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Symbol trace failed" }));
    throw new Error(err.detail || "Symbol trace failed");
  }
  return res.json();
}

export async function getCommits(repoId: number): Promise<RepoCommit[]> {
  const res = await fetch(`${API_BASE}/time-machine/commits/${repoId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getCommitDiff(repoId: number, sha: string): Promise<CommitDiffResponse> {
  const res = await fetch(`${API_BASE}/time-machine/details/${repoId}?sha=${sha}`);
  if (!res.ok) throw new Error("Failed to fetch commit diff");
  return res.json();
}

export async function explainCommit(repoId: number, sha: string, diffSummary: string, message: string): Promise<string> {
  const res = await fetch(`${API_BASE}/time-machine/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_id: repoId, commit_sha: sha, diff_summary: diffSummary, message })
  });
  if (!res.ok) throw new Error("Failed to explain commit");
  const data = await res.json();
  return data.explanation;
}

export async function getIssues(repoId: number): Promise<GitHubIssue[]> {
  const res = await fetch(`${API_BASE}/contribution/issues/${repoId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function generateContributionRoadmap(
  repoId: number,
  issueNumber: number,
  issueTitle: string,
  issueBody: string,
  beginnerMode: boolean
): Promise<{ issue_number: number; beginner_mode: boolean; roadmap: ContributionRoadmap; relevant_files: string[] }> {
  const res = await fetch(`${API_BASE}/contribution/roadmap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo_id: repoId,
      issue_number: issueNumber,
      issue_title: issueTitle,
      issue_body: issueBody,
      beginner_mode: beginnerMode
    })
  });
  if (!res.ok) throw new Error("Failed to generate contribution roadmap");
  return res.json();
}

export async function analyzeImpact(repoId: number, proposedChange: string): Promise<ImpactAnalysisResponse> {
  const res = await fetch(`${API_BASE}/impact/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_id: repoId, proposed_change: proposedChange })
  });
  if (!res.ok) throw new Error("Failed to analyze impact");
  return res.json();
}
