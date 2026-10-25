const express = require("express");
const db = require("../db");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

function serializePost(row, viewerId) {
  const liked = viewerId
    ? !!db
        .prepare("SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?")
        .get(row.id, viewerId)
    : false;
  const likeCount = db
    .prepare("SELECT COUNT(*) c FROM likes WHERE post_id = ?")
    .get(row.id).c;
  const commentCount = db
    .prepare("SELECT COUNT(*) c FROM comments WHERE post_id = ?")
    .get(row.id).c;

  return {
    id: row.id,
    image_url: row.image_url,
    caption: row.caption,
    created_at: row.created_at,
    like_count: likeCount,
    comment_count: commentCount,
    liked_by_viewer: liked,
    author: {
      id: row.user_id,
      username: row.username,
      avatar_url: row.avatar_url,
    },
  };
}

// GET /api/posts?before=<post_id>&limit=12&user=<username>
router.get("/", optionalAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 12, 30);
  const before = parseInt(req.query.before, 10);
  const username = req.query.user;

  let rows;
  if (username) {
    const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (!user) return res.json({ posts: [] });
    rows = before
      ? db
          .prepare(
            `SELECT posts.*, users.username, users.avatar_url
             FROM posts JOIN users ON users.id = posts.user_id
             WHERE posts.user_id = ? AND posts.id < ?
             ORDER BY posts.id DESC LIMIT ?`
          )
          .all(user.id, before, limit)
      : db
          .prepare(
            `SELECT posts.*, users.username, users.avatar_url
             FROM posts JOIN users ON users.id = posts.user_id
             WHERE posts.user_id = ?
             ORDER BY posts.id DESC LIMIT ?`
          )
          .all(user.id, limit);
  } else {
    rows = before
      ? db
          .prepare(
            `SELECT posts.*, users.username, users.avatar_url
             FROM posts JOIN users ON users.id = posts.user_id
             WHERE posts.id < ?
             ORDER BY posts.id DESC LIMIT ?`
          )
          .all(before, limit)
      : db
          .prepare(
            `SELECT posts.*, users.username, users.avatar_url
             FROM posts JOIN users ON users.id = posts.user_id
             ORDER BY posts.id DESC LIMIT ?`
          )
          .all(limit);
  }

  const posts = rows.map((r) => serializePost(r, req.userId));
  res.json({ posts, next_before: rows.length === limit ? rows[rows.length - 1].id : null });
});

router.get("/:id", optionalAuth, (req, res) => {
  const row = db
    .prepare(
      `SELECT posts.*, users.username, users.avatar_url
       FROM posts JOIN users ON users.id = posts.user_id
       WHERE posts.id = ?`
    )
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: "المنشور غير موجود" });
  res.json({ post: serializePost(row, req.userId) });
});

router.post("/", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "لازم ترفع صورة" });
  const caption = (req.body.caption || "").toString().slice(0, 2200);
  const imageUrl = `/uploads/${req.file.filename}`;

  const info = db
    .prepare("INSERT INTO posts (user_id, image_url, caption) VALUES (?, ?, ?)")
    .run(req.userId, imageUrl, caption);

  const row = db
    .prepare(
      `SELECT posts.*, users.username, users.avatar_url
       FROM posts JOIN users ON users.id = posts.user_id
       WHERE posts.id = ?`
    )
    .get(info.lastInsertRowid);

  res.status(201).json({ post: serializePost(row, req.userId) });
});

router.delete("/:id", requireAuth, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "المنشور غير موجود" });
  if (post.user_id !== req.userId) {
    return res.status(403).json({ error: "مش مسموح تمسح منشور مستخدم تاني" });
  }
  db.prepare("DELETE FROM posts WHERE id = ?").run(post.id);
  res.json({ ok: true });
});

router.post("/:id/like", requireAuth, (req, res) => {
  const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "المنشور غير موجود" });

  const existing = db
    .prepare("SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?")
    .get(post.id, req.userId);

  if (existing) {
    db.prepare("DELETE FROM likes WHERE post_id = ? AND user_id = ?").run(post.id, req.userId);
  } else {
    db.prepare("INSERT INTO likes (post_id, user_id) VALUES (?, ?)").run(post.id, req.userId);
  }

  const likeCount = db.prepare("SELECT COUNT(*) c FROM likes WHERE post_id = ?").get(post.id).c;
  res.json({ liked: !existing, like_count: likeCount });
});

router.get("/:id/comments", (req, res) => {
  const rows = db
    .prepare(
      `SELECT comments.*, users.username, users.avatar_url
       FROM comments JOIN users ON users.id = comments.user_id
       WHERE comments.post_id = ?
       ORDER BY comments.id ASC`
    )
    .all(req.params.id);

  res.json({
    comments: rows.map((c) => ({
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      author: { id: c.user_id, username: c.username, avatar_url: c.avatar_url },
    })),
  });
});

router.post("/:id/comments", requireAuth, (req, res) => {
  const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "المنشور غير موجود" });

  const body = (req.body.body || "").toString().trim().slice(0, 500);
  if (!body) return res.status(400).json({ error: "التعليق مينفعش يكون فاضي" });

  const info = db
    .prepare("INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)")
    .run(post.id, req.userId, body);

  const c = db
    .prepare(
      `SELECT comments.*, users.username, users.avatar_url
       FROM comments JOIN users ON users.id = comments.user_id
       WHERE comments.id = ?`
    )
    .get(info.lastInsertRowid);

  res.status(201).json({
    comment: {
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      author: { id: c.user_id, username: c.username, avatar_url: c.avatar_url },
    },
  });
});

module.exports = router;
