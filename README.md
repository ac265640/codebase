# CodeBase Enterprise 🚀

**The Ultimate AI-Powered SaaS Platform for Engineering Teams.**

CodeBase is a premium, state-of-the-art developer platform that allows you to ingest any public GitHub repository, instantly clone and embed its codebase, and interact with it through an intelligent, semantic chat interface. It provides detailed architecture answers with direct file-level source citations and includes a complete interactive file tree explorer, all powered by a robust, secure, and production-ready architecture.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│             React + Vite + TypeScript + Tailwind                │
│       Auth | Stripe Billing | Real-time Sockets | WebGL         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 │ HTTPS + Secure WebSockets
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│             Express + Node.js + TypeScript (REST API)           │
│       Passport (Google/JWT Auth) | Stripe Webhooks | CORS       │
└────────────────┬────────────────────────────────┬───────────────┘
                 │                                │
┌────────────────▼────────────────┐      ┌────────▼───────────────┐
│         MongoDB Atlas           │      │  Upstash Redis (BullMQ)│
│  Users, Sessions, Metered Usage │      │   Robust Task Queue    │
│  Billing Logs, Repo Metadata    │      │  (Repo Ingestion Jobs) │
└─────────────────────────────────┘      └────────────────────────┘
```

---

## ✨ Features

- 🧠 **Intelligent RAG (Retrieval-Augmented Generation)**: Ask complex architectural questions about the codebase and get precise, detailed answers backed by exact file-level source citations.
- ⚡ **Real-Time Progress Ingestion**: Watch the ingestion pipeline (Cloning ➡️ Parsing ➡️ Semantic Vector Embedding) live via robust Socket.IO websocket feeds.
- 📁 **Interactive Code Explorer**: Browse the complete repository directory structure and view raw source code with an integrated syntax highlighter.
- 🔐 **Enterprise-Grade Auth & Cookie Fallback**: Secure JWT tokens with HttpOnly, SameSite cookie sessions and Google OAuth via Passport.js, integrated with a smart, persistent LocalStorage header fallback to guarantee absolute session reliability even on browsers that block third-party cross-origin cookies.
- 📨 **Nodemailer OTP Email Verification**: Self-service registration security verified with secure email OTP tokens.
- 💳 **SaaS Billing Engine**: Integrated Stripe subscription plans with metered API usage tracking.
- 🤖 **Multi-LLM Fallback Strategy**: Automatically fails over from Cohere Command-R to Google Gemini 1.5 Flash if rate limits are exceeded, ensuring zero downtime.
- 🛡️ **Production Rate Limiting**: Out-of-the-box protection against API abuse and spam using `express-rate-limit`.

---

## 🛠️ Tech Stack

| Layer | Component | Technology | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | UI & Styling | **React, Vite, Tailwind CSS** | High-performance, premium SPA with glassmorphism and real-time canvas light rays. |
| **Backend** | API Server | **Express, Node.js, TypeScript** | Robust REST API + Socket.IO for live websocket connection updates. |
| **Database** | Core DB | **MongoDB Atlas** | Secure cloud storage for user metadata, subscription tracking, and logs. |
| **Vector DB** | Semantic Search | **ChromaDB Client** | Semantic vector storage for indexing and querying codebase fragments. |
| **Queueing** | Task Workers | **Redis + BullMQ** | Highly reliable background worker tasks for asynchronous repository cloning and ingestion. |
| **LLMs** | Core Intelligence | **Cohere Command R & Gemini 1.5 Flash** | Dual LLM configuration with seamless automatic fallback capabilities. |
| **Auth** | User Session Security | **JWT + Passport.js** | Advanced secure cookies + full support for Gmail App Password SMTP OTPs. |
| **Payments** | Subscription Engine | **Stripe** | Production-ready checkout pipelines and secure backend webhooks. |

---

## 🚀 Production Deployment

This monorepo is fully optimized for single-click hosting on production cloud environments. 

### Deployment Strategy
- **Frontend**: Deployed to [Vercel](https://vercel.com) (Serverless, optimized for Vite/React).
- **Backend**: Deployed to [Render](https://render.com) (Standard Node.js Web Service).
- **Database**: Cloud-hosted [MongoDB Atlas M0](https://cloud.mongodb.com).
- **Task Queue**: Serverless [Upstash Redis](https://upstash.com) with TLS enabled.

> [!TIP]
> For a detailed, step-by-step interactive manual covering how to set up the databases, configure environments, and spin up the services, please refer directly to the **[DEPLOYMENT.md](file:///Users/amit/Desktop/codebase/DEPLOYMENT.md)** guide.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 18+
- Docker (to run local Redis)
- MongoDB Connection String
- Cohere and Gemini API keys

### Step 1: Start Infrastructure
Launch a local Redis container for the BullMQ task scheduler:
```bash
docker-compose up -d redis
```

### Step 2: Configure & Launch Backend
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
4. Fill in the `.env` parameters, then start the server in development mode:
   ```bash
   npm run dev
   ```

### Step 3: Configure & Launch Frontend
1. Open a new terminal and navigate to the client folder:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
4. Launch the Vite development server:
   ```bash
   npm run dev
   ```

The application will immediately be running and available locally at:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.
