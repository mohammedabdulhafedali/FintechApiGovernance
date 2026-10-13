import { UserPublicProfile } from '../types/auth';

const AUTH_BASE_URL = 'http://localhost:4000/api/v1/auth';
const TOKEN_KEY = 'gov_fintech_auth_token';

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  public removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  public getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public async login(identifier: string, password: string): Promise<{ token: string; user: UserPublicProfile }> {
    const response = await fetch(`${AUTH_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: identifier, password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    this.setToken(data.token);
    return { token: data.token, user: data.user };
  }

  public async getMe(): Promise<UserPublicProfile | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${AUTH_BASE_URL}/me`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        this.removeToken();
        return null;
      }

      const data = await response.json();
      return data.user || null;
    } catch {
      return null;
    }
  }

  public logout(): void {
    this.removeToken();
  }
}

export const authService = AuthService.getInstance();
