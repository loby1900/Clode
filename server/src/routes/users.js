const express = require("express");
const db = require("../db");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

function serializeProfile(user, viewerId) {
  const postCount = db
    .prepare("SELECT COUNT(*) c FROM posts WHERE user_id = ?")
    .get(user.id).c;
  const followerCount = db
    .prepare("SELECT COUNT(*) c FROM follows WHERE following_id = ?")
    .get(user.id).c;
  const followingCount = db
    .prepare("SELECT COUNT(*) c FROM follows WHERE follower_id = ?")
    .get(user.id).c;
  const isFollowedByViewer = viewerId
    ? !!db
        .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
        .get(viewerId, user.id)
    : false;

  return {
    id: user.id,
    username: user.username,
    bio: user.bio,
    avatar_url: user.avatar_url,
    post_count: postCount,
    follower_count: followerCount,
    following_count: followingCount,
    is_followed_by_viewer: isFollowedByViewer,
    is_self: viewerId === user.id,
  };
}

router.get("/:username", optionalAuth, (req, res) => {
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(req.params.username);
  if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
  res.json({ user: serializeProfile(user, req.userId) });
});

router.patch("/me", requireAuth, upload.single("avatar"), (req, res) => {
  const fields = [];
  const values = [];

  if (typeof req.body.bio === "string") {
    fields.push("bio = ?");
    values.push(req.body.bio.slice(0, 300));
  }
  if (req.file) {
    fields.push("avatar_url = ?");
    values.push(`/uploads/${req.file.filename}`);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: "مفيش حاجة للتحديث" });
  }

  values.push(req.userId);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ user: serializeProfile(user, req.userId) });
});

router.post("/:username/follow", requireAuth, (req, res) => {
  const target = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(req.params.username);
  if (!target) return res.status(404).json({ error: "المستخدم غير موجود" });
  if (target.id === req.userId) {
    return res.status(400).json({ error: "مينفعش تتابع نفسك" });
  }

  const existing = db
    .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
    .get(req.userId, target.id);

  if (existing) {
    db.prepare(
      "DELETE FROM follows WHERE follower_id = ? AND following_id = ?"
    ).run(req.userId, target.id);
  } else {
    db.prepare(
      "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)"
    ).run(req.userId, target.id);
  }

  const followerCount = db
    .prepare("SELECT COUNT(*) c FROM follows WHERE following_id = ?")
    .get(target.id).c;

  res.json({ following: !existing, follower_count: followerCount });
});

module.exports = router;
