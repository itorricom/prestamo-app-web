export interface IniciarSesionRequest {
  email: string;
  password: string;
}

export interface Usuario {
  id: string;
  email: string;
  role?: string;
  tenantId?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: Usuario;
}
