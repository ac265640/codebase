// No changes to API_URL or handleResponse

const API_URL = "https://codebase-backend-3xk9.onrender.com";

async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Network response was not ok" }));
    throw new Error(errorData.detail || errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function cloneRepo(repoUrl) {
  const formData = new FormData();
  formData.append("repo_url", repoUrl);
  const response = await fetch(`${API_URL}/clone`, { method: "POST", body: formData });
  return handleResponse(response);
}

export async function listFiles(repoName) {
  const response = await fetch(`${API_URL}/files/${repoName}`);
  return handleResponse(response);
}

export async function readFile(repoName, filePath) {
  const encodedFilePath = encodeURIComponent(filePath);
  const response = await fetch(`${API_URL}/file_content/${repoName}?path=${encodedFilePath}`);
  return handleResponse(response);
}

// This function now just *starts* the embedding process.
export async function createEmbeddings(repoName) {
  const formData = new FormData();
  formData.append("repo_name", repoName);
  const response = await fetch(`${API_URL}/embed`, { method: "POST", body: formData });
  return handleResponse(response);
}

// ✨ CHANGE START: New function to poll for status
export async function getEmbeddingStatus(repoName) {
  const response = await fetch(`${API_URL}/embed-status/${repoName}`);
  return handleResponse(response);
}
// ✨ CHANGE END

export async function chatWithRepo(repoName, question) {
  const formData = new FormData();
  formData.append("repo_name", repoName);
  formData.append("question", question);
  const response = await fetch(`${API_URL}/chat`, { method: "POST", body: formData });
  return handleResponse(response);
}