const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "xfonx-dev-secret-change-me";

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "تسجيل الدخول مطلوب" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.username = payload.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: "جلسة غير صالحة أو منتهية" });
  }
}

// Optional auth: attaches req.userId if a valid token is present, but doesn't block the request.
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.userId = payload.sub;
      req.username = payload.username;
    } catch (_err) {
      // ignore invalid token on optional routes
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
