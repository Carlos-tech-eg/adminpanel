/** Vercel injects env at runtime; avoid loading a stray local .env that could mask dashboard vars. */
if (process.env.VERCEL !== "1") {
  // eslint-disable-next-line global-require
  require("dotenv").config();
}

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const { requireAuth } = require("./middleware/auth");
const { seedUsersIfEmpty, DEMO_PASSWORD_NOTE } = require("./lib/seed");
const { resolveMongoUri } = require("./lib/resolveMongoUri");
const { corsOptions } = require("./lib/corsConfig");
const { getHealthPayload } = require("./lib/healthPayload");

const authRoutes = require("./routes/auth");
const noticesRoutes = require("./routes/notices");
const adminDocumentsRoutes = require("./routes/adminDocuments");
const messagesRoutes = require("./routes/messages");
const auditLogsRoutes = require("./routes/auditLogs");
const dashboardRoutes = require("./routes/dashboard");
const visaApplicationsRoutes = require("./routes/visaApplications");
const consularRegistrationsRoutes = require("./routes/consularRegistrations");
const consularRegistrationCanonical = require("./routes/consularRegistrationCanonical");
const newsArticlesRoutes = require("./routes/newsArticles");
const mediaAssetsRoutes = require("./routes/mediaAssets");
const appointmentsRoutes = require("./routes/appointments");
const { seedDemoContentIfEmpty } = require("./lib/seedDemoContent");
const MediaAsset = require("./models/MediaAsset");

const app = express();
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 1) || 1);

const PORT = Number(process.env.PORT) || 4010;
const DEFAULT_LOCAL_MONGO_URI = "mongodb://127.0.0.1:27017/embassy_admin";
const USE_MEMORY_MONGO = String(process.env.USE_MEMORY_MONGO || "").toLowerCase() === "true";

function ensureWritableDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    if (process.env.VERCEL === "1") {
      // Vercel's deployment filesystem is read-only; uploads are stored in MongoDB.
      return;
    }
    throw err;
  }
}

/** Serverless: connect Mongo only for API/admin routes so SPA + /health load when Atlas is misconfigured. */
function routeNeedsMongoConnect(req) {
  const p = req.path || "/";
  if (p === "/health" || p.startsWith("/meta")) return false;
  if (p.startsWith("/api") || p.startsWith("/admin")) return true;
  if (p.startsWith("/media-files")) return true;
  return false;
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors(corsOptions()));
app.use(express.json({ limit: "4mb" }));

const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_LOGIN_MAX_PER_WINDOW || 8),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== "POST",
  message: { error: "Too many login attempts. Try again in a few minutes." },
});

app.get("/health", (_req, res) => {
  res.json(getHealthPayload());
});

app.get("/meta/demo-users", (_req, res) => {
  const mock = String(process.env.MOCK_AUTH || "")
    .trim()
    .toLowerCase() === "true";
  res.json({
    mockAuth: mock,
    message: mock
      ? DEMO_PASSWORD_NOTE
      : "Production-style auth: passwords are verified with bcrypt. Create users with npm run create-admin or INITIAL_ADMIN_* on first boot.",
    login: "POST /api/auth/login with { email, password }",
    seededEmails: mock ? ["admin@embassy.demo", "consul@embassy.demo", "press@embassy.demo"] : [],
  });
});

app.use("/api/auth/login", authLoginLimiter);

app.use(async (req, res, next) => {
  if (!routeNeedsMongoConnect(req)) return next();
  try {
    await connectDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

const publicRoutes = require("./routes/public");
const contactInquiriesRoutes = require("./routes/contactInquiries");

app.use("/api/public", publicRoutes);
app.use("/api/consular-registration", consularRegistrationCanonical);

app.use("/api/auth", authRoutes);
app.use("/api/contact-inquiries", requireAuth, contactInquiriesRoutes);

app.use("/api/notices", requireAuth, noticesRoutes);
app.use("/api/audit-logs", requireAuth, auditLogsRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/visa-applications", requireAuth, visaApplicationsRoutes);
app.use("/api/consular-registrations", requireAuth, consularRegistrationsRoutes);
app.use("/api/news", requireAuth, newsArticlesRoutes);
app.use("/api/media", requireAuth, mediaAssetsRoutes);
app.use("/api/appointments", requireAuth, appointmentsRoutes);

const adminRouter = express.Router();
adminRouter.use("/documents", adminDocumentsRoutes);
adminRouter.use("/messages", messagesRoutes);
app.use("/admin", requireAuth, adminRouter);

const privateUploads = path.resolve(__dirname, "uploads", "private");
ensureWritableDir(privateUploads);

const publicMedia = path.resolve(__dirname, "uploads", "public-media");
ensureWritableDir(publicMedia);
app.get("/media-files/:filename", async (req, res, next) => {
  try {
    const filename = path.basename(String(req.params.filename || ""));
    if (!filename || filename !== req.params.filename) {
      return res.status(400).json({ error: "Invalid filename" });
    }
    const doc = await MediaAsset.findOne({ storedFileName: filename })
      .select("+data mimeType originalName")
      .lean();
    if (!doc || !doc.data) return next();
    res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
    res.setHeader("Cache-Control", process.env.NODE_ENV === "production" ? "public, max-age=604800" : "no-store");
    if (doc.originalName) {
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName)}"`);
    }
    return res.send(Buffer.from(doc.data));
  } catch (err) {
    return next(err);
  }
});
app.use(
  "/media-files",
  express.static(publicMedia, {
    maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
  })
);

const adminDist = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(path.join(adminDist, "index.html"))) {
  app.use(express.static(adminDist));
}

app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/admin") ||
    req.path.startsWith("/media-files") ||
    req.path.startsWith("/meta") ||
    req.path.startsWith("/assets") ||
    req.path === "/health"
  ) {
    return next();
  }
  const indexFile = path.join(adminDist, "index.html");
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  return next();
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err && String(err.message || "").includes("CORS")) {
    return res.status(403).json({ error: "Forbidden (origin not allowed)" });
  }
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;
  res.status(status).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && err.stack ? { stack: err.stack } : {}),
  });
});

let connectPromise;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    let mongoUri;
    if (USE_MEMORY_MONGO) {
      // eslint-disable-next-line global-require
      const { MongoMemoryServer } = require("mongodb-memory-server");
      // eslint-disable-next-line no-console
      console.log("[mongo] starting in-memory MongoDB (first run may download binaries)...");
      const mem = await MongoMemoryServer.create();
      mongoUri = mem.getUri();
      // eslint-disable-next-line no-underscore-dangle
      global.__embassyAdminMongoMemory = mem;
      // eslint-disable-next-line no-console
      console.log("[mongo] in-memory URI:", mongoUri);
    } else {
      let resolved;
      try {
        resolved = resolveMongoUri();
      } catch (e) {
        connectPromise = undefined;
        throw e;
      }
      const runsOnVercel = process.env.VERCEL === "1";
      const prodLike =
        process.env.NODE_ENV === "production" || runsOnVercel;
      if (prodLike && !resolved) {
        throw new Error(
          "Database not configured: set MONGODB_URI or MONGODB_ATLAS_USER, MONGODB_ATLAS_PASSWORD, " +
            "MONGODB_ATLAS_HOST, and MONGODB_ATLAS_DB in your environment (Vercel Project Settings → Environment Variables)."
        );
      }
      mongoUri = resolved ?? DEFAULT_LOCAL_MONGO_URI;
    }

    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 30_000,
        maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
      });
    } catch (connectErr) {
      const msg = String(connectErr && connectErr.message);
      if (
        msg.includes("ECONNREFUSED") &&
        (msg.includes("127.0.0.1:27017") || msg.includes("localhost:27017"))
      ) {
        throw new Error(
          "MongoDB is not running on this machine (127.0.0.1:27017). Options: start local MongoDB, " +
            "set MONGODB_URI or all MONGODB_ATLAS_* vars to MongoDB Atlas, or for local dev only set USE_MEMORY_MONGO=true."
        );
      }
      throw connectErr;
    }
    // eslint-disable-next-line no-console
    console.log("[mongo] connected");
    // eslint-disable-next-line no-console
    console.log("MongoDB connected");
    // eslint-disable-next-line no-console
    console.log(
      "[mongo] backing store:",
      USE_MEMORY_MONGO
        ? "in-memory (NOT your Atlas DB - set USE_MEMORY_MONGO=false in admin-panel/.env to use MONGODB_URI or MONGODB_ATLAS_*)"
        : mongoUri.startsWith("mongodb+srv")
          ? "Atlas (mongodb+srv)"
          : "from MONGODB_URI / local default"
    );

    const seedResult = await seedUsersIfEmpty();
    // eslint-disable-next-line no-console
    console.log("[seed]", seedResult);

    const seedDemo = String(process.env.SEED_DEMO_CONTENT || "")
      .trim()
      .toLowerCase() === "true";
    if (seedDemo) {
      const demo = await seedDemoContentIfEmpty();
      // eslint-disable-next-line no-console
      console.log("[demo]", demo);
    } else {
      // eslint-disable-next-line no-console
      console.log("[demo] skipped (set SEED_DEMO_CONTENT=true to insert sample news/visas/citas)");
    }
  })();

  try {
    await connectPromise;
  } catch (err) {
    connectPromise = undefined;
    throw err;
  }
}

async function start() {
  try {
    await connectDatabase();

    const server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`[server] listening on http://localhost:${PORT}`);
      // eslint-disable-next-line no-console
      console.log(`[ui]     open http://localhost:${PORT}/ after npm run build:ui`);
      // eslint-disable-next-line no-console
      console.log("[docs]   POST multipart /admin/documents/upload (field: file)");
      // eslint-disable-next-line no-console
      console.log("[docs]   GET /admin/documents/:fileId (Consul|Admin)");
    });

    server.on("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        // eslint-disable-next-line no-console
        console.error(
          `[fatal] Port ${PORT} is already in use (EADDRINUSE). Stop the other process or set a different PORT in admin-panel/.env (and match Vite proxy in frontend/vite.config.ts if you use npm run dev:ui).`
        );
        // eslint-disable-next-line no-console
        console.error(`        Windows: Task Manager -> end Node, or: netstat -ano | findstr :${PORT}`);
        process.exit(1);
      }
      // eslint-disable-next-line no-console
      console.error("[fatal] Server listen error:", err);
      process.exit(1);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[fatal]", err);
    process.exit(1);
  }
}

async function serverlessHandler(req, res) {
  return app(req, res);
}

if (require.main === module) {
  start();
}

module.exports = serverlessHandler;
module.exports.app = app;
module.exports.connectDatabase = connectDatabase;
