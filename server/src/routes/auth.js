const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { JWT_SECRET, requireAuth } = require("../middleware/auth");

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "30d",
  });
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    bio: user.bio,
    avatar_url: user.avatar_url,
  };
}

router.post("/register", (req, res) => {
  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ error: "الاسم والبريد وكلمة المرور كلها مطلوبة" });
  }
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({
      error: "اسم المستخدم لازم يكون 3-20 حرف، وحروف/أرقام/نقطة/أندرسكور بس",
    });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "كلمة المرور لازم تكون 6 أحرف على الأقل" });
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
    .get(username, email);
  if (existing) {
    return res.status(409).json({ error: "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل" });
  }

  const passwordHash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)")
    .run(username, email, passwordHash);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) {
    return res.status(400).json({ error: "اسم المستخدم/البريد وكلمة المرور مطلوبين" });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE username = ? OR email = ?")
    .get(identifier, identifier);

  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
  res.json({ user: publicUser(user) });
});

module.exports = router;
