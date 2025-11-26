# 🚀 Deployment Guide

This guide covers deploying your chess application to production.

## Overview

- **Frontend:** Deploy to Vercel (free tier available)
- **Backend:** Deploy to Railway.app, Render.com, or Fly.io

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Your Repository

1. Ensure your code is pushed to GitHub
2. Make sure `apps/web/package.json` has the correct scripts:
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start"
     }
   }
   ```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project"
3. Import your repository
4. Configure the project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

5. Add Environment Variable:
   - **Key:** `NEXT_PUBLIC_WS_URL`
   - **Value:** `wss://your-backend-url.railway.app/chess` (update after backend deployment)

6. Click "Deploy"

### Step 3: Update WebSocket URL After Backend Deployment

1. Once your backend is deployed, go to Vercel project settings
2. Navigate to "Environment Variables"
3. Update `NEXT_PUBLIC_WS_URL` with your actual backend URL
4. Redeploy the frontend

---

## Backend Deployment

Choose one of the following options based on your needs:

### Option 1: Railway.app (Recommended - Easiest)

**Cost:** Free tier (500 hours/month with $5 credit), then ~$5-10/month

#### Steps:

1. **Sign Up**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your chess repository

3. **Configure Service**
   - Click on the created service
   - Go to "Settings"
   - Set **Root Directory:** `apps/ws-server`
   - Set **Build Command:** `npm install && npm run build`
   - Set **Start Command:** `npm start`

4. **Add Environment Variables** (if needed)
   - In Settings → Variables
   - Add `NODE_ENV=production` (optional)

5. **Get Your URL**
   - Railway will provide a domain like `your-app.railway.app`
   - Your WebSocket URL will be: `wss://your-app.railway.app/chess`

6. **Update Frontend**
   - Update `NEXT_PUBLIC_WS_URL` in Vercel to your Railway URL
   - Redeploy frontend

---

### Option 2: Render.com

**Cost:** Free tier (spins down after 15min inactivity), paid $7/month for always-on

#### Steps:

1. **Sign Up**
   - Go to [render.com](https://render.com)
   - Sign in with GitHub

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Service**
   - **Name:** chess-websocket-server
   - **Root Directory:** `apps/ws-server`
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for no spin-down)

4. **Add Environment Variables**
   - In Environment tab
   - Add `NODE_ENV=production`

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment
   - Your URL: `https://chess-websocket-server.onrender.com`
   - WebSocket URL: `wss://chess-websocket-server.onrender.com/chess`

**Note:** Free tier spins down after 15 minutes of inactivity. First connection after spin-down may take 30-60 seconds.

---

### Option 3: Fly.io

**Cost:** Free tier (3 shared VMs), paid ~$2-5/month

#### Steps:

1. **Install Fly CLI**
   ```bash
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh
   
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Navigate to Backend Directory**
   ```bash
   cd apps/ws-server
   ```

4. **Initialize Fly App**
   ```bash
   fly launch
   ```
   - Choose a unique app name
   - Select a region close to your users
   - Don't deploy yet (we need to configure first)

5. **Configure `fly.toml`**
   
   Create or update `apps/ws-server/fly.toml`:
   ```toml
   app = "your-app-name"
   primary_region = "iad"

   [build]
     [build.args]
       NODE_VERSION = "20"

   [http_service]
     internal_port = 9001
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0
     processes = ["app"]

   [[services]]
     internal_port = 9001
     protocol = "tcp"
     auto_stop_machines = true
     auto_start_machines = true

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]

     [[services.ports]]
       port = 80
       handlers = ["http"]
   ```

6. **Deploy**
   ```bash
   fly deploy
   ```

7. **Get Your URL**
   ```bash
   fly status
   ```
   Your WebSocket URL: `wss://your-app-name.fly.dev/chess`

---

## After Deployment Checklist

- [ ] Backend is deployed and running
- [ ] Frontend environment variable `NEXT_PUBLIC_WS_URL` is set
- [ ] Frontend is redeployed with new environment variable
- [ ] Test creating a game
- [ ] Test joining a game
- [ ] Test making moves
- [ ] Test voice chat (requires HTTPS for WebRTC)

---

## Troubleshooting

### WebSocket Connection Fails

1. **Check URL format:**
   - Development: `ws://localhost:9001/chess`
   - Production: `wss://your-domain.com/chess` (note: `wss://` not `ws://`)

2. **Check CORS:**
   - The WebSocket server doesn't need CORS configuration
   - But ensure your hosting provider allows WebSocket connections

3. **Check backend logs:**
   - Railway: View logs in dashboard
   - Render: Check logs in dashboard
   - Fly: `fly logs`

### Voice Chat Not Working

1. **HTTPS Required:**
   - WebRTC requires HTTPS in production (except localhost)
   - Vercel provides HTTPS by default
   - Ensure backend also uses WSS (secure WebSocket)

2. **Firewall Issues:**
   - Some corporate firewalls block WebRTC
   - May need TURN servers for restrictive networks

### Backend Keeps Crashing

1. **Check memory limits:**
   - Free tiers have memory limits
   - May need to upgrade plan

2. **Check port configuration:**
   - Ensure backend uses `process.env.PORT` or falls back to 9001
   - Some hosts require specific port usage

3. **Check logs for errors:**
   - Most platforms provide log viewing

---

## Cost Estimates

### Minimal Setup (Free Tier)
- **Frontend:** Vercel Free (unlimited bandwidth for hobby)
- **Backend:** Railway Free (500 hours/month) or Render Free (with spin-down)
- **Total:** $0/month

### Recommended Production Setup
- **Frontend:** Vercel Pro ($20/month) - only if you need advanced features
- **Backend:** Railway ($5-10/month) or Render ($7/month)
- **Total:** $5-10/month

### Professional Setup
- **Frontend:** Vercel ($20/month)
- **Backend:** Fly.io or DigitalOcean ($5-10/month)
- **TURN Servers:** Twilio or similar ($1-5/month depending on usage)
- **Total:** $26-35/month

---

## Monitoring

### Railway
- Built-in metrics dashboard
- View CPU, memory, network usage
- Real-time logs

### Render
- Metrics available in dashboard
- Email alerts for crashes
- Log streaming

### Fly.io
- Prometheus metrics available
- Use `fly logs` for real-time logs
- Grafana dashboards can be configured

---

## Scaling Considerations

1. **Horizontal Scaling:**
   - Current architecture doesn't support multiple backend instances
   - Would need Redis or similar for shared game state

2. **Vertical Scaling:**
   - Increase RAM/CPU as needed
   - Monitor connection counts

3. **Database:**
   - Currently no persistence
   - Add database (PostgreSQL/MongoDB) for:
     - Game history
     - User accounts
     - Ratings/statistics

---

## Security Notes

1. **Environment Variables:**
   - Never commit `.env` files
   - Use platform-specific secret management

2. **Rate Limiting:**
   - Consider adding rate limiting to prevent abuse
   - Most platforms provide DDoS protection

3. **HTTPS/WSS:**
   - Always use secure connections in production
   - Platforms like Vercel/Railway handle SSL automatically

---

## Support

If you encounter issues:
1. Check platform documentation (Vercel, Railway, etc.)
2. Review application logs
3. Test locally first to isolate issues
4. Check GitHub issues or create new one

---

**Good luck with your deployment! 🚀**

