
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kvaqyaspaaqspkkcohvd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2YXF5YXNwYWFxc3Bra2NvaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYxMTc3OSwiZXhwIjoyMDc1MTg3Nzc5fQ.39jIukowOCcHRb9RUp4jsEX-rmGxuvbSyo0ij0UIo7Q";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProductStructure() {
    console.log('Fetching one product from products_actualizadosNEW...');
    const { data, error } = await supabase
        .from('productos_actualizadosNEW')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Product data structure:', JSON.stringify(data[0], null, 2));
        console.log('Available keys:', Object.keys(data[0]));
    } else {
        console.log('No data found in the table.');
    }
}

checkProductStructure();
