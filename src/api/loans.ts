import { apiClient } from './client';
import type { Borrower } from './borrowers';

export type LoanStatus = 'ACTIVE' | 'PAID' | 'CANCELLED';
export type InstallmentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface Installment {
  id: string;
  loanId: string;
  number: number;
  dueDate: string;
  installmentAmount: string;
  principalAmount: string;
  interestAmount: string;
  balance: string;
  status: InstallmentStatus;
  paidDate: string | null;
}

export interface Loan {
  id: string;
  borrowerId: string;
  borrower: { fullName: string };
  principal: string;
  monthlyRate: string;
  termMonths: number;
  startDate: string;
  status: LoanStatus;
  notes: string | null;
  createdAt: string;
}

export interface LoanDetail extends Omit<Loan, 'borrower'> {
  borrower: Borrower;
  installments: Installment[];
}

export interface CreateLoanRequest {
  borrowerId: string;
  principal: number;
  monthlyRate: number;
  termMonths: number;
  startDate: string;
  notes?: string;
}

export const loansAPI = {
  getAll: async (): Promise<Loan[]> => {
    const response = await apiClient.get<Loan[]>('/loans');
    return response.data;
  },

  getById: async (id: string): Promise<LoanDetail> => {
    const response = await apiClient.get<LoanDetail>(`/loans/${id}`);
    return response.data;
  },

  create: async (data: CreateLoanRequest): Promise<LoanDetail> => {
    const response = await apiClient.post<LoanDetail>('/loans', data);
    return response.data;
  },
};
