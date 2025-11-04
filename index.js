require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/Auth");
const productRoutes = require("./routes/Product");
const orderRoutes = require("./routes/Order");
const cartRoutes = require("./routes/Cart");
const brandRoutes = require("./routes/Brand");
const categoryRoutes = require("./routes/Category");
const userRoutes = require("./routes/User");
const addressRoutes = require("./routes/Address");
const reviewRoutes = require("./routes/Review");
const wishlistRoutes = require("./routes/Wishlist");
const { connectToDB } = require("./database/db");

// server init
const server = express();

// database connection
connectToDB();

// ✅ Allowed origins
const allowedOrigins = [
  process.env.ORIGIN || "https://hot-wheels-shop-i5aj.vercel.app",
  "http://localhost:3000",
  "https://hot-wheels-shop.vercel.app",
];

// ✅ Debug log to confirm environment variables
console.log("✅ Allowed Origins:", allowedOrigins);
console.log("✅ Current NODE_ENV:", process.env.NODE_ENV);
console.log("✅ Current ORIGIN ENV:", process.env.ORIGIN);

// ✅ CORS middleware with debug logging
server.use(
  cors({
    origin: function (origin, callback) {
      console.log("🌐 Incoming request from origin:", origin);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("🚫 Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    exposedHeaders: ["X-Total-Count"],
    methods: ["GET", "POST", "PATCH", "DELETE"],
  })
);

server.use(express.json({ limit: "50mb" }));
server.use(express.urlencoded({ limit: "50mb", extended: true }));
server.use(cookieParser());
server.use(morgan("dev")); // logs HTTP requests with status

// ✅ Debug middleware: log all requests
server.use((req, res, next) => {
  console.log(`➡️ [${req.method}] ${req.originalUrl}`);
  next();
});

// routeMiddleware
server.use("/auth", authRoutes);
server.use("/users", userRoutes);
server.use("/products", productRoutes);
server.use("/orders", orderRoutes);
server.use("/cart", cartRoutes);
server.use("/brands", brandRoutes);
server.use("/categories", categoryRoutes);
server.use("/address", addressRoutes);
server.use("/reviews", reviewRoutes);
server.use("/wishlist", wishlistRoutes);

// root route
server.get("/", (req, res) => {
  console.log("✅ Root route hit");
  res.status(200).json({ message: "running" });
});

// ✅ Global error handler to catch async or CORS issues
server.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.message);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// server start
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server [STARTED] on http://localhost:${PORT}`);
});
