import json
import re
from typing import List, Dict, Any, Optional
import httpx
from backend.app.config import settings

class LLMService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self.embedding_model = settings.GEMINI_EMBEDDING_MODEL

    async def generate_embedding(self, text: str) -> List[float]:
        """Generates embedding vector for text using Gemini Embedding API."""
        if not self.api_key:
            return [0.0] * 768

        url = f"https://generativelanguage.googleapis.com/v1beta/{self.embedding_model}:embedContent?key={self.api_key}"
        payload = {
            "model": self.embedding_model,
            "content": {
                "parts": [{"text": text[:3000]}]
            }
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("embedding", {}).get("values", [])
        except Exception as e:
            print(f"Embedding error: {e}")
        return [0.0] * 768

    async def generate_chat_response(
        self,
        query: str,
        repo_metadata: Dict[str, Any],
        retrieved_chunks: List[Dict[str, Any]],
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Generates grounded AI response with citations.
        Enforces evidence grounding: if repository evidence is insufficient, explicitly states so.
        """
        context_blocks = []
        for i, chunk in enumerate(retrieved_chunks):
            path = chunk.get("file_path", "unknown")
            start = chunk.get("start_line", 1)
            end = chunk.get("end_line", start + 10)
            code = chunk.get("content", "")
            context_blocks.append(
                f"--- SOURCE #{i+1} [{path}:{start}-{end}] ---\n{code}\n"
            )

        context_str = "\n".join(context_blocks)

        system_instruction = (
            "You are RepoMind AI, an expert codebase intelligence engine. "
            "Your task is to answer developer questions about the repository accurately and concisely.\n\n"
            "CRITICAL RULES:\n"
            "1. Ground your answers strictly in the provided repository sources.\n"
            "2. Whenever you reference logic, functions, or files, cite them with exact markdown tags like `[filepath:start-end]` (e.g. `[src/auth.py:42-58]`).\n"
            "3. If the provided source excerpts do not contain enough evidence to answer confidently, explicitly say: "
            "'Based on the indexed codebase files, there is insufficient evidence to confirm...'\n"
            "4. Never hallucinate or assume dependencies not shown in the source code.\n"
            "5. Provide clear, professional, well-formatted markdown code explanations with code snippets where helpful.\n"
            f"Repository Context: {repo_metadata.get('name', 'Repository')} ({repo_metadata.get('primary_language', '')}).\n"
            f"Description: {repo_metadata.get('description', '')}"
        )

        user_prompt = f"RELEVANT CODE EXCERPTS:\n{context_str}\n\nDEVELOPER QUESTION: {query}"

        contents = []
        if chat_history:
            for msg in chat_history[-6:]:
                role = "user" if msg.get("role") == "user" else "model"
                contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})

        contents.append({"role": "user", "parts": [{"text": user_prompt}]})

        if not self.api_key:
            return {
                "answer": "Gemini API key is not configured. Please set GEMINI_API_KEY in backend/.env to enable grounded AI codebase responses.",
                "citations": []
            }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": contents,
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048
            }
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    raw_text = "".join(p.get("text", "") for p in parts if "text" in p)
                    
                    # Extract citations of form [path:start-end] or [path]
                    citation_matches = re.findall(r'\[([^\]\n]+:\d+(?:-\d+)?)\]', raw_text)
                    citations = []
                    for match in set(citation_matches):
                        parts = match.split(":")
                        f_path = parts[0]
                        lines = parts[1] if len(parts) > 1 else ""
                        s_line, e_line = 1, 1
                        if "-" in lines:
                            try:
                                s_line, e_line = map(int, lines.split("-"))
                            except ValueError:
                                pass
                        elif lines.isdigit():
                            s_line = e_line = int(lines)
                        citations.append({
                            "file_path": f_path,
                            "start_line": s_line,
                            "end_line": e_line
                        })

                    return {
                        "answer": raw_text,
                        "citations": citations
                    }
        except Exception as e:
            return {
                "answer": f"Error communicating with Gemini: {str(e)}",
                "citations": []
            }

        return {
            "answer": "Unable to generate response from repository intelligence engine.",
            "citations": []
        }

    async def explain_commit(self, commit_metadata: Dict[str, Any], diff_summary: str) -> str:
        """Generates clear architectural explanation of a commit."""
        if not self.api_key:
            return "Gemini API key required for AI commit summary."

        prompt = (
            f"Analyze this Git commit from a developer perspective:\n"
            f"Commit Message: {commit_metadata.get('message', '')}\n"
            f"Author: {commit_metadata.get('author', '')}\n"
            f"Changed Files Count: {commit_metadata.get('changed_files_count', 0)}\n\n"
            f"File Diff Summary:\n{diff_summary[:3500]}\n\n"
            "Provide a concise breakdown in markdown with:\n"
            "1. **Core Purpose**: 1-2 sentence summary of what this change achieves.\n"
            "2. **Key Modifications**: Bullet points of specific architectural/logic updates.\n"
            "3. **Impact & Risks**: Any potential breaking changes or regression areas."
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.2}
                })
                resp.raise_for_status()
                parts = resp.json().get("candidates", [])[0].get("content", {}).get("parts", [])
                return "".join(p.get("text", "") for p in parts if "text" in p)
        except Exception as e:
            return f"Failed to generate commit explanation: {str(e)}"

    async def generate_contribution_roadmap(
        self, 
        issue: Dict[str, Any], 
        relevant_files: List[str],
        symbols_context: str,
        beginner_mode: bool = False
    ) -> Dict[str, Any]:
        """Generates a structured, evidence-grounded contribution roadmap for an issue."""
        mode_instruction = (
            "Explain concepts simply with clear beginner-friendly context and prerequisites." 
            if beginner_mode else 
            "Provide a deep architectural analysis for experienced contributors."
        )

        prompt = (
            f"You are RepoMind Contribution Assistant. A developer wants to contribute to this repository issue.\n\n"
            f"ISSUE #{issue.get('number')}: {issue.get('title')}\n"
            f"ISSUE DESCRIPTION:\n{issue.get('body', '')[:2000]}\n\n"
            f"RELEVANT REPOSITORY FILES:\n{', '.join(relevant_files[:15])}\n\n"
            f"RELEVANT SYMBOLS & DEPENDENCIES:\n{symbols_context[:2000]}\n\n"
            f"Tone/Audience: {mode_instruction}\n\n"
            "Return a strictly valid JSON object with the following schema:\n"
            "{\n"
            '  "issue_summary": "1-2 sentence high-level summary of the issue.",\n'
            '  "problem_cause": "Hypothesized technical cause based on code structure.",\n'
            '  "affected_modules": ["module1", "module2"],\n'
            '  "target_files": [{"file_path": "path", "reason": "why to touch this file"}],\n'
            '  "investigation_steps": ["step 1", "step 2", "step 3"],\n'
            '  "implementation_plan": ["step 1", "step 2", "step 3", "step 4"],\n'
            '  "testing_checklist": ["test 1", "test 2"],\n'
            '  "potential_risks": ["risk 1", "risk 2"]\n'
            "}\n"
            "Respond ONLY with the JSON object."
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                resp = await client.post(url, json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
                })
                resp.raise_for_status()
                text = resp.json().get("candidates", [])[0].get("content", {}).get("parts", [])[0].get("text", "{}")
                return json.loads(text)
        except Exception as e:
            return {
                "issue_summary": issue.get("title", ""),
                "problem_cause": "Could not generate automated analysis: " + str(e),
                "affected_modules": [],
                "target_files": [{"file_path": f, "reason": "Matched keyword or import"} for f in relevant_files[:5]],
                "investigation_steps": ["Examine relevant files", "Locate issue reproduction steps"],
                "implementation_plan": ["Draft unit tests", "Implement fix in target file", "Validate changes"],
                "testing_checklist": ["Run existing test suite", "Add regression test"],
                "potential_risks": ["Ensure backward compatibility"]
            }

    async def analyze_impact(
        self,
        proposed_change: str,
        affected_files: List[Dict[str, Any]],
        callers: List[str]
    ) -> Dict[str, Any]:
        """Provides reasoning and testing strategy for impact blast radius."""
        prompt = (
            f"Developer is proposing the following change:\n'{proposed_change}'\n\n"
            f"Graph Analysis Identified Dependent Files:\n{json.dumps(affected_files[:12], indent=2)}\n\n"
            f"Directly Affected Caller Functions: {', '.join(callers[:15])}\n\n"
            "Return a strictly valid JSON object with the following schema:\n"
            "{\n"
            '  "impact_summary": "1-2 sentence summary of expected ripple effects.",\n'
            '  "breaking_risk_assessment": "Low | Medium | High with technical explanation.",\n'
            '  "key_watchouts": ["watchout 1", "watchout 2"],\n'
            '  "recommended_tests": ["test 1", "test 2", "test 3"]\n'
            "}\n"
            "Respond ONLY with the JSON object."
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
                })
                resp.raise_for_status()
                text = resp.json().get("candidates", [])[0].get("content", {}).get("parts", [])[0].get("text", "{}")
                return json.loads(text)
        except Exception as e:
            return {
                "impact_summary": f"Calculated static blast radius across {len(affected_files)} dependent files.",
                "breaking_risk_assessment": "Medium - requires verification of dependent callers.",
                "key_watchouts": ["Verify API contract signatures", "Check caller error handling"],
                "recommended_tests": ["Run integration tests on affected callers", "Validate end-to-end flows"]
            }
