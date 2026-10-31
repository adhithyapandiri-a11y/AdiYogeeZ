"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  FileCode, 
  CornerDownLeft, 
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  ArrowUpRight
} from "lucide-react";
import { queryChat } from "@/lib/api";
import { ChatMessage, Citation } from "@/lib/types";

interface ChatInterfaceProps {
  repoId: number;
  repoName: string;
  onOpenCitation: (filePath: string, startLine: number, endLine: number) => void;
}

export default function ChatInterface({ repoId, repoName, onOpenCitation }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hello! I am **RepoMind AI**, grounded directly in the indexed source code and AST architecture of **${repoName}**.\n\nYou can query me regarding:\n- Architectural structure, folder hierarchy, and system entry points\n- How authentication, database sessions, or state workflows function\n- Where specific functions, classes, or endpoints are declared\n- How to modify or extend components safely\n\nAll answers strictly cite verified file paths and line ranges.`
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const suggestedQuestions = [
    "Explain the overall architecture and main entry points.",
    "Where is the core business logic implemented?",
    "How does authentication and session handling work?",
    "Which files would I need to modify to add a new API endpoint?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const text = queryText || input;
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInput("");
    setLoading(true);

    try {
      const resp = await queryChat(repoId, text, conversationId);
      setConversationId(resp.conversation_id);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: resp.answer,
        citations: resp.citations
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Error communicating with repository intelligence**: ${err.message || "Failed to retrieve response."}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0d0d0d] text-zinc-100 vsk-grid-bg-subtle">
      {/* Header bar */}
      <div className="h-12 border-b border-[#222222] bg-[#121212]/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-2.5 text-xs font-mono">
          <Sparkles className="w-4 h-4 text-[#f54e26]" />
          <span className="font-bold text-white uppercase tracking-wider">RepoMind AI Assistant</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 font-sans">Strict Codebase Evidence Grounding</span>
        </div>
        <div className="text-[10px] font-mono text-zinc-500 uppercase">
          ENGINE: GEMINI 2.5 FLASH
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start space-x-3.5 max-w-4xl mx-auto ${
              msg.role === "user" ? "flex-row-reverse space-x-reverse" : ""
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                msg.role === "user"
                  ? "bg-[#222222] border border-[#333333] text-white"
                  : "bg-[#f54e26] text-white shadow-[0_0_12px_rgba(245,78,38,0.35)]"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`flex-1 rounded-3xl p-5 text-xs leading-relaxed shadow-xl border ${
                msg.role === "user"
                  ? "bg-[#181818] border-[#2c2c2c] text-white max-w-2xl"
                  : "bg-[#141414] border-[#242424] text-zinc-200"
              }`}
            >
              {/* Markdown Render */}
              <div className="prose prose-invert prose-xs max-w-none space-y-3 font-sans">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      const isInline = !match && !String(children).includes("\n");

                      // Check if inline code looks like a file citation, e.g. [path/file.ts:24-40]
                      const codeStr = String(children);
                      const citationMatch = codeStr.match(/^\[?([^\]:\s]+):(\d+)(?:-(\d+))?\]?$/);

                      if (citationMatch) {
                        const fPath = citationMatch[1];
                        const sLine = parseInt(citationMatch[2], 10);
                        const eLine = citationMatch[3] ? parseInt(citationMatch[3], 10) : sLine;

                        return (
                          <button
                            type="button"
                            onClick={() => onOpenCitation(fPath, sLine, eLine)}
                            className="inline-flex items-center space-x-1 px-2.5 py-0.5 my-0.5 rounded-full bg-[#1c1c1c] hover:bg-[#252525] text-[#f54e26] border border-[#2e2e2e] hover:border-[#f54e26]/60 font-mono text-[11px] transition-all cursor-pointer"
                          >
                            <FileCode className="w-3 h-3 text-[#f54e26]" />
                            <span>{fPath}:{sLine}{eLine !== sLine ? `-${eLine}` : ""}</span>
                          </button>
                        );
                      }

                      if (isInline) {
                        return (
                          <code className="px-2 py-0.5 rounded bg-[#1c1c1c] text-[#f54e26] font-mono text-[11px] border border-[#2a2a2a]" {...props}>
                            {children}
                          </code>
                        );
                      }

                      return (
                        <div className="rounded-2xl overflow-hidden my-3 border border-[#262626] bg-[#0d0d0d]">
                          <div className="px-4 py-1.5 bg-[#141414] border-b border-[#222222] text-[10px] text-zinc-400 font-mono flex items-center justify-between">
                            <span className="uppercase">{match ? match[1] : "code"}</span>
                          </div>
                          <pre className="p-4 overflow-x-auto text-[11px] font-mono leading-relaxed text-zinc-200">
                            <code>{children}</code>
                          </pre>
                        </div>
                      );
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>

              {/* Citations Badges Footer */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-3.5 border-t border-[#222222] flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-semibold mr-1 flex items-center space-x-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#f54e26]" />
                    <span>Evidence Sources:</span>
                  </span>
                  {msg.citations.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => onOpenCitation(c.file_path, c.start_line, c.end_line)}
                      className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#1c1c1c] hover:bg-[#242424] text-zinc-300 hover:text-white border border-[#2a2a2a] hover:border-[#f54e26]/50 text-[11px] font-mono transition-all cursor-pointer"
                    >
                      <span>{c.file_path.split("/").pop()}</span>
                      <span className="text-[#f54e26] font-semibold">L{c.start_line}{c.end_line !== c.start_line ? `-${c.end_line}` : ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start space-x-3.5 max-w-4xl mx-auto">
            <div className="w-8 h-8 rounded-full bg-[#f54e26] flex items-center justify-center text-white shrink-0 shadow-[0_0_12px_rgba(245,78,38,0.35)]">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="rounded-2xl p-4 bg-[#141414] border border-[#262626] text-xs font-mono text-zinc-400 flex items-center space-x-2.5">
              <span className="w-2 h-2 rounded-full bg-[#f54e26] animate-ping"></span>
              <span>Grounding query in repository AST symbols and embeddings...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Pills */}
      {messages.length === 1 && (
        <div className="px-6 py-3 max-w-4xl mx-auto w-full">
          <div className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-widest mb-2 flex items-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-[#f54e26]" />
            <span>Suggested Codebase Inquiries</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="text-left p-3 rounded-2xl bg-[#141414] hover:bg-[#1a1a1a] border border-[#242424] hover:border-[#f54e26]/50 text-xs text-zinc-300 hover:text-white font-sans transition-all truncate cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="p-4 border-t border-[#222222] bg-[#0f0f0f]/95 shrink-0">
        <div className="max-w-4xl mx-auto relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about the codebase (architecture, workflows, functions)..."
            rows={2}
            className="w-full resize-none rounded-2xl bg-[#141414] border border-[#282828] p-4 pr-16 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#f54e26] shadow-xl font-sans"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="absolute right-3.5 p-2.5 rounded-full bg-[#f54e26] hover:bg-[#ff623d] disabled:opacity-30 disabled:cursor-not-allowed text-white shadow-[0_0_15px_rgba(245,78,38,0.3)] transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center text-[10px] font-mono text-zinc-500 mt-2">
          RepoMind AI grounds all reasoning in indexed AST symbols and vector code embeddings. Press Enter to send.
        </div>
      </div>
    </div>
  );
}
