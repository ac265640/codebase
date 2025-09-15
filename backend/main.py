from fastapi import FastAPI, Form, HTTPException, Query, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import subprocess, os, json, requests, logging
import chromadb
from urllib.parse import unquote

# Load env
load_dotenv()
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

# Writable dirs for Render
DATA_DIR = "/tmp/codebase_data"
REPOS_DIR = os.path.join(DATA_DIR, "repos")
CHROMA_DIR = os.path.join(DATA_DIR, "chroma")
os.makedirs(REPOS_DIR, exist_ok=True)
os.makedirs(CHROMA_DIR, exist_ok=True)

# Init FastAPI
app = FastAPI()

# Logging
logging.basicConfig(level=logging.INFO)

# Init Chroma
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)

def get_repo_collection(repo_name: str):
    safe_name = repo_name.replace("-", "_")
    return chroma_client.get_or_create_collection(name=safe_name)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # allow all (safer for frontend testing)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Health check ---
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def home():
    return {"message": "🚀 FastAPI backend running on Render"}

# --- Repo Clone ---
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

# --- File Structure ---
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

# --- File Content ---
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

# --- Background Embed Task ---
def process_embeddings(repo_name: str, repo_path: str, collection):
    ALLOWED_EXTENSIONS = {".py", ".ipynb", ".js", ".jsx", ".ts", ".tsx", ".html", ".css",
                          ".java", ".go", ".php", ".rb", ".rs", ".c", ".cpp", ".h", ".cs",
                          ".swift", ".kt", ".scala", ".pl", ".pm", ".t", ".pod", ".r",
                          ".sh", ".ps1", ".bat", ".vbs", ".json", ".xml", ".yaml", ".yml",
                          ".sql", ".env", ".cfg", ".ini", ".toml", ".dockerfile",
                          "docker-compose.yml", ".md", ".txt"}

    def read_files(path):
        for root, dirs, files in os.walk(path):
            if '.git' in dirs: dirs.remove('.git')
            for file in files:
                ext = os.path.splitext(file)[1].lower() if os.path.splitext(file)[1] else file.lower()
                if ext not in ALLOWED_EXTENSIONS: continue
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        if content.strip():
                            yield file_path, content
                except Exception:
                    continue

    batch_size = 96
    docs_batch, ids_batch, metas_batch = [], [], []

    for path, content in read_files(repo_path):
        docs_batch.append(content)
        ids_batch.append(path)
        metas_batch.append({"path": os.path.relpath(path, repo_path)})
        if len(docs_batch) >= batch_size:
            send_to_cohere(collection, docs_batch, ids_batch, metas_batch)
            docs_batch, ids_batch, metas_batch = [], [], []

    if docs_batch:
        send_to_cohere(collection, docs_batch, ids_batch, metas_batch)

def send_to_cohere(collection, docs, ids, metas):
    try:
        res = requests.post(
            "https://api.cohere.com/v1/embed",
            headers={"Authorization": f"Bearer {COHERE_API_KEY}"},
            json={"texts": docs, "model": "small", "truncate": "END"},
            timeout=60
        )
        res.raise_for_status()
        collection.add(ids=ids, documents=docs, embeddings=res.json()["embeddings"], metadatas=metas)
    except Exception as e:
        logging.error(f"Embed failed: {e}")

@app.post("/embed")
def create_embeddings(background_tasks: BackgroundTasks, repo_name: str = Form(...)):
    repo_path = os.path.join(REPOS_DIR, repo_name)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repo not found")
    collection = get_repo_collection(repo_name)

    background_tasks.add_task(process_embeddings, repo_name, repo_path, collection)
    return {"status": "processing", "message": f"Embedding started for {repo_name}"}

# --- Chat ---
@app.post("/chat")
def chat_with_repo(repo_name: str = Form(...), question: str = Form(...)):
    if not COHERE_API_KEY:
        raise HTTPException(status_code=500, detail="COHERE_API_KEY not set")
    collection = get_repo_collection(repo_name)

    headers = {"Authorization": f"Bearer {COHERE_API_KEY}"}
    try:
        embed_res = requests.post(
            "https://api.cohere.com/v1/embed",
            headers=headers,
            json={"texts": [question], "model": "small"},
            timeout=30
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
        prompt = f"""You are an expert developer AI. 
Use this repository context to answer the question.
CONTEXT:\n{context}\n\nQUESTION:\n{question}\n\nANSWER:"""

        gen_res = requests.post(
            "https://api.cohere.com/v1/chat",
            headers=headers,
            json={"model": "command-r-plus", "message": prompt, "temperature": 0.2},
            timeout=60
        )
        gen_res.raise_for_status()
        answer = gen_res.json().get("text", "Sorry, I couldn't generate a response.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Cohere API Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "success", "answer": answer, "sources": results.get("metadatas", [])}
