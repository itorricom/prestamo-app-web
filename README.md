# 💼 Préstamo App — Frontend Web

Aplicación web moderna y reactiva (SPA) para la administración integral de préstamos, cálculo automático de cronogramas de amortización, control de cuotas y registro de cobranzas en tiempo real.

Construida con **React 19**, **Vite**, **Tailwind CSS v4** y **shadcn/ui**, conectada directamente a **Supabase** como backend serverless (PostgreSQL, Autenticación y Funciones RPC).

---

## ✨ Características Principales

- 🔐 **Autenticación Segura**: Inicio de sesión respaldado por Supabase Auth (GoTrue) con gestión de sesión persistente y protección de rutas.
- 👥 **Gestión de Clientes**: Directorio de prestatarios con búsqueda reactiva en tiempo real por nombre, documento (CI/NIT) o teléfono, modales accesibles para alta y edición, y confirmación segura de borrado.
- 💰 **Simulación y Emisión de Préstamos**: Cálculo interactivo en vivo de la cuota mensual fija y total proyectado mediante el **Sistema Francés de Amortización** ($\text{Cuota} = P \times \frac{r(1+r)^n}{(1+r)^n - 1}$), con generación atómica de cuotas en base de datos.
- 📊 **Panel y Métricas Financieras (KPIs)**: Indicadores de capital total colocado, créditos activos y préstamos liquidados.
- 📋 **Cronograma de Amortización**: Desglose por cuota de capital, interés, saldo restante y estado (`Pendiente`, `Parcial`, `Pagada`, `Vencida`).
- 💳 **Módulo de Cobranzas**: Registro de pagos con cálculo automático del saldo restante, soporte para métodos de pago (Efectivo, Depósito, Transferencia/QR) y liquidación automática del contrato al saldar la última cuota.
- 📱 **Diseño 100% Responsivo y Accesible**: Barra lateral colapsable (`Sidebar`), navegación por migas de pan (`Breadcrumbs`), dígitos tabulares (`tabular-nums`) para cifras financieras y cumplimiento de directrices **WCAG 2.2** y **OWASP Top 10**.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Framework & Build** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite 8](https://vitejs.dev/) |
| **Estilos & UI** | [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (preset Nova con Base UI), [Lucide React](https://lucide.dev/) |
| **Estado & Formularios** | [TanStack React Query v5](https://tanstack.com/query/latest), [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/) |
| **Enrutamiento & Notificaciones** | [React Router DOM v7](https://reactrouter.com/), [React Hot Toast](https://react-hot-toast.com/) |
| **Backend & Base de Datos** | [Supabase](https://supabase.com/) (PostgreSQL 15+, Auth, RPCs, Row Level Security) |

---

## 🚀 Inicio Rápido en Local

### 1. Clonar e Instalar Dependencias

```bash
git clone https://github.com/TU_USUARIO/prestamo-app-web.git
cd prestamo-app-web
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

> 💡 **Nota**: Si aún no tienes tu base de datos en Supabase configurada, consulta la guía y script en [`supabase/README.md`](./supabase/README.md) y [`supabase/schema.sql`](./supabase/schema.sql).

### 3. Ejecutar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

### 4. Compilar para Producción

```bash
npm run build
```

Genera la distribución optimizada en el directorio `dist/`.

---

## 🗄️ Base de Datos (Supabase)

El esquema completo de PostgreSQL, las funciones RPC para generación de cuotas y las políticas de seguridad RLS se encuentran en:

- 📜 **Script SQL Maestro**: [`supabase/schema.sql`](./supabase/schema.sql)
- 📖 **Manual de Despliegue de Base de Datos**: [`supabase/README.md`](./supabase/README.md)

---

## ☁️ Despliegue en Vercel

El proyecto está preparado para desplegarse en **Vercel** como una SPA estática:

1. Conecta el repositorio de GitHub en [vercel.com/new](https://vercel.com/new).
2. Añade en **Project Settings > Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. El archivo [`vercel.json`](./vercel.json) incluido reescribe automáticamente todas las rutas hacia `/index.html`, evitando errores 404 al recargar páginas internas.

---

## 📄 Licencia

Este proyecto es de uso privado para la gestión y administración de préstamos.
