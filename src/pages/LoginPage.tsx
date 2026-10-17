import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Landmark, Loader2, Lock, Mail } from 'lucide-react';
import { authAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      navigate('/clientes');
    } catch (error: any) {
      toast.error(error.message || error.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-6">
      {/* Fondo decorativo: halos de color de marca + grilla sutil */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 size-[28rem] rounded-full bg-brand-300/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-40 size-[32rem] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0_0_0/0.04)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0_0_0/0.04)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />
      </div>

      <div className="relative w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <Card className="bg-card/80 shadow-2xl shadow-brand-900/10 backdrop-blur-xl [--card-spacing:--spacing(7)]">
          <CardHeader className="items-center justify-items-center gap-3 text-center">
            <div className="grid size-12 place-items-center rounded-xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30 ring-1 ring-white/20">
              <Landmark className="size-6" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle>
                <h1 className="text-xl font-semibold tracking-tight">Préstamo App</h1>
              </CardTitle>
              <CardDescription>Ingresa a tu cuenta para continuar</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                    spellCheck={false}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className="h-10 pl-9"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className="h-10 pr-10 pl-9"
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="h-10 w-full shadow-md shadow-brand-600/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    Ingresando…
                  </>
                ) : (
                  'Ingresar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Préstamo App — Gestión de préstamos
        </p>
      </div>
    </main>
  );
}
