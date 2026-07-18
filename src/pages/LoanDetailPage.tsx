import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loansAPI } from '../api/loans';
import type { Installment, InstallmentStatus } from '../api/loans';
import { paymentsAPI } from '../api/payments';
import type { PaymentMethod } from '../api/payments';
import { Layout } from '../components/Layout';
import { formatMoney, formatDate } from '../utils/format';

const instStatusStyles: Record<InstallmentStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  PARTIAL: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

const instStatusLabels: Record<InstallmentStatus, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
};

// El backend no marca OVERDUE; se deriva por fecha para mostrar cuotas vencidas.
function effectiveStatus(inst: Installment): InstallmentStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (inst.status === 'PENDING' && inst.dueDate.slice(0, 10) < today) return 'OVERDUE';
  return inst.status;
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

const labelClass = 'mb-1.5 block text-[13px] font-semibold text-slate-600';

export function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState<Installment | null>(null);
  const [amount, setAmount] = useState('');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>('CASH');

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loans', id],
    queryFn: () => loansAPI.getById(id!),
    enabled: !!id,
  });

  const payMutation = useMutation({
    mutationFn: paymentsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', id] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Cobro registrado');
      setPaying(null);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Error al registrar el cobro');
    },
  });

  const openPayForm = (inst: Installment) => {
    setPaying(inst);
    setAmount(inst.installmentAmount);
    setPaidDate(new Date().toISOString().slice(0, 10));
    setMethod('CASH');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paying) return;
    payMutation.mutate({
      installmentId: paying.id,
      amount: Number(amount),
      paidDate,
      method,
    });
  };

  if (isLoading || !loan) {
    return (
      <Layout>
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
          Cargando préstamo…
        </div>
      </Layout>
    );
  }

  const paidCount = loan.installments.filter((i) => i.status === 'PAID').length;
  const overdueCount = loan.installments.filter((i) => effectiveStatus(i) === 'OVERDUE').length;
  const total = loan.installments.reduce((s, i) => s + parseFloat(i.installmentAmount), 0);
  const progress = loan.installments.length
    ? Math.round((paidCount / loan.installments.length) * 100)
    : 0;

  return (
    <Layout>
      <div className="mb-6">
        <Link to="/loans" className="text-sm font-medium text-brand-700 hover:underline">
          ← Volver a préstamos
        </Link>
      </div>

      {/* Resumen del préstamo */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {loan.borrower.fullName}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {loan.borrower.phone && `📞 ${loan.borrower.phone}`}
              {loan.borrower.documentId && ` · CI ${loan.borrower.documentId}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {overdueCount > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-[13px] font-semibold text-red-700">
                {overdueCount} {overdueCount === 1 ? 'cuota vencida' : 'cuotas vencidas'}
              </span>
            )}
            <span className="rounded-full bg-brand-100 px-3 py-1 text-[13px] font-semibold text-brand-700">
              {paidCount} / {loan.installments.length} cuotas pagadas
            </span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Capital</p>
            <p className="mt-0.5 font-semibold text-slate-800">{formatMoney(loan.principal)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tasa mensual</p>
            <p className="mt-0.5 font-semibold text-slate-800">{loan.monthlyRate}%</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Plazo</p>
            <p className="mt-0.5 font-semibold text-slate-800">{loan.termMonths} meses</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total a pagar</p>
            <p className="mt-0.5 font-semibold text-slate-800">{formatMoney(total)}</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {loan.notes && (
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
            📝 {loan.notes}
          </p>
        )}
      </div>

      {/* Formulario de cobro */}
      {paying && (
        <form
          onSubmit={submitPayment}
          className="mb-6 rounded-2xl border-2 border-brand-200 bg-brand-50/50 p-6 shadow-sm"
        >
          <h3 className="mb-4 text-base font-semibold text-slate-900">
            Registrar cobro — Cuota #{paying.number} ({formatMoney(paying.installmentAmount)})
          </h3>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Monto (Bs)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de pago</label>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Método</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className={inputClass}
              >
                <option value="CASH">Efectivo</option>
                <option value="DEPOSIT">Depósito</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={payMutation.isPending}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {payMutation.isPending ? 'Registrando…' : 'Registrar cobro'}
            </button>
            <button
              type="button"
              onClick={() => setPaying(null)}
              className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Plan de cuotas — tarjetas en móvil */}
      <div className="space-y-3 md:hidden">
        {loan.installments.map((inst) => (
          <div
            key={inst.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-800">
                Cuota #{inst.number}
                <span className="ml-2 font-normal text-slate-500">
                  {formatDate(inst.dueDate)}
                </span>
              </p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${instStatusStyles[effectiveStatus(inst)]}`}>
                {instStatusLabels[effectiveStatus(inst)]}
              </span>
            </div>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-lg font-semibold text-slate-900">
                {formatMoney(inst.installmentAmount)}
              </span>
              <span className="text-xs text-slate-400">
                Capital {formatMoney(inst.principalAmount)} · Interés {formatMoney(inst.interestAmount)}
              </span>
            </div>
            {inst.status !== 'PAID' ? (
              <button
                onClick={() => openPayForm(inst)}
                className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Cobrar esta cuota
              </button>
            ) : (
              inst.paidDate && (
                <p className="text-center text-xs text-slate-400">
                  Pagada el {formatDate(inst.paidDate)}
                </p>
              )
            )}
          </div>
        ))}
      </div>

      {/* Plan de cuotas — tabla en escritorio */}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Vencimiento</th>
              <th className="px-4 py-3 text-right">Cuota</th>
              <th className="px-4 py-3 text-right">Capital</th>
              <th className="px-4 py-3 text-right">Interés</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loan.installments.map((inst) => (
              <tr key={inst.id} className="transition hover:bg-brand-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">{inst.number}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(inst.dueDate)}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">
                  {formatMoney(inst.installmentAmount)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {formatMoney(inst.principalAmount)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {formatMoney(inst.interestAmount)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {formatMoney(inst.balance)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${instStatusStyles[effectiveStatus(inst)]}`}>
                    {instStatusLabels[effectiveStatus(inst)]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {inst.status !== 'PAID' && (
                    <button
                      onClick={() => openPayForm(inst)}
                      className="rounded-md bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-700 transition hover:bg-brand-600 hover:text-white"
                    >
                      Cobrar
                    </button>
                  )}
                  {inst.status === 'PAID' && inst.paidDate && (
                    <span className="text-xs text-slate-400">{formatDate(inst.paidDate)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
