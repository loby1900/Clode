const state = {
  providers: [],
  projects: [],
  selectedProjectId: null,
  fileTree: [],
  activeFile: null,
  currentView: "workspace"
};

const elements = {
  providerStatus: document.querySelector("#provider-status"),
  providerBadge: document.querySelector("#provider-badge"),
  chatMessages: document.querySelector("#chat-messages"),
  chatForm: document.querySelector("#chat-form"),
  chatInput: document.querySelector("#chat-input"),
  projectForm: document.querySelector("#project-form"),
  projectList: document.querySelector("#project-list"),
  fileTree: document.querySelector("#file-tree"),
  fileEditor: document.querySelector("#file-editor"),
  projectSelector: document.querySelector("#project-selector"),
  openFileButton: document.querySelector("#open-file"),
  filePathInput: document.querySelector("#file-path"),
  saveFileButton: document.querySelector("#save-file"),
  providerForm: document.querySelector("#provider-form"),
  providerList: document.querySelector("#provider-list"),
  testProviderButton: document.querySelector("#test-provider"),
  clearChatButton: document.querySelector("#clear-chat"),
  themeToggle: document.querySelector("#theme-toggle")
};

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function setStatus(text, isGood) {
  elements.providerStatus.textContent = text;
  elements.providerStatus.className = isGood ? "status-good" : "status-bad";
}

function addMessage(role, content) {
  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;
  bubble.textContent = content;
  elements.chatMessages.appendChild(bubble);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function renderChatPlaceholders() {
  if (!elements.chatMessages.children.length) {
    addMessage("assistant", "Clode is ready. Configure a provider and choose a project to begin.");
  }
}

async function refreshProviders() {
  const data = await apiFetch("/api/providers");
  state.providers = data.providers || [];
  elements.providerList.innerHTML = "";

  if (!state.providers.length) {
    elements.providerList.innerHTML = "<div class=\"list-item\"><div><strong>No connections yet</strong><small>Use OpenAI-compatible credentials or a trusted local endpoint.</small></div></div>";
    setStatus("Unconfigured", false);
    elements.providerBadge.textContent = "No provider connected";
    return;
  }

  for (const provider of state.providers) {
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `
      <div>
        <strong>${provider.name || "Connection"}</strong>
        <small>${provider.provider_type || "openai-compatible"} · ${provider.model_id || "model not set"}</small>
      </div>
      <div class="list-actions">
        <button data-action="use-provider" data-id="${provider.id}" type="button">Use</button>
        <button data-action="delete-provider" data-id="${provider.id}" type="button">Delete</button>
      </div>
    `;
    elements.providerList.appendChild(row);
  }

  const first = state.providers[0];
  setStatus("Ready", true);
  elements.providerBadge.textContent = `${first.name || "Connected"} · ${first.model_id || "default model"}`;
}

async function refreshProjects() {
  const data = await apiFetch("/api/projects");
  state.projects = data.projects || [];
  elements.projectList.innerHTML = "";
  elements.projectSelector.innerHTML = "<option value=\"\">Select project</option>";

  if (!state.projects.length) {
    elements.projectList.innerHTML = "<div class=\"list-item\"><div><strong>No projects yet</strong><small>Create a workspace to begin coding.</small></div></div>";
    return;
  }

  for (const project of state.projects) {
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `
      <div>
        <strong>${project.name}</strong>
        <small>${project.description || "No description"}</small>
      </div>
      <div class="list-actions">
        <button data-action="select-project" data-id="${project.id}" type="button">Open</button>
        <button data-action="delete-project" data-id="${project.id}" type="button">Delete</button>
      </div>
    `;
    elements.projectList.appendChild(row);

    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    elements.projectSelector.appendChild(option);
  }

  if (!state.selectedProjectId && state.projects[0]) {
    state.selectedProjectId = state.projects[0].id;
  }
  elements.projectSelector.value = state.selectedProjectId || "";
  if (state.selectedProjectId) {
    loadProjectFiles(state.selectedProjectId);
  }
}

async function loadProjectFiles(projectId) {
  if (!projectId) return;
  state.selectedProjectId = projectId;
  const data = await apiFetch(`/api/projects/${projectId}/files`);
  const files = data.files || [];
  state.fileTree = files;
  elements.fileTree.innerHTML = "";

  const treeMap = new Map();
  for (const file of files) {
    const segments = file.path.split("/");
    let current = treeMap;
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      if (!current.has(segment)) {
        current.set(segment, { type: i === segments.length - 1 ? file.type : "dir", children: new Map() });
      }
      if (i < segments.length - 1) {
        current = current.get(segment).children;
      }
    }
  }

  function renderNodeMap(map, depth = 0) {
    const entries = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [name, node] of entries) {
      const label = document.createElement("div");
      label.className = "file-node";
      label.style.marginLeft = `${depth * 12}px`;
      label.textContent = name;
      if (node.type === "file") {
        label.addEventListener("click", () => openFileFromProject(node.path || name));
      }
      elements.fileTree.appendChild(label);
      if (node.children && node.children.size) renderNodeMap(node.children, depth + 1);
    }
  }

  renderNodeMap(treeMap);
}

async function openFileFromProject(relativePath) {
  if (!state.selectedProjectId) return;
  state.activeFile = relativePath;
  elements.filePathInput.value = relativePath;
  const data = await apiFetch(`/api/projects/${state.selectedProjectId}/file?path=${encodeURIComponent(relativePath)}`);
  elements.fileEditor.value = data.content || "";
}

async function saveActiveFile() {
  if (!state.selectedProjectId || !state.activeFile) {
    alert("Select a project file first.");
    return;
  }
  const value = elements.fileEditor.value;
  await apiFetch(`/api/projects/${state.selectedProjectId}/file`, {
    method: "POST",
    body: JSON.stringify({ path: state.activeFile, content: value })
  });
  addMessage("assistant", `Saved ${state.activeFile}`);
}

async function createProject(event) {
  event.preventDefault();
  const name = document.querySelector("#project-name").value.trim();
  const description = document.querySelector("#project-description").value.trim();
  if (!name) return;
  const data = await apiFetch("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name, description })
  });
  state.selectedProjectId = data.project.id;
  document.querySelector("#project-form").reset();
  await refreshProjects();
}

async function saveProvider(event) {
  event.preventDefault();
  const payload = {
    name: document.querySelector("#provider-name").value.trim() || "Default provider",
    providerType: document.querySelector("#provider-type").value,
    baseUrl: document.querySelector("#provider-base-url").value.trim(),
    modelId: document.querySelector("#provider-model").value.trim(),
    apiKey: document.querySelector("#provider-api-key").value.trim(),
    allowLocal: document.querySelector("#provider-allow-local").checked
  };

  if (!payload.baseUrl) {
    alert("Base URL is required.");
    return;
  }

  await apiFetch("/api/providers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  elements.providerForm.reset();
  await refreshProviders();
}

async function testConnection() {
  const payload = {
    name: document.querySelector("#provider-name").value.trim() || "Default provider",
    providerType: document.querySelector("#provider-type").value,
    baseUrl: document.querySelector("#provider-base-url").value.trim(),
    modelId: document.querySelector("#provider-model").value.trim(),
    apiKey: document.querySelector("#provider-api-key").value.trim(),
    allowLocal: document.querySelector("#provider-allow-local").checked
  };

  const result = await apiFetch("/api/providers/test", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  addMessage("assistant", `${result.status.toUpperCase()}: ${result.message}`);
  if (result.endpoint) {
    addMessage("assistant", `Endpoint: ${result.endpoint}`);
  }
}

async function sendChat(event) {
  event.preventDefault();
  const text = elements.chatInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  elements.chatInput.value = "";

  try {
    const payload = {
      message: text,
      projectId: state.selectedProjectId,
      providerId: state.providers[0]?.id || null
    };
    const result = await apiFetch("/api/chat", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    addMessage("assistant", result.answer || "No answer was returned.");
  } catch (error) {
    addMessage("assistant", `Error: ${error.message}`);
  }
}

async function deleteTarget(targetType, id) {
  if (!id) return;
  if (targetType === "provider") {
    await apiFetch(`/api/providers/${id}`, { method: "DELETE" });
  }
  if (targetType === "project") {
    await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
  }
  await refreshProviders();
  await refreshProjects();
}

function bindEvents() {
  elements.chatForm.addEventListener("submit", sendChat);
  elements.projectForm.addEventListener("submit", createProject);
  elements.providerForm.addEventListener("submit", saveProvider);
  elements.testProviderButton.addEventListener("click", testConnection);
  elements.clearChatButton.addEventListener("click", () => {
    elements.chatMessages.innerHTML = "";
    renderChatPlaceholders();
  });
  elements.openFileButton.addEventListener("click", () => {
    const value = elements.filePathInput.value.trim();
    if (value) openFileFromProject(value);
  });
  elements.saveFileButton.addEventListener("click", saveActiveFile);
  elements.projectSelector.addEventListener("change", (event) => {
    state.selectedProjectId = event.target.value;
    loadProjectFiles(state.selectedProjectId);
  });
  elements.providerList.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === "delete-provider") {
      await deleteTarget("provider", id);
    }
    if (button.dataset.action === "use-provider") {
      const provider = state.providers.find((item) => item.id === id);
      if (provider) {
        document.querySelector("#provider-name").value = provider.name || "";
        document.querySelector("#provider-type").value = provider.provider_type || "openai-compatible";
        document.querySelector("#provider-base-url").value = provider.base_url || "";
        document.querySelector("#provider-model").value = provider.model_id || "";
      }
    }
  });

  elements.projectList.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === "delete-project") {
      await deleteTarget("project", id);
    }
    if (button.dataset.action === "select-project") {
      state.selectedProjectId = id;
      elements.projectSelector.value = id;
      loadProjectFiles(id);
    }
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
      const panelIds = ["panel-chat", "panel-projects", "panel-files", "panel-integrations", "panel-settings"];
      panelIds.forEach((id) => {
        const visible = id === `panel-${button.dataset.view}` || (button.dataset.view === "workspace" && id === "panel-chat");
        document.getElementById(id).classList.toggle("hidden", !visible);
      });
    });
  });

  elements.themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light");
  });
}

async function init() {
  bindEvents();
  renderChatPlaceholders();
  await refreshProviders();
  await refreshProjects();
}

init().catch((error) => {
  addMessage("assistant", `Initialization failed: ${error.message}`);
});
