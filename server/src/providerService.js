const crypto = require("crypto");

function getEncryptionKey() {
  const rawKey = process.env.SECRET_KEY || process.env.JWT_SECRET || "dev-local-secret-change-me";
  return crypto.createHash("sha256").update(rawKey).digest();
}

function encryptText(value) {
  if (!value) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptText(value) {
  if (!value) return "";
  const [ivHex, tagHex, encryptedHex] = String(value).split(":");
  if (!ivHex || !tagHex || !encryptedHex) return "";
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

module.exports = { encryptText, decryptText };
