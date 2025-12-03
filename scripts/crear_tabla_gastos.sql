-- Crear tabla de gastos
create table public.gastos (
  id uuid not null default gen_random_uuid (),
  nombre text not null,
  concepto text not null,
  valor numeric not null,
  fecha timestamp with time zone not null default now(),
  usuario_id uuid null default auth.uid (),
  constraint gastos_pkey primary key (id)
) tablespace pg_default;

-- Habilitar RLS (Row Level Security) - Opcional pero recomendado
alter table public.gastos enable row level security;

-- Política para permitir lectura a todos (o ajustar según necesidad)
create policy "Permitir lectura a todos"
on public.gastos
for select using (true);

-- Política para permitir inserción a todos (o ajustar según necesidad)
create policy "Permitir inserción a todos"
on public.gastos
for insert with check (true);

-- Política para permitir eliminación a todos
create policy "Permitir eliminación a todos"
on public.gastos
for delete using (true);
