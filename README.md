# CodeBase — AI-Powered Codebase RAG Platform 

[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Express%20%7C%20TypeScript-blue.svg?style=for-the-badge&logo=react)](https://react.dev)
[![Database](https://img.shields.io/badge/Database-MongoDB%20%7C%20Redis-green.svg?style=for-the-badge&logo=mongodb)](https://mongodb.com)
[![AI Engine](https://img.shields.io/badge/AI-Cohere%20%7C%20Gemini%201.5-purple.svg?style=for-the-badge&logo=google-gemini)](https://aistudio.google.com)
[![License](https://img.shields.io/badge/License-MIT-orange.svg?style=for-the-badge&logo=open-source-initiative)](https://opensource.org/licenses/MIT)
[![Live](https://img.shields.io/badge/Live-codebase--pink--two.vercel.app-brightgreen.svg?style=for-the-badge&logo=vercel)](https://codebase-pink-two.vercel.app)

**CodeBase is a premium, enterprise-grade developer platform** designed to ingest, parse, index, and query any public GitHub repository. Built around an intelligent semantic RAG (Retrieval-Augmented Generation) pipeline, it enables developers to converse with any codebase using natural language, providing granular answers with direct file-level source citations and an interactive repository file tree browser.

> 🌐 **Live Platform**: [https://codebase-pink-two.vercel.app](https://codebase-pink-two.vercel.app)

---

## 🏗️ Production System Architecture

```text
       ┌────────────────────────────────────────────────────────┐
       │         React + Vite + TypeScript (SPA Client)         │
       │    Zustand State | Live Sockets | Glassmorphic UI      │
       └──────────────────────────┬─────────────────────────────┘
                                  │
                                  │ HTTPS / WSS (Secure Sockets)
                                  │
       ┌──────────────────────────▼─────────────────────────────┐
       │        Express + Node.js + TypeScript Server           │
       │   JWT HTTP-Only Cookies | Passport Auth | Rate Limits  │
       └────┬───────────────────────┬───────────────────────┬───┘
            │                       │                       │
 ┌──────────▼──────────┐ ┌──────────▼──────────┐ ┌──────────▼──────────┐
 │    MongoDB Atlas    │ │    Upstash Redis    │ │    ChromaDB Client  │
 │  Users, Subscriptions│ │ (BullMQ Ingestion) │ │ (Semantic Vectors)  │
 │   & Usage Telemetry │ │   Asynchronous      │ │  Granular File      │
 │  (Mongoose Models)  │ │   Task Processing   │ │  Code Embeddings    │
 └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

---

## ✨ Features

- 🧠 **Retrieval-Augmented Generation (RAG)**: Ask architectural or logical questions about a cloned codebase. Receive rich, fully contextual responses complete with file name and segment source citations.
- 📁 **Interactive Repository Explorer**: Browse the entire directory structure of any ingested repository through an integrated interactive folder explorer, viewing code with custom syntax highlighters.
- ⚡ **Asynchronous Live Ingestion Pipeline**: Clones, parses, chunks, and embeds repositories as background tasks via a robust **BullMQ** job queue backed by **Upstash Redis**. Watch real-time ingestion status and progress percentages via live **Socket.IO** updates.
- 🔐 **Dual-Layer Token Authentication**: Advanced session reliability leveraging high-security `HttpOnly`, `SameSite` cookies with fallback to localized headers to ensure zero-downtime logins even on tracking-restricted browsers. Supports Gmail SMTP OTP multi-factor registration.
- 💳 **Stripe Metered Billing & Subscriptions**: Tiered membership support featuring subscription status validation and metered API query limits linked to background Stripe webhooks.
- 🛡️ **Dual-LLM Intelligent Failover**: Resilient multi-model API wrapper that routes queries through Cohere Command-R and automatically triggers intelligent fallback to Gemini 1.5 Flash in case of rate-limiting or service disruption.
- 🔒 **Production Hardened Shielding**: Custom API middleware protecting server resources with rate limiters, Helmet headers, CORS policies, and clean input sanitization.

---

## 📁 Clean Monorepo Structure

CodeBase is organized as a clean, highly structured Node/TypeScript monorepo. Deprecated files have been completely pruned:

```text
codebase/
├── client/                     ← React Frontend (Vercel Ready)
│   ├── src/
│   │   ├── api/                ← Axios client instance and API requests
│   │   ├── assets/             ← Visual media, badges, and icons
│   │   ├── components/         ← Reusable layout, UI elements, and modals
│   │   │   ├── chat/           ← Messages, citation links, chat interfaces
│   │   │   ├── repos/          ← Repo cards, file trees, file previews
│   │   │   └── ui/             ← Styled buttons, inputs, canvas light rays
│   │   ├── hooks/              ← Socket, auth, and helper hooks
│   │   ├── pages/              ← Auth callback, dashboard, settings, landing
│   │   ├── router/             ← React Router route configs
│   │   └── store/              ← Zustand client global stores (auth, guest)
│   ├── public/                 ← Web app manifest, favicons, robots.txt
│   ├── index.html              ← Main HTML document entry
│   ├── tailwind.config.js      ← Tailwind styling rules
│   ├── vite.config.ts          ← Vite compilation config
│   └── tsconfig.json           ← Frontend TypeScript compiler settings
│
├── server/                     ← Express Backend (Render Ready)
│   ├── src/
│   │   ├── config/             ← Database, Passport OAuth, and Redis configs
│   │   ├── middleware/          ← CORS, Auth shields, email-OTP & rate limiters
│   │   ├── models/             ← Mongoose models (User, Repo, Subscription, Chat)
│   │   ├── routes/             ← REST controller endpoints grouped by resource
│   │   ├── services/           ← RAG, Cohere/Gemini LLM, Git, and Vector stores
│   │   ├── types/              ← Custom Express type extensions
│   │   ├── utils/              ← JobQueue fallbacks, JWT signers, token utils
│   │   ├── workers/            ← BullMQ repository chunking & embedding workers
│   │   ├── app.ts              ← Express pipeline initialization
│   │   └── server.ts           ← Main HTTP & Socket.IO server execution entry
│   ├── render.yaml             ← Production Infrastructure-as-Code spec
│   ├── Dockerfile              ← Server deployment container script
│   └── tsconfig.json           ← Backend TypeScript compiler settings
│
├── docker-compose.yml          ← Orchestrated local Redis stack launcher
├── DEPLOYMENT.md               ← Production cloud multi-platform guide
└── README.md                   ← Master project description
```

---

## 🛠️ Unified Technology Stack

| Layer | Component | Technologies Used | Key Purpose / Advantage |
| :--- | :--- | :--- | :--- |
| **Frontend** | Application Shell | **React (v18), Vite, TypeScript** | Lightning fast SPA with modular structure and TS type-safety. |
| **Frontend** | Styling & UI | **Tailwind CSS, Glassmorphic CSS** | Sleek UI with canvas-rendered light rays and responsive grids. |
| **Frontend** | Global State | **Zustand** | Light, hook-based state management replacing heavy Redux stores. |
| **Backend** | Application Core | **Express, Node.js, TypeScript** | Multi-threaded backend API featuring robust asynchronous route handlers. |
| **Databases** | Core Storage | **MongoDB Atlas & Mongoose** | Flexible cloud document store capturing users, settings, and metered usage. |
| **Vector DB** | Vector Queries | **ChromaDB Client** | Semantic vector storage utilizing high-speed similarity indexes. |
| **Job Queue** | Task Scheduling | **Redis, BullMQ** | Standard in-production queuing to manage deep git-clone background worker jobs. |
| **AI Layer** | Language Engines | **Cohere Command R & Gemini 1.5** | Robust text embeddings and fallback intelligence. |
| **Security** | Auth & Shielding | **JWT Cookies, Passport.js, OTP** | HttpOnly cookie auth backed by OTP validations & security layers. |

---

## 💻 Local Development Setup

Set up and spin up the complete local development environment in minutes.

### 📋 Prerequisites
- **Node.js** v18 or newer
- **Docker** (to boot local Redis container)
- **MongoDB Connection String** (Atlas or local)
- **Cohere & Gemini API Keys**

### Step 1: Initialize Local Redis Cache
Run the Redis container required for the BullMQ task workers:
```bash
docker-compose up -d redis
```

### Step 2: Set Up Server Backend
1. Enter the `server/` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy and populate the environment configuration:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and fill in your database connections, API keys, and secret keys.*
4. Boot the server in development hot-reload mode:
   ```bash
   npm run dev
   ```

### Step 3: Set Up Client Frontend
1. Open a new terminal tab and enter the `client/` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy and customize the client environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Start the Vite hot-reloading development server:
   ```bash
   npm run dev
   ```

The application is now up and running! Open your browser and navigate to:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🚀 Cloud Production Deployment

This monorepo is fully prepared for cloud deployment. We use the following stack:
- **Frontend SPA**: Deployed to [Vercel](https://vercel.com) (Serverless, automated Vite distribution).
- **Backend API**: Deployed to [Render](https://render.com) (Standard Node.js service utilizing attached 1GB Persistent Disks for local ChromaDB stores).
- **Database**: [MongoDB Atlas](https://mongodb.com) free M0 cluster.
- **Queues**: Serverless [Upstash Redis](https://upstash.com) with TLS enabled.

> [!TIP]
> For a comprehensive, step-by-step interactive manual detailing exact environment variables, Google OAuth setup, and Stripe webhook configuration, refer directly to **[DEPLOYMENT.md](file:///Users/amit/Desktop/codebase/DEPLOYMENT.md)**.

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.
