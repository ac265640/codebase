from fastapi import FastAPI, Form, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import subprocess, os, json, requests
import chromadb
from chromadb.utils import embedding_functions
from urllib.parse import unquote

# Load environment variables
load_dotenv()
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

# Init FastAPI
app = FastAPI()

# Init ChromaDB client (persistent storage in ./chroma)
chroma_client = chromadb.PersistentClient(path="./chroma")

def get_repo_collection(repo_name: str):
    """Get or create a Chroma collection for a repo"""
    safe_name = repo_name.replace("-", "_")
    return chroma_client.get_or_create_collection(name=safe_name)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "🚀 FastAPI backend running"}

@app.post("/clone")
def clone_repo(repo_url: str = Form(...)):
    repo_name = repo_url.split("/")[-1].replace(".git", "")
    clone_path = os.path.join("repos", repo_name)

    if not os.path.exists("repos"):
        os.makedirs("repos")

    if os.path.exists(clone_path):
        return {"status": "exists", "path": clone_path, "repo_name": repo_name}

    try:
        subprocess.run(
            ["git", "clone", repo_url, clone_path],
            capture_output=True,
            text=True,
            check=True
        )
        return {"status": "success", "path": clone_path, "repo_name": repo_name}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=400, detail=f"Failed to clone repository: {e.stderr}")


@app.get("/files/{repo_name}")
def list_files(repo_name: str):
    repo_path = os.path.join("repos", repo_name)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository not found")

    def get_structure(path):
        structure = []
        for item in sorted(os.listdir(path)):
            item_path = os.path.join(path, item)
            if item.startswith('.') or item == '__pycache__':
                continue
            if os.path.isdir(item_path):
                structure.append({
                    "name": item,
                    "type": "folder",
                    "children": get_structure(item_path)
                })
            else:
                structure.append({"name": item, "type": "file"})
        return structure

    return {"name": repo_name, "type": "folder", "children": get_structure(repo_path)}


@app.get("/file_content/{repo_name}")
async def read_file(repo_name: str, request: Request):
    """
    Reads file content. The file path is passed as a query parameter and manually decoded.
    This is the most reliable way to handle file paths with subdirectories.
    """
    path_param = request.query_params.get('path')
    if not path_param:
        raise HTTPException(status_code=400, detail="Missing 'path' query parameter")

    decoded_path = unquote(path_param)
    repo_path = os.path.join("repos", repo_name)
    
    # Security check: prevent directory traversal attacks
    full_path = os.path.abspath(os.path.join(repo_path, decoded_path))
    if not full_path.startswith(os.path.abspath(repo_path)):
        raise HTTPException(status_code=403, detail="File access forbidden")

    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        # This debug print will show in your terminal if the file can't be found
        print(f"DEBUG: File not found at path: {full_path}")
        raise HTTPException(status_code=404, detail="File not found")

    try:
        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return {"file_path": decoded_path, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@app.post("/embed")
def create_embeddings(repo_name: str = Form(...)):
    if not COHERE_API_KEY:
        raise HTTPException(status_code=500, detail="COHERE_API_KEY not set")

    repo_path = os.path.join("repos", repo_name)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repo not found")

    ALLOWED_EXTENSIONS = {".py", ".ipynb", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".java", ".go", ".php", ".rb", ".rs", ".c", ".cpp", ".h", ".cs", ".swift", ".kt", ".scala", ".pl", ".pm", ".t", ".pod", ".r", ".sh", ".ps1", ".bat", ".vbs", ".json", ".xml", ".yaml", ".yml", ".sql", ".env", ".cfg", ".ini", ".toml", ".dockerfile", "docker-compose.yml", ".md", ".txt"}

    def read_files(path):
        for root, dirs, files in os.walk(path):
            if '.git' in dirs:
                dirs.remove('.git')
            for file in files:
                ext = os.path.splitext(file)[1].lower() if os.path.splitext(file)[1] else file.lower()
                if ext not in ALLOWED_EXTENSIONS:
                    continue
                file_path = os.path.join(root, file)
                if ext == ".ipynb":
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            nb = json.load(f)
                            code_cells = ["".join(cell.get("source", [])) for cell in nb.get("cells", []) if cell.get("cell_type") == "code"]
                            content = "\n".join(code_cells)
                            if content.strip(): yield file_path, content
                    except Exception as e:
                        print(f"Failed to read notebook {file_path}: {e}")
                else:
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            if content.strip(): yield file_path, content
                    except Exception as e:
                        print(f"Failed to read file {file_path}: {e}")

    failed_files = []
    collection = get_repo_collection(repo_name)
    batch_size = 96
    docs_batch, ids_batch, metadatas_batch = [], [], []

    for path, content in read_files(repo_path):
        docs_batch.append(content)
        ids_batch.append(path)
        metadatas_batch.append({"path": os.path.relpath(path, repo_path)})
        if len(docs_batch) >= batch_size:
            try:
                res = requests.post("https://api.cohere.com/v1/embed", headers={"Authorization": f"Bearer {COHERE_API_KEY}"}, json={"texts": docs_batch, "model": "small", "truncate": "END"})
                res.raise_for_status()
                collection.add(ids=ids_batch, documents=docs_batch, embeddings=res.json()["embeddings"], metadatas=metadatas_batch)
            except requests.exceptions.RequestException as e:
                failed_files.extend([{"path": p, "error": str(e)} for p in ids_batch])
            finally:
                docs_batch, ids_batch, metadatas_batch = [], [], []
    
    if docs_batch:
        try:
            res = requests.post("https://api.cohere.com/v1/embed", headers={"Authorization": f"Bearer {COHERE_API_KEY}"}, json={"texts": docs_batch, "model": "small", "truncate": "END"})
            res.raise_for_status()
            collection.add(ids=ids_batch, documents=docs_batch, embeddings=res.json()["embeddings"], metadatas=metadatas_batch)
        except requests.exceptions.RequestException as e:
            failed_files.extend([{"path": p, "error": str(e)} for p in ids_batch])

    return {"status": "success", "processed_files": collection.count(), "failed_files": failed_files}

# ----------- CHAT ENDPOINT -----------
@app.post("/chat")
def chat_with_repo(repo_name: str = Form(...), question: str = Form(...)):
    if not COHERE_API_KEY:
        raise HTTPException(status_code=500, detail="COHERE_API_KEY not set")

    safe_repo_name = repo_name.replace("-", "_")
    collection = chroma_client.get_or_create_collection(name=safe_repo_name)

    headers = {"Authorization": f"Bearer {COHERE_API_KEY}"}
    
    try:
        embed_res = requests.post("https://api.cohere.com/v1/embed", headers=headers, json={"texts": [question], "model": "small"})
        embed_res.raise_for_status()
        q_embedding = embed_res.json()["embeddings"][0]

        results = collection.query(query_embeddings=[q_embedding], n_results=5)
        context_docs = results["documents"][0] if results.get("documents") else []

        if not context_docs:
            readme_path = os.path.join("repos", repo_name, "README.md")
            if os.path.exists(readme_path):
                with open(readme_path, "r", encoding="utf-8", errors="ignore") as f:
                    context_docs = [f.read()]
            else:
                context_docs = ["No relevant repository context was found to answer the question."]

        context = "\n\n---\n\n".join(context_docs)
        
        prompt = f"""You are an expert software developer AI. A user is asking a question about a codebase.
        Using the following code snippets from the repository as context, please provide a clear and concise answer.
        If the context is not sufficient, say so. Do not make up information.

        CONTEXT:
        {context}

        QUESTION:
        {question}

        ANSWER:"""
        
        gen_res = requests.post("https://api.cohere.com/v1/chat", headers=headers, json={"model": "command-r-plus", "message": prompt, "temperature": 0.2})
        gen_res.raise_for_status()
        answer = gen_res.json().get("text", "Sorry, I couldn't generate a response.")

    except requests.exceptions.RequestException as e:
        error_detail = e.response.json().get('message') if e.response else str(e)
        raise HTTPException(status_code=502, detail=f"Cohere API Error: {error_detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "success", "answer": answer, "sources": results.get("metadatas", [])}

