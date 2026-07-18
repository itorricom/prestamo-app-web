import { apiClient } from './client';

export type PaymentMethod = 'CASH' | 'DEPOSIT';

export interface Payment {
  id: string;
  installmentId: string;
  amount: string;
  paidDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreatePaymentRequest {
  installmentId: string;
  amount: number;
  paidDate: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export const paymentsAPI = {
  getAll: async (): Promise<Payment[]> => {
    const response = await apiClient.get<Payment[]>('/payments');
    return response.data;
  },

  create: async (data: CreatePaymentRequest): Promise<Payment> => {
    const response = await apiClient.post<Payment>('/payments', data);
    return response.data;
  },
};
