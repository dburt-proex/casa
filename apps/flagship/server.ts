import './src/server/env.js';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";
import { apiRouter } from "./src/server/routes/api.js";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Request Correlation ID Middleware
  app.use((req, res, next) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', req.headers['x-request-id']);
    next();
  });

  // Mount the modular API router
  app.use("/api", apiRouter);

  // Health check
  app.get("/health", (req, res) => {
    res.json({ 
      status: "ok", 
      service: "casa-flagship",
      config: {
        geminiConfigured: !!process.env.GEMINI_API_KEY?.trim()
      }
    });
  });

  // ============================================================================
  // Vite Middleware (Development) / Static Serving (Production)
  // ============================================================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CASA Control Plane Server running on port ${PORT}`);
  });
}

startServer();
