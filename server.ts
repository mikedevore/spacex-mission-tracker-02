import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API constraints check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/news", async (req, res) => {
    const source = req.query?.source as string;
    const allowed = [
      'https://api.spaceflightnewsapi.net/v4/articles/?limit=30&ordering=-published_at',
      'https://api.spaceflightnewsapi.net/v4/articles/?limit=30&search=SpaceX',
      'https://api.spaceflightnewsapi.net/v4/articles/?limit=30&search=Starship',
    ];

    const url = allowed.includes(source) ? source : allowed[0];

    try {
      const r = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!r.ok) throw new Error(`Spaceflight News API HTTP ${r.status}`);
      const data = await r.json();
      res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
      res.status(200).json(data);
    } catch (error: any) {
      res.status(502).json({ error: error.message || 'News feed unavailable', results: [] });
    }
  });

  app.get("/api/backup-applet", async (req, res) => {
    try {
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip();
      const fs = (await import('fs')).default;
      const path = (await import('path')).default;

      // Add local directory files individually to avoid findFiles crash on broken symlinks in node_modules
      const files = fs.readdirSync(process.cwd());
      for (const file of files) {
        if (file === 'node_modules' || file === 'dist' || file.startsWith('.')) continue;
        const fullPath = path.join(process.cwd(), file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          zip.addLocalFolder(fullPath, file);
        } else {
          zip.addLocalFile(fullPath, "");
        }
      }

      const zipBuffer = zip.toBuffer();

      res.attachment('project_backup.zip');
      res.send(zipBuffer);
    } catch (err: any) {
      console.error(err);
      if (!res.headersSent) res.status(500).send({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
