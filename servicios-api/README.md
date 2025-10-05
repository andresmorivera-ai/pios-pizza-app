# Servicios de Base de Datos - Supabase

Esta carpeta contiene toda la configuración y servicios para conectar con Supabase.

## Estructura

```
servicios-api/
├── database/
│   └── supabase.ts          # Cliente de Supabase y servicios de DB
└── README.md                # Este archivo
```

## Configuración

### 1. Instalar dependencias de Supabase

```bash
npm install @supabase/supabase-js
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con:

```env
EXPO_PUBLIC_SUPABASE_URL=tu_supabase_url_aqui
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
```

### 3. Configurar Supabase

1. Crea una cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a Settings > API
4. Copia la URL y la anon key

## Esquema de Base de Datos

### Tabla: mesas
```sql
CREATE TABLE mesas (
  id SERIAL PRIMARY KEY,
  numero INTEGER UNIQUE NOT NULL,
  estado VARCHAR(20) DEFAULT 'disponible',
  capacidad INTEGER DEFAULT 4,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: productos
```sql
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  disponible BOOLEAN DEFAULT true,
  imagen TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: ordenes
```sql
CREATE TABLE ordenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id INTEGER REFERENCES mesas(id),
  productos JSONB NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente',
  total DECIMAL(10,2) NOT NULL,
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Uso

```typescript
import { DatabaseService } from '@/servicios-api/database/supabase';

// Obtener todas las mesas
const mesas = await DatabaseService.getMesas();

// Crear una nueva orden
const orden = await DatabaseService.createOrden({
  mesa_id: 1,
  productos: ['Pollo Broaster', 'Pizza Margherita'],
  estado: 'pendiente',
  total: 25.50
});

// Actualizar estado de orden
await DatabaseService.updateEstadoOrden(ordenId, 'en_preparacion');
```

## Funcionalidades

- ✅ Gestión de mesas
- ✅ Gestión de productos
- ✅ Gestión de órdenes
- ✅ Actualización de estados
- ✅ Consultas optimizadas
- ✅ Tipos TypeScript
