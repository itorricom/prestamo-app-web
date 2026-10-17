import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { prestamosAPI } from '../api/prestamos';
import type { Cuota, EstadoCuota } from '../api/prestamos';
import { pagosAPI } from '../api/pagos';
import type { MetodoPago } from '../api/pagos';
import { Layout } from '../components/Layout';
import { formatMoney, formatDate } from '../utils/format';

const estilosEstadoCuota: Record<EstadoCuota, string> = {
  PENDIENTE: 'bg-slate-100 text-slate-600',
  PARCIAL: 'bg-amber-100 text-amber-700',
  PAGADO: 'bg-emerald-100 text-emerald-700',
  VENCIDO: 'bg-red-100 text-red-700',
};

const etiquetasEstadoCuota: Record<EstadoCuota, string> = {
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Parcial',
  PAGADO: 'Pagada',
  VENCIDO: 'Vencida',
};

// Determina si una cuota pendiente está vencida según la fecha actual
function calcularEstadoEfectivo(cuota: Cuota): EstadoCuota {
  const hoy = new Date().toISOString().slice(0, 10);
  if (cuota.estado === 'PENDIENTE' && cuota.fecha_vencimiento.slice(0, 10) < hoy) {
    return 'VENCIDO';
  }
  return cuota.estado;
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

const labelClass = 'mb-1.5 block text-[13px] font-semibold text-slate-600';

export function DetallePrestamoPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [cobrandoCuota, setCobrandoCuota] = useState<Cuota | null>(null);
  const [monto, setMonto] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');

  const { data: prestamo, isLoading } = useQuery({
    queryKey: ['prestamo', id],
    queryFn: () => prestamosAPI.obtenerPorId(id!),
    enabled: !!id,
  });

  const pagarMutation = useMutation({
    mutationFn: pagosAPI.registrar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prestamo', id] });
      queryClient.invalidateQueries({ queryKey: ['prestamos'] });
      toast.success('Cobro registrado exitosamente');
      setCobrandoCuota(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al registrar el cobro');
    },
  });

  const abrirFormularioCobro = (cuota: Cuota) => {
    setCobrandoCuota(cuota);
    setMonto(String(cuota.monto_cuota));
    setFechaPago(new Date().toISOString().slice(0, 10));
    setMetodo('EFECTIVO');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const enviarCobro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cobrandoCuota) return;
    pagarMutation.mutate({
      cuota_id: cobrandoCuota.id,
      monto_pagado: Number(monto),
      fecha_pago: fechaPago,
      metodo_pago: metodo,
    });
  };

  if (isLoading || !prestamo) {
    return (
      <Layout>
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
          Cargando detalle del préstamo…
        </div>
      </Layout>
    );
  }

  const cuotasPagadas = prestamo.cuotas.filter((c) => c.estado === 'PAGADO').length;
  const cuotasVencidas = prestamo.cuotas.filter((c) => calcularEstadoEfectivo(c) === 'VENCIDO').length;
  const totalPagar = prestamo.cuotas.reduce((sum, c) => sum + parseFloat(String(c.monto_cuota)), 0);
  const progreso = prestamo.cuotas.length
    ? Math.round((cuotasPagadas / prestamo.cuotas.length) * 100)
    : 0;

  return (
    <Layout>
      <div className="mb-6">
        <Link to="/prestamos" className="text-sm font-medium text-brand-700 hover:underline">
          ← Volver a préstamos
        </Link>
      </div>

      {/* Resumen del préstamo */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {prestamo.cliente.nombre_completo}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {prestamo.cliente.telefono && `📞 ${prestamo.cliente.telefono}`}
              {prestamo.cliente.documento_identidad && ` · CI ${prestamo.cliente.documento_identidad}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cuotasVencidas > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-[13px] font-semibold text-red-700">
                {cuotasVencidas} {cuotasVencidas === 1 ? 'cuota vencida' : 'cuotas vencidas'}
              </span>
            )}
            <span className="rounded-full bg-brand-100 px-3 py-1 text-[13px] font-semibold text-brand-700">
              {cuotasPagadas} / {prestamo.cuotas.length} cuotas pagadas
            </span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Capital prestado</p>
            <p className="mt-0.5 font-semibold text-slate-800">{formatMoney(prestamo.monto_prestado)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tasa mensual</p>
            <p className="mt-0.5 font-semibold text-slate-800">{prestamo.tasa_interes_mensual}%</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Plazo</p>
            <p className="mt-0.5 font-semibold text-slate-800">{prestamo.plazo_meses} meses</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total a pagar</p>
            <p className="mt-0.5 font-semibold text-slate-800">{formatMoney(totalPagar)}</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${progreso}%` }}
          />
        </div>

        {prestamo.notas && (
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
            📝 {prestamo.notas}
          </p>
        )}
      </div>

      {/* Formulario de cobro */}
      {cobrandoCuota && (
        <form
          onSubmit={enviarCobro}
          className="mb-6 rounded-2xl border-2 border-brand-200 bg-brand-50/50 p-6 shadow-sm"
        >
          <h3 className="mb-4 text-base font-semibold text-slate-900">
            Registrar cobro — Cuota #{cobrandoCuota.numero_cuota} ({formatMoney(cobrandoCuota.monto_cuota)})
          </h3>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Monto a cobrar (Bs)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de pago</label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Método de pago</label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as MetodoPago)}
                className={inputClass}
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="DEPOSITO">Depósito</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pagarMutation.isPending}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pagarMutation.isPending ? 'Registrando…' : 'Confirmar cobro'}
            </button>
            <button
              type="button"
              onClick={() => setCobrandoCuota(null)}
              className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Plan de cuotas — tarjetas en móvil */}
      <div className="space-y-3 md:hidden">
        {prestamo.cuotas.map((cuota) => (
          <div
            key={cuota.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-800">
                Cuota #{cuota.numero_cuota}
                <span className="ml-2 font-normal text-slate-500">
                  {formatDate(cuota.fecha_vencimiento)}
                </span>
              </p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estilosEstadoCuota[calcularEstadoEfectivo(cuota)]}`}>
                {etiquetasEstadoCuota[calcularEstadoEfectivo(cuota)]}
              </span>
            </div>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-lg font-semibold text-slate-900">
                {formatMoney(cuota.monto_cuota)}
              </span>
              <span className="text-xs text-slate-400">
                Capital {formatMoney(cuota.monto_capital)} · Interés {formatMoney(cuota.monto_interes)}
              </span>
            </div>
            {cuota.estado !== 'PAGADO' ? (
              <button
                onClick={() => abrirFormularioCobro(cuota)}
                className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Cobrar esta cuota
              </button>
            ) : (
              cuota.fecha_pago && (
                <p className="text-center text-xs text-slate-400">
                  Pagada el {formatDate(cuota.fecha_pago)}
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
              <th className="px-4 py-3 text-right">Monto Cuota</th>
              <th className="px-4 py-3 text-right">Capital</th>
              <th className="px-4 py-3 text-right">Interés</th>
              <th className="px-4 py-3 text-right">Saldo Restante</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {prestamo.cuotas.map((cuota) => (
              <tr key={cuota.id} className="transition hover:bg-brand-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">{cuota.numero_cuota}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(cuota.fecha_vencimiento)}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">
                  {formatMoney(cuota.monto_cuota)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {formatMoney(cuota.monto_capital)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {formatMoney(cuota.monto_interes)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {formatMoney(cuota.saldo_restante)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estilosEstadoCuota[calcularEstadoEfectivo(cuota)]}`}>
                    {etiquetasEstadoCuota[calcularEstadoEfectivo(cuota)]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {cuota.estado !== 'PAGADO' && (
                    <button
                      onClick={() => abrirFormularioCobro(cuota)}
                      className="rounded-md bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-700 transition hover:bg-brand-600 hover:text-white"
                    >
                      Cobrar
                    </button>
                  )}
                  {cuota.estado === 'PAGADO' && cuota.fecha_pago && (
                    <span className="text-xs text-slate-400">{formatDate(cuota.fecha_pago)}</span>
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
