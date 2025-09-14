const API_URL = "http://127.0.0.1:8000";

/**
 * Handles the response from the fetch API, throwing an error if the request was not successful.
 * @param {Response} response The response object from a fetch call.
 * @returns {Promise<any>} The JSON data from the response.
 */
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
  // Sending the file path as a query parameter is more reliable.
  // encodeURIComponent is used to safely handle all special characters.
  const encodedFilePath = encodeURIComponent(filePath);
  const response = await fetch(`${API_URL}/file_content/${repoName}?path=${encodedFilePath}`);
  return handleResponse(response);
}

export async function createEmbeddings(repoName) {
  const formData = new FormData();
  formData.append("repo_name", repoName);
  const response = await fetch(`${API_URL}/embed`, { method: "POST", body: formData });
  return handleResponse(response);
}

export async function chatWithRepo(repoName, question) {
  const formData = new FormData();
  formData.append("repo_name", repoName);
  formData.append("question", question);
  const response = await fetch(`${API_URL}/chat`, { method: "POST", body: formData });
  return handleResponse(response);
}

