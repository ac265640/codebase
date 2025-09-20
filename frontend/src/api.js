const API_URL = "http://127.0.0.1:8000";

/**
 * A helper function to handle API responses and errors.
 * @param {Response} response - The raw response from the fetch call.
 * @returns {Promise<any>} - The JSON data from the response.
 * @throws {Error} - Throws an error if the response is not OK.
 */
async function handleResponse(response) {
  if (response.ok) {
    return await response.json();
  } else {
    const errorData = await response.json();
    // FastAPI validation errors are in `detail`, other errors might be in `error`
    // We also handle cases where the error message might be a nested object
    let errorMessage = "An unknown error occurred.";
    if (typeof errorData.error === 'string') {
        errorMessage = errorData.error;
    } else if (typeof errorData.error === 'object') {
        errorMessage = JSON.stringify(errorData.error);
    } else if (errorData.detail) {
        errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Clones a GitHub repository via the backend.
 * @param {string} repoUrl - The full URL of the GitHub repository.
 * @returns {Promise<any>}
 */
export async function cloneRepo(repoUrl) {
  const formData = new FormData();
  formData.append("repo_url", repoUrl);
  const response = await fetch(`${API_URL}/clone`, {
    method: "POST",
    body: formData,
  });
  const data = await handleResponse(response);
  if (data.status === 'error') throw new Error(data.error);
  return data;
}

/**
 * Triggers the embedding process for a cloned repository.
 * @param {string} repoName - The name of the repository.
 * @returns {Promise<any>}
 */
export async function createEmbeddings(repoName) {
  const formData = new FormData();
  formData.append("repo_name", repoName);
  const response = await fetch(`${API_URL}/embed`, {
    method: "POST",
    body: formData,
  });
  const data = await handleResponse(response);
  if (data.status === 'error') throw new Error(data.error);
  return data;
}

/**
 * Lists the file structure of a repository.
 * @param {string} repoName - The name of the repository.
 * @returns {Promise<any>}
 */
export async function listFiles(repoName) {
  const response = await fetch(`${API_URL}/files/${repoName}`);
  return await handleResponse(response);
}

/**
 * Sends a question to the chat endpoint for a repository.
 * @param {string} repoName - The name of the repository.
 * @param {string} question - The user's question.
 * @returns {Promise<any>}
 */
export async function chatWithRepo(repoName, question) {
  const formData = new FormData();
  formData.append("repo_name", repoName);
  formData.append("question", question);
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    body: formData,
  });
  return await handleResponse(response);
}