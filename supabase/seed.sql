-- ==============================================================================
-- SCRIPT DE DATOS DE DEMOSTRACIÓN (SEED) PARA SUPABASE
-- Proyecto: Préstamo App
-- ==============================================================================
-- Instrucciones:
-- 1. Abre tu proyecto en Supabase (https://supabase.com/dashboard)
-- 2. Ve a SQL Editor (>_) en el menú izquierdo
-- 3. Pega todo este código y pulsa RUN (Ctrl + Enter)
-- ==============================================================================

-- 0. CONFIRMAR USUARIO ADMINISTRADOR DE DEMO
-- Si creaste el usuario admin@prestamoapp.com, este comando asegura que esté confirmado para login directo:
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmed_at = COALESCE(confirmed_at, now())
WHERE email = 'admin@prestamoapp.com';

DO $$
DECLARE
    -- IDs de clientes
    v_c1 UUID := gen_random_uuid();
    v_c2 UUID := gen_random_uuid();
    v_c3 UUID := gen_random_uuid();

    -- IDs de préstamos
    v_p1 UUID;
    v_p2 UUID;
    v_p3 UUID;

    -- IDs de cuotas para pagos
    v_cuota_id UUID;
    v_monto NUMERIC;
BEGIN
    -- --------------------------------------------------------------------------
    -- 1. INSERTAR CLIENTES (PRESTATARIOS)
    -- --------------------------------------------------------------------------
    INSERT INTO public.clientes (id, nombre_completo, documento_identidad, telefono, direccion, email)
    VALUES
        (v_c1, 'Carlos Eduardo Mendoza Flores', '4829103 SC', '+591 71234567', 'Av. Las Américas #450, Santa Cruz', 'carlos.mendoza@email.com'),
        (v_c2, 'María René Villarroel Terán', '3918274 CB', '+591 79876543', 'Calle España #128, Cochabamba', 'maria.villarroel@email.com'),
        (v_c3, 'Jorge Antonio Siles Banzer', '5123987 LP', '+591 76543210', 'Av. 6 de Agosto #2100, La Paz', 'jorge.siles@email.com')
    ON CONFLICT (id) DO NOTHING;

    -- --------------------------------------------------------------------------
    -- 2. PRÉSTAMO 1: Crédito Comercial Activo al Día ($5,000 / 6 meses / 2.5% mes)
    -- Cliente: Carlos Eduardo Mendoza
    -- --------------------------------------------------------------------------
    v_p1 := public.crear_prestamo_con_cuotas(
        p_cliente_id => v_c1,
        p_monto_prestado => 5000.00,
        p_tasa_interes_mensual => 2.50,
        p_plazo_meses => 6,
        p_fecha_inicio => CURRENT_DATE - INTERVAL '2 months',
        p_notas => 'Crédito para compra de mercadería e inventario de tienda.'
    );

    -- Pagar cuota 1 en su totalidad (Transferencia Bancaria)
    SELECT id, monto_cuota INTO v_cuota_id, v_monto
    FROM public.cuotas
    WHERE prestamo_id = v_p1 AND numero_cuota = 1;

    PERFORM public.registrar_pago(
        p_cuota_id => v_cuota_id,
        p_monto_pagado => v_monto,
        p_fecha_pago => (CURRENT_DATE - INTERVAL '1 month')::DATE,
        p_metodo_pago => 'TRANSFERENCIA',
        p_numero_referencia => 'TRF-98214-BNB',
        p_notas => 'Pago puntual recibido por transferencia interbancaria.'
    );

    -- Pagar cuota 2 en su totalidad (Efectivo)
    SELECT id, monto_cuota INTO v_cuota_id, v_monto
    FROM public.cuotas
    WHERE prestamo_id = v_p1 AND numero_cuota = 2;

    PERFORM public.registrar_pago(
        p_cuota_id => v_cuota_id,
        p_monto_pagado => v_monto,
        p_fecha_pago => CURRENT_DATE,
        p_metodo_pago => 'EFECTIVO',
        p_numero_referencia => 'REC-00142',
        p_notas => 'Cobro en ventanilla de caja.'
    );

    -- --------------------------------------------------------------------------
    -- 3. PRÉSTAMO 2: Crédito de Equipamiento con Cuota en Mora ($12,000 / 12 meses / 2.0% mes)
    -- Cliente: María René Villarroel
    -- --------------------------------------------------------------------------
    v_p2 := public.crear_prestamo_con_cuotas(
        p_cliente_id => v_c2,
        p_monto_prestado => 12000.00,
        p_tasa_interes_mensual => 2.00,
        p_plazo_meses => 12,
        p_fecha_inicio => CURRENT_DATE - INTERVAL '3 months',
        p_notas => 'Financiamiento de maquinaria textil y refacción de taller.'
    );

    -- Pagar cuota 1 (QR Simple)
    SELECT id, monto_cuota INTO v_cuota_id, v_monto
    FROM public.cuotas
    WHERE prestamo_id = v_p2 AND numero_cuota = 1;

    PERFORM public.registrar_pago(
        p_cuota_id => v_cuota_id,
        p_monto_pagado => v_monto,
        p_fecha_pago => (CURRENT_DATE - INTERVAL '2 months')::DATE,
        p_metodo_pago => 'TRANSFERENCIA',
        p_numero_referencia => 'QR-451928',
        p_notas => 'Pago mediante código QR.'
    );

    -- Cuota 2 pagada parcialmente (genera estado PARCIAL)
    SELECT id, monto_cuota INTO v_cuota_id, v_monto
    FROM public.cuotas
    WHERE prestamo_id = v_p2 AND numero_cuota = 2;

    PERFORM public.registrar_pago(
        p_cuota_id => v_cuota_id,
        p_monto_pagado => ROUND(v_monto / 2.0, 2),
        p_fecha_pago => (CURRENT_DATE - INTERVAL '15 days')::DATE,
        p_metodo_pago => 'EFECTIVO',
        p_numero_referencia => 'REC-00189',
        p_notas => 'Abono del 50% de la cuota por acuerdo de prórroga.'
    );

    -- --------------------------------------------------------------------------
    -- 4. PRÉSTAMO 3: Microcrédito 100% Pagado ($2,500 / 3 meses / 3.0% mes)
    -- Cliente: Jorge Antonio Siles
    -- --------------------------------------------------------------------------
    v_p3 := public.crear_prestamo_con_cuotas(
        p_cliente_id => v_c3,
        p_monto_prestado => 2500.00,
        p_tasa_interes_mensual => 3.00,
        p_plazo_meses => 3,
        p_fecha_inicio => CURRENT_DATE - INTERVAL '4 months',
        p_notas => 'Microcrédito de capital de trabajo de ciclo corto.'
    );

    -- Pagar las 3 cuotas para que el préstamo figure como PAGADO (Historial exitoso)
    FOR i IN 1..3 LOOP
        SELECT id, monto_cuota INTO v_cuota_id, v_monto
        FROM public.cuotas
        WHERE prestamo_id = v_p3 AND numero_cuota = i;

        PERFORM public.registrar_pago(
            p_cuota_id => v_cuota_id,
            p_monto_pagado => v_monto,
            p_fecha_pago => (CURRENT_DATE - ((4 - i) || ' months')::INTERVAL)::DATE,
            p_metodo_pago => 'TRANSFERENCIA',
            p_numero_referencia => 'DEP-LIQ-00' || i,
            p_notas => 'Cuota ' || i || ' liquidada puntualmente.'
        );
    END LOOP;

END $$;
