from fastapi import FastAPI, Form
from fastapi.responses import JSONResponse
import subprocess, os, requests

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

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
    repo_path = os.path.join("repos", repo_name)
    if not os.path.exists(repo_path):
        return {"status": "error", "error": "Repo not found"}

    # Read all files recursively
    def read_files(path):
        for root, dirs, files in os.walk(path):
            for file in files:
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    yield file_path, f.read()

    # Generate embeddings using DeepSeek REST API
    headers = {"Authorization": f"Bearer {process.env.DEEPSEEK_API_KEY}"}

    embeddings = []
    for path, content in read_files(repo_path):
        data = {"text": content}
        res = requests.post(process.env.DEEPSEEK_API_URL, json=data, headers=headers)
        if res.status_code == 200:
            emb_vector = res.json().get("embedding")
            embeddings.append({"path": path, "embedding": emb_vector})
        else:
            return {"status": "error", "error": f"Failed for {path}"}

    return {"status": "success", "embeddings_count": len(embeddings)}
