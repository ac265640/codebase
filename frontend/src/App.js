import { useState } from "react";
import { cloneRepo, listFiles, readFile } from "./api";
import {
  Button,
  TextField,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialLight } from "react-syntax-highlighter/dist/esm/styles/prism";

// Helper function to map file extensions to languages
const getLanguage = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  switch (ext) {
    case "py":
      return "python";
    case "js":
      return "javascript";
    case "ts":
      return "typescript";
    case "jsx":
      return "jsx";
    case "tsx":
      return "tsx";
    case "html":
      return "html";
    case "css":
      return "css";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "java":
      return "java";
    default:
      return "text";
  }
};

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [repoName, setRepoName] = useState("");
  const [files, setFiles] = useState([]);
  const [fileContent, setFileContent] = useState("");
  const [currentFile, setCurrentFile] = useState("");

  const handleClone = async () => {
    const res = await cloneRepo(repoUrl);
    if (res.status === "success" || res.status === "exists") {
      const name = repoUrl.split("/").pop().replace(".git", "");
      setRepoName(name);
      const filesRes = await listFiles(name);
      setFiles(filesRes.children);
    } else {
      alert("Error cloning repo: " + res.error);
    }
  };

  const handleFileClick = async (path) => {
    const res = await readFile(repoName, path);
    setFileContent(res.content);
    setCurrentFile(path);
  };

  const renderFiles = (items, parentPath = "") =>
    items.map((item) => {
      const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
      if (item.type === "folder") {
        return (
          <Box key={fullPath} sx={{ ml: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              {item.name}
            </Typography>
            {renderFiles(item.children, fullPath)}
          </Box>
        );
      } else {
        return (
          <ListItem
            key={fullPath}
            button
            onClick={() => handleFileClick(fullPath)}
            sx={{ pl: 4 }}
          >
            <ListItemText primary={item.name} />
          </ListItem>
        );
      }
    });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🚀 Codebase Companion
      </Typography>

      <Box sx={{ display: "flex", mb: 2 }}>
        <TextField
          label="GitHub Repo URL"
          variant="outlined"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          sx={{ width: 400, mr: 2 }}
        />
        <Button variant="contained" onClick={handleClone}>
          Clone Repository
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2 }}>
        <Paper
          sx={{ width: 300, maxHeight: "70vh", overflowY: "auto", p: 1 }}
        >
          <Typography variant="h6">Files</Typography>
          <Divider sx={{ mb: 1 }} />
          <List dense>{renderFiles(files)}</List>
        </Paper>

        <Paper
          sx={{ flex: 1, p: 2, maxHeight: "70vh", overflowY: "auto" }}
        >
          <Typography variant="h6">File Content</Typography>
          <Divider sx={{ mb: 1 }} />
          {fileContent ? (
            <SyntaxHighlighter
              language={getLanguage(currentFile)}
              style={materialLight}
              showLineNumbers
            >
              {fileContent}
            </SyntaxHighlighter>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Click a file to view its content
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default App;
