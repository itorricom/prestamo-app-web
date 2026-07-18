export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  role: 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'COLLECTOR';
  tenantId: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
