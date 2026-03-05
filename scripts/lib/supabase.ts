import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kvaqyaspaaqspkkcohvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2YXF5YXNwYWFxc3Bra2NvaHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTE3NzksImV4cCI6MjA3NTE4Nzc3OX0.16SKgimtmSMa01CVHbDXWX0Ezh56gdLgDqdHJov0QsY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);