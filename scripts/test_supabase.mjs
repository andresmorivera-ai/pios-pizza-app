import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kvaqyaspaaqspkkcohvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2YXF5YXNwYWFxc3Bra2NvaHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTE3NzksImV4cCI6MjA3NTE4Nzc3OX0.16SKgimtmSMa01CVHbDXWX0Ezh56gdLgDqdHJov0QsY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const formatError = (error) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object') try { return JSON.stringify(error, null, 2); } catch { return String(error); }
    return String(error);
};

async function generarIdVenta() {
    const hoy = new Date();
    const dia = hoy.getDate().toString().padStart(2, '0');
    const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
    const fechaString = dia + mes;

    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

    const { data: ventasHoy, error } = await supabase
        .from('ventas')
        .select('id_venta')
        .gte('fecha_hora', inicioDia.toISOString())
        .lt('fecha_hora', finDia.toISOString());

    if (error) throw error;

    const numerosHoy = ventasHoy?.map(v => parseInt(v.id_venta.substring(4))).filter(n => !isNaN(n)) || [];
    const siguienteNumero = Math.max(0, ...numerosHoy) + 1;
    return fechaString + siguienteNumero.toString().padStart(3, '0');
}

async function guardarVenta() {
    try {
        const idVenta = await generarIdVenta();
        console.log("ID Venta generado:", idVenta);

        const { data: venta, error: ventaError } = await supabase
            .from('ventas')
            .insert({
                id_venta: idVenta,
                mesa: "1",
                total: 1000,
                metodo_pago: "efectivo",
                estado: 'completada'
            })
            .select()
            .single();

        if (ventaError) throw ventaError;
        console.log("Venta insertada:", venta);

        // Cleanup
        await supabase.from('ventas').delete().eq('id', venta.id);
    } catch (e) {
        console.error("Test error:", typeof e.toJSON === 'function' ? e.toJSON() : e);
    }
}

guardarVenta();
