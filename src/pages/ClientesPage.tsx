import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Edit2,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { clientesAPI } from '../api/clientes';
import type { Cliente, CrearClienteRequest } from '../api/clientes';
import { Layout } from '../components/Layout';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const clienteSchema = z.object({
  nombre_completo: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  documento_identidad: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

export function ClientesPage() {
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState<Cliente | null>(null);
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesAPI.obtenerTodos(),
  });

  const crearMutation = useMutation({
    mutationFn: (data: CrearClienteRequest) => clientesAPI.crear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente registrado correctamente');
      cerrarModal();
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
      cerrarModal();
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
      setClienteAEliminar(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar cliente');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
  });

  const abrirNuevo = () => {
    setClienteAEditar(null);
    reset({
      nombre_completo: '',
      documento_identidad: '',
      telefono: '',
      direccion: '',
      email: '',
    });
    setModalAbierto(true);
  };

  const abrirEditar = (cliente: Cliente) => {
    setClienteAEditar(cliente);
    reset({
      nombre_completo: cliente.nombre_completo,
      documento_identidad: cliente.documento_identidad || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      email: cliente.email || '',
    });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setClienteAEditar(null);
    reset();
  };

  const onSubmit = (data: ClienteFormData) => {
    const payload = { ...data, email: data.email || undefined };
    if (clienteAEditar) {
      actualizarMutation.mutate({ id: clienteAEditar.id, data: payload });
    } else {
      crearMutation.mutate(payload);
    }
  };

  // Filtrado en memoria por nombre, documento o teléfono
  const clientesFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    if (!query) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre_completo.toLowerCase().includes(query) ||
        (c.documento_identidad && c.documento_identidad.toLowerCase().includes(query)) ||
        (c.telefono && c.telefono.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query))
    );
  }, [clientes, busqueda]);

  const guardando = crearMutation.isPending || actualizarMutation.isPending;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Clientes
              </h1>
              {!isLoading && (
                <Badge variant="secondary" className="font-semibold">
                  {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Directorio de personas y prestatarios registrados en la plataforma.
            </p>
          </div>

          <Button onClick={abrirNuevo} className="gap-2 shadow-sm">
            <Plus className="size-4" />
            Nuevo cliente
          </Button>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, CI, teléfono o email…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          {busqueda && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBusqueda('')}
              className="h-9 text-xs"
            >
              Limpiar filtro
            </Button>
          )}
        </div>

        {/* Contenido principal */}
        {isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
              <p className="text-sm">Cargando directorio de clientes…</p>
            </CardContent>
          </Card>
        ) : clientes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary mb-4">
                <UserPlus className="size-7" />
              </div>
              <CardTitle className="text-lg">Aún no hay clientes registrados</CardTitle>
              <CardDescription className="mt-1.5 max-w-sm text-center">
                Registra a tu primer cliente para comenzar a simular y desembolsar préstamos con sus planes de cuotas.
              </CardDescription>
              <Button onClick={abrirNuevo} className="mt-5 gap-2">
                <Plus className="size-4" />
                Registrar primer cliente
              </Button>
            </CardContent>
          </Card>
        ) : clientesFiltrados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Search className="size-8 opacity-40 mb-2" />
              <p className="font-medium text-foreground">No se encontraron resultados</p>
              <p className="text-sm">No hay clientes que coincidan con "{busqueda}".</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Vista en tarjetas para pantallas pequeñas */}
            <div className="grid gap-3 sm:hidden">
              {clientesFiltrados.map((cliente) => (
                <Card key={cliente.id} className="overflow-hidden">
                  <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                    <div>
                      <CardTitle className="text-base">{cliente.nombre_completo}</CardTitle>
                      {cliente.documento_identidad && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          CI/NIT: {cliente.documento_identidad}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Opciones para ${cliente.nombre_completo}`}
                          >
                            <MoreVertical className="size-4" aria-hidden />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEditar(cliente)}>
                          <Edit2 className="size-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setClienteAEliminar(cliente)}
                        >
                          <Trash2 className="size-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-xs text-muted-foreground pt-0">
                    {cliente.telefono && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3.5" />
                        <span>{cliente.telefono}</span>
                      </div>
                    )}
                    {cliente.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="size-3.5" />
                        <span className="truncate">{cliente.email}</span>
                      </div>
                    )}
                    {cliente.direccion && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        <span className="truncate">{cliente.direccion}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabla para tablets y escritorio */}
            <Card className="hidden sm:block overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Nombre completo</TableHead>
                    <TableHead>Documento (CI)</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary font-semibold text-xs shrink-0">
                            {cliente.nombre_completo.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-foreground">{cliente.nombre_completo}</span>
                            {cliente.direccion && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                                {cliente.direccion}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cliente.documento_identidad ? (
                          <Badge variant="outline" className="font-mono tabular-nums text-[11px]">
                            {cliente.documento_identidad}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cliente.telefono ? (
                          <span className="text-muted-foreground font-mono tabular-nums text-xs">
                            {cliente.telefono}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cliente.email ? (
                          <span className="text-muted-foreground text-xs">{cliente.email}</span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEditar(cliente)}
                            className="h-8 gap-1.5 text-xs"
                          >
                            <Edit2 className="size-3.5" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setClienteAEliminar(cliente)}
                            className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        {/* Modal de Crear / Editar cliente */}
        <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {clienteAEditar ? 'Editar cliente' : 'Nuevo cliente'}
              </DialogTitle>
              <DialogDescription>
                {clienteAEditar
                  ? 'Actualiza los datos personales y de contacto del cliente.'
                  : 'Completa la información para dar de alta al cliente en la plataforma.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="nombre_completo">
                  Nombre completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre_completo"
                  placeholder="Ej. Juan Pérez García"
                  autoComplete="name"
                  aria-invalid={!!errors.nombre_completo}
                  {...register('nombre_completo')}
                />
                {errors.nombre_completo && (
                  <p className="text-xs text-destructive">{errors.nombre_completo.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="documento_identidad">Documento de identidad (CI / NIT)</Label>
                  <Input
                    id="documento_identidad"
                    placeholder="Ej. 8456123"
                    autoComplete="off"
                    spellCheck={false}
                    {...register('documento_identidad')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telefono">Teléfono / Celular</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Ej. 70012345"
                    {...register('telefono')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="correo@ejemplo.com"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  autoComplete="street-address"
                  placeholder="Ej. Av. Principal #123, Zona Central"
                  {...register('direccion')}
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={guardando}>
                  {guardando ? 'Guardando…' : clienteAEditar ? 'Guardar cambios' : 'Crear cliente'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Alerta de confirmación para eliminar */}
        <AlertDialog
          open={!!clienteAEliminar}
          onOpenChange={(open) => !open && setClienteAEliminar(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminarán los datos de{' '}
                <strong className="text-foreground">{clienteAEliminar?.nombre_completo}</strong>.
                Si tiene préstamos asociados, la eliminación podría no permitirse por integridad de datos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={eliminarMutation.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={eliminarMutation.isPending}
                onClick={() => clienteAEliminar && eliminarMutation.mutate(clienteAEliminar.id)}
              >
                {eliminarMutation.isPending ? 'Eliminando…' : 'Sí, eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
