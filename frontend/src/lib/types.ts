export interface Repository {
  id: number;
  name: string;
  owner: string;
  github_url: string;
  default_branch?: string;
  primary_language: string;
  description: string;
  stars: number;
  forks: number;
  indexing_status: "pending" | "indexing" | "completed" | "failed";
  status_message?: string;
  progress_percent: number;
  file_count: number;
  function_count: number;
  class_count: number;
  dependency_count: number;
  module_count: number;
  languages?: Record<string, number>;
  indexed_at?: string;
}

export interface RepoFile {
  id: number;
  file_path: string;
  language: string;
  line_count: number;
  file_size: number;
  architectural_role?: string;
}

export interface FileContentResponse {
  file_path: string;
  language: string;
  content: string;
  line_count: number;
  symbols: Array<{
    name: string;
    symbol_type: string;
    start_line: number;
    end_line: number;
  }>;
}

export interface Citation {
  file_path: string;
  start_line: number;
  end_line: number;
}

export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  created_at?: string;
}

// Canonical Metrics for Architecture & Workspace Dashboard
export interface CanonicalMetrics {
  indexed_files_count: number;
  functions_count: number;
  classes_count: number;
  direct_imports_count: number;
  call_relationships_count: number;
  inherits_relationships_count: number;
  api_relationships_count: number;
  data_access_relationships_count: number;
  total_relationships_count: number;
  isolated_files_count: number;
}

// View 1: Project Structure (Containment Only)
export interface DirectoryNodeData {
  name: string;
  path: string;
  is_root: boolean;
  file_count: number;
  folder_count: number;
  languages: string[];
  architectural_role: string;
  depth: number;
}

export interface FileNodeData {
  name: string;
  raw_name: string;
  file_path: string;
  language: string;
  color: string;
  architectural_role: string;
  role_color: string;
  line_count: number;
  file_size: number;
  function_count: number;
  class_count: number;
  incoming_count: number;
  outgoing_count: number;
  is_isolated?: boolean;
}

export interface ProjectStructureResponse {
  nodes: Array<{
    id: string;
    type: string;
    position?: { x: number; y: number };
    data: DirectoryNodeData | FileNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
    data?: any;
  }>;
  stats: {
    total_files: number;
    total_directories: number;
    max_depth: number;
    languages: Record<string, number>;
  };
}

// View 2: Dependency Map
export interface ModuleNodeData {
  name: string;
  file_count: number;
  total_lines: number;
  architectural_role: string;
  role_color: string;
  languages: string[];
  incoming_count: number;
  outgoing_count: number;
  key_files: string[];
}

export interface DependencyMapResponse {
  level: "modules" | "files" | "symbols";
  nodes: Array<{
    id: string;
    type: string;
    position?: { x: number; y: number };
    data: any;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
    animated?: boolean;
    data?: {
      relationship_type: string;
      color: string;
      evidence_line?: number;
      evidence_snippet?: string;
      weight?: number;
      breakdown?: Record<string, number>;
    };
  }>;
  canonical_metrics: CanonicalMetrics;
}

// View 3: Feature Flow
export interface FeatureStage {
  stage_number: number;
  title: string;
  component: string;
  role: string;
  function_or_symbol: string;
  description: string;
  input_spec: string;
  output_spec: string;
  code_reference: {
    file_path: string;
    start_line: number;
    end_line: number;
    snippet: string;
  };
  is_error_stage: boolean;
}

export interface FeatureFlowResponse {
  query: string;
  preset_scenarios: string[];
  stages: FeatureStage[];
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: FeatureStage;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
    animated?: boolean;
    label?: string;
    style?: any;
  }>;
  inference_meta: {
    method: string;
    is_synthetic: boolean;
    accuracy_notice: string;
  };
}

// Edge details inspection
export interface EdgeDetails {
  source: string;
  source_basename: string;
  target: string;
  target_basename: string;
  relationship_type: string;
  evidence_line: number;
  evidence_snippet: string;
  source_language: string;
  target_language: string;
}

// Node Details Drawer Data
export interface NodeDetails {
  file_path: string;
  language: string;
  line_count: number;
  file_size: number;
  architectural_role?: string;
  module_name?: string;
  preview: string;
  functions: Array<{ name: string; lines: string; type?: string }>;
  classes: Array<{ name: string; lines: string; type?: string }>;
  incoming_dependencies: Array<{ file_path: string; relationship_type?: string; evidence_line?: number }> | string[];
  outgoing_dependencies: Array<{ file_path: string; relationship_type?: string; evidence_line?: number }> | string[];
}

export interface RootFolderSummary {
  name: string;
  color: string;
  file_count: number;
}

export interface ObsidianNode {
  id: string;
  name: string;
  type: "directory" | "file" | "symbol";
  path: string;
  size: number;
  color: string;
  baseColor?: string;
  branchColor?: string;
  rootFolder?: string;
  depth?: number;
  language?: string;
  lineCount?: number;
  functionCount?: number;
  classCount?: number;
  inDegree?: number;
  outDegree?: number;
  symbolType?: string;
  startLine?: number;
  endLine?: number;
  architecturalRole?: string;
  // Commit state dynamic overlay
  commitStatus?: "modified" | "added" | "removed" | "none";
  commitAdditions?: number;
  commitDeletions?: number;
}

export interface ObsidianLink {
  source: string | any;
  target: string | any;
  type: string;
  value: number;
  color?: string;
  branchColor?: string;
}

export interface ObsidianGraphData {
  nodes: ObsidianNode[];
  links: ObsidianLink[];
  root_folders?: RootFolderSummary[];
  stats: {
    total_nodes: number;
    total_links: number;
    total_directories: number;
    total_files: number;
  };
}

export interface ExecutionPathFlowItem {
  stage: "CALLER" | "TARGET" | "CALLEE";
  name: string;
  symbol_type: string;
  file_path: string;
  lines: string;
  source_code: string;
}

export interface ExecutionPathResponse {
  target_symbol: {
    name: string;
    symbol_type: string;
    file_path: string;
    start_line: number;
    end_line: number;
    source_code: string;
  };
  callers: Array<{
    name: string;
    symbol_type: string;
    file_path: string;
    lines: string;
    source_code: string;
  }>;
  callees: Array<{
    name: string;
    symbol_type: string;
    file_path: string;
    lines: string;
    source_code: string;
  }>;
  flow_chain: ExecutionPathFlowItem[];
  static_analysis_notice: string;
}

export interface RepoCommit {
  id: number;
  sha: string;
  author: string;
  author_avatar?: string;
  message: string;
  timestamp: string;
}

export interface CommitDiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface CommitDiffResponse {
  sha: string;
  message: string;
  author: string;
  date: string;
  stats: { total?: number; additions?: number; deletions?: number };
  files: CommitDiffFile[];
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  user: string;
  avatar: string;
  state: string;
  created_at: string;
  labels: string[];
  comments_count: number;
  url: string;
}

export interface ContributionRoadmap {
  issue_summary: string;
  problem_cause: string;
  affected_modules: string[];
  target_files: Array<{ file_path: string; reason: string }>;
  investigation_steps: string[];
  implementation_plan: string[];
  testing_checklist: string[];
  potential_risks: string[];
}

export interface ImpactAnalysisResponse {
  proposed_change: string;
  seed_files: string[];
  total_affected_count: number;
  tiers: {
    high: Array<{ file_path: string; tier: string; reason: string; is_seed: boolean }>;
    medium: Array<{ file_path: string; tier: string; reason: string; is_seed: boolean }>;
    low: Array<{ file_path: string; tier: string; reason: string; is_seed: boolean }>;
  };
  ai_assessment: {
    impact_summary: string;
    breaking_risk_assessment: string;
    key_watchouts: string[];
    recommended_tests: string[];
  };
  disclaimer: string;
}

// ============================================================================
// API CHAOS LAB & AUTONOMOUS RED-TEAM TYPES
// ============================================================================

export interface ChaosRules {
  active: boolean;
  latency_ms: number;
  error_status: number | null;
  error_rate: number;
  drop_request: boolean;
  malformed_response: boolean;
}

export interface ChaosLogItem {
  id: string;
  method: string;
  endpoint: string;
  timestamp: string;
  duration_ms: number;
  status_code: number;
  chaos_injected: string[];
  payload_preview: string;
  success: boolean;
}

export interface RedTeamLoophole {
  id: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  category: "TIMEOUT_HANG" | "TRANSIENT_FAULT" | "BOUNDARY_FUZZ" | "MALFORMED_DATA";
  endpoint: string;
  description: string;
  reproduction_curl: string;
  observed_failure: string;
  proposed_diff: string;
  fix_explanation: string;
  status: "open" | "shield_active" | "verified_repaired";
  is_shielded?: boolean;
}

export interface RedTeamAuditResponse {
  timestamp: string;
  total_probes_run: number;
  loopholes_detected: number;
  resilience_score: number;
  loopholes: RedTeamLoophole[];
}

export interface CheckoutResult {
  status: string;
  order_id: string;
  items_count: number;
  total_charged: number;
  currency: string;
  card_last4: string;
  processed_at: string;
  chaos_applied: string[];
  latency_ms: number;
}
