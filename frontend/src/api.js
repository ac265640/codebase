const API_URL = "http://127.0.0.1:8000"; // FastAPI backend

export async function cloneRepo(repoUrl) {
  const formData = new FormData();
  formData.append("repo_url", repoUrl);

  const response = await fetch(`${API_URL}/clone`, {
    method: "POST",
    body: formData,
  });
  return await response.json();
}

export async function listFiles(repoName) {
  const response = await fetch(`${API_URL}/files/${repoName}`);
  return await response.json();
}

export async function readFile(repoName, filePath) {
  const response = await fetch(`${API_URL}/file_content/${repoName}/${filePath}`);
  return await response.json();
}
