# Clode AI Workbench

A secure, project-aware AI development workspace built for real provider integrations, project inspection, and controlled local workspaces.

## What this app includes

- Provider configuration for OpenAI-compatible endpoints and custom API URLs
- Encrypted credential storage on the server side
- Project creation and file tree browsing in a local workspace
- Chat interface that sends requests to the configured provider
- Truthful validation and safe error handling for failed or blocked connections
- Secure URL checks to reduce SSRF and private network misuse
- Responsive dark/light interface with project and file panels

## Important truthfulness note

This product is production-minded but not a fake demo. It does not secretly claim a provider is connected or working unless the user actually configured credentials and the backend receives a valid response. A live AI chat request requires a working provider endpoint, model access, and valid credentials from the user environment.

## Quick start

1. Install dependencies

```bash
cd server
npm install
cp .env.example .env
```

2. Update values in `.env` for your environment

```dotenv
PORT=3000
JWT_SECRET=change-this-to-a-long-random-string
SECRET_KEY=change-this-to-a-long-random-string
OPENAI_COMPATIBLE_BASE_URL=https://api.openai.com/v1
```

3. Start the app

```bash
npm start
```

Open `http://localhost:3000`.

## Core flows

### 1. Connect a provider

- Open the Integrations panel.
- Enter the provider name, base URL, model, and API key.
- Use the Test connection action to validate the endpoint.
- The app will return a truthful success, authentication error, or inconclusive result.

### 2. Create a project

- Use the Projects panel to create a workspace.
- Files are stored under `server/data/projects/<project-id>/`.
- You can open files, edit them, and save them back to disk.

### 3. Chat with the configured model

- The assistant sends project context and the user prompt to the configured provider.
- It uses the first connected provider if none is explicitly selected.
- If no provider is configured, the app returns a clear configuration message instead of a fake success.

## Security model

- API keys are stored encrypted with a server-side secret.
- URL validation blocks unsafe schemes and private-network SSRF targets unless explicitly allowed as local.
- Uploaded project content and provider configuration are kept server-side rather than embedded in the browser bundle.
- The app is designed for local-first operation and human approval for destructive actions.

## Testing

Run the backend checks:

```bash
cd server
npm test
```

## Limitations

- Real AI execution depends on user-owned credentials and provider access.
- Some models or endpoints may require different request formats or additional headers.
- This repository does not provide a cloud deployment or external AI account by default.
- Image generation, browser automation, and game workflows are intentionally surfaced as configuration-dependent features rather than pretending they are universal.

## Recommended next improvements

- Add real project import and Git integration.
- Add prompt templates and task execution history.
- Add a sandboxed worker for build, lint, and test commands.
- Add provider-specific adapters for Anthropic, Azure OpenAI, Gemini, and local model servers.
- Add project indexing and RAG features with explicit user approval.
