const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'snippets.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initial = [
      {
        id: 'welcome-html',
        name: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Clode Preview</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="preview-shell">
      <h1>Welcome to Clode</h1>
      <p>Your local coding workspace is ready.</p>
      <button>Launch</button>
    </main>
  </body>
</html>`
      },
      {
        id: 'welcome-css',
        name: 'styles.css',
        language: 'css',
        content: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Arial, sans-serif;
  background: linear-gradient(135deg, #0f172a, #111827);
  color: #e5e7eb;
}

.preview-shell {
  text-align: center;
  padding: 2rem 3rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.6);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.3);
}

button {
  border: none;
  background: #22c55e;
  color: white;
  padding: 0.75rem 1.2rem;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
}`
      },
      {
        id: 'welcome-js',
        name: 'app.js',
        language: 'javascript',
        content: `document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('button');
  if (button) {
    button.addEventListener('click', () => {
      button.textContent = 'Launched ✅';
    });
  }
});`
      }
    ];

    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

function readSnippets() {
  ensureDataFile();
  const content = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(content);
}

function writeSnippets(snippets) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(snippets, null, 2), 'utf8');
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'Clode', status: 'running' });
});

app.get('/api/snippets', (req, res) => {
  const snippets = readSnippets();
  res.json(snippets);
});

app.post('/api/snippets', (req, res) => {
  const { name, language, content } = req.body;
  if (!name || !language || typeof content !== 'string') {
    return res.status(400).json({ error: 'Missing required snippet fields.' });
  }

  const snippets = readSnippets();
  const newSnippet = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    language,
    content
  };

  snippets.push(newSnippet);
  writeSnippets(snippets);
  res.status(201).json(newSnippet);
});

app.put('/api/snippets/:id', (req, res) => {
  const { id } = req.params;
  const { name, language, content } = req.body;
  const snippets = readSnippets();
  const index = snippets.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Snippet not found.' });
  }

  snippets[index] = {
    ...snippets[index],
    name: name || snippets[index].name,
    language: language || snippets[index].language,
    content: typeof content === 'string' ? content : snippets[index].content
  };

  writeSnippets(snippets);
  res.json(snippets[index]);
});

app.delete('/api/snippets/:id', (req, res) => {
  const { id } = req.params;
  const snippets = readSnippets();
  const filtered = snippets.filter((item) => item.id !== id);

  if (filtered.length === snippets.length) {
    return res.status(404).json({ error: 'Snippet not found.' });
  }

  writeSnippets(filtered);
  res.status(204).send();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Clode is running at http://localhost:${PORT}`);
});
