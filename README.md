# Clode

Clode is a lightweight local code workspace built for quick prototyping and testing small web projects.

## Features

- Simple file-based workspace
- Multiple file types: HTML, CSS, JavaScript, Markdown, JSON
- Live preview panel
- Local persistent storage via a backend API
- Ready to run with a single command

## Run it

```bash
npm install
npm start
```

Then open: http://localhost:3000

## Project structure

- `server.js` — Express server and API
- `public/` — frontend files
- `data/snippets.json` — saved snippets
