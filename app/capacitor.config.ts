import type { CapacitorConfig } from '@capacitor/cli';

// The backend URL is baked in at build time from the XFONX_BACKEND_URL
// environment variable (set as a GitHub Actions repo variable/secret once
// the server is deployed - see server/render.yaml). Until that's set, the
// app falls back to the bundled placeholder page in www/.
const backendUrl = process.env.XFONX_BACKEND_URL || '';

const config: CapacitorConfig = {
  appId: 'com.xfonx.app',
  appName: 'XFONX',
  webDir: 'www',
  server: backendUrl
    ? {
        url: backendUrl,
        cleartext: false,
      }
    : undefined,
  android: {
    allowMixedContent: false,
  },
};

export default config;
