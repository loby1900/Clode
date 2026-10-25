# Clode AI Workbench

A secure, project-aware AI workbench for modern software workflows. This project is designed to support a broad set of AI providers without pretending that all providers are universally compatible.

## Supported provider families

The backend supports these provider families through a provider adapter layer:

- OpenAI-compatible APIs
- OpenAI
- Anthropic
- Google Gemini
- DeepSeek
- Groq
- Mistral
- xAI
- Azure OpenAI
- Ollama (local trusted endpoints)
- Custom endpoints

The app is intentionally honest about capability differences. Each provider has different authentication, request formats, model access, and feature support. The app reports a truthful success, auth failure, or inconclusive result instead of faking a successful connection.

## What is implemented

- Secure server-side provider configuration
- Encrypted storage of API keys
- Provider testing and validation against real endpoints
- Project workspaces with local file reads/writes
- Project-aware chat for code and engineering tasks
- Support for local and public provider URLs with explicit safety rules
- Modern dark/light interface for chat, projects, files, and integrations

## Important truthfulness note

This app does not claim that a provider works unless the user configures a valid key, a supported base URL, and a compatible model. Some provider features such as vision, tools, audio, or file operations require specific model support and provider access.

## Quick start

```bash
cd server
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

## Provider configuration

Use the Integrations panel to enter:
- provider name
- provider type
- base URL
- model ID
- API key
- optional local trusted endpoint flag

## Security rules

- API keys are encrypted on the server before storage.
- Private HTTP endpoints are blocked unless explicitly allowed for local use.
- The app does not expose secrets in browser code or logs.
- Model execution only runs when a valid provider config is present.

## Recommended next steps

- Add provider-specific model discovery endpoints
- Add project import from Git repositories
- Add structured task approvals and patch review
- Add build/test execution in a sandboxed worker
- Add image generation and multimodal workflows behind explicit capability checks

The core architecture keeps the AI layer at the final execution boundary: the app configures providers, inspects projects, and then calls the selected model only when the settings and permissions are valid.

