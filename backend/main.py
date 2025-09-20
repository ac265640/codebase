from fastapi import FastAPI, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import subprocess
import os
import json
import requests
import chromadb

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
# We allow both localhost and 127.0.0.1 to be safe.
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
            # Ignore .git folder
            if item == ".git":
                continue
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

    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception:
        # Fallback for non-utf8 files
        with open(full_path, "r", encoding="latin-1", errors="ignore") as f:
            content = f.read()
    return {"file_path": file_path, "content": content}


@app.post("/embed")
def create_embeddings(repo_name: str = Form(...)):
    if not COHERE_API_KEY:
        return JSONResponse(status_code=500, content={"status": "error", "error": "COHERE_API_KEY not set"})

    repo_path = os.path.join("repos", repo_name)
    if not os.path.exists(repo_path):
        return JSONResponse(status_code=404, content={"status": "error", "error": "Repo not found"})

    ALLOWED_EXTENSIONS = {".py", ".ipynb", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".java", ".go", ".php", ".rb", ".rs", ".c", ".cpp", ".h", ".cs", ".swift", ".kt", ".scala", ".pl", ".pm", ".t", ".pod", ".r", ".sh", ".ps1", ".bat", ".vbs", ".json", ".xml", ".yaml", ".yml", ".sql", ".env", ".cfg", ".ini", ".toml", ".dockerfile", "docker-compose.yml", ".md", ".txt"}

    def read_files(path):
        for root, dirs, files in os.walk(path):
            # Exclude .git directory
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

    failed_files = []
    collection = get_repo_collection(repo_name)

    # Simple batching
    batch_size = 96  # Cohere's API limit
    docs_batch = []
    ids_batch = []
    metadatas_batch = []

    for path, content in read_files(repo_path):
        docs_batch.append(content)
        ids_batch.append(path)
        metadatas_batch.append({"path": path})

        if len(docs_batch) >= batch_size:
            try:
                # Embed and add the batch
                res = requests.post(
                    "https://api.cohere.com/v1/embed",
                    headers={"Authorization": f"Bearer {COHERE_API_KEY}"},
                    json={"texts": docs_batch, "model": "small", "truncate": "END"}
                )
                res.raise_for_status()  # Raise an exception for bad status codes
                embeddings = res.json()["embeddings"]
                collection.add(
                    ids=ids_batch,
                    documents=docs_batch,
                    embeddings=embeddings,
                    metadatas=metadatas_batch
                )
            except requests.exceptions.RequestException as e:
                print(f"Failed to embed batch: {e}")
                failed_files.extend([{"path": p, "error": str(e)} for p in ids_batch])
            finally:
                # Clear batches
                docs_batch, ids_batch, metadatas_batch = [], [], []

    # Process any remaining files in the last batch
    if docs_batch:
        try:
            res = requests.post(
                "https://api.cohere.com/v1/embed",
                headers={"Authorization": f"Bearer {COHERE_API_KEY}"},
                json={"texts": docs_batch, "model": "small", "truncate": "END"}
            )
            res.raise_for_status()
            embeddings = res.json()["embeddings"]
            collection.add(
                ids=ids_batch,
                documents=docs_batch,
                embeddings=embeddings,
                metadatas=metadatas_batch
            )
        except requests.exceptions.RequestException as e:
            print(f"Failed to embed final batch: {e}")
            failed_files.extend([{"path": p, "error": str(e)} for p in ids_batch])

    return {
        "status": "success",
        "processed_files": collection.count(),
        "failed_files": failed_files
    }


@app.post("/chat")
def chat_with_repo(repo_name: str = Form(...), question: str = Form(...)):
    if not COHERE_API_KEY:
        return JSONResponse(status_code=500, content={"status": "error", "error": "COHERE_API_KEY not set"})

    safe_repo_name = repo_name.replace("-", "_")
    try:
        collection = chroma_client.get_collection(name=safe_repo_name)
        # IMPROVEMENT: Check if the collection is empty
        if collection.count() == 0:
            return JSONResponse(
                status_code=404, 
                content={"status": "error", "error": "This repository has not been embedded or contains no supported files."}
            )
    except ValueError:
        return JSONResponse(status_code=404, content={"status": "error", "error": "Repository not embedded yet."})


    headers = {"Authorization": f"Bearer {COHERE_API_KEY}"}
    results = {}
    try:
        # Step 1: embed user's question
        embed_res = requests.post(
            "https://api.cohere.com/v1/embed",
            headers=headers,
            json={"texts": [question], "model": "small", "input_type": "search_query"}
        )
        embed_res.raise_for_status()
        q_embedding = embed_res.json()["embeddings"][0]

        # Step 2: query top 5 similar chunks
        results = collection.query(query_embeddings=[q_embedding], n_results=5)
        context_docs = results["documents"][0] if results.get("documents") else []

        # Step 3: fallback to README.md if no context found
        if not context_docs:
            readme_path = os.path.join("repos", repo_name, "README.md")
            if os.path.exists(readme_path):
                with open(readme_path, "r", encoding="utf-8", errors="ignore") as f:
                    context_docs = [f.read()]
            else:
                context_docs = ["No relevant repository context was found to answer the question."]

        context = "\n\n---\n\n".join(context_docs)
        
        # Step 4: generate answer from Cohere
        prompt = f"""
        You are an expert software developer AI. A user is asking a question about a codebase.
        Using the following code snippets from the repository as context, please provide a clear and concise answer.
        If the context is not sufficient, say so. Do not make up information.

        CONTEXT:
        {context}

        QUESTION:
        {question}

        ANSWER:
        """
        gen_res = requests.post(
            "https://api.cohere.com/v1/chat",
            headers=headers,
            json={
                "model": "command-nightly",
                "message": prompt,
                "temperature": 0.2
            }
        )
        gen_res.raise_for_status()
        answer = gen_res.json().get("text", "Sorry, I couldn't generate a response.")

    # IMPROVEMENT: More detailed error logging
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Cohere API request failed: {e}")
        error_details = "An unknown network error occurred."
        if e.response is not None:
            error_details = e.response.text
            print(f"ERROR DETAILS: {error_details}")
        return JSONResponse(status_code=502, content={"status": "error", "error": error_details})
    
    except Exception as e:
        print(f"ERROR: An unexpected error occurred: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "error": str(e)})

    return {"status": "success", "answer": answer, "sources": results.get("metadatas", [])}