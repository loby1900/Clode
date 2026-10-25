# Clode AI Workbench

A secure, project-aware AI development workbench designed for real provider connectivity, project-aware workflows, and user-controlled AI actions.

## Provider support

This app supports a broad set of AI provider families while keeping the actual execution layer honest and explicit:

- OpenAI-compatible endpoints
- OpenAI
- Anthropic
- Google Gemini
- DeepSeek
- Groq
- Mistral
- xAI
- Azure OpenAI
- Ollama local endpoints
- Custom trusted endpoints

The system does not claim universal support. Provider capability differs by model, auth rules, endpoint format, rate limits, and feature access. The app validates the connection and reports success, auth failure, or inconclusive results rather than faking a working setup.

## AI execution model

The AI is intentionally placed at the final execution layer:

1. Configure a provider
2. Select a model and endpoint
3. Open or create a project
4. Build a plan
5. Run only approved work
6. Keep user review and approval for destructive tasks

This means the AI acts as a project-aware assistant, not an uncontrolled external controller. Dangerous actions remain gated behind explicit approval and permission boundaries.

## Features

- Secure server-side encrypted API key storage
- Provider validation and safe URL checks
- Project creation and local file handling
- Controlled task planning and project-aware chat
- Modern dark/light workspace UI
- Broad provider catalog for OpenAI-style and compatible APIs

## Quick start

```bash
cd server
npm install
cp .env.example .env
npm start
```

Then open `http://localhost:3000`.

## Important truthfulness rule

No feature is claimed to work unless the provider and model are configured and a real connection can be validated. Local AI endpoints, custom gateways, image tools, or high-end capabilities require user-owned credentials and provider support.

## What this product is not

This is not an unlimited fake automation system. It is a real, configurable AI workbench that can operate within the boundaries of the configured provider, project files, and user approval rules.

