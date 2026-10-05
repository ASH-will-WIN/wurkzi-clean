require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
const { supabase } = require("./db");
const path = require("path");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const jobRoutes = require("./routes/job");
const authRoutes = require("./routes/auth");
const paymentRoutes = require("./routes/payment");
const applicationRoutes = require("./routes/application");
const connectRoutes = require("./routes/connect");
const webhookRoutes = require("./routes/webhook");
const messageRoutes = require("./routes/message");
const reportRoutes = require("./routes/report");
const reviewRoutes = require("./routes/review");
const referralRoutes = require("./routes/referral");
const leaderboardRoutes = require("./routes/leaderboard");
const profileRoutes = require("./routes/profile");
const blockRoutes = require("./routes/block");

// Webhook routes (must be before express.json middleware)
app.use("/api/webhooks", webhookRoutes);

const allowedOrigins = [
  "http://localhost:3000", // Local development
  "https://wurkzi.com",
  "https://www.wurkzi.com",
  "https://fantastic-motivation-production.up.railway.app",
];

if (process.env.CLIENT_URL) {
  const clientUrl = process.env.CLIENT_URL.replace(/\/$/, "");
  allowedOrigins.push(clientUrl);

  // Also allow the alternative (www vs non-www)
  if (clientUrl.includes("://www.")) {
    allowedOrigins.push(clientUrl.replace("://www.", "://"));
  } else if (clientUrl.includes("://")) {
    allowedOrigins.push(clientUrl.replace("://", "://www."));
  }
}

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        console.error(`CORS Blocked: Origin "${origin}" not in allowed list:`, allowedOrigins);
        var msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Unauthorized"));

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return next(new Error("Unauthorized"));
  socket.userId = data.user.id;
  next();
});

io.on("connection", (socket) => {
  socket.join(socket.userId);
});

app.set("io", io);

// Increase payload size limit for Base64-encoded images
// Base64 encoding increases size by ~33%, so 10MB images become ~13MB
// Allow up to 50MB to handle multiple large images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/api/jobs", jobRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/connect", connectRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/leaderboards", leaderboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/blocks", blockRoutes);

app.get("/", (req, res) => {
  res.send("Wurkzi API is running");
});

// Remove static file serving if we are just an API
// app.use(express.static(path.join(__dirname, "../client/build")));
// app.get("/*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/build", "index.html"));
// });

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

