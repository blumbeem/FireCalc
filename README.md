# FireCalc: Advanced FIRE Simulator

FireCalc is an advanced, mathematically rigorous Financial Independence, Retire Early (FIRE) simulator. It features two powerful simulation engines:
1. **Probabilistic Monte Carlo** (Predictive Regressions)
2. **Backtested Historical** (Rerunning sequence-of-returns from 1928-2023)

This repository contains the high-performance Python **FastAPI backend** that calculates these regressions, along with a standalone **React/Next.js UI Template** you can drop into your own projects.

---

## 1. Running the FastAPI Backend

The backend is built with FastAPI for maximum performance when running 1,000+ Monte Carlo simulations per second.

### Installation
You MUST install the `standard` FastAPI package to run the Uvicorn server:
```bash
python3 -m venv venv
source venv/bin/activate
pip install "fastapi[standard]" pydantic numpy scipy
```

### Running the Server
```bash
# This will launch the backend API on http://localhost:8000
fastapi run main.py --port 8000
```
*Note: The API has interactive Swagger documentation available at `http://localhost:8000/docs` once running!*

---

## 2. Using the Frontend React Template

The beautiful, animated UI is built for Next.js and Tailwind CSS using Recharts. 

Inside the `frontend_template` folder, you will find:
* `types/firecalc.ts`: The TypeScript interfaces that match the Python Pydantic models.
* `components/firecalc/`: The React components for the Form, Charts, and Data Tables.
* `app/firecalc/page.tsx`: A pre-built Next.js page that stitches them all together.

### Integration Steps

1. Copy the `frontend_template` files into your Next.js `src/` directory.
2. Ensure you have the required UI libraries installed in your Next.js project:
   ```bash
   npm install recharts lucide-react
   ```
3. Set up a Next.js API Rewrite Proxy so the frontend can securely talk to the Python backend without CORS issues. Add this to your `next.config.ts`:

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/firecalc/:path*',
        destination: 'http://localhost:8000/api/fire/:path*', // Point to the FastAPI port
      },
    ];
  },
};
export default nextConfig;
```

### 🎨 Themes & Customization
The UI is styled using Tailwind CSS and assumes a dark-mode, slate-based color palette (`bg-slate-950`). Feel free to tweak the Recharts `<linearGradient>` colors inside `FireCalcChart.tsx` to match your own brand guidelines!
