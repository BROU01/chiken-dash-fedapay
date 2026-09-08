import { createApp } from "../server/app";

// Vercel serverless entry point: a single catch-all function handles every
// /api/* route through the same Express app used for non-Vercel hosting.
export default createApp();
