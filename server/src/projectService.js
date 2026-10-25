const { URL } = require("url");
const { randomUUID } = require("crypto");

const DEFAULT_TIMEOUT_MS = 20000;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function parseHostIp(hostname) {
  if (!hostname) return null;
  const normalized = hostname.trim().toLowerCase();
  if (normalized === "localhost") return "localhost";
  if (normalized === "::1") return "::1";
  if (/^\d+\.\d+\.\d+\.\d+$/.test(normalized)) {
    const parts = normalized.split(".").map(Number);
    return parts;
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
  if (Array.isArray(ipParts)) {
    return !isPrivateIPv4(ipParts);
  }

  if (hostname.endsWith(".internal") || hostname.endsWith(".local")) {
    return Boolean(allowLocal);
  }

  return true;
}

function joinUrl(baseUrl, suffix = "") {
  const normalizedBase = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalizedBase) return suffix ? `${suffix}` : "";
  const joined = `${normalizedBase}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
  return joined;
}

function buildProviderHeaders(config) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  return headers;
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
    return { status: 0, ok: false, error: error.message || "connection failed" };
  } finally {
    clearTimeout(timeout);
  }
}

function redactSecrets(text) {
  if (!text) return "";
  return String(text)
    .replace(/(Authorization\s*:\s*Bearer\s+)[^\s\r\n]+/gi, "$1[REDACTED]")
    .replace(/("api_key"\s*:\s*")([^"]+)"/gi, '$1[REDACTED]"')
    .replace(/(apiKey=)([^&\s]+)/gi, "$1[REDACTED]")
    .replace(/(Bearer\s+)([A-Za-z0-9._-]+)/gi, "$1[REDACTED]");
}

async function testProviderConnection(config) {
  const { providerType = "openai-compatible", baseUrl, apiKey, modelId } = config || {};

  if (!baseUrl || !isAllowedProviderUrl(baseUrl, Boolean(config.allowLocal))) {
    return {
      status: "error",
      code: "INVALID_URL",
      message: "Base URL is invalid or uses a blocked network target. Use https://... or a trusted localhost endpoint when explicitly allowed."
    };
  }

  if (!apiKey && !config.allowLocal) {
    return {
      status: "error",
      code: "MISSING_API_KEY",
      message: "This provider requires an API key to validate the connection."
    };
  }

  const model = modelId || "gpt-4o-mini";
  const endpoints = [
    "/models",
    "/chat/completions"
  ];

  for (const suffix of endpoints) {
    const requestUrl = joinUrl(baseUrl, suffix);
    const headers = buildProviderHeaders({ apiKey });

    if (suffix === "/models") {
      const result = await safeJsonFetch(requestUrl, {
        method: "GET",
        headers,
        timeout: DEFAULT_TIMEOUT_MS
      });

      if (result.ok) {
        return {
          status: "success",
          code: "CONNECTED",
          message: `Connection validated for ${providerType}.`,
          model,
          endpoint: requestUrl
        };
      }
      if (result.status === 401 || result.status === 403) {
        return {
          status: "error",
          code: "AUTH_FAILED",
          message: "The API key was rejected by the provider. Check the key and model access.",
          endpoint: requestUrl,
          details: result.payload
        };
      }
      continue;
    }

    const body = {
      model,
      messages: [{ role: "user", content: "Connection check" }],
      max_tokens: 5,
      temperature: 0
    };

    const result = await safeJsonFetch(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      timeout: DEFAULT_TIMEOUT_MS
    });

    if (result.ok) {
      return {
        status: "success",
        code: "CONNECTED",
        message: `Connection validated for ${providerType}.`,
        model,
        endpoint: requestUrl,
        sampleResponse: typeof result.payload === "object" ? result.payload : null
      };
    }

    if (result.status === 401 || result.status === 403) {
      return {
        status: "error",
        code: "AUTH_FAILED",
        message: "The API key was rejected by the provider. Check the key and model access.",
        endpoint: requestUrl,
        details: redactSecrets(JSON.stringify(result.payload || result.error || {}))
      };
    }

    if (result.status === 404 || result.status === 400) {
      return {
        status: "inconclusive",
        code: "ENDPOINT_MISMATCH",
        message: `The endpoint responded but did not match the expected OpenAI-compatible request format. Check the base URL and model ID.`,
        endpoint: requestUrl,
        details: redactSecrets(JSON.stringify(result.payload || result.error || {}))
      };
    }
  }

  return {
    status: "error",
    code: "CONNECTION_FAILED",
    message: "The provider could not be reached or did not return a valid reply.",
    details: "Check your base URL, network access, certificate, and provider availability."
  };
}

async function callProviderChat(config, messages, options = {}) {
  const normalized = Array.isArray(messages) ? messages : [{ role: "user", content: String(messages || "") }];
  const requestUrl = joinUrl(config.baseUrl, "/chat/completions");
  const body = {
    model: config.modelId || "gpt-4o-mini",
    messages: normalized,
    temperature: Number(options.temperature || 0.2),
    max_tokens: Number(options.maxTokens || 500),
    stream: false
  };

  const result = await safeJsonFetch(requestUrl, {
    method: "POST",
    headers: buildProviderHeaders(config),
    body: JSON.stringify(body),
    timeout: DEFAULT_TIMEOUT_MS
  });

  if (!result.ok) {
    throw new Error(
      redactSecrets(
        typeof result.payload === "string" ? result.payload : JSON.stringify(result.payload || result.error || {})
      ) || "Provider call failed."
    );
  }

  const payload = result.payload && typeof result.payload === "object" ? result.payload : {};
  const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
  const content = choice?.message?.content || payload.content || "";

  if (!content) {
    throw new Error("The provider returned no usable message content.");
  }

  return {
    content,
    provider: config.name || config.providerType || "provider",
    model: config.modelId || body.model,
    usage: payload.usage || null,
    id: payload.id || randomUUID()
  };
}

module.exports = {
  isAllowedProviderUrl,
  testProviderConnection,
  callProviderChat,
  redactSecrets,
  joinUrl
};
