import { apiClient } from './client';

export interface Borrower {
  id: string;
  fullName: string;
  documentId?: string;
  phone?: string;
  address?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBorrowerRequest {
  fullName: string;
  documentId?: string;
  phone?: string;
  address?: string;
  email?: string;
}

export interface UpdateBorrowerRequest extends Partial<CreateBorrowerRequest> {}

export const borrowersAPI = {
  getAll: async (): Promise<Borrower[]> => {
    const response = await apiClient.get<Borrower[]>('/borrowers');
    return response.data;
  },

  getById: async (id: string): Promise<Borrower> => {
    const response = await apiClient.get<Borrower>(`/borrowers/${id}`);
    return response.data;
  },

  create: async (data: CreateBorrowerRequest): Promise<Borrower> => {
    const response = await apiClient.post<Borrower>('/borrowers', data);
    return response.data;
  },

  update: async (id: string, data: UpdateBorrowerRequest): Promise<Borrower> => {
    const response = await apiClient.patch<Borrower>(`/borrowers/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/borrowers/${id}`);
  },
};
