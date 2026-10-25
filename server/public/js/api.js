const API = {
  base: "/api",

  token() {
    return localStorage.getItem("xfonx_token");
  },
  setToken(t) {
    if (t) localStorage.setItem("xfonx_token", t);
    else localStorage.removeItem("xfonx_token");
  },
  user() {
    try {
      return JSON.parse(localStorage.getItem("xfonx_user") || "null");
    } catch (_e) {
      return null;
    }
  },
  setUser(u) {
    if (u) localStorage.setItem("xfonx_user", JSON.stringify(u));
    else localStorage.removeItem("xfonx_user");
  },
  logout() {
    this.setToken(null);
    this.setUser(null);
    window.location.href = "/index.html";
  },

  async req(path, { method = "GET", body, isForm = false } = {}) {
    const headers = {};
    const t = this.token();
    if (t) headers["Authorization"] = `Bearer ${t}`;
    let payload = body;
    if (body && !isForm) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(this.base + path, { method, headers, body: payload });
    let data = {};
    try {
      data = await res.json();
    } catch (_e) {
      /* no body */
    }
    if (!res.ok) {
      throw new Error(data.error || `خطأ (${res.status})`);
    }
    return data;
  },

  register(username, email, password) {
    return this.req("/auth/register", { method: "POST", body: { username, email, password } });
  },
  login(identifier, password) {
    return this.req("/auth/login", { method: "POST", body: { identifier, password } });
  },
  me() {
    return this.req("/auth/me");
  },

  feed({ before, user } = {}) {
    const params = new URLSearchParams();
    if (before) params.set("before", before);
    if (user) params.set("user", user);
    const qs = params.toString();
    return this.req(`/posts${qs ? "?" + qs : ""}`);
  },
  createPost(file, caption) {
    const fd = new FormData();
    fd.append("image", file);
    fd.append("caption", caption || "");
    return this.req("/posts", { method: "POST", body: fd, isForm: true });
  },
  deletePost(id) {
    return this.req(`/posts/${id}`, { method: "DELETE" });
  },
  toggleLike(id) {
    return this.req(`/posts/${id}/like`, { method: "POST" });
  },
  comments(id) {
    return this.req(`/posts/${id}/comments`);
  },
  addComment(id, bodyText) {
    return this.req(`/posts/${id}/comments`, { method: "POST", body: { body: bodyText } });
  },

  profile(username) {
    return this.req(`/users/${username}`);
  },
  toggleFollow(username) {
    return this.req(`/users/${username}/follow`, { method: "POST" });
  },
  updateProfile({ bio, avatarFile }) {
    const fd = new FormData();
    if (bio !== undefined) fd.append("bio", bio);
    if (avatarFile) fd.append("avatar", avatarFile);
    return this.req("/users/me", { method: "PATCH", body: fd, isForm: true });
  },
};

function requireLogin() {
  if (!API.token()) {
    window.location.href = "/index.html";
    return false;
  }
  return true;
}

function showToast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2200);
}

function timeAgo(iso) {
  const d = new Date(iso.includes("Z") ? iso : iso + "Z");
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "الآن";
  if (diff < 3600) return `${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} يوم`;
  return d.toLocaleDateString("ar-EG");
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
