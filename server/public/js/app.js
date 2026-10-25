* { box-sizing: border-box; }
:root {
  --bg: #0b1020;
  --panel: #111827;
  --panel-alt: #171f2f;
  --panel-soft: #1b2438;
  --text: #e5edf8;
  --muted: #99a6c7;
  --line: rgba(148, 163, 184, 0.18);
  --accent: #7c9cff;
  --accent-strong: #8b5cf6;
  --success: #2dc770;
  --warning: #fbbf24;
  --danger: #ff6b6b;
  --shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
}

body.light {
  --bg: #eef3ff;
  --panel: #ffffff;
  --panel-alt: #f4f7ff;
  --panel-soft: #eaf0ff;
  --text: #1b2333;
  --muted: #4a5d84;
  --line: rgba(127, 146, 177, 0.24);
  --accent: #3d68ff;
  --accent-strong: #7c3aed;
  --success: #0f9f72;
  --warning: #b7791f;
  --danger: #d92d20;
  --shadow: 0 18px 40px rgba(79, 96, 138, 0.14);
}

html, body {
  margin: 0;
  min-height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, "Segoe UI", sans-serif;
}

body {
  transition: background 0.2s ease, color 0.2s ease;
}

button, input, select, textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  background: linear-gradient(180deg, rgba(17,24,39,0.9), rgba(11,16,32,0.96));
  border-right: 1px solid var(--line);
  padding: 24px 18px;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  font-weight: 800;
}

.brand-block h1 {
  margin: 0;
  font-size: 1.15rem;
}

.brand-block p {
  margin: 0;
  color: var(--muted);
  font-size: 0.72rem;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--text);
  text-align: left;
  padding: 10px 12px;
  transition: 0.2s;
}

.nav-item:hover, .nav-item.active {
  background: rgba(124, 156, 255, 0.1);
  border-color: var(--line);
}

.status-card, .panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: var(--shadow);
}

.status-card {
  margin-top: 24px;
  padding: 16px;
}

.status-label {
  display: block;
  color: var(--muted);
  font-size: 0.7rem;
  letter-spacing: .08em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.status-good {
  color: var(--success);
}

.status-bad {
  color: var(--danger);
}

.workspace {
  padding: 30px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--muted);
  font-size: 0.68rem;
}

.topbar h2 {
  margin: 8px 0 0;
  font-size: clamp(1.6rem, 2vw, 2.2rem);
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 0.9fr);
  gap: 22px;
}

.main-panel {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.panel {
  padding: 18px;
}

.hidden {
  display: none !important;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.05rem;
}

.chat-messages {
  min-height: 280px;
  max-height: 420px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: var(--panel-alt);
  border: 1px solid var(--line);
}

.message {
  padding: 12px 14px;
  border-radius: 12px;
  max-width: 88%;
  line-height: 1.5;
  white-space: pre-wrap;
}

.message.user {
  background: rgba(124, 156, 255, 0.15);
  align-self: flex-end;
}

.message.assistant {
  background: rgba(15, 159, 114, 0.08);
  align-self: flex-start;
}

.composer, .provider-form, .inline-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

textarea, input, select {
  width: 100%;
  background: var(--panel-alt);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 11px 12px;
}

textarea {
  resize: vertical;
  min-height: 80px;
}

.composer-actions, .stack-buttons, .editor-actions, .project-tools {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.primary-button, .ghost-button {
  border-radius: 10px;
  padding: 10px 14px;
  border: 1px solid var(--line);
}

.primary-button {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  border: none;
}

.ghost-button {
  background: transparent;
  color: var(--text);
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.list-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--panel-alt);
}

.list-item small {
  display: block;
  color: var(--muted);
}

.list-actions {
  display: flex;
  gap: 8px;
}

.list-actions button {
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--text);
  padding: 7px 10px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.checkbox-row {
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--muted);
}

.file-tree {
  margin: 16px 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel-alt);
  padding: 10px;
}

.file-node {
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text);
}

.file-node:hover {
  background: rgba(124, 156, 255, 0.12);
}

#file-editor {
  margin-top: 14px;
  min-height: 260px;
  background: #0f172a;
}

body.light #file-editor {
  background: #edf3ff;
}

.task-plan {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  line-height: 1.8;
}

.feature-list {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  line-height: 1.8;
}

.context-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (max-width: 980px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: none;
    border-bottom: 1px solid var(--line);
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .workspace {
    padding: 16px;
  }
}
