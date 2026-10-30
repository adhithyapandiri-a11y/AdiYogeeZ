"use client";

import { useMemo } from "react";
import hljs from "highlight.js/lib/common";

export function SourcePreview({
  source,
  path,
}: {
  source: string;
  path: string;
}) {
  const html = useMemo(() => {
    const ext = path.split(".").pop() || "";
    const language =
      (
        {
          ts: "typescript",
          tsx: "typescript",
          jsx: "javascript",
          js: "javascript",
          py: "python",
          md: "markdown",
          yml: "yaml",
          sh: "bash",
          html: "xml",
          svg: "xml",
        } as Record<string, string>
      )[ext] || ext;
    // highlight.js escapes input before adding its own syntax spans.
    return hljs.highlight(source, {
      language: hljs.getLanguage(language) ? language : "plaintext",
    }).value;
  }, [source, path]);
  return (
    <div className="flex overflow-auto rounded-lg border border-slate-800 bg-[#090d16] py-3 text-[11px] leading-6">
      <pre
        aria-hidden="true"
        className="sticky left-0 shrink-0 select-none border-r border-slate-800 bg-[#090d16] px-3 text-right font-mono text-slate-500"
      >
        {source
          .split("\n")
          .map((_, i) => i + 1)
          .join("\n")}
      </pre>
      <pre
        tabIndex={0}
        aria-label={`Source preview of ${path}`}
        className="px-3 font-mono text-slate-300 focus-visible:outline-2 focus-visible:outline-violet-400 [&_.hljs-keyword]:text-violet-300 [&_.hljs-string]:text-emerald-300 [&_.hljs-comment]:text-slate-500 [&_.hljs-title]:text-sky-300 [&_.hljs-number]:text-amber-300 [&_.hljs-tag]:text-rose-300"
      >
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
