const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const historyRoutes = require("./routes/historyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const favoritesRoutes = require("./routes/favoritesRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// Import error handler middleware
const errorHandler = require("./middleware/errorHandler");

// Import database connection
const connectDB = require("./config/db");

// Initialize express app
const app = express();
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
const server = http.createServer(app);

// Initialize Socket.IO with CORS and production settings
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
});

// Make io accessible to our routes
app.set("io", io);

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Join user to their personal room for notifications
  socket.on("join", (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their notification room`);
    }
  });

  // Join a room for specific post
  socket.on("join-post", (postId) => {
    socket.join(`post:${postId}`);
    console.log(`Socket ${socket.id} joined room for post: ${postId}`);
  });

  // Leave a post room
  socket.on("leave-post", (postId) => {
    socket.leave(`post:${postId}`);
    console.log(`Socket ${socket.id} left room for post: ${postId}`);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Set up rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Middlewares with security settings
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
  }),
);
app.use(morgan("dev"));
app.use(limiter);

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/posts", postRoutes);
  app.use("/api/history", historyRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/favorites", favoritesRoutes);
  app.use("/api/notifications", notificationRoutes);

if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "../client/build");
  app.use(express.static(clientBuildPath));
  // Only non-API GETs get the SPA fallback:
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Connect to database
connectDB();

// Start server with graceful shutdown
const PORT = process.env.PORT || 5000;
const serverInstance = server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  serverInstance.close(() => {
    console.log("Process terminated.");
  });
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  serverInstance.close(() => {
    process.exit(1);
  });
});
