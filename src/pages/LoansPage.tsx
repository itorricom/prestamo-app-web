import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { loansAPI } from '../api/loans';
import type { CreateLoanRequest, LoanStatus } from '../api/loans';
import { borrowersAPI } from '../api/borrowers';
import { Layout } from '../components/Layout';
import { formatMoney, formatDate } from '../utils/format';

const loanSchema = z.object({
  borrowerId: z.string().min(1, 'Selecciona un prestatario'),
  principal: z.number('Ingresa un monto válido').positive('Debe ser mayor a 0'),
  monthlyRate: z.number('Ingresa una tasa válida').min(0, 'Mínimo 0').max(100, 'Máximo 100'),
  termMonths: z.number('Ingresa un plazo válido').int().min(1, 'Mínimo 1 mes').max(360, 'Máximo 360 meses'),
  startDate: z.string().min(1, 'Fecha requerida'),
  notes: z.string().optional(),
});

type LoanFormData = z.infer<typeof loanSchema>;

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

const labelClass = 'mb-1.5 block text-[13px] font-semibold text-slate-600';

const statusStyles: Record<LoanStatus, string> = {
  ACTIVE: 'bg-brand-100 text-brand-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-200 text-slate-500',
};

const statusLabels: Record<LoanStatus, string> = {
  ACTIVE: 'Activo',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
};

export function LoansPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: () => loansAPI.getAll(),
  });

  const { data: borrowers = [] } = useQuery({
    queryKey: ['borrowers'],
    queryFn: () => borrowersAPI.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLoanRequest) => loansAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Préstamo creado con su plan de cuotas');
      setShowForm(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear el préstamo');
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: { startDate: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = (data: LoanFormData) => {
    createMutation.mutate({ ...data, notes: data.notes || undefined });
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Préstamos</h1>
          {!isLoading && (
            <span className="rounded-full bg-brand-100 px-3 py-0.5 text-[13px] font-semibold text-brand-700">
              {loans.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={
            showForm
              ? 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50'
              : 'rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700'
          }
        >
          {showForm ? 'Cancelar' : '+ Nuevo préstamo'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="mb-5 text-base font-semibold text-slate-900">Nuevo préstamo</h3>

          <div className="mb-4">
            <label className={labelClass}>
              Prestatario <span className="text-red-500">*</span>
            </label>
            <select {...register('borrowerId')} className={inputClass} defaultValue="">
              <option value="" disabled>Selecciona un prestatario…</option>
              {borrowers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.fullName} {b.documentId ? `(CI ${b.documentId})` : ''}
                </option>
              ))}
            </select>
            {errors.borrowerId && (
              <p className="mt-1 text-xs text-red-600">{errors.borrowerId.message}</p>
            )}
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>
                Capital (Bs) <span className="text-red-500">*</span>
              </label>
              <input type="number" step="0.01" min="0" placeholder="5000" {...register('principal', { valueAsNumber: true })} className={inputClass} />
              {errors.principal && (
                <p className="mt-1 text-xs text-red-600">{errors.principal.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Tasa mensual (%) <span className="text-red-500">*</span>
              </label>
              <input type="number" step="0.1" min="0" max="100" placeholder="3" {...register('monthlyRate', { valueAsNumber: true })} className={inputClass} />
              {errors.monthlyRate && (
                <p className="mt-1 text-xs text-red-600">{errors.monthlyRate.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Plazo (meses) <span className="text-red-500">*</span>
              </label>
              <input type="number" min="1" max="360" placeholder="12" {...register('termMonths', { valueAsNumber: true })} className={inputClass} />
              {errors.termMonths && (
                <p className="mt-1 text-xs text-red-600">{errors.termMonths.message}</p>
              )}
            </div>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Fecha de inicio <span className="text-red-500">*</span>
              </label>
              <input type="date" {...register('startDate')} className={inputClass} />
              {errors.startDate && (
                <p className="mt-1 text-xs text-red-600">{errors.startDate.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Notas</label>
              <input placeholder="Opcional" {...register('notes')} className={inputClass} />
            </div>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMutation.isPending ? 'Creando…' : 'Crear préstamo'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
          Cargando préstamos…
        </div>
      ) : loans.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mb-3 text-4xl">📋</div>
          <p className="mb-1 font-semibold text-slate-700">Aún no hay préstamos</p>
          <p className="text-sm text-slate-500">Crea el primero para generar su plan de cuotas.</p>
        </div>
      ) : (
        <>
          {/* Tarjetas en móvil */}
          <div className="space-y-3 md:hidden">
            {loans.map((loan) => (
              <Link
                key={loan.id}
                to={`/loans/${loan.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-800">{loan.borrower.fullName}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[loan.status]}`}>
                    {statusLabels[loan.status]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">{formatMoney(loan.principal)}</span>
                  <span>{loan.monthlyRate}% mensual</span>
                  <span>{loan.termMonths} meses</span>
                  <span>Inicio: {formatDate(loan.startDate)}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Tabla en escritorio */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Prestatario</th>
                  <th className="px-5 py-3 text-right">Capital</th>
                  <th className="px-5 py-3 text-right">Tasa</th>
                  <th className="px-5 py-3 text-right">Plazo</th>
                  <th className="px-5 py-3">Inicio</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((loan) => (
                  <tr key={loan.id} className="transition hover:bg-brand-50/60">
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {loan.borrower.fullName}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-800">
                      {formatMoney(loan.principal)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-600">{loan.monthlyRate}%</td>
                    <td className="px-5 py-3.5 text-right text-slate-600">{loan.termMonths} m</td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDate(loan.startDate)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[loan.status]}`}>
                        {statusLabels[loan.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/loans/${loan.id}`}
                        className="rounded-md bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-700 transition hover:bg-brand-600 hover:text-white"
                      >
                        Ver cuotas
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
