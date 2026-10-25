const state = {
  files: [],
  activeFileId: null,
  editor: document.getElementById('code-editor'),
  fileList: document.getElementById('file-list'),
  currentFileName: document.getElementById('current-file-name'),
  previewFrame: document.getElementById('preview-frame'),
  languageSelect: document.getElementById('language-select'),
  newFileBtn: document.getElementById('new-file-btn'),
  saveBtn: document.getElementById('save-btn'),
  previewBtn: document.getElementById('preview-btn')
};

async function fetchSnippets() {
  const response = await fetch('/api/snippets');
  if (!response.ok) {
    throw new Error('Unable to load files');
  }
  const files = await response.json();
  return files;
}

function getActiveFile() {
  return state.files.find((file) => file.id === state.activeFileId) || state.files[0] || null;
}

function renderFileList() {
  state.fileList.innerHTML = '';

  state.files.forEach((file) => {
    const button = document.createElement('button');
    button.className = `file-item ${file.id === state.activeFileId ? 'active' : ''}`;
    button.textContent = file.name;
    button.type = 'button';
    button.addEventListener('click', () => {
      state.activeFileId = file.id;
      renderFileList();
      syncEditorFromFile();
    });
    state.fileList.appendChild(button);
  });
}

function syncEditorFromFile() {
  const activeFile = getActiveFile();
  if (!activeFile) {
    state.editor.value = '';
    state.currentFileName.textContent = 'No file';
    return;
  }

  state.activeFileId = activeFile.id;
  state.editor.value = activeFile.content;
  state.currentFileName.textContent = activeFile.name;
  state.languageSelect.value = activeFile.language || 'text';
}

async function saveActiveFile() {
  const activeFile = getActiveFile();
  if (!activeFile) {
    return;
  }

  const payload = {
    name: activeFile.name,
    language: state.languageSelect.value,
    content: state.editor.value
  };

  const response = await fetch(`/api/snippets/${activeFile.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    console.error('Failed to save snippet');
    return;
  }

  state.files = await fetchSnippets();
  renderFileList();
  syncEditorFromFile();
}

async function createNewFile() {
  const name = prompt('File name', 'untitled.txt');
  if (!name) {
    return;
  }

  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : 'text';
  const languageMap = {
    html: 'html',
    css: 'css',
    js: 'javascript',
    json: 'json',
    md: 'markdown',
    txt: 'text'
  };

  const response = await fetch('/api/snippets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      language: languageMap[extension] || 'text',
      content: ''
    })
  });

  if (!response.ok) {
    console.error('Failed to create file');
    return;
  }

  const newFile = await response.json();
  state.files.push(newFile);
  state.activeFileId = newFile.id;
  renderFileList();
  syncEditorFromFile();
}

function updatePreview() {
  const activeFile = getActiveFile();
  if (!activeFile) {
    state.previewFrame.srcdoc = '<p>No preview available.</p>';
    return;
  }

  if (activeFile.language === 'html') {
    state.previewFrame.srcdoc = activeFile.content;
    return;
  }

  const htmlTemplate = `
    <html>
      <body>
        <style>${state.files.find((file) => file.language === 'css')?.content || ''}</style>
        <script>${state.files.find((file) => file.language === 'javascript')?.content || ''}</script>
      </body>
    </html>
  `;

  if (activeFile.language === 'css' || activeFile.language === 'javascript') {
    state.previewFrame.srcdoc = htmlTemplate;
    return;
  }

  state.previewFrame.srcdoc = `<pre>${escapeHtml(activeFile.content)}</pre>`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function init() {
  try {
    state.files = await fetchSnippets();
    if (!state.files.length) {
      return;
    }
    state.activeFileId = state.files[0].id;
    renderFileList();
    syncEditorFromFile();
    updatePreview();
  } catch (error) {
    console.error(error);
  }
}

state.newFileBtn.addEventListener('click', createNewFile);
state.saveBtn.addEventListener('click', saveActiveFile);
state.previewBtn.addEventListener('click', updatePreview);
state.languageSelect.addEventListener('change', async () => {
  const activeFile = getActiveFile();
  if (!activeFile) {
    return;
  }
  activeFile.language = state.languageSelect.value;
  await saveActiveFile();
});
state.editor.addEventListener('input', () => {
  const activeFile = getActiveFile();
  if (!activeFile) {
    return;
  }
  activeFile.content = state.editor.value;
});

init();
