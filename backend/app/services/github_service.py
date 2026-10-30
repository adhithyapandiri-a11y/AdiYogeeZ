import os
import re
import base64
from typing import Dict, Any, List, Optional, Tuple
import httpx
from backend.app.config import settings

class GitHubService:
    def __init__(self, token: Optional[str] = None):
        self.token = token or settings.GITHUB_TOKEN
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "RepoMind-Platform"
        }
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    @staticmethod
    def parse_repo_url(url: str) -> Tuple[str, str]:
        """
        Parses github URL or 'owner/repo' into (owner, repo) tuple.
        Supports:
        - https://github.com/owner/repo
        - https://github.com/owner/repo.git
        - git@github.com:owner/repo.git
        - owner/repo
        """
        cleaned = url.strip().rstrip("/")
        if cleaned.endswith(".git"):
            cleaned = cleaned[:-4]
            
        match = re.search(r"github\.com[:/]([^/]+)/([^/]+)", cleaned)
        if match:
            return match.group(1), match.group(2)
            
        parts = cleaned.split("/")
        if len(parts) == 2 and not any(" " in p for p in parts):
            return parts[0], parts[1]
            
        raise ValueError(f"Invalid GitHub repository URL: {url}")

    async def get_repo_details(self, owner: str, repo: str) -> Dict[str, Any]:
        """Fetches repo metadata from GitHub API."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=self.headers)
            if resp.status_code == 404:
                raise ValueError(f"Repository {owner}/{repo} not found or is private.")
            elif resp.status_code == 403:
                raise ValueError("GitHub API rate limit exceeded or access forbidden.")
            resp.raise_for_status()
            data = resp.json()
            return {
                "owner": data.get("owner", {}).get("login", owner),
                "name": data.get("name", repo),
                "github_url": data.get("html_url", f"https://github.com/{owner}/{repo}"),
                "default_branch": data.get("default_branch", "main"),
                "primary_language": data.get("language") or "Unknown",
                "description": data.get("description") or "",
                "stars": data.get("stargazers_count", 0),
                "forks": data.get("forks_count", 0),
                "open_issues_count": data.get("open_issues_count", 0),
                "updated_at": data.get("updated_at")
            }

    async def get_tree(self, owner: str, repo: str, branch: str = "main") -> List[Dict[str, Any]]:
        """Fetches recursive tree of files in the repository."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
            resp = await client.get(url, headers=self.headers)
            if resp.status_code != 200:
                # Try master if main failed
                if branch == "main":
                    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/master?recursive=1"
                    resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            tree_data = resp.json()
            return tree_data.get("tree", [])

    async def get_file_content(self, owner: str, repo: str, file_path: str, branch: str = "main") -> str:
        """Fetches content of a single file."""
        async with httpx.AsyncClient(timeout=20.0) as client:
            url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}?ref={branch}"
            resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            data = resp.json()
            if "content" in data and data.get("encoding") == "base64":
                raw_bytes = base64.b64decode(data["content"])
                return raw_bytes.decode("utf-8", errors="replace")
            elif "download_url" in data and data["download_url"]:
                down_resp = await client.get(data["download_url"])
                return down_resp.text
            return ""

    async def get_commits(self, owner: str, repo: str, per_page: int = 30) -> List[Dict[str, Any]]:
        """Fetches recent commits."""
        async with httpx.AsyncClient(timeout=20.0) as client:
            url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page={per_page}"
            resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            commits = resp.json()
            result = []
            for c in commits:
                author_info = c.get("author") or {}
                commit_info = c.get("commit") or {}
                result.append({
                    "sha": c.get("sha", "")[:8],
                    "full_sha": c.get("sha", ""),
                    "author": commit_info.get("author", {}).get("name", "Unknown"),
                    "author_avatar": author_info.get("avatar_url", ""),
                    "date": commit_info.get("author", {}).get("date"),
                    "message": commit_info.get("message", ""),
                    "url": c.get("html_url", "")
                })
            return result

    async def get_commit_details(self, owner: str, repo: str, commit_sha: str) -> Dict[str, Any]:
        """Fetches single commit diff and file stats."""
        async with httpx.AsyncClient(timeout=20.0) as client:
            url = f"https://api.github.com/repos/{owner}/{repo}/commits/{commit_sha}"
            resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            data = resp.json()
            files = []
            for f in data.get("files", []):
                files.append({
                    "filename": f.get("filename"),
                    "status": f.get("status"),
                    "additions": f.get("additions", 0),
                    "deletions": f.get("deletions", 0),
                    "changes": f.get("changes", 0),
                    "patch": f.get("patch", "")
                })
            return {
                "sha": data.get("sha", ""),
                "message": data.get("commit", {}).get("message", ""),
                "author": data.get("commit", {}).get("author", {}).get("name", "Unknown"),
                "date": data.get("commit", {}).get("author", {}).get("date"),
                "stats": data.get("stats", {}),
                "files": files
            }

    async def get_issues(self, owner: str, repo: str, state: str = "open", per_page: int = 20) -> List[Dict[str, Any]]:
        """Fetches issues from repo."""
        async with httpx.AsyncClient(timeout=20.0) as client:
            url = f"https://api.github.com/repos/{owner}/{repo}/issues?state={state}&per_page={per_page}"
            resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            items = resp.json()
            issues = []
            for it in items:
                # Exclude Pull Requests (GitHub issues API returns PRs as issues with 'pull_request' key)
                if "pull_request" in it:
                    continue
                issues.append({
                    "number": it.get("number"),
                    "title": it.get("title"),
                    "body": it.get("body") or "",
                    "user": it.get("user", {}).get("login", "Unknown"),
                    "avatar": it.get("user", {}).get("avatar_url", ""),
                    "state": it.get("state"),
                    "created_at": it.get("created_at"),
                    "labels": [l.get("name") for l in it.get("labels", [])],
                    "comments_count": it.get("comments", 0),
                    "url": it.get("html_url")
                })
            return issues
