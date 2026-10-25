const crypto = require("crypto");
const { URL } = require("url");

const PROVIDER_CATALOG = [
  { id: "openai-compatible", label: "OpenAI-compatible", baseUrl: "https://api.openai.com/v1", requiresApiKey: true, supports: ["chat", "tools", "structured-output", "vision"], description: "Works with OpenAI-compatible gateways, OpenRouter, vLLM, and compatible proxy servers." },
  { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", requiresApiKey: true, supports: ["chat", "tools", "vision", "audio", "structured-output"], description: "Official OpenAI API with model-specific feature access." },
  { id: "anthropic", label: "Anthropic", baseUrl: "https://api.anthropic.com", requiresApiKey: true, supports: ["chat", "tools", "vision", "structured-output"], description: "Anthropic Messages API." },
  { id: "gemini", label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", requiresApiKey: true, supports: ["chat", "vision", "audio", "structured-output"], description: "Google Generative Language API." },
  { id: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com", requiresApiKey: true, supports: ["chat", "coding", "structured-output"], description: "OpenAI-style or provider-specific endpoint depending on deployment." },
  { id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", requiresApiKey: true, supports: ["chat", "coding", "fast-response"], description: "Fast model inference platform using OpenAI-compatible request shapes." },
  { id: "mistral", label: "Mistral", baseUrl: "https://api.mistral.ai/v1", requiresApiKey: true, supports: ["chat", "tools", "structured-output"], description: "Mistral APIs with model-specific support." },
  { id: "xai", label: "xAI", baseUrl: "https://api.x.ai/v1", requiresApiKey: true, supports: ["chat", "tools", "long-context"], description: "xAI API; verify exact model support and response format for advanced features." },
  { id: "azure-openai", label: "Azure OpenAI", baseUrl: "https://<your-resource>.openai.azure.com", requiresApiKey: true, supports: ["chat", "tools", "structured-output"], description: "Azure-hosted OpenAI deployments. Endpoint and deployment name are provider-specific." },
  { id: "ollama", label: "Ollama", baseUrl: "http://localhost:11434", requiresApiKey: false, allowLocal: true, supports: ["chat", "local-models", "coding"], description: "Locally running Ollama models; explicit local trust is required." },
  { id: "custom", label: "Custom endpoint", baseUrl: "https://example.com", requiresApiKey: false, supports: ["chat"], description: "Use any trusted endpoint you control or document explicitly." }
];

const DEFAULT_TIMEOUT_MS = 20000;
const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

function normalizeProviderType(type) {
  const value = String(type || "openai-compatible").trim().toLowerCase();
  if (["openai-compatible", "openai_compatible"].includes(value)) return "openai-compatible";
  if (["azure-openai", "azure_openai"].includes(value)) return "azure-openai";
  if (["google-gemini", "gemini"].includes(value)) return "gemini";
  return value;
}

function getDefaultModelForProvider(providerType) {
  const map = {
    openai: "gpt-4o-mini",
    "openai-compatible": "gpt-4o-mini",
    anthropic: "claude-3-5-sonnet-20241022",
    gemini: "gemini-1.5-flash",
    deepseek: "deepseek-chat",
    groq: "llama-3.3-70b-versatile",
    mistral: "mistral-small-latest",
    xai: "grok-2-latest",
    "azure-openai": "gpt-4o-mini",
    ollama: "llama3.1",
    custom: "model-name"
  };
  return map[normalizeProviderType(providerType)] || "gpt-4o-mini";
}

function joinUrl(baseUrl, suffix = "") {
  const normalized = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalized) return suffix ? `${suffix}` : "";
  const safeSuffix = suffix && !suffix.startsWith("/") ? `/${suffix}` : suffix;
  return `${normalized}${safeSuffix || ""}`;
}

function parseHostIp(hostname) {
  if (!hostname) return null;
  const normalized = hostname.trim().toLowerCase();
  if (normalized === "localhost") return "localhost";
  if (normalized === "::1") return "::1";
  if (/^\d+\.\d+\.\d+\.\d+$/.test(normalized)) return normalized.split(".").map(Number);
  return null;
}

function isPrivateIPv4(parts) {
  if (!Array.isArray(parts) || parts.length !== 4) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isAllowedProviderUrl(rawUrl, allowLocal = false) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (!SAFE_PROTOCOLS.has(parsed.protocol)) return false;
  if (parsed.username || parsed.password) return false;

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return Boolean(allowLocal);

  const ipParts = parseHostIp(hostname);
  if (Array.isArray(ipParts)) return !isPrivateIPv4(ipParts);

  if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return Boolean(allowLocal);

  return true;
}

function redactSecrets(value) {
  if (!value) return "";
  return String(value)
    .replace(/(Authorization\s*:\s*Bearer\s+)[^\s\r\n]+/gi, "$1[REDACTED]")
    .replace(/("api_key"\s*:\s*\")([^"]+)\"/gi, '$1[REDACTED]"')
    .replace(/(apiKey=)([^&\s]+)/gi, "$1[REDACTED]")
    .replace(/(Bearer\s+)([A-Za-z0-9._-]+)/gi, "$1[REDACTED]")
    .replace(/(x-api-key\s*:\s*)([^\s\r\n]+)/gi, "$1[REDACTED]")
    .replace(/(api-key\s*:\s*)([^\s\r\n]+)/gi, "$1[REDACTED]");
}

function buildProviderHeaders(providerType, config) {
  const type = normalizeProviderType(providerType);
  const headers = { Accept: "application/json" };

  if (type === "anthropic") {
    headers["Content-Type"] = "application/json";
    headers["x-api-key"] = config.apiKey || "";
    headers["anthropic-version"] = config.anthropicVersion || "2023-06-01";
    return headers;
  }

  if (type === "gemini") {
    headers["Content-Type"] = "application/json";
    return headers;
  }

  if (type === "azure-openai") {
    headers["Content-Type"] = "application/json";
    headers["api-key"] = config.apiKey || "";
    return headers;
  }

  headers["Content-Type"] = "application/json";
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  return headers;
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [{ role: "user", content: String(messages || "") }];
  }
  return messages
    .filter((message) => message && (message.content || message.text))
    .map((message) => ({ role: message.role || "user", content: String(message.content || message.text || "") }));
}

function extractTextFromMessages(messages) {
  return normalizeMessages(messages)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}

async function safeJsonFetch(urlString, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(urlString, {
      ...options,
      signal: controller.signal
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();
    return { status: response.status, ok: response.ok, payload, headers: response.headers };
  } catch (error) {
    return { status: 0, ok: false, error: error.message || String(error), payload: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAiCompatible(config, messages, options = {}) {
  const requestUrl = joinUrl(config.baseUrl, "/chat/completions");
  const body = {
    model: config.modelId || getDefaultModelForProvider(config.providerType),
    messages: normalizeMessages(messages),
    temperature: Number(options.temperature ?? 0.2),
    max_tokens: Number(options.maxTokens ?? 500),
    stream: false
  };

  const result = await safeJsonFetch(requestUrl, {
    method: "POST",
    headers: buildProviderHeaders(config.providerType, config),
    body: JSON.stringify(body),
    timeout: DEFAULT_TIMEOUT_MS
  });

  if (!result.ok) throw new Error(redactSecrets(JSON.stringify(result.payload || result.error || {})) || "OpenAI-compatible request failed.");

  const payload = result.payload && typeof result.payload === "object" ? result.payload : {};
  const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
  const content = choice?.message?.content || payload.message?.content || "";
  if (!content) throw new Error("Provider returned no usable content.");

  return {
    content,
    provider: config.name || config.providerType || "openai-compatible",
    model: config.modelId || body.model,
    usage: payload.usage || null,
    raw: payload,
    id: payload.id || crypto.randomUUID()
  };
}

async function callAnthropic(config, messages, options = {}) {
  const requestUrl = joinUrl(config.baseUrl, "/v1/messages");
  const userMessages = normalizeMessages(messages).filter((message) => message.role !== "system");
  const systemPrompt = normalizeMessages(messages).find((message) => message.role === "system");
  const payload = {
    model: config.modelId || getDefaultModelForProvider("anthropic"),
    max_tokens: Number(options.maxTokens ?? 512),
    temperature: Number(options.temperature ?? 0.2),
    messages: userMessages.map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: [{ type: "text", text: message.content }] })),
    ...(systemPrompt ? { system: systemPrompt.content } : {})
  };

  const result = await safeJsonFetch(requestUrl, {
    method: "POST",
    headers: buildProviderHeaders("anthropic", config),
    body: JSON.stringify(payload),
    timeout: DEFAULT_TIMEOUT_MS
  });

  if (!result.ok) throw new Error(redactSecrets(JSON.stringify(result.payload || result.error || {})) || "Anthropic API request failed.");

  const data = result.payload && typeof result.payload === "object" ? result.payload : {};
  const text = Array.isArray(data.content) ? data.content.map((part) => part.text || "").join("\n") : "";
  if (!text) throw new Error("Anthropic returned no text content.");

  return {
    content: text,
    provider: config.name || "anthropic",
    model: config.modelId || data.model || getDefaultModelForProvider("anthropic"),
    usage: data.usage || null,
    raw: data,
    id: data.id || crypto.randomUUID()
  };
}

async function callGemini(config, messages, options = {}) {
  if (!config.apiKey) throw new Error("A Gemini API key is required.");
  const model = config.modelId || getDefaultModelForProvider("gemini");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  const payload = {
    contents: [{ parts: [{ text: extractTextFromMessages(messages) }] }],
    generationConfig: {
      temperature: Number(options.temperature ?? 0.2),
      maxOutputTokens: Number(options.maxTokens ?? 500)
    }
  };

  const result = await safeJsonFetch(url, {
    method: "POST",
    headers: buildProviderHeaders("gemini", config),
    body: JSON.stringify(payload),
    timeout: DEFAULT_TIMEOUT_MS
  });

  if (!result.ok) throw new Error(redactSecrets(JSON.stringify(result.payload || result.error || {})) || "Gemini call failed.");
  const data = result.payload && typeof result.payload === "object" ? result.payload : {};
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
  if (!text) throw new Error("Gemini returned no useful content.");

  return {
    content: text,
    provider: config.name || "gemini",
    model,
    usage: data.usageMetadata || null,
    raw: data,
    id: data.name || crypto.randomUUID()
  };
}

async function callOllama(config, messages, options = {}) {
  const requestUrl = joinUrl(config.baseUrl, "/api/chat");
  const result = await safeJsonFetch(requestUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.modelId || getDefaultModelForProvider("ollama"),
      messages: normalizeMessages(messages),
      stream: false,
      options: {
        temperature: Number(options.temperature ?? 0.2)
      }
    }),
    timeout: DEFAULT_TIMEOUT_MS
  });

  if (!result.ok) throw new Error(redactSecrets(JSON.stringify(result.payload || result.error || {})) || "Ollama call failed.");
  const data = result.payload && typeof result.payload === "object" ? result.payload : {};
  const content = data.message?.content || "";
  if (!content) throw new Error("Ollama returned no readable content.");

  return {
    content,
    provider: config.name || "ollama",
    model: config.modelId || data.model || getDefaultModelForProvider("ollama"),
    usage: data.total_duration ? { total_duration: data.total_duration } : null,
    raw: data,
    id: data.id || crypto.randomUUID()
  };
}

async function callProviderChat(config, messages, options = {}) {
  if (!config || !config.baseUrl) throw new Error("A provider base URL is required.");
  const providerType = normalizeProviderType(config.providerType);

  if (providerType === "anthropic") return callAnthropic(config, messages, options);
  if (providerType === "gemini") return callGemini(config, messages, options);
  if (providerType === "ollama") return callOllama(config, messages, options);
  return callOpenAiCompatible(config, messages, options);
}

async function testProviderConnection(config) {
  const providerType = normalizeProviderType(config.providerType);
  const prepared = {
    ...config,
    providerType,
    modelId: config.modelId || getDefaultModelForProvider(providerType),
    allowLocal: Boolean(config.allowLocal)
  };

  if (!prepared.baseUrl || !isAllowedProviderUrl(prepared.baseUrl, prepared.allowLocal)) {
    return {
      status: "error",
      code: "INVALID_URL",
      message: "Base URL is invalid or blocked. Use a trusted destination or enable local endpoints only when necessary."
    };
  }

  if (providerType === "gemini") {
    if (!prepared.apiKey) {
      return { status: "error", code: "MISSING_API_KEY", message: "Gemini requires an API key." };
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(prepared.apiKey)}`;
    const result = await safeJsonFetch(url, { method: "GET", timeout: DEFAULT_TIMEOUT_MS });
    if (result.ok) return { status: "success", code: "CONNECTED", message: "Gemini API validated successfully.", endpoint: url };
    return { status: "error", code: result.status === 401 || result.status === 403 ? "AUTH_FAILED" : "CONNECTION_FAILED", message: result.status === 401 || result.status === 403 ? "The Gemini API key was rejected." : "The provider could not be reached.", details: redactSecrets(JSON.stringify(result.payload || result.error || {})) };
  }

  if (providerType === "anthropic") {
    if (!prepared.apiKey) return { status: "error", code: "MISSING_API_KEY", message: "Anthropic requires an API key." };
    const url = joinUrl(prepared.baseUrl, "/v1/models");
    const result = await safeJsonFetch(url, { method: "GET", headers: buildProviderHeaders("anthropic", prepared), timeout: DEFAULT_TIMEOUT_MS });
    if (result.ok) return { status: "success", code: "CONNECTED", message: "Anthropic API validated successfully.", endpoint: url };
    return { status: "error", code: result.status === 401 || result.status === 403 ? "AUTH_FAILED" : "CONNECTION_FAILED", message: result.status === 401 || result.status === 403 ? "The Anthropic key was rejected." : "The provider could not be reached.", details: redactSecrets(JSON.stringify(result.payload || result.error || {})) };
  }

  if (!prepared.apiKey && !prepared.allowLocal) {
    return { status: "error", code: "MISSING_API_KEY", message: "This provider requires an API key unless it is a trusted local endpoint." };
  }

  const modelsUrl = joinUrl(prepared.baseUrl, "/models");
  const modelsResult = await safeJsonFetch(modelsUrl, { method: "GET", headers: buildProviderHeaders(providerType, prepared), timeout: DEFAULT_TIMEOUT_MS });
  if (modelsResult.ok) {
    return { status: "success", code: "CONNECTED", message: `${providerType} is reachable and responding to model listings.`, endpoint: modelsUrl };
  }

  const fallbackUrl = joinUrl(prepared.baseUrl, "/chat/completions");
  const fallbackResult = await safeJsonFetch(fallbackUrl, {
    method: "POST",
    headers: buildProviderHeaders(providerType, prepared),
    body: JSON.stringify({ model: prepared.modelId, messages: [{ role: "user", content: "Connection check" }], max_tokens: 5, temperature: 0 }),
    timeout: DEFAULT_TIMEOUT_MS
  });

  if (fallbackResult.ok) {
    return { status: "success", code: "CONNECTED", message: `${providerType} accepted a minimal chat request.`, endpoint: fallbackUrl, model: prepared.modelId };
  }

  return { status: "inconclusive", code: "ENDPOINT_MISMATCH", message: "The endpoint responded, but it did not match the expected provider request format.", details: redactSecrets(JSON.stringify(fallbackResult.payload || fallbackResult.error || {})) };
}

module.exports = {
  PROVIDER_CATALOG,
  DEFAULT_TIMEOUT_MS,
  isAllowedProviderUrl,
  normalizeProviderType,
  getDefaultModelForProvider,
  testProviderConnection,
  callProviderChat,
  buildProviderHeaders,
  safeJsonFetch,
  redactSecrets,
  joinUrl,
  normalizeMessages,
  extractTextFromMessages
};

function getEncryptionKey() {
  const rawKey = process.env.SECRET_KEY || process.env.JWT_SECRET || "dev-local-secret-change-me";
  return crypto.createHash("sha256").update(rawKey).digest();
}

function encryptText(value) {
  if (!value) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptText(value) {
  if (!value) return "";
  const [ivHex, tagHex, encryptedHex] = String(value).split(":");
  if (!ivHex || !tagHex || !encryptedHex) return "";
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

module.exports.encryptText = encryptText;
module.exports.decryptText = decryptText;

{