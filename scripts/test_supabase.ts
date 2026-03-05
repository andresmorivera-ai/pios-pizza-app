import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kvaqyaspaaqspkkcohvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2YXF5YXNwYWFxc3Bra2NvaHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTE3NzksImV4cCI6MjA3NTE4Nzc3OX0.16SKgimtmSMa01CVHbDXWX0Ezh56gdLgDqdHJov0QsY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testVentas() {
    const { data, error } = await supabase.from('ventas').select('*').limit(1);
    console.log('Ventas:', { data, error });

    const { data: vp, error: e2 } = await supabase.from('venta_productos').select('*').limit(1);
    console.log('Venta Productos:', { vp, e2 });

    const { data: og, error: e3 } = await supabase.from('ordenesgenerales').select('*').limit(1);
    console.log('Ordenes Generales:', { og, e3 });

    const { data: mesas, error: e4 } = await supabase.from('mesas').select('*').limit(1);
    console.log('Mesas:', { mesas, e4 });
}

testVentas();
