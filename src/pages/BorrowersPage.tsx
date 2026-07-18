import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { borrowersAPI } from '../api/borrowers';
import type { Borrower, CreateBorrowerRequest } from '../api/borrowers';
import { Layout } from '../components/Layout';

const borrowerSchema = z.object({
  fullName: z.string().min(3, 'Nombre es requerido'),
  documentId: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

type BorrowerFormData = z.infer<typeof borrowerSchema>;

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

const labelClass = 'mb-1.5 block text-[13px] font-semibold text-slate-600';

export function BorrowersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: borrowers = [], isLoading } = useQuery({
    queryKey: ['borrowers'],
    queryFn: () => borrowersAPI.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBorrowerRequest) => borrowersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowers'] });
      toast.success('Prestatario creado');
      setShowForm(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateBorrowerRequest }) =>
      borrowersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowers'] });
      toast.success('Prestatario actualizado');
      setEditingId(null);
      setShowForm(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => borrowersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowers'] });
      toast.success('Prestatario eliminado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BorrowerFormData>({
    resolver: zodResolver(borrowerSchema),
  });

  const onSubmit = (data: BorrowerFormData) => {
    const payload = { ...data, email: data.email || undefined };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (borrower: Borrower) => {
    reset(borrower);
    setEditingId(borrower.id);
    setShowForm(true);
  };

  const handleNew = () => {
    if (showForm) {
      setShowForm(false);
      setEditingId(null);
    } else {
      reset({ fullName: '', documentId: '', phone: '', address: '', email: '' });
      setEditingId(null);
      setShowForm(true);
    }
  };

  const handleDelete = (borrower: Borrower) => {
    if (window.confirm(`¿Eliminar a ${borrower.fullName}? Esta acción no se puede deshacer.`)) {
      deleteMutation.mutate(borrower.id);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
        {/* Encabezado de página */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Prestatarios
            </h1>
            {!isLoading && (
              <span className="rounded-full bg-brand-100 px-3 py-0.5 text-[13px] font-semibold text-brand-700">
                {borrowers.length}
              </span>
            )}
          </div>
          <button
            onClick={handleNew}
            className={
              showForm
                ? 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50'
                : 'rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700'
            }
          >
            {showForm ? 'Cancelar' : '+ Nuevo prestatario'}
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="mb-5 text-base font-semibold text-slate-900">
              {editingId ? 'Editar prestatario' : 'Nuevo prestatario'}
            </h3>

            <div className="mb-4">
              <label className={labelClass}>
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <input
                placeholder="Ej. Juan Pérez García"
                {...register('fullName')}
                className={inputClass}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Documento de identidad</label>
                <input placeholder="Ej. 8456123" {...register('documentId')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input placeholder="Ej. 70012345" {...register('phone')} className={inputClass} />
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
                <input placeholder="Ej. Av. Principal #123" {...register('address')} className={inputClass} />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={handleNew}
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
            Cargando prestatarios…
          </div>
        ) : borrowers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mb-3 text-4xl">🗂️</div>
            <p className="mb-1 font-semibold text-slate-700">Aún no hay prestatarios</p>
            <p className="mb-5 text-sm text-slate-500">
              Crea el primero para empezar a registrar préstamos.
            </p>
            {!showForm && (
              <button
                onClick={handleNew}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                + Nuevo prestatario
              </button>
            )}
          </div>
        ) : (
          <>
          {/* Tarjetas en móvil */}
          <div className="space-y-3 md:hidden">
            {borrowers.map((borrower) => (
              <div
                key={borrower.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-800">{borrower.fullName}</p>
                  {borrower.documentId && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                      CI: {borrower.documentId}
                    </span>
                  )}
                </div>
                <div className="mb-3 space-y-1 text-sm text-slate-600">
                  {borrower.phone && <p>📞 {borrower.phone}</p>}
                  {borrower.email && <p>✉️ {borrower.email}</p>}
                  {borrower.address && <p>📍 {borrower.address}</p>}
                  {!borrower.phone && !borrower.email && !borrower.address && (
                    <p className="text-slate-400">Sin datos de contacto</p>
                  )}
                </div>
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => handleEdit(borrower)}
                    className="flex-1 rounded-md bg-brand-50 px-3 py-2 text-[13px] font-semibold text-brand-700 transition hover:bg-brand-600 hover:text-white"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(borrower)}
                    disabled={deleteMutation.isPending}
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
                  <th className="px-5 py-3">Documento</th>
                  <th className="px-5 py-3">Teléfono</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {borrowers.map((borrower) => (
                  <tr key={borrower.id} className="transition hover:bg-brand-50/60">
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {borrower.fullName}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {borrower.documentId || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {borrower.phone || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {borrower.email || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(borrower)}
                        className="rounded-md bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-700 transition hover:bg-brand-600 hover:text-white"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(borrower)}
                        disabled={deleteMutation.isPending}
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
