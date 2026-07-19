import test from 'node:test';
import assert from 'node:assert/strict';
import { getApiBaseUrl } from '../src/services/apiUrl.js';

test('uses a relative API base URL in production', () => {
  const baseUrl = getApiBaseUrl({ PROD: true, VITE_API_URL: '' });
  assert.equal(baseUrl, '/api/v1');
});

test('falls back to local backend URL during local development', () => {
  const baseUrl = getApiBaseUrl({ PROD: false, VITE_API_URL: '' });
  assert.equal(baseUrl, 'http://localhost:8000/api/v1');
});

test('respects an explicit VITE_API_URL when provided', () => {
  const baseUrl = getApiBaseUrl({ PROD: true, VITE_API_URL: 'https://api.example.com/v1' });
  assert.equal(baseUrl, 'https://api.example.com/v1');
});
