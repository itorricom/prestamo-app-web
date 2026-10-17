import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  FileText,
  Phone,
} from 'lucide-react';
import { prestamosAPI } from '../api/prestamos';
import type { Cuota, EstadoCuota } from '../api/prestamos';
import { pagosAPI } from '../api/pagos';
import type { MetodoPago } from '../api/pagos';
import { Layout } from '../components/Layout';
import { formatMoney, formatDate } from '../utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
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

const badgeVariantsCuota: Record<
  EstadoCuota,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PAGADO: 'default',
  PENDIENTE: 'secondary',
  PARCIAL: 'outline',
  VENCIDO: 'destructive',
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
  if (
    cuota.estado === 'PENDIENTE' &&
    cuota.fecha_vencimiento.slice(0, 10) < hoy
  ) {
    return 'VENCIDO';
  }
  return cuota.estado;
}

export function DetallePrestamoPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [cobrandoCuota, setCobrandoCuota] = useState<Cuota | null>(null);
  const [monto, setMonto] = useState('');
  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().slice(0, 10)
  );
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
        <Card className="my-12">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
            <p className="text-sm">Cargando cronograma del préstamo…</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const cuotasPagadas = prestamo.cuotas.filter((c) => c.estado === 'PAGADO').length;
  const cuotasVencidas = prestamo.cuotas.filter(
    (c) => calcularEstadoEfectivo(c) === 'VENCIDO'
  ).length;
  const totalPagar = prestamo.cuotas.reduce(
    (sum, c) => sum + parseFloat(String(c.monto_cuota)),
    0
  );
  const totalRecaudado = prestamo.cuotas
    .filter((c) => c.estado === 'PAGADO')
    .reduce((sum, c) => sum + parseFloat(String(c.monto_cuota)), 0);
  const saldoPendiente = totalPagar - totalRecaudado;

  const progreso = prestamo.cuotas.length
    ? Math.round((cuotasPagadas / prestamo.cuotas.length) * 100)
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Navegación de retorno */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            render={<Link to="/prestamos" />}
            className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver a préstamos
          </Button>
        </div>

        {/* Ficha Ejecutiva del Crédito */}
        <Card className="overflow-hidden border-primary/20 bg-card/60 backdrop-blur shadow-sm">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/40">
            <div className="flex items-start gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-sm shrink-0">
                {prestamo.cliente.nombre_completo.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-xl">
                  {prestamo.cliente.nombre_completo}
                </CardTitle>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {prestamo.cliente.documento_identidad && (
                    <span className="font-mono">CI: {prestamo.cliente.documento_identidad}</span>
                  )}
                  {prestamo.cliente.telefono && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="size-3" />
                      {prestamo.cliente.telefono}
                    </span>
                  )}
                  <span>Inicio: {formatDate(prestamo.fecha_inicio)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {cuotasVencidas > 0 && (
                <Badge variant="destructive" className="gap-1.5 font-semibold">
                  <AlertTriangle className="size-3.5" />
                  {cuotasVencidas} {cuotasVencidas === 1 ? 'cuota vencida' : 'cuotas vencidas'}
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1.5">
                <CheckCircle2 className="size-3.5 text-primary" />
                {cuotasPagadas} de {prestamo.cuotas.length} cuotas pagadas
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Indicadores Financieros */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Capital Prestado
                </span>
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {formatMoney(prestamo.monto_prestado)}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tasa Mensual
                </span>
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {prestamo.tasa_interes_mensual}%
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total a Recaudar
                </span>
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {formatMoney(totalPagar)}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Saldo Restante
                </span>
                <p className="text-lg font-bold font-mono tabular-nums text-primary">
                  {formatMoney(saldoPendiente)}
                </p>
              </div>
            </div>

            {/* Barra de Progreso de Cobro */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Progreso de liquidación</span>
                <span className="font-bold text-foreground font-mono">{progreso}% completado</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>

            {prestamo.notas && (
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <FileText className="size-4 shrink-0 text-muted-foreground/80 mt-0.5" />
                <span>{prestamo.notas}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan de Amortización / Cuotas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Cronograma de Pagos
              </h2>
              <p className="text-xs text-muted-foreground">
                Plan detallado de capital, interés y saldo por cada vencimiento mensual.
              </p>
            </div>
          </div>

          {/* Tarjetas Móviles de Cuotas */}
          <div className="grid gap-3 sm:hidden">
            {prestamo.cuotas.map((cuota) => {
              const estadoEfectivo = calcularEstadoEfectivo(cuota);
              return (
                <Card key={cuota.id}>
                  <CardHeader className="flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-sm font-bold">
                        Cuota #{cuota.numero_cuota}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Vence: {formatDate(cuota.fecha_vencimiento)}
                      </p>
                    </div>
                    <Badge variant={badgeVariantsCuota[estadoEfectivo]}>
                      {etiquetasEstadoCuota[estadoEfectivo]}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs pt-0">
                    <div className="flex items-baseline justify-between border-t border-border/50 pt-2">
                      <span className="text-muted-foreground">Monto de cuota:</span>
                      <span className="text-base font-bold font-mono text-foreground">
                        {formatMoney(cuota.monto_cuota)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Capital: {formatMoney(cuota.monto_capital)}</span>
                      <span>Interés: {formatMoney(cuota.monto_interes)}</span>
                    </div>

                    {cuota.estado !== 'PAGADO' ? (
                      <Button
                        size="sm"
                        onClick={() => abrirFormularioCobro(cuota)}
                        className="w-full gap-1.5"
                      >
                        <CreditCard className="size-3.5" />
                        Registrar cobro
                      </Button>
                    ) : (
                      cuota.fecha_pago && (
                        <p className="text-center text-[11px] text-muted-foreground">
                          Pagada el {formatDate(cuota.fecha_pago)}
                        </p>
                      )
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tabla Escritorio de Cuotas */}
          <Card className="hidden sm:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Monto Cuota</TableHead>
                  <TableHead className="text-right">Capital</TableHead>
                  <TableHead className="text-right">Interés</TableHead>
                  <TableHead className="text-right">Saldo Restante</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prestamo.cuotas.map((cuota) => {
                  const estadoEfectivo = calcularEstadoEfectivo(cuota);
                  return (
                    <TableRow key={cuota.id}>
                      <TableCell className="text-center font-mono tabular-nums font-medium">
                        {cuota.numero_cuota}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(cuota.fecha_vencimiento)}
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono tabular-nums text-foreground">
                        {formatMoney(cuota.monto_cuota)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground text-xs">
                        {formatMoney(cuota.monto_capital)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground text-xs">
                        {formatMoney(cuota.monto_interes)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground text-xs">
                        {formatMoney(cuota.saldo_restante)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={badgeVariantsCuota[estadoEfectivo]}>
                          {etiquetasEstadoCuota[estadoEfectivo]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {cuota.estado !== 'PAGADO' ? (
                          <Button
                            size="sm"
                            onClick={() => abrirFormularioCobro(cuota)}
                            className="h-8 gap-1.5 text-xs shadow-xs"
                          >
                            <CreditCard className="size-3.5" />
                            Cobrar
                          </Button>
                        ) : (
                          cuota.fecha_pago && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {formatDate(cuota.fecha_pago)}
                            </span>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Modal de Cobro */}
        <Dialog
          open={!!cobrandoCuota}
          onOpenChange={(open) => !open && setCobrandoCuota(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar cobro de cuota</DialogTitle>
              <DialogDescription>
                Cuota #{cobrandoCuota?.numero_cuota} — Importe programado:{' '}
                <strong className="text-foreground">
                  {formatMoney(cobrandoCuota?.monto_cuota || 0)}
                </strong>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={enviarCobro} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="monto_cobro">
                  Monto a cobrar (Bs) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="monto_cobro"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fecha_pago">
                    Fecha de pago <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fecha_pago"
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="metodo_pago">Método de pago</Label>
                  <select
                    id="metodo_pago"
                    value={metodo}
                    onChange={(e) => setMetodo(e.target.value as MetodoPago)}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="EFECTIVO" className="bg-popover text-popover-foreground">
                      Efectivo
                    </option>
                    <option value="DEPOSITO" className="bg-popover text-popover-foreground">
                      Depósito bancario
                    </option>
                    <option value="TRANSFERENCIA" className="bg-popover text-popover-foreground">
                      Transferencia / QR
                    </option>
                  </select>
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCobrandoCuota(null)}
                  disabled={pagarMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={pagarMutation.isPending}>
                  {pagarMutation.isPending ? 'Confirmando…' : 'Confirmar cobro'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
