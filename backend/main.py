from fastapi import FastAPI, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import subprocess, os, json, requests

# Load environment variables from .env file
load_dotenv()
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

app = FastAPI()

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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

    if not os.path.exists(clone_path):
        result = subprocess.run(
            ["git", "clone", repo_url, clone_path],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return {"status": "success", "path": clone_path}
        else:
            return {"status": "error", "error": result.stderr}
    else:
        return {"status": "exists", "path": clone_path}

@app.get("/files/{repo_name}")
def list_files(repo_name: str):
    repo_path = os.path.join("repos", repo_name)
    if not os.path.exists(repo_path):
        return JSONResponse(status_code=404, content={"error": "Repository not found"})

    def get_structure(path):
        structure = []
        for item in os.listdir(path):
            item_path = os.path.join(path, item)
            if os.path.isdir(item_path):
                structure.append({
                    "name": item,
                    "type": "folder",
                    "children": get_structure(item_path)
                })
            else:
                structure.append({
                    "name": item,
                    "type": "file",
                })
        return structure

    return {"name": repo_name, "type": "folder", "children": get_structure(repo_path)}

@app.get("/file_content/{repo_name}/{file_path:path}")
def read_file(repo_name: str, file_path: str):
    full_path = os.path.join("repos", repo_name, file_path)
    if not os.path.exists(full_path):
        return JSONResponse(status_code=404, content={"error": "File not found"})

    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    return {"file_path": file_path, "content": content}

@app.post("/embed")
def create_embeddings(repo_name: str = Form(...)):
    if not COHERE_API_KEY:
        return {"status": "error", "error": "COHERE_API_KEY not set"}

    repo_path = os.path.join("repos", repo_name)
    if not os.path.exists(repo_path):
        return {"status": "error", "error": "Repo not found"}

    ALLOWED_EXTENSIONS = {".py", ".ipynb", ".txt", ".md"}

    def read_files(path):
        for root, dirs, files in os.walk(path):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext not in ALLOWED_EXTENSIONS:
                    continue

                file_path = os.path.join(root, file)

                if ext == ".ipynb":
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            nb = json.load(f)
                            code_cells = [
                                "".join(cell.get("source", []))
                                for cell in nb.get("cells", [])
                                if cell.get("cell_type") == "code"
                            ]
                            content = "\n".join(code_cells)
                            if content.strip():
                                yield file_path, content
                    except Exception as e:
                        print(f"Failed to read notebook {file_path}: {e}")
                        continue
                else:
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            if content.strip():
                                yield file_path, content
                    except Exception as e:
                        print(f"Failed to read file {file_path}: {e}")
                        continue

    embeddings = []
    failed_files = []

    for path, content in read_files(repo_path):
        data = {
            "model": "small",  # Cohere free embedding model
            "texts": [content]
        }
        headers = {"Authorization": f"Bearer {COHERE_API_KEY}", "Content-Type": "application/json"}
        try:
            res = requests.post("https://api.cohere.com/v1/embed", headers=headers, json=data)
            if res.status_code == 200:
                emb_vector = res.json()["embeddings"][0]
                embeddings.append({"path": path, "embedding": emb_vector})
            else:
                failed_files.append({"path": path, "error": res.text})
        except Exception as e:
            failed_files.append({"path": path, "error": str(e)})

    return {
        "status": "success" if embeddings else "error",
        "embeddings_count": len(embeddings),
        "failed_files": failed_files
    }
