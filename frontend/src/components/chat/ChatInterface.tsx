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
  HelpCircle
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
      content: `Hello! I am **RepoMind AI**, grounded in the indexed code and architecture of **${repoName}**.\n\nYou can ask me about:\n- System architecture and entry points\n- How authentication or data flows work\n- Where specific functions or models are implemented\n- How to modify or extend a feature\n\nAll answers cite specific repository files and line numbers.`
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
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-[#090d16] text-slate-100">
      {/* Header bar */}
      <div className="h-12 border-b border-white/10 bg-[#0c121e]/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 text-xs">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="font-semibold text-slate-200">RepoMind Grounded AI Assistant</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">Strict Codebase Evidence Grounding</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Model: Gemini 2.5 Flash
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
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`flex-1 rounded-2xl p-4.5 text-xs leading-relaxed shadow-xl border ${
                msg.role === "user"
                  ? "bg-indigo-600/20 border-indigo-500/30 text-slate-100 max-w-2xl"
                  : "bg-[#0f172a]/90 border-white/10 text-slate-200"
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
                            className="inline-flex items-center space-x-1 px-2 py-0.5 my-0.5 rounded-md bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 font-mono text-[11px] transition-colors cursor-pointer"
                          >
                            <FileCode className="w-3 h-3 text-violet-400" />
                            <span>{fPath}:{sLine}{eLine !== sLine ? `-${eLine}` : ""}</span>
                          </button>
                        );
                      }

                      if (isInline) {
                        return (
                          <code className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px] border border-white/5" {...props}>
                            {children}
                          </code>
                        );
                      }

                      return (
                        <div className="rounded-xl overflow-hidden my-3 border border-white/10 bg-[#090d16]">
                          <div className="px-3 py-1 bg-slate-900 border-b border-white/5 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                            <span>{match ? match[1] : "code"}</span>
                          </div>
                          <pre className="p-3 overflow-x-auto text-[11px] font-mono leading-relaxed text-slate-200">
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
                <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1 flex items-center space-x-1">
                    <FileCode className="w-3 h-3 text-violet-400" />
                    <span>Evidence Sources:</span>
                  </span>
                  {msg.citations.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => onOpenCitation(c.file_path, c.start_line, c.end_line)}
                      className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[11px] font-mono transition-colors"
                    >
                      <span>{c.file_path.split("/").pop()}</span>
                      <span className="text-indigo-400 font-semibold">L{c.start_line}{c.end_line !== c.start_line ? `-${c.end_line}` : ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start space-x-3.5 max-w-4xl mx-auto">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="rounded-2xl p-4 bg-[#0f172a]/90 border border-white/10 text-xs text-slate-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
              <span>Grounding query in repository AST and embeddings...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Pills */}
      {messages.length === 1 && (
        <div className="px-6 py-2 max-w-4xl mx-auto w-full">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Suggested Repository Questions</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-indigo-500/30 text-xs text-slate-300 transition-all truncate"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="p-4 border-t border-white/10 bg-[#0c121e]/90 shrink-0">
        <div className="max-w-4xl mx-auto relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about the codebase (architecture, workflows, functions)..."
            rows={2}
            className="w-full resize-none rounded-2xl bg-slate-900/90 border border-white/10 p-3.5 pr-14 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 shadow-2xl"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="absolute right-3.5 p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center text-[10px] text-slate-500 mt-2">
          RepoMind AI grounds all reasoning in indexed AST symbols and vector code embeddings. Press Enter to send, Shift+Enter for newline.
        </div>
      </div>
    </div>
  );
}
