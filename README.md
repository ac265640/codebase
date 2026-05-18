# CodexAI

**RAG-powered conversational assistant for GitHub codebases.**

CodexAI allows you to paste any public GitHub repository URL, instantly clone and embed its codebase, and interact with it through a chat interface. It provides detailed answers with direct source citations and includes a complete file explorer.

## Live Demo
🚀 [View Live on Vercel](https://your-vercel-url.vercel.app/)

## Architecture

```text
┌─────────────────────────────────────────────┐
│   React + Vite + TypeScript + Tailwind      │
│   Deployed: Vercel (free)                   │
└──────────────────┬──────────────────────────┘
                   │ HTTPS + WebSocket
┌──────────────────▼──────────────────────────┐
│   Express + Node.js + TypeScript            │
│   Auth | Repos | Chat | Socket.IO           │
│   + Cohere SDK + ChromaDB SDK (JS)          │
│   Deployed: Render (free web service)       │
│   Persistent disk: /app/data (1GB)          │
└──────────┬──────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────┐
│   MongoDB Atlas M0 (free)                   │
│   Users | Repositories | ChatSessions       │
└─────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology | Description |
|-----------|-----------|-------------|
| **Frontend** | React, Vite, Tailwind CSS, shadcn/ui | Fast, modern client with custom UI components. |
| **Backend** | Express, Node.js, TypeScript | REST API + Socket.IO for real-time progress. |
| **Database** | MongoDB Atlas (M0 Free Tier) | Stores users, repo metadata, and chat history. |
| **Vector DB** | ChromaDB (Local/Persistent) | Stores embeddings for semantic search. |
| **LLM / Embeddings** | Cohere API | `embed-english-light-v3.0` & `command-r` models. |
| **Deployment** | Vercel (Frontend), Render (Backend) | Free-tier hosting. |

## Features
- **JWT Authentication**: Secure user registration and login with HTTP-only cookies and automatic token refresh.
- **GitHub Ingestion**: Clone, parse, and embed any public GitHub repository.
- **RAG-Powered Q&A**: Ask complex questions about the code and get precise answers backed by source citations.
- **Real-Time Progress**: Watch the ingestion pipeline (Cloning → Parsing → Embedding) live via Socket.IO.
- **Persistent Chat**: Chat history is saved per repository so you never lose context.
- **Interactive File Explorer**: Browse the directory structure and view raw code with a built-in syntax viewer.

## Local Development Setup

### Prerequisites
- Node.js 18+
- Git
- MongoDB URI (local or Atlas)
- Cohere API Key

### 1. Clone & Setup Backend
```bash
git clone https://github.com/ac265640/codebase.git codexai
cd codexai/server
cp .env.example .env
```
Fill out the variables in `server/.env`:
```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
COHERE_API_KEY=your_cohere_key
CHROMA_PERSIST_PATH=./chroma_db
REPOS_DIR=./repos
CLIENT_URL=http://localhost:5174
NODE_ENV=development
```
Start the backend:
```bash
npm install
npm run dev
```

### 2. Setup Frontend
In a new terminal:
```bash
cd codexai/client
cp .env.example .env
```
Ensure `client/.env` has:
```env
VITE_API_URL=http://localhost:5001
VITE_SOCKET_URL=http://localhost:5001
```
Start the frontend:
```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5174`.

## Deployment Guide

### 1. MongoDB Atlas
1. Create a free M0 cluster at [MongoDB Cloud](https://cloud.mongodb.com).
2. Go to **Database Access** and create a user.
3. Go to **Network Access** and add `0.0.0.0/0` (Render IPs are dynamic).
4. Copy your connection string and replace `<password>`.

### 2. Render (Backend)
1. Push the code to GitHub.
2. Go to [Render](https://render.com) and create a new **Web Service**.
3. Connect your repository. Render will automatically detect `render.yaml`.
4. Fill in the required environment variables in the Render dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `COHERE_API_KEY`
   - *Note: Leave `CLIENT_URL` blank for now.*

### 3. Vercel (Frontend)
1. Go to [Vercel](https://vercel.com) and import the repository.
2. Set the **Root Directory** to `client`.
3. Add environment variables:
   - `VITE_API_URL` = `https://<your-render-app>.onrender.com`
   - `VITE_SOCKET_URL` = `https://<your-render-app>.onrender.com`
4. Deploy.

### 4. Finalize CORS
1. Copy the URL Vercel gives you (e.g., `https://codexai.vercel.app`).
2. Go back to your Render dashboard.
3. Add the `CLIENT_URL` environment variable and set it to your Vercel URL.
4. Manually trigger a deploy on Render to pick up the new CORS configuration.

## Free Tier Limits & Considerations
- **Cohere API**: 1,000 calls/month on the free tier.
- **Render**: Free web services spin down after 15 minutes of inactivity. The first request after sleeping may take ~30 seconds (CodexAI displays a "waking up" banner when this happens).
- **MongoDB Atlas**: M0 tier is limited to 512MB storage.
- **ChromaDB**: Vectors are stored persistently on a 1GB Render disk mounted at `/app/data`.
