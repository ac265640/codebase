# CodexAI Enterprise

**The AI-Powered SaaS Platform for Engineering Teams.**

CodexAI allows you to ingest any public GitHub repository, instantly clone and embed its codebase, and interact with it through an intelligent chat interface. It provides detailed answers with direct source citations and includes a complete file explorer, built on a robust, scalable architecture.

## Architecture

```text
┌─────────────────────────────────────────────┐
│   React + Vite + TypeScript + Tailwind      │
│   Auth | Stripe Billing | Real-time Sockets │
└──────────────────┬──────────────────────────┘
                   │ HTTPS + WebSocket
┌──────────────────▼──────────────────────────┐
│   Express + Node.js + TypeScript            │
│   Passport (Google/JWT) | Stripe Integration│
│   Multi-LLM (Cohere + Gemini)               │
└──────────┬───────────────────────┬──────────┘
           │                       │
┌──────────▼────────────┐ ┌────────▼──────────┐
│ MongoDB Atlas         │ │ Redis (BullMQ)    │
│ Users, Subscriptions, │ │ Background Jobs   │
│ Usage Logs, Repos     │ │ (Repo embedding)  │
└───────────────────────┘ └───────────────────┘
```

## Tech Stack

| Component | Technology | Description |
|-----------|-----------|-------------|
| **Frontend** | React, Vite, Tailwind CSS | Fast, premium UI with glassmorphism and animated WebGL backgrounds. |
| **Backend** | Express, Node.js, TypeScript | REST API + Socket.IO for real-time progress. |
| **Database** | MongoDB Atlas | Stores users, usage metering, repo metadata, and chat history. |
| **Vector DB** | ChromaDB (Local/Persistent) | Stores embeddings for semantic search. |
| **Queueing** | Redis + BullMQ | Reliable background processing for repository cloning and embedding. |
| **LLMs** | Cohere API & Gemini API | Multi-LLM setup with fallback capabilities. |
| **Auth** | JWT + Passport.js | Supports Email/Password (with Nodemailer OTP) and Google OAuth. |
| **Payments** | Stripe | Subscription tiers and API usage metering. |

## Features
- **Intelligent RAG**: Ask complex questions about the code and get precise answers backed by source citations.
- **Enterprise Auth**: JWT Authentication and Google OAuth via Passport.js.
- **Background Processing**: Heavy repository embedding operations are offloaded to Redis-backed BullMQ workers.
- **SaaS Billing Engine**: Integrated Stripe subscription plans with programmatic API access and usage metering.
- **Multi-LLM Strategy**: Automatically fails over from Cohere to Google Gemini if rate limits are hit.
- **Interactive File Explorer**: Browse the directory structure and view raw code with a built-in syntax viewer.
- **Real-Time Progress**: Watch the ingestion pipeline (Cloning → Parsing → Embedding) live via Socket.IO.

## Local Development Setup

### Prerequisites
- Node.js 18+
- Docker (for Redis)
- MongoDB URI
- Cohere API Key & Google Gemini API Key
- Stripe Secret Key

### 1. Start Infrastructure
Run the `docker-compose` file to start Redis:
```bash
docker-compose up -d redis
```

### 2. Setup Backend
```bash
cd server
npm install
cp .env.example .env
```
Fill out the `.env` file with your credentials (MongoDB, JWT secrets, LLM keys, Stripe, and Google OAuth).

Start the backend:
```bash
npm run dev
```

### 3. Setup Frontend
In a new terminal:
```bash
cd client
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.
