import { API_BASE_URL } from '../config/env';

export class ApiService {
  private static getAccessToken: () => string | null = () => null;
  private static onUnauthenticated: () => void = () => {};

  /**
   * Initializes the API service with access to the current token
   * and a callback for when authentication is irrecoverably lost.
   */
  static initialize(getAccessToken: () => string | null, onUnauthenticated: () => void) {
    this.getAccessToken = getAccessToken;
    this.onUnauthenticated = onUnauthenticated;
  }

  /**
   * Core fetch wrapper that automatically attaches the Bearer token.
   * If a 401 is encountered, it attempts to refresh the token via the
   * HttpOnly cookie and retries the request once.
   */
  static async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Setup default headers
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = this.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const config: RequestInit = {
      ...options,
      headers,
      // VERY IMPORTANT: Send credentials (HttpOnly cookie) with every request
      // This allows the /refresh endpoint to work without JS interaction.
      credentials: 'true' === 'true' ? 'include' : 'same-origin',
    };

    let response = await fetch(url, config);

    // If unauthorized, attempt a silent token refresh rotation
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newToken = refreshData.data.accessToken;
          
          // Fire a custom event to notify AuthContext to update the token
          window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: { token: newToken } }));
          
          // Retry original request
          headers.set('Authorization', `Bearer ${newToken}`);
          response = await fetch(url, { ...config, headers });
        } else {
          // Refresh failed (e.g. cookie expired or revoked). Force logout.
          this.onUnauthenticated();
          throw new Error('Session expired');
        }
      } catch (error) {
        this.onUnauthenticated();
        throw error;
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw data.error || new Error(data.message || 'An error occurred');
    }

    return data;
  }
}
