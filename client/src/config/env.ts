/**
 * Frontend runtime configuration.
 *
 * Local development defaults to the Express API on port 4000.
 * In production (Vercel), set VITE_API_URL to the Render backend origin
 * (e.g. https://velozity-api.onrender.com) — no trailing slash.
 */
const DEFAULT_API_ORIGIN = 'http://localhost:4000';

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '');
}

export const API_ORIGIN = normalizeOrigin(
  import.meta.env.VITE_API_URL || DEFAULT_API_ORIGIN,
);

export const API_BASE_URL = `${API_ORIGIN}/api/v1`;

/** Socket.io connects to the backend origin (not the /api path). */
export const SOCKET_URL = API_ORIGIN;
