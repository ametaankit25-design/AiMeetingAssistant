const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const processRouter = require("./routes/process");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
// CORS configuration - allow requests from frontend
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // In production, set to your Amplify URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));
app.use(express.json());

// ── Health check endpoint ──────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ─────────────────────────────────────────────────
app.use("/api/process-audio", processRouter);

// ── 404 handler for unknown API routes ─────────────────────
app.use("/api/*", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// ── Global error handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Ensure uploads directory exists ────────────────────────
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads/ directory");
}

// ── Start server ───────────────────────────────────────────
const HOST = process.env.HOST || "0.0.0.0"; // Allow external connections in production
const server = app.listen(PORT, HOST, () => {
  console.log(
    `AI Meeting Assistant backend running on http://${HOST}:${PORT}`
  );
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Error: Port ${PORT} is already in use. Kill the other process or use a different port.`
    );
    process.exit(1);
  }
  console.error("Server error:", err);
  process.exit(1);
});
