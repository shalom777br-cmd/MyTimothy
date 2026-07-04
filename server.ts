import express from "express";
import path from "path";
import dotenv from "dotenv";

// Import all Vercel Serverless Function API handlers
import analyzeHandler from "./api/temote/analyze";
import suggestHandler from "./api/temote/suggest";
import notifyHandler from "./api/temote/notify";
import scheduleHandler from "./api/temote/schedule";
import dataHandler from "./api/temote/data";
import memoriesHandler from "./api/temote/memories";
import repoInfoHandler from "./api/github/repo-info";
import statusHandler from "./api/github/status";
import indexHandler from "./api/index";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up API routes by mapping them directly to the Vercel Serverless Function handlers
app.all("/api", (req, res) => indexHandler(req, res));
app.post("/api/temote/analyze", (req, res) => analyzeHandler(req, res));
app.post("/api/temote/suggest", (req, res) => suggestHandler(req, res));
app.post("/api/temote/notify", (req, res) => notifyHandler(req, res));
app.post("/api/temote/schedule", (req, res) => scheduleHandler(req, res));

app.get("/api/temote/data", (req, res) => dataHandler(req, res));
app.post("/api/temote/data", (req, res) => dataHandler(req, res));

app.all("/api/temote/memories", (req, res) => memoriesHandler(req, res));

app.get("/api/github/repo-info", (req, res) => repoInfoHandler(req, res));
app.get("/api/github/status", (req, res) => statusHandler(req, res));

// Vite / Static Assets Handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
    console.log(`Development server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
