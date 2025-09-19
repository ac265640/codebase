# ✨ CHANGE START: Import BackgroundTasks and create a status dictionary
from fastapi import FastAPI, Form, HTTPException, Query, Request, BackgroundTasks
# ✨ CHANGE END
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import subprocess, os, json, requests
import chromadb
from urllib.parse import unquote

# Load environment variables
load_dotenv()
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

# --- Writable directory for Render ---
DATA_DIR = "/tmp/codebase_data"
REPOS_DIR = os.path.join(DATA_DIR, "repos")
CHROMA_DIR = os.path.join(DATA_DIR, "chroma")
os.makedirs(REPOS_DIR, exist_ok=True)
os.makedirs(CHROMA_DIR, exist_ok=True)

# ✨ CHANGE START: In-memory dictionary to track embedding status
# In a production app, you might use Redis or a database for this
embedding_statuses = {}
# ✨ CHANGE END

# Init FastAPI
app = FastAPI()

# Init ChromaDB client in writable directory
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)

def get_repo_collection(repo_name: str):
    safe_name = repo_name.replace("-", "_")
    return chroma_client.get_or_create_collection(name=safe_name)

# ✅ CORS setup for local + Vercel
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://codebase-eight-kohl.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "🚀 FastAPI backend running"}

# ---------------- ROUTES BELOW ----------------

@app.post("/clone")
def clone_repo(repo_url: str = Form(...)):
    repo_name = repo_url.split("/")[-1].replace(".git", "")
    clone_path = os.path.join(REPOS_DIR, repo_name)

    if os.path.exists(clone_path):
        return {"status": "exists", "path": clone_path, "repo_name": repo_name}

    try:
        subprocess.run(
            ["git", "clone", repo_url, clone_path],
            capture_output=True, text=True, check=True
        )
        return {"status": "success", "path": clone_path, "repo_name": repo_name}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=400, detail=f"Failed to clone repository: {e.stderr}")

@app.get("/files/{repo_name}")
def list_files(repo_name: str):
    repo_path = os.path.join(REPOS_DIR, repo_name)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository not found")
    def get_structure(path):
        structure = []
        for item in sorted(os.listdir(path)):
            item_path = os.path.join(path, item)
            if item.startswith('.') or item == '__pycache__':
                continue
            if os.path.isdir(item_path):
                structure.append({"name": item, "type": "folder", "children": get_structure(item_path)})
            else:
                structure.append({"name": item, "type": "file"})
        return structure
    return {"name": repo_name, "type": "folder", "children": get_structure(repo_path)}

@app.get("/file_content/{repo_name}")
async def read_file(repo_name: str, request: Request):
    path_param = request.query_params.get('path')
    if not path_param:
        raise HTTPException(status_code=400, detail="Missing 'path' query parameter")
    decoded_path = unquote(path_param)
    repo_path = os.path.join(REPOS_DIR, repo_name)
    full_path = os.path.abspath(os.path.join(repo_path, decoded_path))
    if not full_path.startswith(os.path.abspath(repo_path)):
        raise HTTPException(status_code=403, detail="File access forbidden")
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return {"file_path": decoded_path, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

# ✨ CHANGE START: This function now contains the long-running logic.
def run_embedding_process(repo_name: str):
    """This function runs in the background."""
    global embedding_statuses
    repo_path = os.path.join(REPOS_DIR, repo_name)

    try:
        embedding_statuses[repo_name] = {"status": "processing", "progress": "Reading files..."}

        ALLOWED_EXTENSIONS = {".py", ".ipynb", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".java", ".go", ".php", ".rb", ".rs", ".c", ".cpp", ".h", ".cs", ".swift", ".kt", ".scala", ".pl", ".pm", ".t", ".pod", ".r", ".sh", ".ps1", ".bat", ".vbs", ".json", ".xml", ".yaml", ".yml", ".sql", ".env", ".cfg", ".ini", ".toml", ".dockerfile", "docker-compose.yml", ".md", ".txt"}

        file_contents = []
        for root, dirs, files in os.walk(repo_path):
            if '.git' in dirs: dirs.remove('.git')
            for file in files:
                ext = os.path.splitext(file)[1].lower() if os.path.splitext(file)[1] else file.lower()
                if ext not in ALLOWED_EXTENSIONS: continue
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        if ext == ".ipynb":
                            nb = json.load(f)
                            code_cells = ["".join(cell.get("source", [])) for cell in nb.get("cells", []) if cell.get("cell_type") == "code"]
                            content = "\n".join(code_cells)
                        else:
                            content = f.read()
                        if content.strip():
                            file_contents.append({"path": file_path, "content": content})
                except Exception:
                    pass
        
        if not file_contents:
            embedding_statuses[repo_name] = {"status": "complete", "processed_files": 0, "failed_files": []}
            return

        collection = get_repo_collection(repo_name)
        failed_files = []
        batch_size = 96 
        total_files = len(file_contents)

        for i in range(0, total_files, batch_size):
            batch = file_contents[i:i+batch_size]
            docs_batch = [item['content'] for item in batch]
            ids_batch = [item['path'] for item in batch]
            metadatas_batch = [{"path": os.path.relpath(item['path'], repo_path)} for item in batch]
            
            embedding_statuses[repo_name] = {"status": "processing", "progress": f"Embedding batch {i//batch_size + 1}/{(total_files + batch_size - 1)//batch_size}"}

            try:
                res = requests.post(
                    "https://api.cohere.com/v1/embed",
                    headers={"Authorization": f"Bearer {COHERE_API_KEY}"},
                    json={"texts": docs_batch, "model": "embed-english-v3.0", "input_type": "search_document"},
                    timeout=60 # Add a generous timeout for the Cohere API call itself
                )
                res.raise_for_status()
                collection.add(ids=ids_batch, documents=docs_batch, embeddings=res.json()["embeddings"], metadatas=metadatas_batch)
            except requests.exceptions.RequestException as e:
                failed_files.extend([{"path": p, "error": str(e)} for p in ids_batch])
        
        embedding_statuses[repo_name] = {"status": "complete", "processed_files": collection.count(), "failed_files": failed_files}

    except Exception as e:
        embedding_statuses[repo_name] = {"status": "error", "message": str(e)}

@app.post("/embed")
def start_embedding(repo_name: str = Form(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    """This endpoint starts the embedding process in the background and returns immediately."""
    if not COHERE_API_KEY:
        raise HTTPException(status_code=500, detail="COHERE_API_KEY not set")
    repo_path = os.path.join(REPOS_DIR, repo_name)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repo not found")

    embedding_statuses[repo_name] = {"status": "starting"}
    background_tasks.add_task(run_embedding_process, repo_name)
    
    return {"status": "started", "message": f"Embedding process started for {repo_name}."}

@app.get("/embed-status/{repo_name}")
def get_embedding_status(repo_name: str):
    """This endpoint allows the frontend to poll for the status of the embedding job."""
    status = embedding_statuses.get(repo_name)
    if not status:
        raise HTTPException(status_code=404, detail="Embedding status not found for this repository.")
    return status
# ✨ CHANGE END

# ... (The /chat endpoint remains the same)
@app.post("/chat")
def chat_with_repo(repo_name: str = Form(...), question: str = Form(...)):
    if not COHERE_API_KEY:
        raise HTTPException(status_code=500, detail="COHERE_API_KEY not set")
    safe_repo_name = repo_name.replace("-", "_")
    collection = chroma_client.get_or_create_collection(name=safe_repo_name)
    headers = {"Authorization": f"Bearer {COHERE_API_KEY}"}
    try:
        embed_res = requests.post(
            "https://api.cohere.com/v1/embed",
            headers=headers,
            json={
                "texts": [question],
                "model": "embed-english-v3.0",
                "input_type": "search_query"
            }
        )
        embed_res.raise_for_status()
        q_embedding = embed_res.json()["embeddings"][0]
        results = collection.query(query_embeddings=[q_embedding], n_results=5)
        context_docs = results["documents"][0] if results.get("documents") else []
        if not context_docs:
            readme_path = os.path.join(REPOS_DIR, repo_name, "README.md")
            if os.path.exists(readme_path):
                with open(readme_path, "r", encoding="utf-8", errors="ignore") as f:
                    context_docs = [f.read()]
            else:
                context_docs = ["No relevant repository context was found."]
        context = "\n\n---\n\n".join(context_docs)
        prompt = f"""You are an expert software developer AI. Using the following code snippets from the repository as context, please provide a clear and concise answer. If the context is not sufficient, say so. Do not make up information.
        CONTEXT:\n{context}\n\nQUESTION:\n{question}\n\nANSWER:"""
        gen_res = requests.post(
            "https://api.cohere.com/v1/chat",
            headers=headers,
            json={"model": "command-r-plus", "message": prompt, "temperature": 0.2}
        )
        gen_res.raise_for_status()
        answer = gen_res.json().get("text", "Sorry, I couldn't generate a response.")
    except requests.exceptions.RequestException as e:
        error_detail = e.response.json().get('message') if e.response else str(e)
        raise HTTPException(status_code=502, detail=f"Cohere API Error: {error_detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "success", "answer": answer, "sources": results.get("metadatas", [])}