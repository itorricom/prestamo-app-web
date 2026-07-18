import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const response = await authAPI.login(data);
      login(response.user, response.accessToken);
      toast.success('Bienvenido');
      navigate('/borrowers');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50 p-6">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
          {/* Marca */}
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-2xl text-white shadow-lg shadow-brand-600/30">
              💰
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Préstamo App
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Ingresa a tu cuenta para continuar
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-600">
                Email
              </label>
              <input
                type="email"
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
                {...register('email')}
                className={inputClass}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-600">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
                className={inputClass}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
            <p className="font-semibold text-brand-700">Credenciales demo</p>
            <p>Email: admin@prestamo.local</p>
            <p>Contraseña: admin123</p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Préstamo App — Gestión de préstamos
        </p>
      </div>
    </div>
  );
}
