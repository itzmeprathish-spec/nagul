const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gadget_store";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function clientErrorStatus(err) {
  if (!err) return 500;
  if (err.name === "CastError" || err.name === "ValidationError") return 400;
  if (err.code === 11000) return 409;
  return 500;
}

const { Schema } = mongoose;
const User = mongoose.models.User || mongoose.model("User", new Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String
}));

const Product = mongoose.models.Product || mongoose.model("Product", new Schema({
  category: String,
  name: String,
  price: Number,
  imageUrl: String
}));

function signToken(user) {
  return jwt.sign({ sub: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash: hash });
    res.json({ token: signToken(user) });
  } catch (err) {
    res.status(clientErrorStatus(err)).json({ message: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password || "", user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    res.json({ token: signToken(user) });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const products = await Product.find(filter).lean();
    res.json({ products });
  } catch {
    res.status(500).json({ message: "Failed" });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    const ping = mongoose.connection.db ? await mongoose.connection.db.admin().ping() : null;
    res.json({ mongo: mongoose.connection.readyState, ping: !!ping });
  } catch {
    res.status(503).json({ message: "DB error" });
  }
});

app.post("/api/cart", auth, async (_req, res) => {
  res.json({ message: "Added to cart" });
});

app.post("/api/orders", async (_req, res) => {
  res.json({ orderId: `GS-${Date.now()}` });
});

const PUBLIC_DIR = path.join(__dirname, "public");
app.use(express.static(PUBLIC_DIR));
app.use(express.static(__dirname));
app.get("/", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.get("/checkout", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "checkout.html")));
app.get("/wishlist", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "wishlist.html")));

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");
  } catch {
    console.warn("MongoDB not connected. Running in fallback mode.");
  }
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
