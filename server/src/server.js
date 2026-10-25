require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const { uploadsDir } = require("./middleware/upload");
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const userRoutes = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Static frontend + uploaded images
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/uploads", express.static(uploadsDir));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "XFONX" }));

// Centralized error handler (e.g. multer file-type/size errors)
app.use((err, _req, res, _next) => {
  if (err) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message || "حصل خطأ غير متوقع" });
  }
});

// SPA fallback for client-side routed pages (profile.html?user=... etc. are real files,
// this just covers unknown paths so refreshing deep links doesn't 404 the API).
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`XFONX running at http://localhost:${PORT}`);
});
