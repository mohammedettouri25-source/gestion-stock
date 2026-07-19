export function getApiBaseUrl(env = null) {
  const runtimeEnv = env || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {});

  if (runtimeEnv.VITE_API_URL) {
    return runtimeEnv.VITE_API_URL;
  }

  if (runtimeEnv.PROD) {
    return '/api/v1';
  }

  return 'https://localhost/api/v1';
}
