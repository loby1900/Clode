const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const db = require("./db");

const PROJECTS_ROOT = path.join(__dirname, "..", "data", "projects");
fs.mkdirSync(PROJECTS_ROOT, { recursive: true });

function ensureProjectRoot(projectId) {
  const metadata = db.prepare("SELECT root_path FROM ai_projects WHERE id = ?").get(projectId);
  if (!metadata) throw new Error("Project not found.");
  if (!fs.existsSync(metadata.root_path)) {
    fs.mkdirSync(metadata.root_path, { recursive: true });
  }
  return metadata.root_path;
}

function safePath(basePath, relativePath) {
  const trimmed = String(relativePath || "").replace(/^\/+/, "").trim();
  if (!trimmed || trimmed === ".") return basePath;
  const candidate = path.resolve(basePath, trimmed);
  const normalizedBase = path.resolve(basePath);
  if (candidate !== normalizedBase && !candidate.startsWith(normalizedBase + path.sep)) {
    throw new Error("Invalid project path. Access outside the project root is not allowed.");
  }
  return candidate;
}

function listAllFiles(rootPath) {
  const entries = [];
  function walk(currentPath) {
    const children = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const child of children) {
      const fullPath = path.join(currentPath, child.name);
      if (child.isDirectory()) {
        if ([".git", "node_modules", "dist", "build", "venv", ".venv"].includes(child.name)) continue;
        entries.push({ path: path.relative(rootPath, fullPath).replace(/\\/g, "/"), type: "dir" });
        walk(fullPath);
        continue;
      }
      if (child.isFile()) {
        const rel = path.relative(rootPath, fullPath).replace(/\\/g, "/");
        if (rel.startsWith(".git/")) continue;
        const stat = fs.statSync(fullPath);
        entries.push({ path: rel, type: "file", size: stat.size });
      }
    }
  }
  walk(rootPath);
  return entries;
}

function listProjects() {
  return db.prepare("SELECT * FROM ai_projects ORDER BY updated_at DESC").all();
}

function createProject({ name, description = "" }) {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) throw new Error("Project name is required.");

  const id = randomUUID();
  const rootPath = path.join(PROJECTS_ROOT, id);
  fs.mkdirSync(rootPath, { recursive: true });
  fs.writeFileSync(path.join(rootPath, "README.md"), `# ${trimmedName}\n\n${description || "Project created by Clode."}\n`);

  db.prepare(`
    INSERT INTO ai_projects (id, name, description, root_path)
    VALUES (?, ?, ?, ?)
  `).run(id, trimmedName, description || "", rootPath);

  return db.prepare("SELECT * FROM ai_projects WHERE id = ?").get(id);
}

function getProject(projectId) {
  return db.prepare("SELECT * FROM ai_projects WHERE id = ?").get(projectId);
}

function readProjectFile(projectId, relativePath) {
  const project = getProject(projectId);
  if (!project) throw new Error("Project not found.");
  const filePath = safePath(project.root_path, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error("File not found in project.");
  }
  return fs.readFileSync(filePath, "utf8");
}

function writeProjectFile(projectId, relativePath, content) {
  const project = getProject(projectId);
  if (!project) throw new Error("Project not found.");
  const targetPath = safePath(project.root_path, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, String(content || ""));

  db.prepare(`
    UPDATE ai_projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(projectId);

  return { path: path.relative(project.root_path, targetPath).replace(/\\/g, "/") };
}

function deleteProject(projectId) {
  const project = getProject(projectId);
  if (!project) throw new Error("Project not found.");
  if (fs.existsSync(project.root_path)) {
    fs.rmSync(project.root_path, { recursive: true, force: true });
  }
  db.prepare("DELETE FROM ai_projects WHERE id = ?").run(projectId);
  db.prepare("DELETE FROM ai_chat_sessions WHERE project_id = ?").run(projectId);
  return { deleted: true, projectId };
}

module.exports = {
  PROJECTS_ROOT,
  createProject,
  deleteProject,
  ensureProjectRoot,
  getProject,
  listAllFiles,
  listProjects,
  readProjectFile,
  safePath,
  writeProjectFile
};
