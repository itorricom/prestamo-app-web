import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { clientesAPI } from '../api/clientes';
import type { Cliente, CrearClienteRequest } from '../api/clientes';
import { Layout } from '../components/Layout';

const clienteSchema = z.object({
  nombre_completo: z.string().min(3, 'El nombre es requerido'),
  documento_identidad: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

const labelClass = 'mb-1.5 block text-[13px] font-semibold text-slate-600';

export function ClientesPage() {
  const queryClient = useQueryClient();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesAPI.obtenerTodos(),
  });

  const crearMutation = useMutation({
    mutationFn: (data: CrearClienteRequest) => clientesAPI.crear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente registrado correctamente');
      setMostrarFormulario(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear cliente');
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CrearClienteRequest }) =>
      clientesAPI.actualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente actualizado correctamente');
      setEditandoId(null);
      setMostrarFormulario(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar cliente');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: string) => clientesAPI.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente eliminado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar cliente');
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
  });

  const onSubmit = (data: ClienteFormData) => {
    const payload = { ...data, email: data.email || undefined };
    if (editandoId) {
      actualizarMutation.mutate({ id: editandoId, data: payload });
    } else {
      crearMutation.mutate(payload);
    }
  };

  const handleEditar = (cliente: Cliente) => {
    reset({
      nombre_completo: cliente.nombre_completo,
      documento_identidad: cliente.documento_identidad || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      email: cliente.email || '',
    });
    setEditandoId(cliente.id);
    setMostrarFormulario(true);
  };

  const handleNuevo = () => {
    if (mostrarFormulario) {
      setMostrarFormulario(false);
      setEditandoId(null);
    } else {
      reset({ nombre_completo: '', documento_identidad: '', telefono: '', direccion: '', email: '' });
      setEditandoId(null);
      setMostrarFormulario(true);
    }
  };

  const handleEliminar = (cliente: Cliente) => {
    if (window.confirm(`¿Eliminar a ${cliente.nombre_completo}? Esta acción no se puede deshacer.`)) {
      eliminarMutation.mutate(cliente.id);
    }
  };

  const guardando = crearMutation.isPending || actualizarMutation.isPending;

  return (
    <Layout>
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Clientes
          </h1>
          {!isLoading && (
            <span className="rounded-full bg-brand-100 px-3 py-0.5 text-[13px] font-semibold text-brand-700">
              {clientes.length}
            </span>
          )}
        </div>
        <button
          onClick={handleNuevo}
          className={
            mostrarFormulario
              ? 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50'
              : 'rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700'
          }
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo cliente'}
        </button>
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="mb-5 text-base font-semibold text-slate-900">
            {editandoId ? 'Editar cliente' : 'Nuevo cliente'}
          </h3>

          <div className="mb-4">
            <label className={labelClass}>
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              placeholder="Ej. Juan Pérez García"
              {...register('nombre_completo')}
              className={inputClass}
            />
            {errors.nombre_completo && (
              <p className="mt-1 text-xs text-red-600">{errors.nombre_completo.message}</p>
            )}
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Documento de identidad (CI / NIT)</label>
              <input placeholder="Ej. 8456123" {...register('documento_identidad')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input placeholder="Ej. 70012345" {...register('telefono')} className={inputClass} />
            </div>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                {...register('email')}
                className={inputClass}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Dirección</label>
              <input placeholder="Ej. Av. Principal #123" {...register('direccion')} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : editandoId ? 'Actualizar' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={handleNuevo}
              className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Contenido */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
          Cargando clientes…
        </div>
      ) : clientes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mb-3 text-4xl">🗂️</div>
          <p className="mb-1 font-semibold text-slate-700">Aún no hay clientes registrados</p>
          <p className="mb-5 text-sm text-slate-500">
            Crea el primero para empezar a registrar préstamos.
          </p>
          {!mostrarFormulario && (
            <button
              onClick={handleNuevo}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              + Nuevo cliente
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tarjetas en móvil */}
          <div className="space-y-3 md:hidden">
            {clientes.map((cliente) => (
              <div
                key={cliente.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-800">{cliente.nombre_completo}</p>
                  {cliente.documento_identidad && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                      CI: {cliente.documento_identidad}
                    </span>
                  )}
                </div>
                <div className="mb-3 space-y-1 text-sm text-slate-600">
                  {cliente.telefono && <p>📞 {cliente.telefono}</p>}
                  {cliente.email && <p>✉️ {cliente.email}</p>}
                  {cliente.direccion && <p>📍 {cliente.direccion}</p>}
                  {!cliente.telefono && !cliente.email && !cliente.direccion && (
                    <p className="text-slate-400">Sin datos de contacto</p>
                  )}
                </div>
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => handleEditar(cliente)}
                    className="flex-1 rounded-md bg-brand-50 px-3 py-2 text-[13px] font-semibold text-brand-700 transition hover:bg-brand-600 hover:text-white"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(cliente)}
                    disabled={eliminarMutation.isPending}
                    className="flex-1 rounded-md bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-60"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla en escritorio */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Documento (CI)</th>
                  <th className="px-5 py-3">Teléfono</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="transition hover:bg-brand-50/60">
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {cliente.nombre_completo}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {cliente.documento_identidad || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {cliente.telefono || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {cliente.email || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleEditar(cliente)}
                        className="rounded-md bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-700 transition hover:bg-brand-600 hover:text-white"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(cliente)}
                        disabled={eliminarMutation.isPending}
                        className="ml-2 rounded-md bg-red-50 px-3 py-1.5 text-[13px] font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-60"
                      >
                        Eliminar
                      </button>
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
