export const productionChecklist = {
  desktopLogin: 'Verify the frontend can log in from a desktop browser against the production backend.',
  iphoneSafariLogin: 'Verify the login request succeeds on iPhone Safari with HTTPS and no mixed-content errors.',
  androidChromeLogin: 'Verify the login request succeeds on Android Chrome with the same HTTPS path.',
  apiConnectivity: 'Confirm the Render API responds to /api/v1/auth/login and /api/v1/auth/profile.',
  authentication: 'Confirm Sanctum token auth works for protected routes using the Authorization bearer header.',
  cors: 'Confirm preflight OPTIONS requests succeed and the browser receives the expected CORS headers.',
  https: 'Confirm all frontend and backend URLs are HTTPS-only.',
  offlineMode: 'Verify offline mode only triggers when the network is truly unavailable and not during normal API failures.',
  serviceWorker: 'Verify the PWA service worker is not intercepting API requests or breaking authentication.',
  environmentVariables: 'Verify Vercel and Render environment variables are present and consistent.'
};
