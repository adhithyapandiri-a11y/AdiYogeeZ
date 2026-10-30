import os
import re
import ast
from typing import List, Dict, Any, Optional, Set, Tuple
from pathlib import Path

EXTENSION_TO_LANGUAGE = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".h": "C/C++ Header",
    ".hpp": "C++ Header",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".dart": "Dart",
    ".sql": "SQL",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".toml": "TOML",
    ".md": "Markdown",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
}

class ParserService:
    @staticmethod
    def detect_language(file_path: str) -> str:
        ext = Path(file_path).suffix.lower()
        return EXTENSION_TO_LANGUAGE.get(ext, "Plain Text")

    @staticmethod
    def is_source_code(file_path: str) -> bool:
        """Determines if a file should be parsed for code symbols and dependencies."""
        ignored_dirs = {
            "node_modules", ".git", "venv", ".venv", "__pycache__", 
            "dist", "build", ".next", ".nuxt", "coverage", ".turbo",
            "vendor", "target", "out", ".idea", ".vscode"
        }
        parts = Path(file_path).parts
        if any(p in ignored_dirs for p in parts):
            return False

        ext = Path(file_path).suffix.lower()
        code_exts = {
            ".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", 
            ".java", ".cpp", ".c", ".h", ".hpp", ".rb", ".php", 
            ".cs", ".swift", ".kt", ".dart", ".sql"
        }
        return ext in code_exts

    @staticmethod
    def classify_architectural_role(file_path: str, symbols: List[Dict[str, Any]] = None, content: str = "") -> str:
        """
        Classifies file into a definitive architectural role without confusing
        programming language with role. Returns 'Unknown' if uncertain.
        """
        path_lower = file_path.lower()
        base_name = os.path.basename(path_lower)
        symbols = symbols or []

        # 1. Tests
        if any(k in path_lower for k in ["/test/", "/tests/", "__tests__", ".test.", ".spec.", "_test.py", "test_"]):
            return "Test"

        # 2. Configuration & Manifests
        config_files = {
            "package.json", "tsconfig.json", "dockerfile", "makefile", 
            "gemfile", "cargo.toml", "pyproject.toml", "requirements.txt",
            "webpack.config.js", "vite.config.ts", "next.config.js"
        }
        if base_name in config_files or path_lower.endswith((".yaml", ".yml", ".toml", ".env.example", ".config.js", ".config.ts")):
            return "Configuration"

        # 3. Entry Point (root / main entry file)
        entry_names = {"index.js", "index.ts", "main.py", "app.py", "server.js", "server.ts", "main.go", "app.js", "app.ts", "express.js", "main.js", "main.ts"}
        if base_name in entry_names and (path_lower.count("/") <= 1 or path_lower.startswith("src/") or path_lower.startswith("lib/") or path_lower.startswith("cmd/")):
            return "Entry Point"

        # 4. Route / Controller / API Endpoint
        if any(k in path_lower for k in ["route", "router", "controller", "endpoint", "/api/", "handler"]):
            return "Route / Controller"

        # 5. UI Component / Views
        if any(k in path_lower for k in ["component", "view", "page", "screen", "frontend", "ui", "widget"]) or \
           path_lower.endswith((".tsx", ".jsx", ".vue", ".svelte", ".html", ".css", ".scss")):
            return "UI Component"

        # 6. Service / Middleware / Business Logic / Core App
        if any(k in path_lower for k in ["service", "manager", "business", "workflow", "processor", "middleware", "application.js", "app.js", "context", "layer"]):
            return "Service"

        # 7. Model / Entity / Schema / Request / Response
        if any(k in path_lower for k in ["model", "entity", "schema", "types", "dto", "interface", "request.js", "response.js"]):
            return "Model / Entity"

        # 8. Data Repository / Database Storage
        if any(k in path_lower for k in ["repo", "repository", "dao", "db", "database", "store", "migration"]):
            return "Data Repository"

        # 9. Utility / Helper
        if any(k in path_lower for k in ["util", "helper", "common", "shared", "tool", "lib/utils", "support"]):
            return "Utility"

        return "Unknown"

    @staticmethod
    def classify_directory_role(dir_path: str) -> str:
        """Classifies a directory's high-level role for the Project Structure view."""
        p_lower = dir_path.lower()
        if any(k in p_lower for k in ["test", "tests", "__tests__", "spec"]):
            return "Test Suite"
        if any(k in p_lower for k in ["lib", "src/core", "core", "pkg"]):
            return "Core Library"
        if any(k in p_lower for k in ["api", "route", "router", "controller"]):
            return "API & Routing"
        if any(k in p_lower for k in ["component", "components", "view", "views", "page", "pages", "ui"]):
            return "UI Components"
        if any(k in p_lower for k in ["service", "services", "handler", "handlers"]):
            return "Services"
        if any(k in p_lower for k in ["model", "models", "schema", "entity", "db", "database"]):
            return "Data & Storage"
        if any(k in p_lower for k in ["example", "examples", "demo", "sample", "samples"]):
            return "Examples & Demos"
        if any(k in p_lower for k in ["doc", "docs", "guide"]):
            return "Documentation"
        if any(k in p_lower for k in ["util", "utils", "helper", "helpers", "common"]):
            return "Utilities"
        if any(k in p_lower for k in ["config", "scripts", ".github"]):
            return "Configuration & Build"
        return "Unknown"

    @classmethod
    def parse_file(cls, file_path: str, content: str) -> Dict[str, Any]:
        """
        Parses source file content to extract:
        - symbols (functions, classes, methods)
        - imports (raw modules/paths imported with line evidence)
        - calls (invocations found in the body)
        - inherits (class inheritance relationships)
        - api_routes (endpoints defined)
        - data_ops (DB operations detected)
        """
        lang = cls.detect_language(file_path)
        symbols: List[Dict[str, Any]] = []
        imports: List[Dict[str, Any]] = []
        calls: List[Dict[str, Any]] = []
        inherits: List[Dict[str, Any]] = []
        api_routes: List[Dict[str, Any]] = []
        data_ops: List[Dict[str, Any]] = []

        if lang == "Python":
            symbols, imports, calls, inherits, api_routes, data_ops = cls._parse_python(content, file_path)
        else:
            symbols, imports, calls, inherits, api_routes, data_ops = cls._parse_js_ts_and_general(content, file_path, lang)

        return {
            "symbols": symbols,
            "imports": imports,
            "calls": calls,
            "inherits": inherits,
            "api_routes": api_routes,
            "data_ops": data_ops,
            "language": lang,
            "architectural_role": cls.classify_architectural_role(file_path, symbols, content)
        }

    @classmethod
    def _parse_python(cls, content: str, file_path: str):
        symbols: List[Dict[str, Any]] = []
        imports: List[Dict[str, Any]] = []
        calls: List[Dict[str, Any]] = []
        inherits: List[Dict[str, Any]] = []
        api_routes: List[Dict[str, Any]] = []
        data_ops: List[Dict[str, Any]] = []

        try:
            tree = ast.parse(content)
        except Exception:
            return cls._parse_js_ts_and_general(content, file_path, "Python")

        lines = content.splitlines()

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append({
                        "module": alias.name,
                        "line": getattr(node, 'lineno', 1),
                        "snippet": lines[getattr(node, 'lineno', 1) - 1] if lines else f"import {alias.name}"
                    })
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append({
                        "module": node.module,
                        "line": getattr(node, 'lineno', 1),
                        "snippet": lines[getattr(node, 'lineno', 1) - 1] if lines else f"from {node.module} import ..."
                    })
            elif isinstance(node, ast.Call):
                c_name = None
                if isinstance(node.func, ast.Name):
                    c_name = node.func.id
                elif isinstance(node.func, ast.Attribute):
                    c_name = node.func.attr
                if c_name:
                    calls.append({
                        "target_symbol": c_name,
                        "line": getattr(node, 'lineno', 1)
                    })
                    # Check for data operations
                    if c_name in {"execute", "query", "filter", "get", "save", "delete", "commit"}:
                        data_ops.append({
                            "operation": c_name,
                            "line": getattr(node, 'lineno', 1)
                        })

        for item in tree.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                start = item.lineno
                end = getattr(item, 'end_lineno', start)
                snippet = "\n".join(lines[start - 1:end])
                symbols.append({
                    "name": item.name,
                    "symbol_type": "function",
                    "start_line": start,
                    "end_line": end,
                    "source_code": snippet[:1000],
                    "parent_symbol": ""
                })
            elif isinstance(item, ast.ClassDef):
                c_start = item.lineno
                c_end = getattr(item, 'end_lineno', c_start)
                symbols.append({
                    "name": item.name,
                    "symbol_type": "class",
                    "start_line": c_start,
                    "end_line": c_end,
                    "source_code": "\n".join(lines[c_start - 1:min(c_start + 15, c_end)])[:1000],
                    "parent_symbol": ""
                })
                for base in item.bases:
                    if isinstance(base, ast.Name):
                        inherits.append({
                            "child": item.name,
                            "parent": base.id,
                            "line": c_start
                        })
                for sub in item.body:
                    if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        m_start = sub.lineno
                        m_end = getattr(sub, 'end_lineno', m_start)
                        symbols.append({
                            "name": sub.name,
                            "symbol_type": "method",
                            "start_line": m_start,
                            "end_line": m_end,
                            "source_code": "\n".join(lines[m_start - 1:m_end])[:1000],
                            "parent_symbol": item.name
                        })

        return symbols, imports, calls, inherits, api_routes, data_ops

    @classmethod
    def _parse_js_ts_and_general(cls, content: str, file_path: str, lang: str):
        symbols: List[Dict[str, Any]] = []
        imports: List[Dict[str, Any]] = []
        calls: List[Dict[str, Any]] = []
        inherits: List[Dict[str, Any]] = []
        api_routes: List[Dict[str, Any]] = []
        data_ops: List[Dict[str, Any]] = []
        lines = content.splitlines()

        # 1. Imports extraction with line numbers and snippets
        import_patterns = [
            r'import\s+(?:[\w*\s{},]*\s+from\s+)?[\'"]([^\'"]+)[\'"]',
            r'require\([\'"]([^\'"]+)[\'"]\)'
        ]
        for pat in import_patterns:
            for match in re.finditer(pat, content):
                line_no = content[:match.start()].count("\n") + 1
                snippet = lines[line_no - 1] if line_no <= len(lines) else match.group(0)
                imports.append({
                    "module": match.group(1),
                    "line": line_no,
                    "snippet": snippet.strip()
                })

        # 2. Extract function calls
        for match in re.finditer(r'\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(', content):
            func_name = match.group(1)
            if func_name not in {"if", "for", "while", "switch", "catch", "import", "require", "return", "function", "describe", "it", "else"}:
                line_no = content[:match.start()].count("\n") + 1
                calls.append({
                    "target_symbol": func_name,
                    "line": line_no
                })
                # Check for API communication
                if func_name in {"fetch", "axios", "get", "post", "put", "delete", "patch"} and "api" in file_path.lower():
                    api_routes.append({
                        "endpoint": func_name,
                        "line": line_no
                    })
                # Check for data operations
                if func_name in {"query", "find", "findOne", "findById", "save", "insert", "update", "delete", "create"}:
                    data_ops.append({
                        "operation": func_name,
                        "line": line_no
                    })

        # 3. Class patterns & Inheritance
        class_pats = [
            r'^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)(?:\s+extends\s+([A-Za-z0-9_$]+))?(?:\s+implements\s+([A-Za-z0-9_$,\s]+))?',
            r'^\s*(?:export\s+)?interface\s+([A-Za-z0-9_$]+)(?:\s+extends\s+([A-Za-z0-9_$]+))?'
        ]
        for pat in class_pats:
            for match in re.finditer(pat, content, re.MULTILINE):
                name = match.group(1)
                parent_class = match.group(2) if len(match.groups()) >= 2 and match.group(2) else None
                line_no = content[:match.start()].count("\n") + 1
                snippet = "\n".join(lines[line_no - 1:min(line_no + 20, len(lines))])
                symbols.append({
                    "name": name,
                    "symbol_type": "class",
                    "start_line": line_no,
                    "end_line": min(line_no + 30, len(lines)),
                    "source_code": snippet[:1000],
                    "parent_symbol": ""
                })
                if parent_class:
                    inherits.append({
                        "child": name,
                        "parent": parent_class.strip(),
                        "line": line_no
                    })

        # 4. Function & Method patterns
        func_pats = [
            (r'^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(', "function"),
            (r'^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>', "function"),
            (r'^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?function\b', "function"),
            (r'^\s*(?:(?:exports|module\.exports|[A-Za-z0-9_$]+(?:\.prototype)?)\.([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?function\b)', "method"),
            (r'^\s*(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*([A-Za-z0-9_$]+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{', "method")
        ]

        seen_names = set()
        for pat, s_type in func_pats:
            for match in re.finditer(pat, content, re.MULTILINE):
                name = match.group(1)
                if name in seen_names:
                    continue
                if name not in {"if", "for", "while", "switch", "catch", "describe", "it", "require", "import", "return", "else", "function", "class", "get", "set"}:
                    seen_names.add(name)
                    line_no = content[:match.start()].count("\n") + 1
                    snippet = "\n".join(lines[line_no - 1:min(line_no + 25, len(lines))])
                    symbols.append({
                        "name": name,
                        "symbol_type": s_type,
                        "start_line": line_no,
                        "end_line": min(line_no + 25, len(lines)),
                        "source_code": snippet[:1000],
                        "parent_symbol": ""
                    })

        return symbols, imports, calls, inherits, api_routes, data_ops

    @staticmethod
    def resolve_import_path(source_file: str, import_str: str, all_file_paths: Set[str]) -> Optional[str]:
        """
        Resolves relative and module imports to an actual repository file path.
        """
        import_clean = import_str.strip("'\"")
        
        if import_clean in all_file_paths:
            return import_clean

        if import_clean.startswith("."):
            source_dir = os.path.dirname(source_file)
            candidate = os.path.normpath(os.path.join(source_dir, import_clean)).replace("\\", "/")
            
            if candidate in all_file_paths:
                return candidate
                
            for ext in [".ts", ".tsx", ".js", ".jsx", ".py", "/index.ts", "/index.js", "/index.tsx"]:
                with_ext = candidate + ext
                if with_ext in all_file_paths:
                    return with_ext

        base_name = os.path.basename(import_clean)
        for f in all_file_paths:
            if f.endswith(f"/{base_name}.ts") or f.endswith(f"/{base_name}.py") or f.endswith(f"/{base_name}.js"):
                return f

        return None
