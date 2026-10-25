function renderTopbar(title) {
  return `
  <div class="topbar">
    <div class="brand">
      <div class="brand-mark">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 5L19 19M19 5L5 19" stroke="white" stroke-width="3.2" stroke-linecap="round"/>
        </svg>
      </div>
      <span>${title || "XFONX"}</span>
    </div>
    <button class="icon-btn" id="logoutBtn" title="تسجيل الخروج">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
      </svg>
    </button>
  </div>`;
}

function renderTabbar(active) {
  const me = API.user();
  const avatarSrc = me && me.avatar_url ? me.avatar_url : null;
  return `
  <div class="tabbar">
    <a class="tab ${active === "feed" ? "active" : ""}" href="/feed.html">
      <svg viewBox="0 0 24 24" fill="${active === "feed" ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
        <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V10.5z"/>
      </svg>
    </a>
    <button class="tab" id="newPostTabBtn">
      <span class="tab-add">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
          <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
        </svg>
      </span>
    </button>
    <a class="tab ${active === "profile" ? "active" : ""}" href="/profile.html?user=${me ? me.username : ""}">
      ${
        avatarSrc
          ? `<img class="avatar-tab" src="${avatarSrc}" alt="">`
          : `<svg viewBox="0 0 24 24" fill="${active === "profile" ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>`
      }
    </a>
  </div>`;
}

function mountShell(active, title) {
  if (!requireLogin()) return;
  document.getElementById("topbar-slot").outerHTML = renderTopbar(title);
  document.getElementById("tabbar-slot").outerHTML = renderTabbar(active);

  document.getElementById("logoutBtn").addEventListener("click", () => {
    API.logout();
  });
  document.getElementById("newPostTabBtn").addEventListener("click", () => {
    openNewPostModal();
  });
}

// ---- New post modal (shared across pages) ----
function ensureNewPostModal() {
  if (document.getElementById("newPostModal")) return;
  const div = document.createElement("div");
  div.innerHTML = `
  <div class="modal-backdrop" id="newPostModal">
    <div class="modal-sheet">
      <h2>منشور جديد</h2>
      <div class="file-drop" id="fileDrop">
        <div id="dropContent">اضغط هنا لاختيار صورة</div>
        <input type="file" id="fileInput" accept="image/*" style="display:none" />
      </div>
      <div class="field">
        <label>الوصف</label>
        <textarea id="captionInput" rows="3" placeholder="اكتب وصف للمنشور..."></textarea>
      </div>
      <button class="btn-primary" id="submitPostBtn">نشر</button>
      <button type="button" class="btn-secondary" id="cancelPostBtn" style="margin-top:8px">إلغاء</button>
    </div>
  </div>`;
  document.body.appendChild(div.firstElementChild);

  const modal = document.getElementById("newPostModal");
  const fileDrop = document.getElementById("fileDrop");
  const fileInput = document.getElementById("fileInput");
  const dropContent = document.getElementById("dropContent");
  const submitBtn = document.getElementById("submitPostBtn");
  const cancelBtn = document.getElementById("cancelPostBtn");
  let selectedFile = null;

  fileDrop.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const f = fileInput.files[0];
    if (!f) return;
    selectedFile = f;
    const reader = new FileReader();
    reader.onload = (e) => {
      dropContent.innerHTML = `<img src="${e.target.result}" alt="">`;
    };
    reader.readAsDataURL(f);
  });

  cancelBtn.addEventListener("click", () => closeNewPostModal());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeNewPostModal();
  });

  submitBtn.addEventListener("click", async () => {
    if (!selectedFile) {
      showToast("اختار صورة الأول");
      return;
    }
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span>`;
    try {
      const caption = document.getElementById("captionInput").value;
      await API.createPost(selectedFile, caption);
      showToast("تم النشر بنجاح");
      closeNewPostModal();
      if (typeof window.onPostCreated === "function") window.onPostCreated();
      else window.location.href = "/feed.html";
    } catch (err) {
      showToast(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "نشر";
      selectedFile = null;
      fileInput.value = "";
      dropContent.innerHTML = "اضغط هنا لاختيار صورة";
    }
  });
}

function openNewPostModal() {
  ensureNewPostModal();
  document.getElementById("newPostModal").classList.add("show");
}
function closeNewPostModal() {
  const m = document.getElementById("newPostModal");
  if (m) m.classList.remove("show");
}
