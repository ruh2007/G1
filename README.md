# 🎵 Guess the Song (G1)

A real-time, phone-based multiplayer music guessing game supporting up to 500 concurrent players.

## 🚀 Railway Deployment

This application is fully optimized for **Railway.app** using standard Nixpacks build pipeline:

- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Port**: Auto-assigned by Railway via `process.env.PORT`

### Quick Deployment Steps
1. Push your repository to GitHub: `https://github.com/ruh2007/G1.git`
2. Open [Railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Select `ruh2007/G1`.
4. Go to Service Settings → **Networking** → **Generate Domain**.

### Live Routes
- **Players Screen**: `https://<your-railway-domain>.up.railway.app/`
- **Host Dashboard**: `https://<your-railway-domain>.up.railway.app/host`

## 🛠️ Local Development

```bash
# Start backend
cd backend
npm run dev

# Start frontend
cd frontend
npm run dev
```
