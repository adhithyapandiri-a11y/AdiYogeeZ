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
  CheckCircle2,
  ArrowUpRight
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
    <div className="flex h-[calc(100vh-4rem)] bg-[#0d0d0d] text-zinc-100 vsk-grid-bg-subtle select-none">
      {/* Left Symbol Selector Pane */}
      <div className="w-80 border-r border-[#222222] bg-[#0d0d0d] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#222222] space-y-3">
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-white uppercase tracking-wider">
            <GitFork className="w-4 h-4 text-[#f54e26]" />
            <span>Search Functions & Methods</span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Filter symbol name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-[#141414] border border-[#282828] text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#f54e26]"
            />
          </div>
        </div>

        {/* Symbols list */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {filteredSymbols.slice(0, 80).map((sym, idx) => {
            const isSelected = selectedSymbol === sym.name;
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedSymbol(sym.name);
                  handleTrace(sym.name);
                }}
                className={`w-full text-left p-3 rounded-2xl text-xs transition-all flex flex-col space-y-1 cursor-pointer ${
                  isSelected
                    ? "bg-[#f54e26]/10 border border-[#f54e26]/50 text-white shadow-sm"
                    : "hover:bg-[#161616] text-zinc-400 hover:text-white border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between font-mono font-medium truncate">
                  <span className={`truncate ${isSelected ? "text-[#f54e26] font-bold" : ""}`}>
                    {sym.name}()
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase">{sym.symbol_type}</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 truncate">{sym.file_path}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Execution Flow Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Disclaimer Notice */}
        <div className="h-11 px-6 border-b border-[#222222] bg-[#121212] flex items-center justify-between text-xs font-mono text-zinc-400 shrink-0">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#f9bf28] shrink-0" />
            <span>
              Static Code Analysis: Relationships resolved via Tree-sitter AST and identifier call sites.
            </span>
          </div>
          {data && (
            <div className="text-[11px] text-zinc-500">
              {data.callers.length} Callers • {data.callees.length} Callees detected
            </div>
          )}
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Flow Visualizer Column */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
            {loading ? (
              <div className="h-64 flex items-center justify-center text-zinc-500 text-xs font-mono">
                <div className="flex items-center space-x-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#f54e26] animate-ping"></span>
                  <span>Tracing static execution path...</span>
                </div>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-[#1c1212] border border-[#f54e26]/30 text-[#ff623d] text-xs font-mono">
                {error}
              </div>
            ) : data ? (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-1">
                  <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">
                    // EXECUTION CALL CHAIN
                  </div>
                  <h2 className="text-xl font-black text-white font-mono uppercase">
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
                          className={`w-full rounded-3xl p-5 border transition-all cursor-pointer shadow-lg ${
                            isTarget
                              ? "bg-[#181818] border-[#f54e26]/60 shadow-[0_0_25px_rgba(245,78,38,0.2)] ring-1 ring-[#f54e26]/40"
                              : "bg-[#141414] border-[#262626] hover:border-zinc-500"
                          } ${isSelected ? "ring-2 ring-[#f54e26]" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                item.stage === "CALLER"
                                  ? "bg-[#f9bf28]/10 text-[#f9bf28] border border-[#f9bf28]/20"
                                  : item.stage === "TARGET"
                                  ? "bg-[#f54e26]/10 text-[#f54e26] border border-[#f54e26]/30"
                                  : "bg-[#00a86b]/10 text-[#00a86b] border border-[#00a86b]/20"
                              }`}
                            >
                              {item.stage === "CALLER" ? "Incoming Caller" : item.stage === "TARGET" ? "Inspected Target" : "Downstream Invocation"}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-500">
                              L{item.lines}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div>
                              <div className="font-mono font-bold text-white text-base">
                                {item.name}()
                              </div>
                              <div className="text-xs font-mono text-zinc-400 mt-0.5">
                                {item.file_path}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCode(item.file_path);
                              }}
                              className="p-2 rounded-full bg-[#1c1c1c] hover:bg-[#262626] text-zinc-300 hover:text-white border border-[#2c2c2c] text-xs flex items-center space-x-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#f54e26]" />
                              <span>View File</span>
                            </button>
                          </div>
                        </div>

                        {/* Connector Arrow */}
                        {idx < data.flow_chain.length - 1 && (
                          <div className="my-2 flex flex-col items-center text-zinc-600">
                            <div className="w-[1px] h-4 bg-[#2e2e2e]"></div>
                            <ArrowDown className="w-4 h-4 text-[#f54e26]" />
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
            <div className="w-96 border-l border-[#222222] bg-[#121212] p-6 flex flex-col shrink-0 overflow-y-auto space-y-4 font-mono">
              <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                <div className="flex items-center space-x-2">
                  <Code className="w-4 h-4 text-[#f54e26]" />
                  <span className="font-bold text-xs uppercase tracking-wider text-white">Source Inspector</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#1c1c1c] text-[#f54e26] border border-[#2a2a2a]">
                  {inspectedStep.stage}
                </span>
              </div>

              <div>
                <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Symbol</div>
                <div className="font-bold text-sm text-white">{inspectedStep.name}()</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">File & Lines</div>
                <div className="text-xs text-zinc-300 break-all">{inspectedStep.file_path}</div>
                <div className="text-xs text-[#f54e26] mt-0.5 font-bold">Lines: {inspectedStep.lines}</div>
              </div>

              <div className="space-y-1.5 flex-1 flex flex-col">
                <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                  Source Excerpt
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0d0d0d] border border-[#222222] text-xs text-zinc-200 overflow-x-auto whitespace-pre leading-relaxed flex-1">
                  {inspectedStep.source_code || "// No inline source body available"}
                </div>
              </div>

              <button
                onClick={() => onOpenCode(inspectedStep.file_path)}
                className="w-full py-2.5 px-4 rounded-full bg-[#1a1a1a] hover:bg-[#222222] text-white font-semibold text-xs transition-colors border border-[#2e2e2e] flex items-center justify-center space-x-2 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-[#f54e26]" />
                <span>Open in Full Code Viewer</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
