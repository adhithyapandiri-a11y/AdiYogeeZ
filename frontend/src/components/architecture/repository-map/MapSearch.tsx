"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, FileCode2, Folder, CornerDownLeft, X } from "lucide-react";
import { searchEntries, type Entry } from "./model";

export function MapSearch({
  entries,
  onSelect,
}: {
  entries: Entry[];
  onSelect: (path: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const results = useMemo(
    () => (query.trim() ? searchEntries(entries, query) : []),
    [entries, query],
  );
  const shown = results.slice(0, 60);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", shortcut);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", shortcut);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  function choose(path: string) {
    onSelect(path);
    setQuery("");
    setOpen(false);
    input.current?.focus();
  }
  return (
    <div
      ref={root}
      className="relative flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-400 focus-within:border-violet-400"
    >
      <Search size={15} />
      <input
        ref={input}
        className="w-full min-w-0 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
        aria-label="Search repository map"
        role="combobox"
        aria-expanded={open && !!query.trim()}
        aria-controls={`${id}-results`}
        aria-autocomplete="list"
        aria-activedescendant={
          open && shown[active] ? `${id}-${active}` : undefined
        }
        placeholder="Find a file or folder…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            setOpen(false);
          }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            const next =
              (active + (e.key === "ArrowDown" ? 1 : -1) + shown.length) %
              Math.max(1, shown.length);
            setActive(next);
            document
              .getElementById(`${id}-${next}`)
              ?.scrollIntoView({ block: "nearest" });
          }
          if (e.key === "Enter" && open && shown[active]) {
            e.preventDefault();
            choose(shown[active].path);
          }
        }}
      />
      {query ? (
        <button
          aria-label="Clear map search"
          className="rounded p-1 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-violet-400"
          onClick={() => {
            setQuery("");
            input.current?.focus();
          }}
        >
          <X size={14} />
        </button>
      ) : (
        <kbd className="hidden shrink-0 text-[10px] text-slate-500 sm:block">
          Ctrl / ⌘ K
        </kbd>
      )}
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-lg border border-slate-700 bg-[#0c121e] shadow-xl">
          <div className="border-b border-slate-800 px-3 py-2 text-[11px] text-slate-400">
            {results.length} matches in indexed files and folders
          </div>
          <div
            id={`${id}-results`}
            role="listbox"
            className="max-h-72 overflow-auto p-1"
          >
            {shown.map((entry, i) => (
              <button
                id={`${id}-${i}`}
                key={entry.path}
                role="option"
                aria-selected={active === i}
                className={`flex w-full items-center gap-2 rounded-md p-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-violet-400 ${active === i ? "bg-violet-500/20 text-violet-200" : "text-slate-300 hover:bg-slate-800"}`}
                onPointerMove={() => setActive(i)}
                onClick={() => choose(entry.path)}
              >
                {entry.kind === "folder" ? (
                  <Folder size={15} />
                ) : (
                  <FileCode2 size={15} />
                )}
                <span className="min-w-0 flex-1">
                  <strong className="block font-medium">{entry.name}</strong>
                  <small className="block truncate pt-1 text-[10px] text-slate-400">
                    {entry.path}
                  </small>
                </span>
                {active === i && <CornerDownLeft size={13} />}
              </button>
            ))}
            {!results.length && (
              <p className="p-4 text-xs leading-6 text-slate-400">
                No files match “{query}”. Try part of a path.
              </p>
            )}
          </div>
          <footer className="border-t border-slate-800 p-2 text-[10px] text-slate-400">
            ↑ ↓ navigate · Enter reveal · Escape dismiss
            {results.length > 60 && " · Showing first 60; refine your search"}
          </footer>
        </div>
      )}
    </div>
  );
}
