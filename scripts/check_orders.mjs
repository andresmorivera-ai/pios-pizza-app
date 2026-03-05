import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kvaqyaspaaqspkkcohvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2YXF5YXNwYWFxc3Bra2NvaHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTE3NzksImV4cCI6MjA3NTE4Nzc3OX0.16SKgimtmSMa01CVHbDXWX0Ezh56gdLgDqdHJov0QsY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkOrders() {
    const { data: og, error: e1 } = await supabase
        .from('ordenesgenerales')
        .select('*')
        .in('estado', ['pendiente', 'en_preparacion', 'listo', 'pendiente_por_pagar']);

    console.log("Ordenes Generales Pendientes:", JSON.stringify(og, null, 2));

    const { data: o, error: e2 } = await supabase
        .from('ordenes')
        .select('*')
        .in('estado', ['pendiente', 'en_preparacion', 'listo', 'pendiente_por_pagar']);

    console.log("Ordenes (Mesa) Pendientes:", JSON.stringify(o, null, 2));
}

checkOrders();
