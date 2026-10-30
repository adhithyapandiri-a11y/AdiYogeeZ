"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Network,
  Boxes,
  MessageSquareCode,
  LoaderCircle,
  GitBranch,
} from "lucide-react";
import { connectRepo, getRepositories, getRepository } from "@/lib/api";
import type { Repository } from "@/lib/types";
import NeuralMap from "@/components/neural/NeuralMap";
import type { ObsidianGraphData } from "@/lib/types";
import preview from "@/components/neural/preview.json";
export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [repoId, setRepoId] = useState<number | null>(null);
  const [recent, setRecent] = useState<Repository[]>([]);
  const mounted = useRef(true);
  const submitting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    getRepositories()
      .then((r) => {
        if (mounted.current)
          setRecent(r.filter((r) => r.indexing_status === "completed"));
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!repoId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    async function poll() {
      try {
        const repo = await getRepository(repoId!);
        if (!active) return;
        failures = 0;
        setStatus(repo.status_message || "Reading repository structure…");
        setProgress(repo.progress_percent ?? null);
        if (repo.indexing_status === "completed") {
          router.push(`/workspace/${repoId}/architecture`);
          return;
        }
        if (repo.indexing_status === "failed") {
          setError(
            repo.status_message ||
              "Repository indexing failed. Check the URL and try again.",
          );
          setBusy(false);
          submitting.current = false;
          setRepoId(null);
          return;
        }
      } catch (e) {
        if (!active) return;
        failures++;
        if (failures >= 3) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not read repository status. Please retry.",
          );
          setBusy(false);
          submitting.current = false;
          setRepoId(null);
          return;
        }
        setStatus("Connection interrupted. Retrying repository status…");
      }
      if (active) timer = setTimeout(poll, 1500);
    }
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [repoId, router]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    let canonical = "";
    try {
      const parsed = new URL(url.trim());
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (
        parsed.protocol !== "https:" ||
        parsed.hostname !== "github.com" ||
        parsed.username ||
        parsed.password ||
        parsed.port ||
        parts.length !== 2 ||
        !parts.every((p) => /^[\w.-]+$/.test(p)) ||
        parts.some((p) => p === "." || p === "..")
      )
        throw new Error();
      canonical = `https://github.com/${parts[0]}/${parts[1].replace(/\.git$/, "")}`;
    } catch {
      setError(
        "Enter a GitHub repository URL, such as https://github.com/owner/repository.",
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    setProgress(null);
    setStatus("Connecting to GitHub…");
    try {
      const result = await connectRepo(canonical);
      if (!mounted.current) return;
      if (result.status === "already_indexed")
        router.push(`/workspace/${result.repo_id}/architecture`);
      else {
        setStatus("Waiting for the repository indexer…");
        setRepoId(result.repo_id);
      }
    } catch (e) {
      if (mounted.current) {
        setError(
          e instanceof Error
            ? e.message
            : "Could not connect. Please try again.",
        );
        setBusy(false);
        submitting.current = false;
      }
    }
  }
  return (
    <main className="repomind-home">
      <header className="home-header">
        <Link href="/" className="home-brand">
          <Network size={28} strokeWidth={1.6} />
          RepoMind
        </Link>
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a
            href="https://github.com/adhithyapandiri-a11y/AdiYogeeZ"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
        <a href="#repository-url" className="home-outline">
          Explore Repository <ArrowRight size={15} />
        </a>
      </header>
      <section className="home-hero">
        <p className="home-eyebrow">YOUR CODEBASE, CONNECTED</p>
        <h1>Understand any codebase.</h1>
        <p className="home-description">
          Transform GitHub repositories into interactive 3D knowledge graphs.
          <br className="desktop-break" /> Explore architecture, discover
          relationships, and understand code with AI.
        </p>
        <form className="home-repo-form" onSubmit={submit} noValidate>
          <label className="home-url">
            <GitBranch size={21} />
            <span className="sr-only">GitHub repository URL</span>
            <input
              id="repository-url"
              type="url"
              placeholder="https://github.com/owner/repository"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
              aria-invalid={!!error}
              aria-describedby={error ? "repo-error" : "repo-help"}
              autoComplete="url"
              spellCheck={false}
            />
          </label>
          <button className="home-primary" disabled={busy} type="submit">
            {busy ? (
              <>
                <LoaderCircle size={16} className="loading-spin" />
                Analyzing repository
              </>
            ) : (
              <>
                Explore Repository <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
        <p id="repo-help" className="home-help">
          Start with a public GitHub repository.
        </p>
        {error && (
          <p id="repo-error" role="alert" className="home-error">
            {error}
          </p>
        )}
        {busy && (
          <div className="home-progress" role="status" aria-live="polite">
            <span>{status}</span>
            {progress !== null && (
              <>
                <progress
                  max={100}
                  value={progress}
                  aria-label="Repository indexing progress"
                />
                <span>{Math.round(progress)}%</span>
              </>
            )}
          </div>
        )}
        {recent.length > 0 && (
          <div className="home-recent">
            <span>Continue exploring</span>
            {recent.slice(0, 3).map((r) => (
              <Link key={r.id} href={`/workspace/${r.id}/architecture`}>
                <GitBranch size={12} />
                {r.owner}/{r.name}
                <ArrowRight size={12} />
              </Link>
            ))}
          </div>
        )}
      </section>
      <section
        className="home-product"
        aria-label="Interactive workspace preview"
      >
        <div className="home-product-header">
          <span>
            <Network size={18} />
            RepoMind <i>/</i> AdiYogeeZ
          </span>
          <span className="home-snapshot">
            Interactive source snapshot · preview
          </span>
        </div>
        <NeuralMap
          data={preview as ObsidianGraphData}
          name="AdiYogeeZ"
          preview
        />
        <p className="home-preview-caption">
          Explore this repository’s source snapshot. Connect a repository above
          to load its current indexed structure and dependencies.
        </p>
      </section>
      <section id="features" className="home-features">
        {[
          {
            icon: Network,
            title: "See the connections.",
            body: "Navigate your repository in three dimensions. Follow files, folders, and detected dependencies.",
          },
          {
            icon: Boxes,
            title: "Find your bearings.",
            body: "Move from the big picture to a single file, with searchable paths and focused inspection.",
          },
          {
            icon: MessageSquareCode,
            title: "Read with context.",
            body: "Open the existing AI workspace to ask questions grounded in your repository’s source.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <article key={title}>
            <Icon size={22} strokeWidth={1.4} />
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>
      <section id="how-it-works" className="home-how">
        <h2>A clear path into unfamiliar code.</h2>
        <p>
          Connect a public repository. Let RepoMind index its source. Explore
          the neural map, inspect a file, and follow the relationships that
          matter.
        </p>
        <a href="#repository-url">
          Explore your repository <ArrowRight size={16} />
        </a>
      </section>
      <footer className="home-footer">
        <Link href="/" className="home-brand">
          <Network size={19} />
          RepoMind
        </Link>
        <span>Make sense of what’s connected.</span>
        <a href="https://github.com/adhithyapandiri-a11y/AdiYogeeZ">
          View on GitHub <ArrowRight size={13} />
        </a>
      </footer>
    </main>
  );
}
