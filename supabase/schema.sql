-- ==============================================================================
-- SCHEMA COMPLETO DE BASE DE DATOS PARA SUPABASE
-- Proyecto: Préstamo App (Gestión de Créditos, Amortizaciones y Cobranzas)
-- Compatible con: Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLAS PRINCIPALES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 2.1 Tabla: CLIENTES (Prestatarios)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nombre_completo TEXT NOT NULL,
    documento_identidad TEXT,
    telefono TEXT,
    direccion TEXT,
    email TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON public.clientes (nombre_completo);
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON public.clientes (documento_identidad);

-- ------------------------------------------------------------------------------
-- 2.2 Tabla: PRESTAMOS (Contratos de Crédito)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prestamos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    monto_prestado NUMERIC(12, 2) NOT NULL CHECK (monto_prestado > 0),
    tasa_interes_mensual NUMERIC(5, 2) NOT NULL CHECK (tasa_interes_mensual >= 0),
    plazo_meses INTEGER NOT NULL CHECK (plazo_meses > 0),
    fecha_inicio DATE NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'PAGADO', 'CANCELADO')),
    notas TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_prestamos_cliente ON public.prestamos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON public.prestamos (estado);

-- ------------------------------------------------------------------------------
-- 2.3 Tabla: CUOTAS (Cronograma de Amortización)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cuotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prestamo_id UUID NOT NULL REFERENCES public.prestamos(id) ON DELETE CASCADE,
    numero_cuota INTEGER NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    monto_cuota NUMERIC(12, 2) NOT NULL,
    monto_capital NUMERIC(12, 2) NOT NULL,
    monto_interes NUMERIC(12, 2) NOT NULL,
    saldo_restante NUMERIC(12, 2) NOT NULL,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO')),
    fecha_pago TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_prestamo_cuota UNIQUE (prestamo_id, numero_cuota)
);

CREATE INDEX IF NOT EXISTS idx_cuotas_prestamo ON public.cuotas (prestamo_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_vencimiento ON public.cuotas (fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_cuotas_estado ON public.cuotas (estado);

-- ------------------------------------------------------------------------------
-- 2.4 Tabla: PAGOS (Historial de Cobros)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuota_id UUID NOT NULL REFERENCES public.cuotas(id) ON DELETE CASCADE,
    monto_pagado NUMERIC(12, 2) NOT NULL CHECK (monto_pagado > 0),
    fecha_pago DATE NOT NULL,
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'DEPOSITO', 'TRANSFERENCIA')),
    numero_referencia TEXT,
    url_comprobante TEXT,
    notas TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pagos_cuota ON public.pagos (cuota_id);

-- ==============================================================================
-- 3. PROCEDIMIENTOS ALMACENADOS (RPC FUNCTIONS PARA SUPABASE)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 3.1 Función RPC: crear_prestamo_con_cuotas
-- Calcula la amortización en sistema francés y genera atómicamente el plan
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_prestamo_con_cuotas(
    p_cliente_id UUID,
    p_monto_prestado NUMERIC,
    p_tasa_interes_mensual NUMERIC,
    p_plazo_meses INTEGER,
    p_fecha_inicio DATE,
    p_notas TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prestamo_id UUID;
    v_usuario_id UUID;
    v_tasa_decimal NUMERIC;
    v_cuota_fija NUMERIC;
    v_saldo NUMERIC;
    v_interes NUMERIC;
    v_capital NUMERIC;
    v_fecha_vencimiento DATE;
    i INTEGER;
BEGIN
    v_usuario_id := auth.uid();
    v_saldo := p_monto_prestado;
    v_tasa_decimal := p_tasa_interes_mensual / 100.0;

    -- Cálculo de cuota fija mensual (Fórmula de amortización francesa)
    IF v_tasa_decimal = 0 THEN
        v_cuota_fija := ROUND(p_monto_prestado / p_plazo_meses, 2);
    ELSE
        v_cuota_fija := ROUND(
            p_monto_prestado * (v_tasa_decimal * POWER(1 + v_tasa_decimal, p_plazo_meses)) /
            (POWER(1 + v_tasa_decimal, p_plazo_meses) - 1),
            2
        );
    END IF;

    -- 1. Insertar cabecera del préstamo
    INSERT INTO public.prestamos (
        usuario_id,
        cliente_id,
        monto_prestado,
        tasa_interes_mensual,
        plazo_meses,
        fecha_inicio,
        estado,
        notas
    ) VALUES (
        v_usuario_id,
        p_cliente_id,
        p_monto_prestado,
        p_tasa_interes_mensual,
        p_plazo_meses,
        p_fecha_inicio,
        'ACTIVO',
        p_notas
    ) RETURNING id INTO v_prestamo_id;

    -- 2. Generar el cronograma de cuotas
    FOR i IN 1..p_plazo_meses LOOP
        v_fecha_vencimiento := p_fecha_inicio + (i || ' months')::INTERVAL;
        v_interes := ROUND(v_saldo * v_tasa_decimal, 2);
        
        -- Ajuste en la última cuota para cuadrar redondeos
        IF i = p_plazo_meses THEN
            v_capital := v_saldo;
            v_cuota_fija := v_capital + v_interes;
            v_saldo := 0.00;
        ELSE
            v_capital := v_cuota_fija - v_interes;
            v_saldo := v_saldo - v_capital;
        END IF;

        INSERT INTO public.cuotas (
            prestamo_id,
            numero_cuota,
            fecha_vencimiento,
            monto_cuota,
            monto_capital,
            monto_interes,
            saldo_restante,
            estado
        ) VALUES (
            v_prestamo_id,
            i,
            v_fecha_vencimiento,
            v_cuota_fija,
            v_capital,
            v_interes,
            GREATEST(v_saldo, 0.00),
            'PENDIENTE'
        );
    END LOOP;

    RETURN v_prestamo_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3.2 Función RPC: registrar_pago
-- Registra el cobro, actualiza el estado de la cuota y liquida el préstamo si finaliza
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_pago(
    p_cuota_id UUID,
    p_monto_pagado NUMERIC,
    p_fecha_pago DATE,
    p_metodo_pago TEXT,
    p_numero_referencia TEXT DEFAULT NULL,
    p_url_comprobante TEXT DEFAULT NULL,
    p_notas TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pago_id UUID;
    v_prestamo_id UUID;
    v_monto_cuota NUMERIC;
    v_total_pagado NUMERIC;
    v_cuotas_pendientes INTEGER;
BEGIN
    -- 1. Obtener datos de la cuota
    SELECT prestamo_id, monto_cuota INTO v_prestamo_id, v_monto_cuota
    FROM public.cuotas
    WHERE id = p_cuota_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cuota no encontrada';
    END IF;

    -- 2. Insertar el pago
    INSERT INTO public.pagos (
        cuota_id,
        monto_pagado,
        fecha_pago,
        metodo_pago,
        numero_referencia,
        url_comprobante,
        notas
    ) VALUES (
        p_cuota_id,
        p_monto_pagado,
        p_fecha_pago,
        p_metodo_pago,
        p_numero_referencia,
        p_url_comprobante,
        p_notas
    ) RETURNING id INTO v_pago_id;

    -- 3. Calcular suma acumulada de pagos para esta cuota
    SELECT COALESCE(SUM(monto_pagado), 0) INTO v_total_pagado
    FROM public.pagos
    WHERE cuota_id = p_cuota_id;

    -- 4. Actualizar estado de la cuota
    IF v_total_pagado >= v_monto_cuota THEN
        UPDATE public.cuotas
        SET estado = 'PAGADO',
            fecha_pago = p_fecha_pago
        WHERE id = p_cuota_id;
    ELSE
        UPDATE public.cuotas
        SET estado = 'PARCIAL'
        WHERE id = p_cuota_id;
    END IF;

    -- 5. Verificar si todas las cuotas del préstamo están pagadas
    SELECT COUNT(*) INTO v_cuotas_pendientes
    FROM public.cuotas
    WHERE prestamo_id = v_prestamo_id
      AND estado != 'PAGADO';

    IF v_cuotas_pendientes = 0 THEN
        UPDATE public.prestamos
        SET estado = 'PAGADO',
            actualizado_en = timezone('utc'::text, now())
        WHERE id = v_prestamo_id;
    END IF;

    RETURN v_pago_id;
END;
$$;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) - SEGURIDAD OWASP
-- ==============================================================================

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios autenticados:
CREATE POLICY "Acceso total a clientes para usuarios autenticados"
    ON public.clientes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acceso total a préstamos para usuarios autenticados"
    ON public.prestamos FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acceso total a cuotas para usuarios autenticados"
    ON public.cuotas FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acceso total a pagos para usuarios autenticados"
    ON public.pagos FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
