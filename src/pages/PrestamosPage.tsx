import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { prestamosAPI } from '../api/prestamos';
import type { CrearPrestamoRequest, EstadoPrestamo } from '../api/prestamos';
import { clientesAPI } from '../api/clientes';
import { Layout } from '../components/Layout';
import { formatMoney, formatDate } from '../utils/format';

const prestamoSchema = z.object({
  cliente_id: z.string().min(1, 'Selecciona un cliente'),
  monto_prestado: z.number({ message: 'Ingresa un monto válido' }).positive('Debe ser mayor a 0'),
  tasa_interes_mensual: z.number({ message: 'Ingresa una tasa válida' }).min(0, 'Mínimo 0').max(100, 'Máximo 100'),
  plazo_meses: z.number({ message: 'Ingresa un plazo válido' }).int().min(1, 'Mínimo 1 mes').max(360, 'Máximo 360 meses'),
  fecha_inicio: z.string().min(1, 'Fecha requerida'),
  notas: z.string().optional(),
});

type PrestamoFormData = z.infer<typeof prestamoSchema>;

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

const labelClass = 'mb-1.5 block text-[13px] font-semibold text-slate-600';

const estilosEstado: Record<EstadoPrestamo, string> = {
  ACTIVO: 'bg-brand-100 text-brand-700',
  PAGADO: 'bg-emerald-100 text-emerald-700',
  CANCELADO: 'bg-slate-200 text-slate-500',
};

const etiquetasEstado: Record<EstadoPrestamo, string> = {
  ACTIVO: 'Activo',
  PAGADO: 'Pagado',
  CANCELADO: 'Cancelado',
};

export function PrestamosPage() {
  const queryClient = useQueryClient();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const { data: prestamos = [], isLoading } = useQuery({
    queryKey: ['prestamos'],
    queryFn: () => prestamosAPI.obtenerTodos(),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesAPI.obtenerTodos(),
  });

  const crearMutation = useMutation({
    mutationFn: (data: CrearPrestamoRequest) => prestamosAPI.crear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prestamos'] });
      toast.success('Préstamo creado con su plan de cuotas');
      setMostrarFormulario(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear el préstamo');
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PrestamoFormData>({
    resolver: zodResolver(prestamoSchema),
    defaultValues: { fecha_inicio: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = (data: PrestamoFormData) => {
    crearMutation.mutate({ ...data, notas: data.notas || undefined });
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Préstamos</h1>
          {!isLoading && (
            <span className="rounded-full bg-brand-100 px-3 py-0.5 text-[13px] font-semibold text-brand-700">
              {prestamos.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className={
            mostrarFormulario
              ? 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50'
              : 'rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700'
          }
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo préstamo'}
        </button>
      </div>

      {mostrarFormulario && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="mb-5 text-base font-semibold text-slate-900">Nuevo préstamo</h3>

          <div className="mb-4">
            <label className={labelClass}>
              Cliente <span className="text-red-500">*</span>
            </label>
            <select {...register('cliente_id')} className={inputClass} defaultValue="">
              <option value="" disabled>Selecciona un cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_completo} {c.documento_identidad ? `(CI ${c.documento_identidad})` : ''}
                </option>
              ))}
            </select>
            {errors.cliente_id && (
              <p className="mt-1 text-xs text-red-600">{errors.cliente_id.message}</p>
            )}
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>
                Monto / Capital (Bs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="5000"
                {...register('monto_prestado', { valueAsNumber: true })}
                className={inputClass}
              />
              {errors.monto_prestado && (
                <p className="mt-1 text-xs text-red-600">{errors.monto_prestado.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Tasa mensual (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="3"
                {...register('tasa_interes_mensual', { valueAsNumber: true })}
                className={inputClass}
              />
              {errors.tasa_interes_mensual && (
                <p className="mt-1 text-xs text-red-600">{errors.tasa_interes_mensual.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Plazo (meses) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="360"
                placeholder="12"
                {...register('plazo_meses', { valueAsNumber: true })}
                className={inputClass}
              />
              {errors.plazo_meses && (
                <p className="mt-1 text-xs text-red-600">{errors.plazo_meses.message}</p>
              )}
            </div>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Fecha de inicio <span className="text-red-500">*</span>
              </label>
              <input type="date" {...register('fecha_inicio')} className={inputClass} />
              {errors.fecha_inicio && (
                <p className="mt-1 text-xs text-red-600">{errors.fecha_inicio.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Notas</label>
              <input placeholder="Opcional" {...register('notas')} className={inputClass} />
            </div>
          </div>

          <button
            type="submit"
            disabled={crearMutation.isPending}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {crearMutation.isPending ? 'Creando…' : 'Crear préstamo'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
          Cargando préstamos…
        </div>
      ) : prestamos.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mb-3 text-4xl">📋</div>
          <p className="mb-1 font-semibold text-slate-700">Aún no hay préstamos registrados</p>
          <p className="text-sm text-slate-500">Crea el primero para generar automáticamente su plan de cuotas.</p>
        </div>
      ) : (
        <>
          {/* Tarjetas en móvil */}
          <div className="space-y-3 md:hidden">
            {prestamos.map((prestamo) => (
              <Link
                key={prestamo.id}
                to={`/prestamos/${prestamo.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-800">{prestamo.cliente?.nombre_completo || 'Cliente'}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estilosEstado[prestamo.estado]}`}>
                    {etiquetasEstado[prestamo.estado]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">{formatMoney(prestamo.monto_prestado)}</span>
                  <span>{prestamo.tasa_interes_mensual}% mensual</span>
                  <span>{prestamo.plazo_meses} meses</span>
                  <span>Inicio: {formatDate(prestamo.fecha_inicio)}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Tabla en escritorio */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3 text-right">Capital prestado</th>
                  <th className="px-5 py-3 text-right">Tasa</th>
                  <th className="px-5 py-3 text-right">Plazo</th>
                  <th className="px-5 py-3">Inicio</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prestamos.map((prestamo) => (
                  <tr key={prestamo.id} className="transition hover:bg-brand-50/60">
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {prestamo.cliente?.nombre_completo || 'Cliente'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-800">
                      {formatMoney(prestamo.monto_prestado)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-600">{prestamo.tasa_interes_mensual}%</td>
                    <td className="px-5 py-3.5 text-right text-slate-600">{prestamo.plazo_meses} m</td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDate(prestamo.fecha_inicio)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estilosEstado[prestamo.estado]}`}>
                        {etiquetasEstado[prestamo.estado]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/prestamos/${prestamo.id}`}
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
