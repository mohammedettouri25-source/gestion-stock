import axios from 'axios';
import { getApiBaseUrl } from './apiUrl';

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

const retryableStatuses = new Set([408, 429, 500, 502, 503, 504]);
const retryableCodes = new Set(['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT']);

function isRetryableError(error) {
  const status = error?.response?.status;
  const code = error?.code;
  const message = error?.message || '';

  return (
    retryableCodes.has(code) ||
    retryableStatuses.has(status) ||
    message.includes('Network Error') ||
    message.includes('timeout')
  );
}

apiClient.interceptors.request.use((config) => {
  const headers = config.headers || {};
  headers.Accept = headers.Accept || 'application/json';
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  config.headers = headers;

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const retryCount = config.__retryCount || 0;
    const shouldRetry = !config.__isRetry && retryCount < 2 && isRetryableError(error);

    if (shouldRetry) {
      const delayMs = 1000 * (retryCount + 1);
      config.__retryCount = retryCount + 1;
      config.__isRetry = true;

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return apiClient(config);
    }

    const requestUrl = config.baseURL && config.url
      ? `${config.baseURL}${config.url}`
      : config.url || 'unknown';

    console.error('[API] Request failed', {
      url: requestUrl,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      code: error.code
    });

    return Promise.reject(error);
  }
);

export default apiClient;

export function getApiErrorMessage(error) {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.response?.status) {
    return `Request failed with status ${error.response.status}`;
  }

  if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
    return 'Unable to reach the server. Please check your internet connection or try again.';
  }

  if (error?.message?.includes('timeout')) {
    return 'The request timed out. The backend may be warming up, please try again.';
  }

  return error?.message || 'Unable to complete the request.';
}
