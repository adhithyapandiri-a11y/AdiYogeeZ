"use client";

import React, { useState, useEffect } from "react";
import { 
  GitFork, 
  Search, 
  ArrowRight, 
  ArrowDown, 
  Code, 
  FileCode, 
  AlertCircle,
  Eye,
  CheckCircle2
} from "lucide-react";
import { getExecutionPathSymbols, traceExecutionPath } from "@/lib/api";
import { ExecutionPathResponse, ExecutionPathFlowItem } from "@/lib/types";

interface ExecutionPathVisualizerProps {
  repoId: number;
  onOpenCode: (filePath: string, line?: number) => void;
}

export default function ExecutionPathVisualizer({ repoId, onOpenCode }: ExecutionPathVisualizerProps) {
  const [symbols, setSymbols] = useState<Array<{ name: string; symbol_type: string; file_path: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [data, setData] = useState<ExecutionPathResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active inspected step in the flow
  const [inspectedStep, setInspectedStep] = useState<ExecutionPathFlowItem | null>(null);

  useEffect(() => {
    getExecutionPathSymbols(repoId).then((syms) => {
      setSymbols(syms);
      if (syms.length > 0 && !selectedSymbol) {
        setSelectedSymbol(syms[0].name);
        handleTrace(syms[0].name);
      }
    });
  }, [repoId]);

  const handleTrace = async (symbolName: string) => {
    if (!symbolName) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await traceExecutionPath(repoId, symbolName);
      setData(resp);
      if (resp.flow_chain && resp.flow_chain.length > 0) {
        // default inspect target
        const target = resp.flow_chain.find((f) => f.stage === "TARGET") || resp.flow_chain[0];
        setInspectedStep(target);
      }
    } catch (err: any) {
      setError(err.message || "Failed to trace function relationship.");
    } finally {
      setLoading(false);
    }
  };

  const filteredSymbols = symbols.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-[#090d16] text-slate-100">
      {/* Left Symbol Selector Pane */}
      <div className="w-80 border-r border-white/10 bg-[#0c121e]/90 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <GitFork className="w-4 h-4 text-indigo-400" />
            <span>Search Functions & Methods</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search symbol name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Symbols list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredSymbols.slice(0, 80).map((sym, idx) => {
            const isSelected = selectedSymbol === sym.name;
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedSymbol(sym.name);
                  handleTrace(sym.name);
                }}
                className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex flex-col space-y-1 ${
                  isSelected
                    ? "bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 shadow-sm"
                    : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between font-mono font-medium truncate">
                  <span className="truncate">{sym.name}()</span>
                  <span className="text-[10px] text-slate-500 uppercase">{sym.symbol_type}</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">{sym.file_path}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Execution Flow Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Disclaimer Notice */}
        <div className="h-10 px-6 border-b border-white/10 bg-[#0f172a]/60 backdrop-blur-md flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Static Code Analysis Notice: Relationships are detected via AST parsing and identifier call sites.
            </span>
          </div>
          {data && (
            <div className="text-[11px] text-slate-500">
              {data.callers.length} Callers • {data.callees.length} Callees detected
            </div>
          )}
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Flow Visualizer Column */}
          <div className="flex-1 p-8 overflow-y-auto space-y-6">
            {loading ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                <span>Tracing static execution path...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {error}
              </div>
            ) : data ? (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-1">
                  <div className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                    Execution Path Hierarchy
                  </div>
                  <h2 className="text-lg font-bold text-slate-100 font-mono">
                    {data.target_symbol.name}()
                  </h2>
                </div>

                {/* Vertical Step Sequence */}
                <div className="space-y-4">
                  {data.flow_chain.map((item, idx) => {
                    const isSelected = inspectedStep?.name === item.name;
                    const isTarget = item.stage === "TARGET";

                    return (
                      <div key={idx} className="flex flex-col items-center">
                        {/* Node Card */}
                        <div
                          onClick={() => setInspectedStep(item)}
                          className={`w-full rounded-2xl p-4.5 border transition-all cursor-pointer shadow-xl ${
                            isTarget
                              ? "bg-gradient-to-r from-indigo-900/40 via-violet-900/30 to-slate-900/80 border-indigo-500/50 shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                              : "bg-[#0f172a]/90 border-white/10 hover:border-white/20"
                          } ${isSelected ? "ring-2 ring-violet-400" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                item.stage === "CALLER"
                                  ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                  : item.stage === "TARGET"
                                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                  : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                              }`}
                            >
                              {item.stage === "CALLER" ? "Incoming Caller" : item.stage === "TARGET" ? "Inspected Function" : "Downstream Invocation"}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              L{item.lines}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div>
                              <div className="font-mono font-bold text-slate-100 text-sm">
                                {item.name}()
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {item.file_path}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCode(item.file_path);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/5 text-xs flex items-center space-x-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View File</span>
                            </button>
                          </div>
                        </div>

                        {/* Connector Arrow */}
                        {idx < data.flow_chain.length - 1 && (
                          <div className="my-2 flex flex-col items-center text-slate-600">
                            <div className="w-[1px] h-4 bg-slate-700"></div>
                            <ArrowDown className="w-4 h-4 text-slate-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Side Code Inspector Panel */}
          {inspectedStep && (
            <div className="w-96 border-l border-white/10 bg-[#0c121e]/95 p-5 flex flex-col shrink-0 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <Code className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-xs text-slate-100">Symbol Source Inspector</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {inspectedStep.stage}
                </span>
              </div>

              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Symbol</div>
                <div className="font-mono font-bold text-sm text-slate-200">{inspectedStep.name}()</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">File & Lines</div>
                <div className="text-xs text-slate-300 font-mono break-all">{inspectedStep.file_path}</div>
                <div className="text-xs text-indigo-400 font-mono mt-0.5">Lines: {inspectedStep.lines}</div>
              </div>

              <div className="space-y-1.5 flex-1 flex flex-col">
                <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  Source Code Extract
                </div>
                <div className="p-3 rounded-xl bg-[#090d16] border border-white/10 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre leading-relaxed flex-1">
                  {inspectedStep.source_code || "// No inline source body available"}
                </div>
              </div>

              <button
                onClick={() => onOpenCode(inspectedStep.file_path)}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-white/10 flex items-center justify-center space-x-2"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Open in Full Code Viewer</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
