import { createClient } from '@supabase/supabase-js';

// 🔐 Claves de tu proyecto
const SUPABASE_URL = "https://kvaqyaspaaqspkkcohvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2YXF5YXNwYWFxc3Bra2NvaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYxMTc3OSwiZXhwIjoyMDc1MTg3Nzc5fQ.39jIukowOCcHRb9RUp4jsEX-rmGxuvbSyo0ij0UIo7Q";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🧪 Probar conexión
async function probarConexion() {
  console.log("🔌 Probando conexión a Supabase...");

  const { data, error } = await supabase.from("productos").select("*").limit(3);

  if (error) {
    console.error("❌ Error al conectar o consultar:", error.message);
  } else {
    console.log("✅ Conexión exitosa. Productos encontrados:");
    console.table(data);
  }
}

probarConexion();