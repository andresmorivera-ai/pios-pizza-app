# 📚 Guía Pedagógica: Conexión a Base de Datos con Supabase

## 🎯 ¿Qué es Supabase?

**Supabase** es una plataforma que proporciona una base de datos PostgreSQL en la nube, similar a Firebase pero usando SQL. Es como tener un servidor de base de datos que puedes usar desde tu aplicación móvil sin necesidad de configurar servidores propios.

---

## 🔌 PASO 1: Configuración Inicial (El "Cable" de Conexión)

### 📁 Archivo: `scripts/lib/supabase.ts`

Este es el archivo más importante, aquí se crea la "conexión" con la base de datos:

```typescript
import { createClient } from '@supabase/supabase-js';

// 🔑 Credenciales de tu proyecto Supabase
const SUPABASE_URL = "https://kvaqyaspaaqspkkcohvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// 🚀 Crear el cliente (la "conexión")
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 🔍 Explicación Paso a Paso:

1. **`import { createClient }`**: 
   - Importamos la función que crea el "cliente" de Supabase
   - Es como obtener las herramientas para conectarte

2. **`SUPABASE_URL`**: 
   - Es la dirección de tu base de datos en internet
   - Como la dirección de una casa, pero en la nube
   - Ejemplo: `https://tu-proyecto.supabase.co`

3. **`SUPABASE_ANON_KEY`**: 
   - Es una "llave" que permite acceder a tu base de datos
   - La palabra "anon" significa "anónimo" - es una llave pública pero segura
   - Es como una tarjeta de acceso que te permite entrar al edificio

4. **`createClient(URL, KEY)`**: 
   - Crea el objeto `supabase` que usaremos para hacer todas las operaciones
   - Es como "conectar el cable" a la base de datos

5. **`export const supabase`**: 
   - Exportamos el cliente para que cualquier archivo pueda usarlo
   - Es como dejar el "cable" disponible para toda la casa

---

## 📦 PASO 2: Usar la Conexión en Otros Archivos

### 📁 Ejemplo: `utilidades/context/OrdenesContext.tsx`

```typescript
// 1️⃣ Importar el cliente
import { supabase } from '@/scripts/lib/supabase';

// 2️⃣ Usar el cliente para hacer consultas
const { data, error } = await supabase
  .from('ordenes')        // Seleccionar la tabla
  .select('*')           // Seleccionar todas las columnas
  .limit(10);            // Limitar a 10 resultados
```

### 🔍 Explicación:

- **`import { supabase }`**: Traemos el "cable" que creamos antes
- **`supabase.from('ordenes')`**: Decimos "quiero trabajar con la tabla 'ordenes'"
- **`.select('*')`**: Decimos "quiero ver todos los datos"
- **`.limit(10)`**: Decimos "solo quiero 10 resultados"

---

## 🛠️ PASO 3: Operaciones Básicas (CRUD)

### 📖 **READ (Leer) - Obtener Datos**

```typescript
// Obtener todas las órdenes
const { data: ordenes, error } = await supabase
  .from('ordenes')
  .select('*');

if (error) {
  console.error('Error:', error);
} else {
  console.log('Órdenes encontradas:', ordenes);
}
```

**¿Qué hace?**
- Va a la tabla `ordenes`
- Selecciona todos los registros (`*` significa "todo")
- Si hay error, lo muestra
- Si no hay error, muestra los datos

---

### ✏️ **CREATE (Crear) - Insertar Datos**

```typescript
// Crear una nueva orden
const { data: nuevaOrden, error } = await supabase
  .from('ordenes')
  .insert([
    {
      mesa: 'Mesa 5',
      productos: ['Pizza Margarita', 'Coca Cola'],
      total: 30000,
      estado: 'pendiente',
      fecha_creacion: new Date().toISOString()
    }
  ])
  .select()
  .single();

if (error) {
  console.error('Error creando orden:', error);
} else {
  console.log('Orden creada:', nuevaOrden);
}
```

**¿Qué hace?**
- Va a la tabla `ordenes`
- Inserta un nuevo registro con los datos proporcionados
- `.select()` devuelve el registro creado
- `.single()` asegura que solo devuelva un objeto (no un array)

---

### 🔄 **UPDATE (Actualizar) - Modificar Datos**

```typescript
// Actualizar el estado de una orden
const { data: ordenActualizada, error } = await supabase
  .from('ordenes')
  .update({ estado: 'entregado' })  // Nuevos valores
  .eq('id', '123-abc-456')          // Condición: donde id = '123-abc-456'
  .select()
  .single();

if (error) {
  console.error('Error actualizando:', error);
} else {
  console.log('Orden actualizada:', ordenActualizada);
}
```

**¿Qué hace?**
- Va a la tabla `ordenes`
- Actualiza el campo `estado` a `'entregado'`
- Solo en el registro donde `id` sea igual a `'123-abc-456'`
- `.eq()` significa "igual a" (equals)

---

### 🗑️ **DELETE (Eliminar) - Borrar Datos**

```typescript
// Eliminar una orden
const { error } = await supabase
  .from('ordenes')
  .delete()
  .eq('id', '123-abc-456');  // Solo eliminar donde id = '123-abc-456'

if (error) {
  console.error('Error eliminando:', error);
} else {
  console.log('Orden eliminada correctamente');
}
```

**¿Qué hace?**
- Va a la tabla `ordenes`
- Elimina el registro donde `id` sea igual a `'123-abc-456'`

---

## 🔍 PASO 4: Filtros y Consultas Avanzadas

### Filtrar por Condiciones

```typescript
// Obtener solo órdenes pendientes
const { data, error } = await supabase
  .from('ordenes')
  .select('*')
  .eq('estado', 'pendiente');  // Solo donde estado = 'pendiente'
```

### Filtrar por Rango de Fechas

```typescript
// Obtener ventas de hoy
const hoy = new Date();
const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

const { data, error } = await supabase
  .from('ventas')
  .select('*')
  .gte('fecha_hora', inicioDia.toISOString())  // >= inicioDia
  .lt('fecha_hora', finDia.toISOString());     // < finDia
```

**Operadores útiles:**
- `.eq('campo', valor)` - Igual a
- `.neq('campo', valor)` - No igual a
- `.gt('campo', valor)` - Mayor que
- `.gte('campo', valor)` - Mayor o igual que
- `.lt('campo', valor)` - Menor que
- `.lte('campo', valor)` - Menor o igual que
- `.like('campo', '%texto%')` - Contiene texto

---

## 🔄 PASO 5: Tiempo Real (Real-time Subscriptions)

### Escuchar Cambios en Tiempo Real

```typescript
// Escuchar cuando se inserta una nueva orden
const canal = supabase
  .channel('ordenes-cambios')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',           // Evento: cuando se inserta
      schema: 'public',          // Esquema de la base de datos
      table: 'ordenes'           // Tabla a escuchar
    },
    (payload) => {
      console.log('Nueva orden recibida:', payload.new);
      // Aquí puedes actualizar tu estado de React
    }
  )
  .subscribe();

// ⚠️ IMPORTANTE: Limpiar la suscripción cuando no se necesite
// (por ejemplo, cuando el componente se desmonte)
return () => {
  supabase.removeChannel(canal);
};
```

**¿Qué hace?**
- Crea un "canal" de comunicación
- Escucha cambios en la tabla `ordenes`
- Cuando se inserta un nuevo registro, ejecuta la función callback
- Es como tener un "walkie-talkie" con la base de datos

**Tipos de eventos:**
- `INSERT` - Cuando se crea un registro
- `UPDATE` - Cuando se actualiza un registro
- `DELETE` - Cuando se elimina un registro

---

## 📊 PASO 6: Ejemplo Completo del Proyecto

### 📁 Archivo: `utilidades/context/OrdenesContext.tsx`

```typescript
import { supabase } from '@/scripts/lib/supabase';

// Función para cargar órdenes desde Supabase
const cargarOrdenesDesdeSupabase = async (): Promise<Orden[]> => {
  try {
    // 1. Obtener inicio y fin del día
    const { inicioDia, finDia } = getInicioYFinDia();
    
    // 2. Consultar órdenes del día actual que no estén pagadas
    const { data: ordenesBD, error } = await supabase
      .from('ordenes')
      .select('*')
      .gte('fecha_creacion', inicioDia.toISOString())
      .lt('fecha_creacion', finDia.toISOString())
      .neq('estado', 'pago');  // Excluir órdenes pagadas
    
    if (error) {
      console.error('Error cargando órdenes:', error);
      return [];
    }
    
    // 3. Convertir los datos de Supabase al formato de la app
    const ordenes: Orden[] = (ordenesBD || []).map((o: any) => ({
      id: o.id,
      mesa: o.mesa,
      productos: o.productos,
      total: o.total,
      estado: o.estado,
      fechaCreacion: new Date(o.fecha_creacion),
    }));
    
    return ordenes;
  } catch (error) {
    console.error('Error en cargarOrdenesDesdeSupabase:', error);
    return [];
  }
};
```

**Flujo completo:**
1. ✅ Calcula el rango de fechas del día
2. ✅ Consulta Supabase con filtros
3. ✅ Maneja errores
4. ✅ Convierte los datos al formato de la app
5. ✅ Retorna las órdenes

---

## 🎯 PASO 7: Manejo de Errores

### Patrón Recomendado

```typescript
const { data, error } = await supabase
  .from('ordenes')
  .select('*');

// ✅ SIEMPRE verificar errores primero
if (error) {
  console.error('Error:', error.message);
  // Mostrar mensaje al usuario
  Alert.alert('Error', 'No se pudieron cargar las órdenes');
  return; // Salir de la función
}

// ✅ Si no hay error, usar los datos
if (data) {
  console.log('Datos recibidos:', data);
  // Actualizar estado de React
  setOrdenes(data);
}
```

---

## 🔐 PASO 8: Seguridad y Buenas Prácticas

### ⚠️ Problema Actual: Credenciales Hardcodeadas

**❌ NO HACER (como está ahora):**
```typescript
const SUPABASE_URL = "https://kvaqyaspaaqspkkcohvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**✅ MEJOR: Usar Variables de Entorno**

1. Crear archivo `.env` en la raíz del proyecto:
```env
EXPO_PUBLIC_SUPABASE_URL=https://kvaqyaspaaqspkkcohvd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Actualizar `scripts/lib/supabase.ts`:
```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
```

**¿Por qué?**
- Las credenciales no quedan expuestas en el código
- Puedes tener diferentes configuraciones para desarrollo y producción
- Es más seguro y profesional

---

## 📋 RESUMEN: Flujo Completo de una Operación

```
1. 📱 Usuario hace una acción (ej: crear orden)
   ↓
2. 🔌 La app llama a una función (ej: agregarOrden)
   ↓
3. 📡 La función usa `supabase.from('tabla')` para conectarse
   ↓
4. 🛠️ Se ejecuta la operación (INSERT, SELECT, UPDATE, DELETE)
   ↓
5. ⏳ Se espera la respuesta (await)
   ↓
6. ✅ Si hay datos: se actualiza el estado de React
   ❌ Si hay error: se muestra mensaje al usuario
   ↓
7. 🎨 La UI se actualiza automáticamente (React re-renderiza)
```

---

## 🎓 Conceptos Clave para Recordar

1. **`supabase`**: Es el objeto que representa tu conexión a la base de datos
2. **`.from('tabla')`**: Selecciona la tabla con la que quieres trabajar
3. **`.select()`**: Lee datos de la tabla
4. **`.insert()`**: Crea nuevos registros
5. **`.update()`**: Modifica registros existentes
6. **`.delete()`**: Elimina registros
7. **`.eq()`, `.gte()`, `.lt()`**: Filtros para buscar datos específicos
8. **`await`**: Espera a que la operación termine antes de continuar
9. **`{ data, error }`**: Siempre verifica ambos, especialmente `error`

---

## 🚀 Próximos Pasos

1. ✅ Entender cómo funciona `createClient`
2. ✅ Aprender las operaciones CRUD básicas
3. ✅ Practicar con filtros y consultas
4. ✅ Implementar manejo de errores robusto
5. ✅ Mover credenciales a variables de entorno
6. ✅ Implementar suscripciones en tiempo real si es necesario

---

## 📚 Recursos Adicionales

- [Documentación oficial de Supabase](https://supabase.com/docs)
- [Guía de JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Ejemplos de consultas](https://supabase.com/docs/reference/javascript/select)

---

**¡Felicidades! 🎉 Ahora entiendes cómo funciona la conexión a la base de datos en esta aplicación.**


