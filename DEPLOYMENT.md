# CodeBase — Deployment Guide
## Stack: Vercel (frontend) + Render (backend) + MongoDB Atlas (database)
## All free tier — no credit card required for core services

---

## Prerequisites

Before deploying, have these ready:
- GitHub account with the CodexAI/CodeBase repo pushed
- MongoDB Atlas account (cloud.mongodb.com) — free M0 cluster created
- Cohere account (cohere.com) — free API key
- Google Cloud Console project with OAuth 2.0 credentials
- Gmail account with App Password generated

Optional (for full feature set):
- Gemini API key (aistudio.google.com) — free
- Stripe account in test mode (dashboard.stripe.com) — free
- Upstash account (upstash.com) — free Redis (10k commands/day)

---

## Step 1 — MongoDB Atlas Setup

1. Go to cloud.mongodb.com → sign in → "Build a Database"
2. Choose M0 Free → select closest region → name: `codexai`
3. Create a database user:
   - Username: `codexai-user`
   - Password: generate a secure password, copy it
4. Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)
   (Render IPs are dynamic, so we must allow all)
5. Connect → Drivers → copy the connection string
   Replace `<password>` with your database user's password
   Replace `myFirstDatabase` with `codexai`
   Final format: `mongodb+srv://codexai-user:<password>@cluster0.xxxxx.mongodb.net/codexai`

---

## Step 2 — Deploy Backend to Render

1. Go to render.com → sign in with GitHub → "New +"  → "Web Service"
2. Connect your GitHub repo → select the CodexAI repository
3. Configure:
   - **Name**: `codexai-server`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free

4. Add Persistent Disk (required for ChromaDB):
   - Scroll to "Disks" → "Add Disk"
   - Name: `codexai-data`
   - Mount Path: `/app/data`
   - Size: 1 GB
   - Click "Save"

5. Set Environment Variables (Environment tab → "Add Environment Variable"):

   | Key | Value |
   |-----|-------|
   | NODE_ENV | production |
   | CHROMA_PERSIST_PATH | /app/data/chroma_db |
   | REPOS_DIR | /app/data/repos |
   | MONGODB_URI | your Atlas connection string |
   | JWT_SECRET | run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
   | JWT_REFRESH_SECRET | same command, different value |
   | COHERE_API_KEY | from cohere.com dashboard |
   | GEMINI_API_KEY | from aistudio.google.com |
   | GOOGLE_CLIENT_ID | from Google Cloud Console |
   | GOOGLE_CLIENT_SECRET | from Google Cloud Console |
   | GOOGLE_CALLBACK_URL | https://codexai-server.onrender.com/api/auth/google/callback |
   | SMTP_USER | your Gmail address |
   | SMTP_APP_PASSWORD | your Gmail App Password |
   | STRIPE_SECRET_KEY | sk_test_... from Stripe |
   | STRIPE_WEBHOOK_SECRET | set after step 3 below |
   | REDIS_URL | from Upstash dashboard |
   | CLIENT_URL | https://your-app.vercel.app (set AFTER step 3) |

6. Click "Create Web Service" → wait for first deploy (3–5 minutes)
7. Once deployed, copy your Render URL: `https://codexai-server.onrender.com`
8. Test: open `https://codexai-server.onrender.com/api/health` in browser
   → must show `{"status":"ok"}`

---

## Step 3 — Deploy Frontend to Vercel

1. Go to vercel.com → sign in with GitHub → "Add New Project"
2. Import your CodexAI repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client` (click "Edit" next to root directory)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. Add Environment Variables:

   | Key | Value |
   |-----|-------|
   | VITE_API_URL | https://codexai-server.onrender.com |
   | VITE_SOCKET_URL | https://codexai-server.onrender.com |

5. Click "Deploy" → wait 1–2 minutes
6. Copy your Vercel URL: `https://codexai-xxxx.vercel.app`

---

## Step 4 — Connect Frontend ↔ Backend

After both are deployed:

1. **Update CLIENT_URL on Render**:
   - Render dashboard → codexai-server → Environment
   - Update `CLIENT_URL` to your Vercel URL: `https://codexai-xxxx.vercel.app`
   - Click "Save Changes" → Render will auto-redeploy (2–3 min)

2. **Update Google OAuth callback URL**:
   - Google Cloud Console → APIs & Services → Credentials
   - Click your OAuth 2.0 Client ID
   - Authorized redirect URIs → Add:
     `https://codexai-server.onrender.com/api/auth/google/callback`
   - Save → wait 5 minutes for propagation

3. **Set up Stripe webhook** (if using billing):
   - Stripe Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://codexai-server.onrender.com/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`
   - Copy the webhook signing secret → update `STRIPE_WEBHOOK_SECRET` on Render

---

## Step 5 — Smoke Test (run after every deployment)

Open your Vercel URL and test in order:

- [ ] Landing page loads
- [ ] Register with a Gmail address → OTP email received
- [ ] Verify OTP → redirected to dashboard
- [ ] Login with email/password → dashboard loads
- [ ] Google OAuth → consent screen → dashboard (not login loop)
- [ ] Add a GitHub repo URL → progress bar animates → status becomes "done"
- [ ] Click repo → file tree appears
- [ ] Ask a question → answer returned with source citations
- [ ] Logout → redirected to landing
- [ ] Visit `/dashboard` while logged out → redirected to `/login`

---

## Free Tier Limits Reference

| Service | Limit | Impact |
|---------|-------|--------|
| Render web service | 750 hrs/month, sleeps after 15min inactivity | First request after sleep takes ~30s |
| Render persistent disk | 1 GB | Fits ~20-30 medium repos in ChromaDB |
| MongoDB Atlas M0 | 512 MB storage | ~50k documents |
| Cohere free tier | 1000 API calls/month (embed+chat combined) | ~50 repo embeds or ~500 chat queries |
| Gemini free tier | 15 RPM, 1M tokens/day | More than enough for demo |
| Vercel hobby | 100 GB bandwidth/month | More than enough |
| Upstash Redis | 10,000 commands/day | Sufficient for demo usage |

## Render Cold Start Warning

Free tier services sleep after 15 minutes of inactivity. The first request
after sleeping takes 20–40 seconds. The frontend already shows a
"Service is waking up..." banner during slow responses.

To keep the service warm during a demo: visit `/api/health` a minute before
your demo to wake it up.

---

## Re-deploying After Code Changes

**Frontend (Vercel)**: push to `main` branch → Vercel auto-deploys in ~1 min

**Backend (Render)**: push to `main` branch → Render auto-deploys in ~3 min
- Note: ChromaDB data on the persistent disk survives redeployments
- Repos cloned to `/app/data/repos` also survive redeployments

---

## Troubleshooting

**401 on every API call from frontend**
→ Check `CLIENT_URL` env var on Render matches your Vercel URL exactly (no trailing slash)
→ Check cookies: `sameSite: 'none'` and `secure: true` in production code

**Socket.IO not connecting**
→ Check Socket.IO CORS origin includes your Vercel URL
→ Check browser console for WebSocket errors

**ChromaDB errors on Render**
→ Verify persistent disk is attached at `/app/data`
→ Verify `CHROMA_PERSIST_PATH=/app/data/chroma_db` env var is set

**Google OAuth loops back to login**
→ Verify callback URL in Google Cloud Console matches `GOOGLE_CALLBACK_URL` exactly
→ Verify `CLIENT_URL` is set on Render so the OAuth redirect lands correctly
→ Check `passport.session()` is NOT in app.ts (must use `session: false`)

**OTP emails not arriving**
→ Check spam folder first
→ Verify `SMTP_APP_PASSWORD` is the App Password (16 chars), not Gmail password
→ Verify 2-Step Verification is enabled on the Gmail account

**Build fails on Render**
→ Check `server/package.json` has `"build": "tsc"` and `"start": "node dist/server.js"`
→ Run `npm run build` locally first — fix all TypeScript errors before pushing
