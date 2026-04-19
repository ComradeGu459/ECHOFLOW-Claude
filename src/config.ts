// Backend API base URL
// In development: empty string (same origin, Express serves both)
// In production: set VITE_API_BASE_URL to your Railway backend URL
// e.g. https://your-app.railway.app
export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '';
