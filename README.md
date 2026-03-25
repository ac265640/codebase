# CodexAI — Chat with Any GitHub Codebase

> A RAG powered developer tool that lets you clone any GitHub repository and ask natural language questions about it — powered by Cohere embeddings, ChromaDB, and FastAPI.

---

## Problem

When you land on an unfamiliar codebase — whether for a code review, debugging, or onboarding — you waste hours hunting through files just to answer simple questions like *"Where is authentication handled?"* or *"How does the data pipeline work?"*

Traditional search (Ctrl+F, `grep`) is keyword-only and gives you zero understanding of *why* code does what it does.

**CodexAI solves this**: clone a repo, embed it once, then just ask questions — and get answers grounded in the actual code.

---

## Approach

The core pipeline is a classic **RAG (Retrieval-Augmented Generation)** architecture:

```
GitHub Repo → File Parsing → Chunking → Cohere Embeddings
                                              ↓
                                        ChromaDB (vector store)
                                              ↓
User Question → Embed Question → Top-K Retrieval → Cohere LLM → Answer
```

### Stack

| Layer | Technology | Why |
|---|---|---|
| **API** | FastAPI | Async-ready, auto-docs, fast to build |
| **Embeddings** | Cohere `embed-small` | Free tier, good semantic quality for code |
| **Vector Store** | ChromaDB (persistent) | Local, no infra, SQL-like querying |
| **LLM** | Cohere `command-nightly` | Strong instruction-following |
| **Frontend** | React | Component-based, easy file tree rendering |

### API Endpoints

- `POST /clone` — Clone a GitHub repo to local disk
- `GET /files/{repo_name}` — Traverse and return directory tree
- `GET /file_content/{repo_name}/{file_path}` — Read raw file content
- `POST /embed` — Parse all code files, batch-embed (96/batch), store in ChromaDB
- `POST /chat` — Embed question → retrieve top-5 chunks → prompt LLM → return answer + sources

---

## Iterations

### v0 — Proof of Concept
- Hardcoded a single repo path, manually ran embedding once
- Used a single big prompt with all file contents pasted in — hit token limits instantly
- Realised I needed chunking and retrieval, not brute-force context stuffing

### v1 — Basic RAG
- Introduced ChromaDB for vector storage
- Used Cohere embeddings for both documents and queries
- Simple `/embed` + `/chat` flow worked end-to-end for small repos
- **Problem**: No batching — Cohere API has a 96-text-per-request limit, blew up on larger repos

### v2 — Production-Ready Batching + File Type Support
- Added batch processing (96 docs/batch) with proper error handling per batch
- Added support for `.ipynb` (Jupyter notebooks) by extracting only code cells from JSON
- Added fallback to `README.md` if vector retrieval returns no results
- **Bug fixed**: `results = {}` was initialized before the try block, which caused the `sources` field to return empty even on successful queries — moved initialization inside the try block after the actual query

### v3 — Multi-Repo Support
- Each repo gets its own ChromaDB collection (keyed by repo name)
- `/clone` checks for existing clones to avoid re-downloading
- Frontend supports switching between multiple loaded repos

---

## Key Design Choices

**1. ChromaDB over Pinecone/Weaviate**
Kept the stack local and zero-infra. For a dev tool used by one person or a small team, spinning up a cloud vector DB adds latency and cost. ChromaDB's persistent client gives the same semantic search with a single line of setup.

**2. Cohere over OpenAI**
The free tier of Cohere's embedding API is generous enough to embed entire medium-sized codebases without paying. `embed-small` produces 1024-dim vectors — more than sufficient for code similarity.

**3. File-level chunking (not line-level)**
Code files are semantically coherent units. Splitting by line or token would break function context across chunks, worsening retrieval quality. File-level chunks keep logical context intact.

**4. Notebook parsing**
`.ipynb` files are JSON — not plain text. Naively embedding the raw JSON gives terrible results. I extract only `cell_type == "code"` cells and join them, so the embedding represents actual code, not notebook metadata.

**5. RAG fallback chain**
If vector retrieval returns nothing (new repo, sparse embedding), the system falls back to the repo's README for context rather than hallucinating. This prevents confident wrong answers.

---

## Daily Time Commitment

Built over ~2 weeks alongside college coursework. Typical time was **2–3 hours/day** on active build days, with lighter days (~30 min) for debugging and testing.

---

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
echo "COHERE_API_KEY=your_key_here" > .env
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000`, backend on `http://localhost:8000`.

---

## What I'd Build Next

- **Chunk by function/class** using AST parsing (`tree-sitter`) for better retrieval granularity
- **Re-ranking** with Cohere's rerank API before passing context to the LLM
- **Streaming responses** via SSE so answers appear token-by-token
- **Persistent chat history** per repo using a SQLite session store
