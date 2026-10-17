import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  Clock,
  HandCoins,
  Plus,
  Search,
  Wallet,
} from 'lucide-react';
import { prestamosAPI } from '../api/prestamos';
import type { CrearPrestamoRequest, EstadoPrestamo } from '../api/prestamos';
import { clientesAPI } from '../api/clientes';
import { Layout } from '../components/Layout';
import { formatMoney, formatDate } from '../utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const prestamoSchema = z.object({
  cliente_id: z.string().min(1, 'Selecciona un cliente'),
  monto_prestado: z
    .number({ message: 'Ingresa un monto válido' })
    .positive('Debe ser mayor a 0'),
  tasa_interes_mensual: z
    .number({ message: 'Ingresa una tasa válida' })
    .min(0, 'Mínimo 0')
    .max(100, 'Máximo 100'),
  plazo_meses: z
    .number({ message: 'Ingresa un plazo válido' })
    .int()
    .min(1, 'Mínimo 1 mes')
    .max(360, 'Máximo 360 meses'),
  fecha_inicio: z.string().min(1, 'Fecha requerida'),
  notas: z.string().optional(),
});

type PrestamoFormData = z.infer<typeof prestamoSchema>;

const badgeVariantsEstado: Record<EstadoPrestamo, 'default' | 'secondary' | 'outline'> = {
  ACTIVO: 'default',
  PAGADO: 'secondary',
  CANCELADO: 'outline',
};

const etiquetasEstado: Record<EstadoPrestamo, string> = {
  ACTIVO: 'Activo',
  PAGADO: 'Pagado',
  CANCELADO: 'Cancelado',
};

export function PrestamosPage() {
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

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
      setModalAbierto(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear el préstamo');
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PrestamoFormData>({
    resolver: zodResolver(prestamoSchema),
    defaultValues: {
      fecha_inicio: new Date().toISOString().slice(0, 10),
      monto_prestado: 5000,
      tasa_interes_mensual: 3,
      plazo_meses: 12,
    },
  });

  // Cálculo en tiempo real de la cuota fija estimada (Sistema Francés)
  const montoWatch = useWatch({ control, name: 'monto_prestado' });
  const tasaWatch = useWatch({ control, name: 'tasa_interes_mensual' });
  const plazoWatch = useWatch({ control, name: 'plazo_meses' });

  const cuotaEstimada = useMemo(() => {
    const P = Number(montoWatch) || 0;
    const r = (Number(tasaWatch) || 0) / 100;
    const n = Number(plazoWatch) || 0;
    if (P <= 0 || n <= 0) return 0;
    if (r === 0) return P / n;
    const cuota = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return isFinite(cuota) ? cuota : 0;
  }, [montoWatch, tasaWatch, plazoWatch]);

  const totalEstimado = cuotaEstimada * (Number(plazoWatch) || 0);

  const onSubmit = (data: PrestamoFormData) => {
    crearMutation.mutate({ ...data, notas: data.notas || undefined });
  };

  // Métricas financieras calculadas
  const metricas = useMemo(() => {
    const totalPrestado = prestamos.reduce(
      (sum, p) => sum + parseFloat(String(p.monto_prestado || 0)),
      0
    );
    const activos = prestamos.filter((p) => p.estado === 'ACTIVO').length;
    const pagados = prestamos.filter((p) => p.estado === 'PAGADO').length;
    return { totalPrestado, activos, pagados };
  }, [prestamos]);

  // Filtrado
  const prestamosFiltrados = useMemo(() => {
    return prestamos.filter((p) => {
      const matchEstado =
        filtroEstado === 'TODOS' ? true : p.estado === filtroEstado;
      const q = busqueda.trim().toLowerCase();
      const matchBusqueda = q
        ? (p.cliente?.nombre_completo || '').toLowerCase().includes(q) ||
          (p.cliente?.documento_identidad || '').toLowerCase().includes(q)
        : true;
      return matchEstado && matchBusqueda;
    });
  }, [prestamos, filtroEstado, busqueda]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Préstamos
              </h1>
              {!isLoading && (
                <Badge variant="secondary" className="font-semibold">
                  {prestamos.length} {prestamos.length === 1 ? 'préstamo' : 'préstamos'}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Cartera de créditos, cronogramas de amortización y seguimiento de cobranza.
            </p>
          </div>

          <Button onClick={() => setModalAbierto(true)} className="gap-2 shadow-sm">
            <Plus className="size-4" />
            Nuevo préstamo
          </Button>
        </div>

        {/* Tarjetas de Métricas (KPIs) */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Capital Total Colocado
              </span>
              <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatMoney(metricas.totalPrestado)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Monto histórico en créditos emitidos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Préstamos Activos
              </span>
              <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Clock className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metricas.activos}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Contratos en etapa regular de amortización
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Préstamos Liquidados
              </span>
              <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
                <CheckCircle2 className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metricas.pagados}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Créditos completados satisfactoriamente
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda y Filtros de Estado */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente o CI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-9 pl-9"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['TODOS', 'ACTIVO', 'PAGADO', 'CANCELADO'] as const).map((estado) => {
              const activo = filtroEstado === estado;
              return (
                <Button
                  key={estado}
                  variant={activo ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFiltroEstado(estado)}
                  className="h-8 text-xs font-medium"
                >
                  {estado === 'TODOS'
                    ? 'Todos'
                    : etiquetasEstado[estado as EstadoPrestamo] || estado}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Listado */}
        {isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
              <p className="text-sm">Cargando préstamos…</p>
            </CardContent>
          </Card>
        ) : prestamos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary mb-4">
                <HandCoins className="size-7" />
              </div>
              <CardTitle className="text-lg">Aún no hay préstamos registrados</CardTitle>
              <CardDescription className="mt-1.5 max-w-sm text-center">
                Genera tu primer contrato de crédito. Se creará automáticamente la tabla de amortización con sus cuotas y fechas de vencimiento.
              </CardDescription>
              <Button onClick={() => setModalAbierto(true)} className="mt-5 gap-2">
                <Plus className="size-4" />
                Crear primer préstamo
              </Button>
            </CardContent>
          </Card>
        ) : prestamosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Search className="size-8 opacity-40 mb-2" />
              <p className="font-medium text-foreground">No se encontraron préstamos</p>
              <p className="text-sm">Intenta cambiando el término de búsqueda o el filtro de estado.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tarjetas Móviles */}
            <div className="grid gap-3 sm:hidden">
              {prestamosFiltrados.map((prestamo) => (
                <Link
                  key={prestamo.id}
                  to={`/prestamos/${prestamo.id}`}
                  className="block transition-transform active:scale-[0.99]"
                >
                  <Card className="hover:border-primary/40 transition-colors">
                    <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                      <div>
                        <CardTitle className="text-base">
                          {prestamo.cliente?.nombre_completo || 'Cliente'}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Inicio: {formatDate(prestamo.fecha_inicio)}
                        </p>
                      </div>
                      <Badge variant={badgeVariantsEstado[prestamo.estado]}>
                        {etiquetasEstado[prestamo.estado]}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs pt-0">
                      <div className="flex items-center justify-between text-sm font-semibold text-foreground pt-1 border-t border-border/50">
                        <span>Capital</span>
                        <span>{formatMoney(prestamo.monto_prestado)}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Tasa / Plazo</span>
                        <span>
                          {prestamo.tasa_interes_mensual}% m. / {prestamo.plazo_meses} meses
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Tabla Escritorio */}
            <Card className="hidden sm:block overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28%]">Cliente</TableHead>
                    <TableHead className="text-right">Capital Prestado</TableHead>
                    <TableHead className="text-right">Tasa Mensual</TableHead>
                    <TableHead className="text-right">Plazo</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prestamosFiltrados.map((prestamo) => (
                    <TableRow key={prestamo.id}>
                      <TableCell className="font-medium">
                        <div>
                          <span className="text-foreground">
                            {prestamo.cliente?.nombre_completo || 'Cliente'}
                          </span>
                          {prestamo.cliente?.documento_identidad && (
                            <p className="text-[11px] text-muted-foreground">
                              CI: {prestamo.cliente.documento_identidad}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold font-mono text-foreground">
                        {formatMoney(prestamo.monto_prestado)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono">
                        {prestamo.tasa_interes_mensual}%
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {prestamo.plazo_meses} meses
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(prestamo.fecha_inicio)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badgeVariantsEstado[prestamo.estado]}>
                          {etiquetasEstado[prestamo.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link to={`/prestamos/${prestamo.id}`} />}
                          className="h-8 gap-1 text-xs text-primary hover:text-primary"
                        >
                          Ver plan
                          <ArrowUpRight className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        {/* Modal de Nuevo Préstamo */}
        <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo préstamo</DialogTitle>
              <DialogDescription>
                Define las condiciones crediticias. Las cuotas y fechas se calcularán de manera automática.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="cliente_id">
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <select
                  id="cliente_id"
                  {...register('cliente_id')}
                  defaultValue=""
                  aria-invalid={!!errors.cliente_id}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="" disabled className="bg-popover text-popover-foreground">
                    Selecciona un cliente…
                  </option>
                  {clientes.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      className="bg-popover text-popover-foreground"
                    >
                      {c.nombre_completo}{' '}
                      {c.documento_identidad ? `(CI: ${c.documento_identidad})` : ''}
                    </option>
                  ))}
                </select>
                {errors.cliente_id && (
                  <p className="text-xs text-destructive">{errors.cliente_id.message}</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="monto_prestado">
                    Capital (Bs) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="monto_prestado"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="5000"
                    aria-invalid={!!errors.monto_prestado}
                    {...register('monto_prestado', { valueAsNumber: true })}
                  />
                  {errors.monto_prestado && (
                    <p className="text-xs text-destructive">
                      {errors.monto_prestado.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tasa_interes_mensual">
                    Tasa mensual (%) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tasa_interes_mensual"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="3"
                    aria-invalid={!!errors.tasa_interes_mensual}
                    {...register('tasa_interes_mensual', { valueAsNumber: true })}
                  />
                  {errors.tasa_interes_mensual && (
                    <p className="text-xs text-destructive">
                      {errors.tasa_interes_mensual.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plazo_meses">
                    Plazo (meses) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="plazo_meses"
                    type="number"
                    min="1"
                    max="360"
                    placeholder="12"
                    aria-invalid={!!errors.plazo_meses}
                    {...register('plazo_meses', { valueAsNumber: true })}
                  />
                  {errors.plazo_meses && (
                    <p className="text-xs text-destructive">
                      {errors.plazo_meses.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Vista previa en tiempo real de la cuota estimada */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <div className="flex items-center justify-between text-xs font-medium text-primary">
                  <span className="flex items-center gap-1.5">
                    <Calculator className="size-4" />
                    Simulación de Cuota Mensual
                  </span>
                  <span className="text-sm font-bold font-mono">
                    {formatMoney(cuotaEstimada)} / mes
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-primary/10 pt-1.5">
                  <span>Total estimado a recaudar ({plazoWatch || 0} cuotas):</span>
                  <span className="font-semibold text-foreground font-mono">
                    {formatMoney(totalEstimado)}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fecha_inicio">
                    Fecha de desembolso <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    aria-invalid={!!errors.fecha_inicio}
                    {...register('fecha_inicio')}
                  />
                  {errors.fecha_inicio && (
                    <p className="text-xs text-destructive">
                      {errors.fecha_inicio.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notas">Notas / Garantías</Label>
                  <Input id="notas" placeholder="Ej. Garantía de equipo" {...register('notas')} />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalAbierto(false)}
                  disabled={crearMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={crearMutation.isPending}>
                  {crearMutation.isPending ? 'Creando plan…' : 'Crear préstamo'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
