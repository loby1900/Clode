const { randomUUID } = require("crypto");
const { URL } = require("url");

const PROVIDER_CATALOG = [
  {
    id: "openai-compatible",
    label: "OpenAI-compatible",
    baseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    capabilities: ["chat", "tools", "structured-output", "vision"],
    notes: "Works for OpenAI-compatible APIs, OpenRouter, DeepSeek-like endpoints, and similar servers."
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    capabilities: ["chat", "vision", "tools", "audio", "structured-output"],
    notes: "Official OpenAI API, including chat completions and tool calling when supported by the model."
  },
  {
    id: "anthropic",
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    requiresApiKey: true,
    capabilities: ["chat", "vision", "tools", "structured-output"],
    notes: "Anthropic Messages API; model access must be enabled for the provided key."
  },
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    requiresApiKey: true,
    capabilities: ["chat", "vision", "audio", "structured-output"],
    notes: "Use the Google Generative Language API with a valid API key."
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    requiresApiKey: true,
    capabilities: ["chat", "code", "structured-output"],
    notes: "Uses OpenAI-compatible request shapes in most deployments."
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    requiresApiKey: true,
    capabilities: ["chat", "code", "fast-response"],
    notes: "Fast inference provider that often uses OpenAI-compatible endpoints."
  },
  {
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    requiresApiKey: true,
    capabilities: ["chat", "tools", "structured-output"],
    notes: "Mistral chat API and compatible models."
  },
  {
    id: "xai",
    label: "xAI",
    baseUrl: "https://api.x.ai/v1",
    requiresApiKey: true,
    capabilities: ["chat", "tools", "long-context"],
    notes: "xAI REST API; verify the exact model ID and response format before relying on advanced features."
  },
  {
    id: "azure-openai",
    label: "Azure OpenAI",
    baseUrl: "https://<your-resource>.openai.azure.com",
    requiresApiKey: true,
    capabilities: ["chat", "tools", "structured-output"],
    notes: "Requires a valid Azure endpoint and API key. The deployment name is usually the model alias."
  },
  {
    id: "ollama",
    label: "Ollama",
    baseUrl: "http://localhost:11434",
    requiresApiKey: false,
    allowLocal: true,
    capabilities: ["chat", "local-models", "code"],
    notes: "Runs locally; requires a locally running Ollama instance and explicit local trust."
  },
  {
    id: "custom",
    label: "Custom endpoint",
    baseUrl: "https://example.com",
    requiresApiKey: false,
    capabilities: ["chat"],
    notes: "Use only for documented endpoints you control or trust."
  }
];

const DEFAULT_TIMEOUT_MS = 20000;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function normalizeProviderType(type) {
  const normalized = String(type || "openai-compatible").trim().toLowerCase();
  if (normalized === "openai-compatible" || normalized === "openai_compatible") return "openai-compatible";
  if (normalized === "azure-openai" || normalized === "azure_openai") return "azure-openai";
  if (normalized === "gemini") return "gemini";
  if (normalized === "google-gemini") return "gemini";
  return normalized;
}

function joinUrl(baseUrl, suffix = "") {
  const normalizedBase = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalizedBase) return suffix ? `${suffix}` : "";
  const safeSuffix = suffix && !suffix.startsWith("/") ? `/${suffix}` : suffix;
  return `${normalizedBase}${safeSuffix || ""}`;
}

function parseHostIp(hostname) {
  if (!hostname) return null;
  const normalized = hostname.trim().toLowerCase();
  if (normalized === "localhost") return "localhost";
  if (normalized === "::1") return "::1";
  if (/^\d+\.\d+\.\d+\.\d+$/.test(normalized)) {
    return normalized.split(".").map(Number);
  }
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

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return false;
  if (parsed.username || parsed.password) return false;

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return Boolean(allowLocal);
  }

  const ipParts = parseHostIp(hostname);
  if (Array.isArray(ipParts)) return !isPrivateIPv4(ipParts);

  if (hostname.endsWith(".internal") || hostname.endsWith(".local")) {
    return Boolean(allowLocal);
  }

  return true;
}

function safeJsonFetch(urlString, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT_MS);

  return fetch(urlString, {
    ...options,
    signal: controller.signal
  })
    .then(async (response) => {
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : await response.text();
      return {
        status: response.status,
        ok: response.ok,
        payload,
        headers: response.headers
      };
    })
    .catch((error) => ({
      status: 0,
      ok: false,
      error: error.message || String(error),
      payload: null
    }))
    .finally(() => clearTimeout(timeout));
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

function getDefaultModelForProvider(providerType) {
  const normalized = normalizeProviderType(providerType);
  const defaults = {
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
  return defaults[normalized] || "gpt-4o-mini";
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [{ role: "user", content: String(messages || "") }];
  }

  return messages
    .filter((message) => message && (message.content || message.text))
    .map((message) => ({
      role: message.role || "user",
      content: String(message.content || message.text || "")
    }));
}

function extractTextFromMessages(messages) {
  const normalized = normalizeMessages(messages);
  return normalized.map((message) => `${message.role}: ${message.content}`).join("\n");
}

function buildOpenAiCompatiblePayload(config, messages, options) {
  const finalMessages = normalizeMessages(messages).map((message) => {
    if (typeof message.content === "string") return message;
    return { role: message.role || "user", content: String(message.content || "") };
  });

  return {
    model: config.modelId || getDefaultModelForProvider(config.providerType),
    messages: finalMessages,
    temperature: Number(options.temperature ?? 0.2),
    max_tokens: Number(options.maxTokens ?? 500),
    stream: false
  };
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
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  return headers;
}

async function callOpenAiCompatible(config, messages, options = {}) {
  const requestUrl = joinUrl(config.baseUrl, "/chat/completions");
  const body = buildOpenAiCompatiblePayload(config, messages, options);

  const result = await safeJsonFetch(requestUrl, {
    method: "POST",
    headers: buildProviderHeaders(config.providerType, config),
    body: JSON.stringify(body),
    timeout: DEFAULT_TIMEOUT_MS
  });

  if (!result.ok) {
    throw new Error(redactSecrets(JSON.stringify(result.payload || result.error || {})) || "The OpenAI-compatible provider returned an error.");
  }

  const payload = result.payload && typeof result.payload === "object" ? result.payload : {};
  const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
  const content = choice?.message?.content || payload.message?.content || "";

  if (!content) {
    throw new Error("The provider returned no usable message content.");
  }

  return {
    content,
    provider: config.name || config.providerType || "openai-compatible",
    model: config.modelId || body.model,
    usage: payload.usage || null,
    raw: payload,
    id: payload.id || randomUUID()
  };
}

async function callAnthropic(config, messages, options = {}) {
  const requestUrl = joinUrl(config.baseUrl, "/v1/messages");
  const finalMessages = normalizeMessages(messages).filter((message) => message.role !== "system");
  const textMessages = finalMessages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: [{ type: "text", text: message.content }]
  }));

  const systemPrompt = normalizeMessages(messages).find((message) => message.role === "system");

  const body = {
    model: config.modelId || getDefaultModelForProvider("anthropic"),
    max_tokens: Number(options.maxTokens ?? 512),
    messages: textMessages,
    system: systemPrompt ? systemPrompt.content : undefined,
    temperature: Number(options.temperature ?? 0.2)
  };

  const result = await safeJsonFetch(requestUrl, {
    method: "POST",
    headers: buildProviderHeaders("anthropic", config),
    body: JSON.stringify(body),
    timeout: DEFAULT_TIMEOUT_MS
  });

  if (!result.ok) {
    throw new Error(redactSecrets(JSON.stringify(result.payload || result.error || {})) || "Anthropic API request failed.");
  }

  const payload = result.payload && typeof result.payload === "object" ? result.payload : {};
  const text = Array.isArray(payload.content)
    ? payload.content.map((part) => part.text || "").join("\n").trim()
    : "";

  if (!text) {
    throw new Error("Anthropic returned no text content.");
  }

  return {
    content: text,
    provider: config.name || "anthropic",
    model: config.modelId || payload.model || "claude",
    usage: payload.usage || null,
    raw: payload,
    id: payload.id || randomUUID()
  };
}

async function callGemini(config, messages, options = {}) {
  const apiKey = config.apiKey;
  if (!apiKey) {
    throw new Error("A Gemini API key is required.");
  }

  const model = config.modelId || getDefaultModelForProvider("gemini");
  const promptText = extractTextFromMessages(messages);
  const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: Number(options.temperature ?? 0.2),
      maxOutputTokens: Number(options.maxTokens ?? 500)
    }
  };

  const result = await safeJsonFetch(requestUrl, {
    method: "POST",
    headers: buildProviderHeaders("gemini", config),
    body: JSON.stringify(body),
    timeout: DEFAULT_TIMEOUT_MS
  });

  if (!result.ok) {
    throw new Error(redactSecrets(JSON.stringify(result.payload || result.error || {})) || "Gemini API request failed.");
  }

  const payload = result.payload && typeof result.payload === "object" ? result.payload : {};
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
  if (!text) throw new Error("Gemini returned no content.");

  return {
    content: text,
    provider: config.name || "gemini",
    model,
    usage: payload.usageMetadata || null,
    raw: payload,
    id: payload.name || randomUUID()
  };
}

async function callProviderChat(config, messages, options = {}) {
  const providerType = normalizeProviderType(config.providerType);
  if (!config || !config.baseUrl) {
    throw new Error("A provider base URL is required.");
  }

  if (providerType === "anthropic") return callAnthropic(config, messages, options);
  if (providerType === "gemini") return callGemini(config, messages, options);
  if (providerType === "ollama") {
    const requestUrl = joinUrl(config.baseUrl, "/api/chat");
    const result = await safeJsonFetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.modelId || getDefaultModelForProvider("ollama"),
        messages: normalizeMessages(messages),
        stream: false
      }),
      timeout: DEFAULT_TIMEOUT_MS
    });

    if (!result.ok) {
      throw new Error(redactSecrets(JSON.stringify(result.payload || result.error || {})) || "Ollama request failed.");
    }

    const payload = result.payload && typeof result.payload === "object" ? result.payload : {};
    const content = payload.message?.content || "";
    if (!content) throw new Error("Ollama returned no readable content.");
    return {
      content,
      provider: config.name || "ollama",
      model: config.modelId || payload.model || getDefaultModelForProvider("ollama"),
      usage: payload.total_duration ? { total_duration: payload.total_duration } : null,
      raw: payload,
      id: payload.id || randomUUID()
    };
  }

  return callOpenAiCompatible(config, messages, options);
}

async function testProviderConnection(config) {
  const providerType = normalizeProviderType(config.providerType);
  const cleanedConfig = {
    ...config,
    providerType,
    modelId: config.modelId || getDefaultModelForProvider(providerType),
    allowLocal: Boolean(config.allowLocal)
  };

  if (!cleanedConfig.baseUrl || !isAllowedProviderUrl(cleanedConfig.baseUrl, cleanedConfig.allowLocal)) {
    return {
      status: "error",
      code: "INVALID_URL",
      message: "Base URL is invalid or blocked. Use a trusted public endpoint or explicitly allow a local endpoint only when needed."
    };
  }

  if (providerType === "gemini") {
    if (!cleanedConfig.apiKey) {
      return { status: "error", code: "MISSING_API_KEY", message: "Gemini requires a valid API key." };
    }
    const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanedConfig.apiKey)}`;
    const result = await safeJsonFetch(requestUrl, { method: "GET", timeout: DEFAULT_TIMEOUT_MS });
    if (result.ok) {
      return { status: "success", code: "CONNECTED", message: "Gemini API is reachable and accepted the key.", endpoint: requestUrl };
    }
    return {
      status: "error",
      code: "AUTH_FAILED",
      message: "Gemini rejected the key or the model API is unavailable.",
      details: redactSecrets(JSON.stringify(result.payload || result.error || {}))
    };
  }

  if (providerType === "anthropic") {
    if (!cleanedConfig.apiKey) {
      return { status: "error", code: "MISSING_API_KEY", message: "Anthropic requires an API key." };
    }
    const requestUrl = joinUrl(cleanedConfig.baseUrl, "/v1/models");
    const result = await safeJsonFetch(requestUrl, {
      method: "GET",
      headers: buildProviderHeaders("anthropic", cleanedConfig),
      timeout: DEFAULT_TIMEOUT_MS
    });
    if (result.ok) {
      return { status: "success", code: "CONNECTED", message: "Anthropic API validated successfully.", endpoint: requestUrl };
    }
    return {
      status: "error",
      code: result.status === 401 || result.status === 403 ? "AUTH_FAILED" : "CONNECTION_FAILED",
      message: result.status === 401 || result.status === 403 ? "The Anthropic API key was rejected." : "The provider could not be contacted.",
      details: redactSecrets(JSON.stringify(result.payload || result.error || {}))
    };
  }

  if (!cleanedConfig.apiKey && !cleanedConfig.allowLocal) {
    return {
      status: "error",
      code: "MISSING_API_KEY",
      message: "This provider requires an API key. If the endpoint is local, allow local connections explicitly."
    };
  }

  const requestUrl = joinUrl(cleanedConfig.baseUrl, "/models");
  const result = await safeJsonFetch(requestUrl, {
    method: "GET",
    headers: buildProviderHeaders(providerType, cleanedConfig),
    timeout: DEFAULT_TIMEOUT_MS
  });

  if (result.ok) {
    return {
      status: "success",
      code: "CONNECTED",
      message: `${providerType} appears to be reachable and responding to model requests.`,
      endpoint: requestUrl,
      model: cleanedConfig.modelId
    };
  }

  if (result.status === 401 || result.status === 403) {
    return {
      status: "error",
      code: "AUTH_FAILED",
      message: "The key was rejected or access was denied by the provider.",
      details: redactSecrets(JSON.stringify(result.payload || result.error || {}))
    };
  }

  const chatResult = await safeJsonFetch(joinUrl(cleanedConfig.baseUrl, "/chat/completions"), {
    method: "POST",
    headers: buildProviderHeaders(providerType, cleanedConfig),
    body: JSON.stringify({
      model: cleanedConfig.modelId,
      messages: [{ role: "user", content: "Connection check" }],
      max_tokens: 5,
      temperature: 0
    }),
    timeout: DEFAULT_TIMEOUT_MS
  });

  if (chatResult.ok) {
    return {
      status: "success",
      code: "CONNECTED",
      message: `${providerType} accepted a minimal chat request and is otherwise usable.`,
      endpoint: joinUrl(cleanedConfig.baseUrl, "/chat/completions"),
      model: cleanedConfig.modelId
    };
  }

  return {
    status: "inconclusive",
    code: "ENDPOINT_MISMATCH",
    message: "The endpoint responded, but it did not match the expected request format for this provider family.",
    details: redactSecrets(JSON.stringify(chatResult.payload || chatResult.error || {}))
  };
}

module.exports = {
  PROVIDER_CATALOG,
  DEFAULT_TIMEOUT_MS,
  isAllowedProviderUrl,
  testProviderConnection,
  callProviderChat,
  getDefaultModelForProvider,
  normalizeProviderType,
  redactSecrets,
  joinUrl,
  buildProviderHeaders,
  safeJsonFetch
};

