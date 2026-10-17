# 🐘 Guía de Configuración y Scripts de Base de Datos para Supabase

Este directorio contiene los scripts SQL y la documentación arquitectónica para inicializar la base de datos de **Préstamo App** en cualquier proyecto nuevo de [Supabase](https://supabase.com).

---

## 📁 Archivos Disponibles

- **[`schema.sql`](./schema.sql)**: Script maestro DDL en PostgreSQL con todas las tablas, índices, llaves foráneas, funciones RPC y políticas de seguridad RLS.

---

## 🚀 Pasos para Configurar en un Nuevo Proyecto de Supabase

### 1. Crear el Proyecto en Supabase
1. Ingresa a [database.new](https://database.new) e inicia sesión con tu cuenta de GitHub o correo.
2. Crea una nueva organización o selecciona una existente.
3. Elige el nombre del proyecto (ej. `prestamo-app-prod`) y establece una contraseña segura para la base de datos.
4. Selecciona la región geográfica más cercana a tus usuarios (ej. `South America (São Paulo)`).

### 2. Ejecutar el Script `schema.sql`
1. En el panel lateral izquierdo de tu proyecto de Supabase, haz clic en **SQL Editor** (ícono de terminal `>_`).
2. Haz clic en **New query**.
3. Copia todo el contenido del archivo [`supabase/schema.sql`](./schema.sql) y pégalo en el editor.
4. Presiona el botón verde **Run** (o `Ctrl + Enter`).
5. Verás el mensaje `Success. No rows returned`, lo que confirma que las 4 tablas, los índices y los 2 procedimientos RPC fueron creados exitosamente.

### 3. Crear el Primer Usuario Administrador
1. Ve a **Authentication** > **Users** en el menú de Supabase.
2. Haz clic en **Add user** > **Create user**.
3. Ingresa un correo (ej. `admin@prestamoapp.com`) y una contraseña segura (mínimo 8 caracteres).
4. Asegúrate de marcar la casilla **Auto Confirm User?** para que pueda iniciar sesión de inmediato sin requerir confirmación por correo electrónico.

### 4. Obtener las Credenciales de Conexión
1. Dirígete a **Project Settings** (ícono de engranaje) > **API**.
2. Copia los siguientes valores:
   - **Project URL**: `https://xxxxxxxxxxxxxxxx.supabase.co`
   - **Project API Keys** > `anon` `public`: `eyJhbGciOi...`
3. Crea o edita el archivo `.env.local` en la raíz de tu proyecto frontend:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 Arquitectura de Datos

### Diagrama Entidad-Relación

```text
┌─────────────────┐       1:N       ┌─────────────────┐
│    clientes     │ ─────────────── │    prestamos    │
└─────────────────┘                 └─────────────────┘
                                             │ 1:N
                                             ▼
┌─────────────────┐       1:N       ┌─────────────────┐
│      pagos      │ ─────────────── │     cuotas      │
└─────────────────┘                 └─────────────────┘
```

### Descripción de Tablas

| Tabla | Propósito | Llaves / Restricciones |
| :--- | :--- | :--- |
| **`clientes`** | Prestatarios y personas registradas | `id` (UUID), `usuario_id` (FK a `auth.users`), `nombre_completo` |
| **`prestamos`** | Contratos de crédito acordados | `monto_prestado` (> 0), `tasa_interes_mensual`, `plazo_meses`, `estado` (`ACTIVO`, `PAGADO`, `CANCELADO`) |
| **`cuotas`** | Calendario de pagos amortizados | `prestamo_id` (CASCADE), `numero_cuota`, `fecha_vencimiento`, `monto_capital`, `monto_interes`, `saldo_restante` |
| **`pagos`** | Bitácora transaccional de cobros | `cuota_id` (CASCADE), `monto_pagado`, `metodo_pago` (`EFECTIVO`, `DEPOSITO`, `TRANSFERENCIA`), comprobante |

---

## ⚡ Procedimientos Almacenados (RPC Functions)

### 1. `crear_prestamo_con_cuotas`
- **Por qué existe**: Evita viajes innecesarios cliente-servidor (Round-Trips) y garantiza **atomicidad (ACID)**. Si falla la creación de una cuota, se cancela todo el préstamo sin dejar datos corruptos.
- **Fórmula Matemática**: Aplica el **Sistema Francés de Amortización**:
  $$\text{Cuota} = P \times \frac{r(1+r)^n}{(1+r)^n - 1}$$
- **Uso en Frontend**:
  ```ts
  const { data: nuevoPrestamoId, error } = await supabase.rpc('crear_prestamo_con_cuotas', {
    p_cliente_id: 'uuid-del-cliente',
    p_monto_prestado: 5000,
    p_tasa_interes_mensual: 3.0,
    p_plazo_meses: 12,
    p_fecha_inicio: '2026-05-01',
    p_notas: 'Garantía prendaria'
  });
  ```

### 2. `registrar_pago`
- **Por qué existe**: Registra el recibo en `pagos`, evalúa si el abono cubre la totalidad de la cuota (marcando `PAGADO` o `PARCIAL`) y comprueba si todas las cuotas del crédito fueron saldadas para cambiar el estado general del préstamo a `PAGADO`.
- **Uso en Frontend**:
  ```ts
  const { data: pagoId, error } = await supabase.rpc('registrar_pago', {
    p_cuota_id: 'uuid-de-la-cuota',
    p_monto_pagado: 450.50,
    p_fecha_pago: '2026-05-15',
    p_metodo_pago: 'TRANSFERENCIA',
    p_numero_referencia: 'TR-998822'
  });
  ```

---

## 🛡️ Seguridad y Control de Acceso (OWASP / RLS)

El script activa **Row Level Security (RLS)** en todas las tablas:

```sql
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
```

### Variante Multi-Tenant / Multi-Usuario
Si en el futuro deseas que cada asesor/cobrador **solo vea sus propios clientes y préstamos**, simplemente reemplaza las políticas de `schema.sql` por:

```sql
-- Solo el usuario que creó el cliente puede verlo y editarlo:
CREATE POLICY "Aislamiento por usuario en clientes" ON public.clientes
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());
```
