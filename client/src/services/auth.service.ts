import { ApiService } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';
}

interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: User;
  };
}

export class AuthService {
  static async login(email: string, password: string): Promise<LoginResponse> {
    return ApiService.fetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static async logout(): Promise<void> {
    return ApiService.fetch('/auth/logout', {
      method: 'POST',
    });
  }

  static async getMe(): Promise<{ success: boolean; data: { user: User } }> {
    return ApiService.fetch('/auth/me', {
      method: 'GET',
    });
  }
}
