import { useState, useEffect, useRef } from "react";
import { cloneRepo, createEmbeddings, chatWithRepo, listFiles } from "./api";
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
    CircularProgress,
    Chip,
    Avatar,
    Card,
    CardContent,
    Alert,
    CssBaseline
} from "@mui/material";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { SmartToy, AccountCircle } from '@mui/icons-material';
import { motion } from 'framer-motion';
import './App.css'; // For custom scrollbar and new styles

// A sleek, dark theme
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#76e4f7', // Light blue
        },
        secondary: {
            main: '#f7d976', // A complementary gold/yellow
        },
        background: {
            default: 'transparent', // Make default background transparent to see body animation
            paper: 'rgba(20, 20, 30, 0.8)', // Semi-transparent dark blueish paper
        },
        text: {
            primary: '#f0f0f0',
            secondary: '#a0a0a0',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 700,
        },
    },
});

function App() {
    // State for repository handling
    const [repoUrl, setRepoUrl] = useState("");
    const [repoName, setRepoName] = useState("");
    const [files, setFiles] = useState([]);
    // State for UI and messaging
    const [status, setStatus] = useState("idle"); // idle, cloning, embedding, ready, error
    const [errorMessage, setErrorMessage] = useState("");
    const [chatLoading, setChatLoading] = useState(false);

    // State for chat
    const [question, setQuestion] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const chatEndRef = useRef(null);

    // Auto-scroll to the latest message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const handleCloneAndEmbed = async () => {
        setFiles([]);
        setChatHistory([]);
        setErrorMessage("");

        try {
            setStatus("cloning");
            const cloneRes = await cloneRepo(repoUrl);
            const name = cloneRes.path.split('/').pop(); // Extract repo name from path
            setRepoName(name);

            const filesRes = await listFiles(name);
            setFiles(filesRes.children);

            setStatus("embedding");
            await createEmbeddings(name);
            setStatus("ready");
            setChatHistory([{
                sender: 'ai',
                text: `Repository '${name}' is ready. Ask me anything about the codebase.`
            }]);

        } catch (error) {
            setStatus("error");
            const errorDetails = error.response?.data?.error || "An unknown error occurred.";
            setErrorMessage(errorDetails);
            console.error(error);
        }
    };

    const handleChat = async () => {
        if (!question.trim() || !repoName) return;

        const userMessage = { sender: 'user', text: question };
        setChatHistory(prev => [...prev, userMessage]);
        setQuestion("");
        setChatLoading(true);

        try {
            const res = await chatWithRepo(repoName, question);
            const aiMessage = { sender: 'ai', text: res.answer, sources: res.sources };
            setChatHistory(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorText = error.response?.data?.error || `Sorry, something went wrong.`;
            const errorMessage = { sender: 'ai', text: errorText };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setChatLoading(false);
        }
    };

    const renderFiles = (items, parentPath = "") =>
        items.map((item) => {
            const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
            if (item.type === "folder") {
                return (
                    <Box key={fullPath} sx={{ ml: 2, my: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: darkTheme.palette.text.secondary }}>
                            {item.name}/
                        </Typography>
                        {renderFiles(item.children, fullPath)}
                    </Box>
                );
            } else {
                return (
                    <ListItem key={fullPath} dense sx={{ pl: 4, py: 0 }}>
                        <ListItemText primary={item.name} primaryTypographyProps={{ variant: 'body2', color: darkTheme.palette.text.primary }} />
                    </ListItem>
                );
            }
        });

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Box sx={{ p: 3, minHeight: '100vh', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom className="app-title">
                    Codebase Companion
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3, maxWidth: '600px', mx: 'auto' }}>
                    Your AI-powered developer assistant. Paste a public GitHub repository URL, click "Clone & Embed," and start asking questions about the code.
                </Typography>

                <Paper sx={{ p: 2, mb: 2, background: 'rgba(20, 20, 30, 0.8)', backdropFilter: 'blur(10px)', maxWidth: '800px', mx: 'auto', width: '100%' }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <TextField
                            label="GitHub Repository URL"
                            variant="outlined"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            fullWidth
                            sx={{ mr: 2 }}
                            disabled={status === 'cloning' || status === 'embedding'}
                            className="repo-input"
                        />
                        <Button
                            variant="contained"
                            onClick={handleCloneAndEmbed}
                            disabled={status === 'cloning' || status === 'embedding'}
                            sx={{ height: '56px', whiteSpace: 'nowrap' }}
                            className="clone-button"
                        >
                            {status === 'cloning' || status === 'embedding' ? <CircularProgress size={24} sx={{ color: 'white', mr: 1 }} /> : null}
                            {status === 'cloning' ? 'Cloning...' : (status === 'embedding' ? 'Embedding...' : 'Clone & Embed')}
                        </Button>
                    </Box>
                    {status === 'error' && <Alert severity="error" sx={{ mt: 2 }}>{errorMessage}</Alert>}
                </Paper>

                <Box sx={{ display: "flex", gap: 2, flex: 1, overflow: 'hidden', textAlign: 'left' }}>
                    {/* Left Panel: File Explorer */}
                    <Paper sx={{ width: 350, overflowY: "auto", p: 2, background: 'rgba(20, 20, 30, 0.8)', backdropFilter: 'blur(10px)' }}>
                        <Typography variant="h6">File Explorer</Typography>
                        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
                        {files.length > 0 ? (
                            <List dense>{renderFiles(files)}</List>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, p: 1 }}>
                                {status === 'idle' && 'Clone a repository to see its file structure.'}
                                {status === 'cloning' && 'Cloning repository...'}
                                {status === 'embedding' && 'Processing files...'}
                            </Typography>
                        )}
                    </Paper>

                    {/* Right Panel: Chat */}
                    <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(20, 20, 30, 0.8)', backdropFilter: 'blur(10px)' }}>
                        <CardContent sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                            {chatHistory.map((msg, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Box sx={{ display: 'flex', my: 2, alignItems: 'flex-start' }}>
                                        <Avatar sx={{ bgcolor: msg.sender === 'ai' ? darkTheme.palette.primary.main : darkTheme.palette.secondary.main, mr: 2 }}>
                                            {msg.sender === 'ai' ? <SmartToy /> : <AccountCircle />}
                                        </Avatar>
                                        <Box sx={{ background: msg.sender === 'ai' ? 'rgba(0,0,0,0.2)' : 'rgba(247, 217, 118, 0.1)', p: 1.5, borderRadius: 2, width: '100%' }}>
                                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{msg.text}</Typography>
                                            {msg.sources && msg.sources[0] && (
                                                <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <Typography variant="caption" color="text.secondary">Sources:</Typography>
                                                    {msg.sources[0].map((source, i) => (
                                                        <Chip key={i} label={source.path.split('/').slice(1).join('/')} size="small" sx={{ ml: 1, mt: 0.5, background: 'rgba(255,255,255,0.1)' }} />
                                                    ))}
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                </motion.div>
                            ))}
                            {chatLoading && <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />}
                            <div ref={chatEndRef} />
                        </CardContent>
                        <Box sx={{ p: 2, borderTop: `1px solid ${darkTheme.palette.divider}` }}>
                            <Box sx={{ display: 'flex' }}>
                                <TextField
                                    placeholder="Ask a question about the codebase..."
                                    variant="outlined"
                                    fullWidth
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !chatLoading && handleChat()}
                                    disabled={status !== 'ready' || chatLoading}
                                />
                                <Button variant="contained" onClick={handleChat} disabled={status !== 'ready' || chatLoading} sx={{ ml: 1 }}>
                                    Send
                                </Button>
                            </Box>
                        </Box>
                    </Card>
                </Box>
            </Box>
        </ThemeProvider>
    );
}

export default App;