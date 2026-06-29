import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON body
  app.use(express.json());

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Generic secure API proxy endpoint for client requests
  app.post("/api/proxy", async (req, res) => {
    try {
      const { url, method = "GET", headers = {}, body } = req.body;
      if (!url) {
        return res.status(400).json({ error: "Missing 'url' field in request body" });
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Proxy target responded with status ${response.status}` });
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        return res.json(data);
      } else {
        const text = await response.text();
        return res.send(text);
      }
    } catch (e: any) {
      console.error("Proxy Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development or static file serving for production
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
