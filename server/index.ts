import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { loadDotEnvIfPresent } from "./loadEnv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === "production";
loadDotEnvIfPresent(path.resolve(__dirname, ".."));

async function startServer() {
  const { createApp } = await import("./app");
  const app = createApp();

  if (isProduction) {
    // Non-Vercel hosting: this same process serves the built SPA alongside the API.
    // (On Vercel, static files are served by the platform and only /api/* reaches this app.)
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    // Express 5 dropped bare "*" route patterns; a path-less middleware
    // catches everything not already handled above (API routes, static files).
    app.use((_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  const port = process.env.PORT || (isProduction ? 3000 : 8787);
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
