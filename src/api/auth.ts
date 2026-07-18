import { apiClient } from './client';
export * from './types';
import type { LoginRequest, AuthResponse } from './types';

export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },
};
