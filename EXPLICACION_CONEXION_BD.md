# 📚 Explicación: Conexión a Base de Datos y Generación de IDs

## 🔌 1. CONEXIÓN A SUPABASE

### Configuración del Cliente
La conexión se establece en el archivo `scripts/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kvaqyaspaaqspkkcohvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**¿Cómo funciona?**
1. Se importa la función `createClient` de la librería `@supabase/supabase-js`
2. Se proporcionan las credenciales: URL del proyecto y clave anónima (anon key)
3. Se exporta el cliente `supabase` que se usa en toda la aplicación

---

## 🆔 2. GENERACIÓN DE IDs

### A. ID del Pedido (Orden) - Local y Base de Datos

#### **ID Local (temporal)**
Cuando se crea una orden en la aplicación, se genera un ID local:

**Ubicación:** `utilidades/context/OrdenesContext.tsx` (línea 119)

```typescript
const nuevaOrden: Orden = {
  id: `orden-${Date.now()}`,  // Ejemplo: "orden-1734567890123"
  mesa,
  productos,
  total,
  estado: 'pendiente',
  fechaCreacion: new Date(),
};
```

**Características:**
- ✅ Se genera usando `Date.now()` (timestamp en milisegundos)
- ✅ Formato: `"orden-" + timestamp`
- ✅ Es temporal, solo existe en el estado de React
- ✅ Se usa para identificar la orden mientras está en la app

#### **ID en Base de Datos (UUID)**
Cuando la orden se guarda en Supabase, la base de datos genera automáticamente un UUID:

**Ubicación:** Tabla `ordenes` en Supabase

```sql
CREATE TABLE ordenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- 🔹 Generado automáticamente
  mesa VARCHAR,
  productos JSONB,
  total DECIMAL,
  estado VARCHAR,
  fecha_creacion TIMESTAMP,
  ...
);
```

**Características:**
- ✅ UUID (Universally Unique Identifier)
- ✅ Se genera automáticamente por PostgreSQL/Supabase
- ✅ Formato: `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`
- ✅ Es único a nivel global
- ✅ Se guarda cuando la orden pasa a estado "pago" (línea 208 de OrdenesContext.tsx)

**Flujo completo:**
```
1. Usuario crea orden → ID local: "orden-1734567890123"
2. Orden se muestra en la app con ID local
3. Usuario cobra la orden → Se inserta en Supabase
4. Supabase genera UUID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
5. Este UUID se guarda en el campo `id` de la tabla `ordenes`
```

---

### B. ID de Venta (id_venta) - Formato Personalizado

#### **Generación del ID de Venta**
El ID de venta tiene un formato especial: **DDMMNNN**

**Ubicación:** `servicios-api/ventas.ts` (función `generarIdVenta()`)

```typescript
export async function generarIdVenta(): Promise<string> {
  const hoy = new Date();
  const dia = hoy.getDate().toString().padStart(2, '0');      // Día: "24"
  const mes = (hoy.getMonth() + 1).toString().padStart(2, '0'); // Mes: "10"
  const fechaString = dia + mes;  // "2410"
  
  // Contar ventas del día actual
  const { data: ventasHoy } = await supabase
    .from('ventas')
    .select('id_venta')
    .gte('fecha_hora', inicioDia.toISOString())
    .lt('fecha_hora', finDia.toISOString());
  
  // Encontrar el siguiente número
  const siguienteNumero = Math.max(0, ...numerosHoy) + 1;
  
  return fechaString + siguienteNumero.toString().padStart(3, '0');
  // Resultado: "2410001" (primera venta del 24 de octubre)
}
```

**Formato del ID:**
- **DD**: Día (2 dígitos) - Ejemplo: `24`
- **MM**: Mes (2 dígitos) - Ejemplo: `10`
- **NNN**: Número secuencial (3 dígitos) - Ejemplo: `001`

**Ejemplos:**
- `2410001` = Primera venta del 24 de octubre
- `2410002` = Segunda venta del 24 de octubre
- `2510001` = Primera venta del 25 de octubre (se reinicia el contador)

**Características:**
- ✅ Formato legible para humanos
- ✅ Incluye fecha (día y mes)
- ✅ Número secuencial que se reinicia cada día
- ✅ Se consulta la base de datos para saber cuántas ventas hay del día

**Flujo de uso:**
```
1. Usuario cobra una orden en detalles-cobro.tsx
2. Se llama a guardarVenta() → genera ID: "2410001"
3. Se inserta en tabla "ventas" con ese id_venta
4. Se muestra al usuario: "ID de Venta: 2410001"
```

---

### C. ID Aleatorio en Base de Datos (UUID)

#### **Tabla: ordenes**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```
- Se genera automáticamente al insertar
- Formato: `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`

#### **Tabla: ventas**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```
- También se genera automáticamente
- Se usa como clave primaria
- El `id_venta` es un campo adicional (no es la clave primaria)

---

## 📊 RESUMEN DE IDs

| Tipo | Formato | Ejemplo | Dónde se genera |
|------|---------|---------|-----------------|
| **ID Orden Local** | `orden-{timestamp}` | `orden-1734567890123` | Frontend (React) |
| **ID Orden BD** | UUID | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | Supabase (PostgreSQL) |
| **ID Venta** | `DDMMNNN` | `2410001` | Función JavaScript |
| **ID Venta BD** | UUID | `f9e8d7c6-b5a4-3210-9876-543210fedcba` | Supabase (PostgreSQL) |

---

## 🔄 FLUJO COMPLETO DE UNA ORDEN

```
1. CREAR ORDEN
   └─> ID Local: "orden-1734567890123" (generado en OrdenesContext)
   └─> Estado: "pendiente"
   └─> Solo existe en memoria (React state)

2. ACTUALIZAR ORDEN
   └─> Se modifica usando el ID local
   └─> Estado: "en_preparacion" → "listo" → "entregado"

3. COBRAR ORDEN
   └─> Se genera ID de Venta: "2410001" (función generarIdVenta)
   └─> Se guarda en tabla "ventas" con UUID automático
   └─> Se actualiza orden a estado "pago" en Supabase
   └─> Supabase genera UUID para la orden si no existe

4. ALMACENAMIENTO FINAL
   └─> Tabla "ventas": UUID (id) + "2410001" (id_venta)
   └─> Tabla "ordenes": UUID (id) + datos de la orden
```

---

## 🛠️ ARCHIVOS CLAVE

1. **`scripts/lib/supabase.ts`** - Cliente de Supabase
2. **`utilidades/context/OrdenesContext.tsx`** - Manejo de órdenes y IDs locales
3. **`servicios-api/ventas.ts`** - Generación de ID de venta
4. **`app/detalles-cobro.tsx`** - Uso de guardarVenta() con ID de venta
5. **`app/crear-orden.tsx`** - Creación de órdenes nuevas

---

## 💡 NOTAS IMPORTANTES

- ⚠️ El ID local (`orden-{timestamp}`) es temporal y solo existe en React
- ✅ El UUID de la base de datos es permanente y único globalmente
- ✅ El ID de venta (`DDMMNNN`) es legible para humanos y se reinicia cada día
- ✅ Todos los IDs UUID son generados automáticamente por PostgreSQL/Supabase
- ✅ El ID de venta se genera consultando cuántas ventas hay del día actual








