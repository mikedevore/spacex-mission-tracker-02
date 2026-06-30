import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import type { AddressInfo } from "net";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours — avoids re-hitting LL2 on every page load

async function fetchWithCache(url: string) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  console.log(`[Cache Miss] Fetching ${url} from origin`);
  const response = await fetch(url, { headers: { 'User-Agent': 'SpaceXTracker/2.0', 'Accept': 'application/json' } });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}

async function startServer() {
  const app = express();
  const preferredPort = Number.parseInt(process.env.PORT ?? "3000", 10);
  const host = process.env.HOST ?? "127.0.0.1";

  async function listenOnAvailablePort(startPort: number) {
    for (let port = startPort; port < startPort + 20; port += 1) {
      try {
        const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
          const listener = app.listen(port, host, () => resolve(listener));
          listener.on("error", reject);
        });

        return server;
      } catch (error: any) {
        if (error?.code === "EADDRINUSE") {
          continue;
        }

        throw error;
      }
    }

    throw new Error(`Unable to find a free port starting from ${startPort}`);
  }

  // Basic API endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // News Proxy
  app.get("/api/news", async (req, res) => {
    try {
      const source = req.query.source as string;
      if (!source) {
        return res.status(400).json({ error: "Missing source parameter" });
      }
      const data = await fetchWithCache(source);
      res.json(data);
    } catch (e: any) {
      console.error(`Error fetching news: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  // Generic API Proxy for whitelisted domains (SpaceX, SpaceDevs)
  app.get("/api/proxy", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "Missing url parameter" });
      }
      
      const allowedDomains = ["api.spacexdata.com", "ll.thespacedevs.com", "lldev.thespacedevs.com", "api.spaceflightnewsapi.net"];
      try {
        const urlObj = new URL(url);
        if (!allowedDomains.includes(urlObj.hostname)) {
          return res.status(403).json({ error: "Domain not allowed" });
        }
      } catch (e) {
        return res.status(400).json({ error: "Invalid URL" });
      }

      const data = await fetchWithCache(url);
      res.json(data);
    } catch (e: any) {
      console.error(`Proxy Error for ${req.query.url}: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  // Fetches a spacex.com launch page and extracts the X broadcast URL embedded in the HTML.
  // Used by upcoming mission feed to resolve x.com/i/broadcasts/XXXXX links.
  app.get("/api/spacex-webcast", async (req, res) => {
    const url = ((req.query.url as string) || "").trim();
    if (!url || !/^https?:\/\/(www\.)?spacex\.com\//i.test(url)) {
      return res.status(400).json({ error: "invalid url — must be a spacex.com page" });
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const upstream = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SpaceXMissionTracker/1.0)",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timer);
      if (!upstream.ok) {
        return res.status(502).json({ error: `spacex.com returned ${upstream.status}` });
      }
      const html = await upstream.text();
      const match = html.match(/https?:\/\/x\.com\/i\/broadcasts\/[A-Za-z0-9]+/);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).json({ broadcastUrl: match ? match[0] : null });
    } catch (err: any) {
      console.error("[spacex-webcast]", err.message);
      return res.status(502).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = await listenOnAvailablePort(preferredPort);
  const address = server.address() as AddressInfo | null;
  const port = address?.port ?? preferredPort;

  console.log(`Server running on http://${host}:${port}`);
}

startServer();
