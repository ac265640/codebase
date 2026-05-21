# CodeBase Client — Premium React + TypeScript + Vite SPA 🎨

Welcome to the **CodeBase Frontend client**. This React SPA is built on top of the ultra-fast Vite bundler using TypeScript and styled with a custom Glassmorphic design language using Tailwind CSS. 

---

## 🏗️ Folder Structure Overview

The frontend source structure is organized for modularity, clean state encapsulation, and ease of routing:

```text
client/
├── public/                 ← Static favicons, logo assets, and web manifest
├── src/
│   ├── api/
│   │   └── client.ts       ← Centralized Axios instance with automatic token interceptors
│   │
│   ├── assets/             ← Hero branding and high-res vector graphics
│   │
│   ├── components/
│   │   ├── chat/           ← Intelligent chat modules (bubbles, citations, input)
│   │   ├── repos/          ← Repository viewer components (cards, file trees, file previews)
│   │   │   ├── FileTree.tsx  ← Recursive directory explorer
│   │   │   └── AddRepoModal.tsx ← Modal to clone a new repository via URL
│   │   └── ui/             ← Pure, reusable interface blocks (buttons, dialogs, progress bars)
│   │       ├── LightRays.tsx ← Interactive WebGL/CSS canvas lighting animation
│   │       └── toast.tsx   ← Toast alerts notification provider
│   │
│   ├── hooks/
│   │   └── useSocket.ts    ← Real-time connection hook supporting Socket.IO
│   │
│   ├── pages/              ← Dynamic page views mapped to React Router
│   │   ├── Landing.tsx     ← Modern product landing page with dynamic lighting
│   │   ├── Login.tsx       ← Secure login gateway
│   │   ├── Register.tsx    ← Secure account creation with email-OTP challenge
│   │   ├── Dashboard.tsx   ← Active dashboard showing list of repos and chat history
│   │   ├── Settings.tsx    ← API key generation, user profile, and Stripe billing limits
│   │   └── AuthCallback.tsx← OAuth redirect interceptor to handle token handshakes
│   │
│   ├── router/
│   │   └── index.tsx       ← React Router (v6) route maps and Auth Guard wrappers
│   │
│   └── store/              ← Zustand state engines
│       ├── authStore.ts    ← Stores logged-in user profiles, tokens, and verification status
│       └── guestStore.ts   ← Manages session state for anonymous/demo users
│
├── index.html              ← Root HTML document injection point
├── tailwind.config.js      ← Custom premium Tailwind tokens and theme configurations
├── vite.config.ts          ← Vite compilation configuration (port: 5173)
├── vercel.json             ← Single-page application router settings for Vercel
└── tsconfig.json           ← TypeScript compiler options
```

---

## ⚡ Active Technologies

- **React SPA**: React 18 using functional components, customized hooks, and clean lifecycle management.
- **Vite + TS**: Blazing fast Hot Module Replacement (HMR) with comprehensive TypeScript type-safety compiler grids.
- **Zustand State**: Lightweight, reactive stores handling cross-component shared state without the boilerplate or render overhead of Context API/Redux.
- **Glassmorphism Theme**: Curated CSS and Tailwind classes integrating dark modes, smooth color gradients, drop shadows, and high-performance WebGL canvas overlays.
- **Socket.IO Client**: Establishes continuous bi-directional pipelines to track and display real-time background repository cloning and embedding metrics.
- **Axios Interceptors**: Intercepts requests to append authentication headers and handles `401 Unauthorized` token refreshes seamlessly.

---

## 💻 Local Development Setup

Ensure you have created the correct client configuration before launching:

1. **Verify Client Configuration**
   Copy the example environment template:
   ```bash
   cp .env.example .env
   ```
   Confirm the target API addresses (matching the server execution port):
   ```ini
   VITE_API_URL=http://localhost:5000
   VITE_SOCKET_URL=http://localhost:5000
   ```

2. **Boot the Hot-Reloading Client**
   Run the following commands within the `client/` directory:
   ```bash
   npm install
   npm run dev
   ```
   Navigate to: 👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🚀 Production Building & Vercel Deployment

### Compile Production Static Files
To compile and test the production-ready distribution bundle locally:
```bash
npm run build
```
This compiles TypeScript, optimizes code, and generates output files into the `dist/` directory.

### Deploying to Vercel
Deploying the client React app to Vercel takes seconds:
1. Connect your repository to Vercel.
2. Select `client` as the **Root Directory**.
3. Vercel automatically detects Vite. Verify these settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Add the following environment variables:
   - `VITE_API_URL`: Your deployed production backend URL (e.g. `https://api.your-platform.com`).
   - `VITE_SOCKET_URL`: Your deployed production backend URL.
5. Click **Deploy**. The `vercel.json` file automatically handles single-page routing fallbacks.
