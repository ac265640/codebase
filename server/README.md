# CodeBase Server — Robust Express + TypeScript API Engine ⚙️

Welcome to the **CodeBase Backend API Server**. Built on Node.js and Express using TypeScript, this backend drives the RAG pipeline, manages BullMQ background processing tasks, handles Stripe payments, and manages session state.

---

## 🏗️ Folder Structure Overview

The server codebase is organized cleanly around services, models, controllers (routes), and background jobs:

```text
server/
├── src/
│   ├── config/             ← Central database and third-party configuration adapters
│   │   ├── db.ts           ← MongoDB connection handler
│   │   ├── passport.ts     ← Passport.js Google OAuth configuration
│   │   └── redis.ts        ← Redis connection handler for queues
│   │
│   ├── middleware/         ← HTTP Request Interceptors
│   │   ├── authenticate.ts ← JWT validation and automatic cookie-to-header fallback
│   │   ├── requireEmailVerified.ts ← Restricts routes to OTP-verified accounts
│   │   ├── trackUsage.ts   ← Records metered API counts
│   │   └── usageLimit.ts   ← Enforces subscription limits before calling expensive LLMs
│   │
│   ├── models/             ← Mongoose Document Schemas
│   │   ├── User.ts         ← Users, authentication hash details, and verified profiles
│   │   ├── Repository.ts   ← Cloned repos, progress, file counts, and statuses
│   │   ├── ChatSession.ts  ← Persistent chat history, messages, and citation segments
│   │   ├── Subscription.ts ← Stripe plan and subscription state mapping
│   │   ├── APIKey.ts       ← Developer tokens for external REST programmatic access
│   │   └── UsageLog.ts     ← Metered logs detailing LLM usage metrics
│   │
│   ├── routes/             ← Express REST API Routing Controllers
│   │   ├── auth.ts         ← JWT, Local Registration, Login, and Google OAuth
│   │   ├── repos.ts        ← Repos listing, deletion, file-tree building, and code viewing
│   │   ├── chat.ts         ← RAG Q&A chat queries, session history, and session deletion
│   │   ├── billing.ts      ← Stripe payment sessions and webhook listeners
│   │   ├── apiKeys.ts      ← Manage developer programmatic API keys
│   │   └── user.ts         ← Profile edits and verification email triggers
│   │
│   ├── services/           ← Core Business Logic Services
│   │   ├── gitService.ts   ← Shallow-cloning and pulling repos from GitHub
│   │   ├── fileService.ts  ← Filtering target files, cleaning code-noise, and tree building
│   │   ├── embedService.ts ← Cohere embedding generator and ChromaDB collection manager
│   │   ├── ragService.ts   ← Context search retrieval and multi-source citations
│   │   ├── llmProvider.ts  ← Dual-LLM Cohere + Gemini automatic fallback framework
│   │   └── socketManager.ts← Socket.io session and real-time live ingestion progress emitters
│   │
│   ├── types/              ← Custom type extensions and namespaces
│   │
│   ├── utils/              ← Pure utility functions
│   │   ├── jobQueue.ts     ← Memory-backed queue (fallback for BullMQ in simple environments)
│   │   └── tokens.ts       ← Cryptographic JWT cookie & local header signers
│   │
│   ├── workers/            ← Multi-threaded Job Processing Workers
│   │   └── embedWorker.ts  ← Asynchronous background thread executing long-running RAG indexing
│   │
│   ├── app.ts              ← Express middleware loading, routing, and global error catches
│   └── server.ts           ← Server startup script bootstrapper
│
├── render.yaml             ← Infra-as-Code Blueprint for Render cloud service deployments
├── Dockerfile              ← Production multi-stage Docker build recipe
└── tsconfig.json           ← TypeScript compiler settings
```

---

## ⚡ Key Architectural Pipelines

### 🔄 The Repository Ingestion Flow
When a user adds a repository URL, the ingestion runs completely in the background:
1. **Queue Staging**: An ingestion job is pushed to the **BullMQ** queue.
2. **Shallow Clone**: A separate background worker clones the repo into the configured disk space using `gitService.ts` with `--depth 1` for speed.
3. **File Parsing**: `fileService.ts` reads the directory recursively, filtering files by extension, stripping out files over 100KB, extracting code cells from `.ipynb` files, and cleaning code-noise.
4. **Vector Indexing**: Code chunks are sent to Cohere's `embed-english-light-v3.0` API in batches. The resulting vectors are saved directly in ChromaDB.
5. **Real-time Broadcast**: At each stage, the socket manager broadcasts progress updates (`cloned`, `parsing`, `embedding: N%`, `done`) directly to the user's browser.

### 🛡️ Intelligent LLM Failover Provider
To achieve production reliability on free-tier APIs, the `llmProvider.ts` class contains a dual-LLM pipeline:
* **Primary Query**: Sent to Cohere Command-R.
* **Intelligent Fallback**: In the event of a `429 Rate Limit` or standard API disruption, the provider automatically falls back to Google Gemini 1.5 Flash. This failover is completely transparent to the user, ensuring zero service interruptions.

---

## 💻 Local Development Setup

Follow these steps to run the Express TypeScript backend locally:

### 1. Set Up Environment Variables
Create your local environment file in the `server/` directory:
```bash
cp .env.example .env
```
Fill in the parameters:
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/codebase
JWT_SECRET=your_ultra_secure_jwt_access_secret_key
JWT_REFRESH_SECRET=your_ultra_secure_jwt_refresh_secret_key

# Redis Configuration (For BullMQ queues)
REDIS_URL=redis://127.0.0.1:6379

# AI APIs
COHERE_API_KEY=your_cohere_key
GEMINI_API_KEY=your_gemini_key

# Paths
CHROMA_PERSIST_PATH=./chroma_db
REPOS_DIR=./repos

# Security & CORS
CLIENT_URL=http://localhost:5173
```

### 2. Boot Local Services
Ensure local Redis is running:
```bash
docker-compose up -d redis
```

### 3. Run Development Server
```bash
npm install
npm run dev
```
Check health state at: 👉 **`http://localhost:5000/api/health`** (must return `{"status":"ok"}`).

---

## 🚀 Render Production Deployment

The server is optimized to deploy seamlessly as a **Node.js Web Service** on Render:

1. Create a "New Web Service" on Render and point it to your repository.
2. Configure settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
3. Add a **Persistent Disk** (critical for retaining indexed repositories):
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB
4. Adjust production Environment Variables on Render:
   - Set `CHROMA_PERSIST_PATH` to `/app/data/chroma_db`
   - Set `REPOS_DIR` to `/app/data/repos`
   - Set `REDIS_URL` to your cloud Redis instance (e.g. Upstash Redis URL)
   - Add all database and AI provider secrets.
5. Click **Deploy**. The server will automatically initialize databases, boot workers, and connect Socket pipelines on port 5000.
