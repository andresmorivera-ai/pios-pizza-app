# 📋 REVISIÓN DE CONEXIÓN A BASE DE DATOS

## ✅ RESUMEN EJECUTIVO

**Estado Actual:** La aplicación **SÍ usa Supabase** como base de datos principal. No hay almacenamiento en JSON como base de datos.

**Uso de JSON encontrado:**
- ✅ Solo para pasar datos entre pantallas (navegación)
- ✅ Solo para AsyncStorage (almacenamiento local del usuario)

---

## 🔍 HALLAZGOS DETALLADOS

### 1. CONFIGURACIÓN DE SUPABASE

**Ubicación:** `scripts/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kvaqyaspaaqspkkcohvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**⚠️ PROBLEMA:** Credenciales hardcodeadas (deberían estar en variables de entorno)

---

### 2. TABLAS DE SUPABASE EN USO

#### ✅ Tabla: `ordenes`
- **Uso:** Guardar y consultar órdenes
- **Archivos que la usan:**
  - `utilidades/context/OrdenesContext.tsx` (líneas 42, 208, 235, 255)
  - `app/(tabs)/seleccionar-mesa.tsx` (línea 19)

#### ✅ Tabla: `mesas`
- **Uso:** Estado de las mesas
- **Archivos que la usan:**
  - `app/(tabs)/seleccionar-mesa.tsx`
  - `utilidades/context/OrdenesContext.tsx`

#### ✅ Tabla: `productos`
- **Uso:** Catálogo de productos
- **Archivos que la usan:**
  - `app/crear-orden.tsx` (línea 55)
  - `scripts/test-supabase.ts`

#### ✅ Tabla: `usuarios`
- **Uso:** Autenticación de usuarios
- **Archivos que la usan:**
  - `app/(tabs)/loginAdmin.tsx` (líneas 37, 58)

#### ✅ Tabla: `ventas`
- **Uso:** Historial de ventas
- **Archivos que la usan:**
  - `servicios-api/ventas.ts` (líneas 45, 85, 140)

#### ✅ Tabla: `venta_productos`
- **Uso:** Productos de cada venta
- **Archivos que la usan:**
  - `servicios-api/ventas.ts` (líneas 113, 149)

---

### 3. USO DE JSON ENCONTRADO

#### ✅ JSON.stringify en `app/cobrar.tsx` (línea 24)
```typescript
productos: JSON.stringify(orden.productos)
```
**Propósito:** Pasar datos entre pantallas (navegación)
**NO es almacenamiento:** Solo serialización para parámetros de navegación

#### ✅ JSON.parse en `app/detalles-cobro.tsx` (línea 42)
```typescript
const productos: string[] = JSON.parse(params.productos as string);
```
**Propósito:** Deserializar datos recibidos de navegación
**NO es almacenamiento:** Solo deserialización de parámetros

#### ✅ AsyncStorage en `utilidades/context/AuthContext.tsx`
```typescript
await AsyncStorage.setItem('usuario', JSON.stringify(userData));
const parsed = JSON.parse(data);
```
**Propósito:** Almacenamiento local del usuario en el dispositivo
**Es normal:** AsyncStorage requiere JSON para objetos complejos

**CONCLUSIÓN:** No hay almacenamiento de datos de negocio en JSON. Todo está en Supabase.

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### Problema 1: Credenciales Hardcodeadas

**Archivo:** `scripts/lib/supabase.ts`

**Problema:**
```typescript
const SUPABASE_URL = "https://kvaqyaspaaqspkkcohvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**Solución recomendada:**
```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
```

---

### Problema 2: Lógica Mixta en OrdenesContext

**Archivo:** `utilidades/context/OrdenesContext.tsx`

**Problema:** 
- Genera IDs locales (`orden-${Date.now()}`)
- Solo guarda en Supabase cuando la orden pasa a estado "pago"
- Si la app se cierra antes de cobrar, la orden no se persiste

**Código problemático:**
```typescript
// Línea 117-127: Crea orden localmente
const agregarOrden = async (mesa: string, productos: string[], total: number) => {
  const nuevaOrden: Orden = {
    id: `orden-${Date.now()}`,  // ❌ ID local temporal
    // ...
  };
  setOrdenes((prev) => [nuevaOrden, ...prev]);
  // ❌ NO guarda en Supabase inmediatamente
};

// Línea 208: Solo guarda cuando es "pago"
if (nuevoEstado === 'pago') {
  const { error } = await supabase.from('ordenes').insert([...]);
  // ❌ Inserta NUEVA orden en lugar de actualizar
}
```

**Solución recomendada:**
1. Guardar orden en Supabase inmediatamente al crearla
2. Usar el UUID de Supabase como ID desde el inicio
3. Actualizar la orden existente en lugar de insertar una nueva

---

### Problema 3: Inconsistencia en Guardado de Órdenes

**Archivo:** `utilidades/context/OrdenesContext.tsx` (línea 208)

**Problema:**
```typescript
if (nuevoEstado === 'pago') {
  const { error } = await supabase.from('ordenes').insert([...]);
  // ❌ Esto inserta una NUEVA orden en lugar de actualizar la existente
}
```

**Debería ser:**
```typescript
if (nuevoEstado === 'pago') {
  const { error } = await supabase
    .from('ordenes')
    .update({ estado: 'pago' })
    .eq('id', id);  // ✅ Actualizar la orden existente
}
```

---

## 📊 ESTRUCTURA ACTUAL DE DATOS

### Flujo de una Orden:

```
1. CREAR ORDEN
   └─> ID Local: "orden-1734567890123" (generado en OrdenesContext)
   └─> Estado: "pendiente"
   └─> Solo existe en memoria (React state)
   └─> ❌ NO se guarda en Supabase aún

2. ACTUALIZAR ORDEN
   └─> Se modifica usando el ID local
   └─> Estado: "en_preparacion" → "listo" → "entregado"
   └─> ❌ NO se guarda en Supabase aún

3. COBRAR ORDEN
   └─> Se genera ID de Venta: "2410001" (función generarIdVenta)
   └─> Se guarda en tabla "ventas" con UUID automático
   └─> Se inserta NUEVA orden en tabla "ordenes" con estado "pago"
   └─> ❌ PROBLEMA: Se duplica la orden

4. ALMACENAMIENTO FINAL
   └─> Tabla "ventas": UUID (id) + "2410001" (id_venta) ✅
   └─> Tabla "ordenes": UUID (id) + datos de la orden ✅
   └─> ❌ PROBLEMA: Orden duplicada (una local, una en BD)
```

---

## ✅ RECOMENDACIONES

### 1. Mover Credenciales a Variables de Entorno

**Crear archivo `.env`:**
```env
EXPO_PUBLIC_SUPABASE_URL=https://kvaqyaspaaqspkkcohvd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Actualizar `scripts/lib/supabase.ts`:**
```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
```

---

### 2. Guardar Órdenes en Supabase Inmediatamente

**Modificar `agregarOrden` en OrdenesContext:**
```typescript
const agregarOrden = async (mesa: string, productos: string[], total: number) => {
  // Guardar en Supabase primero
  const { data: nuevaOrdenBD, error } = await supabase
    .from('ordenes')
    .insert([
      {
        mesa,
        productos,
        total,
        estado: 'pendiente',
        fecha_creacion: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error guardando orden:', error);
    return;
  }

  // Usar el UUID de Supabase como ID
  const nuevaOrden: Orden = {
    id: nuevaOrdenBD.id,  // ✅ UUID de Supabase
    mesa,
    productos,
    total,
    estado: 'pendiente',
    fechaCreacion: new Date(nuevaOrdenBD.fecha_creacion),
  };

  setOrdenes((prev) => [nuevaOrden, ...prev]);
};
```

---

### 3. Actualizar Órdenes en Lugar de Insertar Nuevas

**Modificar `actualizarEstadoOrden` en OrdenesContext:**
```typescript
const actualizarEstadoOrden = async (id: string, nuevoEstado: Orden['estado']) => {
  // Actualizar en Supabase
  const { error } = await supabase
    .from('ordenes')
    .update({ estado: nuevoEstado })
    .eq('id', id);  // ✅ Actualizar la orden existente

  if (error) {
    console.error('Error actualizando orden:', error);
    return;
  }

  // Actualizar localmente
  setOrdenes((prev) =>
    prev.map((orden) => (orden.id === id ? { ...orden, estado: nuevoEstado } : orden))
  );

  // Si es "pago", actualizar mesa a "disponible"
  if (nuevoEstado === 'pago') {
    const ordenAActualizar = ordenes.find((o) => o.id === id);
    if (ordenAActualizar) {
      await supabase
        .from('mesas')
        .update({ estado: 'disponible' })
        .eq('numero_mesa', ordenAActualizar.mesa);
    }
  }
};
```

---

## 📝 CONCLUSIÓN

### ✅ Lo que está bien:
1. Supabase está configurado y funcionando
2. Todas las tablas necesarias existen
3. No hay almacenamiento de datos de negocio en JSON
4. El uso de JSON es solo para navegación y AsyncStorage (normal)

### ⚠️ Lo que necesita mejorarse:
1. Mover credenciales a variables de entorno
2. Guardar órdenes en Supabase inmediatamente al crearlas
3. Usar UUID de Supabase desde el inicio
4. Actualizar órdenes existentes en lugar de insertar nuevas

### 🎯 Próximos pasos:
1. Implementar las correcciones recomendadas
2. Probar que las órdenes se guarden correctamente
3. Verificar que no se dupliquen órdenes
4. Asegurar que las órdenes persistan aunque la app se cierre

---

## 📚 ARCHIVOS REVISADOS

1. ✅ `scripts/lib/supabase.ts` - Configuración de Supabase
2. ✅ `utilidades/context/OrdenesContext.tsx` - Manejo de órdenes
3. ✅ `app/cobrar.tsx` - Pantalla de cobro
4. ✅ `app/detalles-cobro.tsx` - Detalles de cobro
5. ✅ `app/crear-orden.tsx` - Crear orden
6. ✅ `app/(tabs)/seleccionar-mesa.tsx` - Seleccionar mesa
7. ✅ `app/(tabs)/loginAdmin.tsx` - Login de admin
8. ✅ `servicios-api/ventas.ts` - Servicios de ventas
9. ✅ `utilidades/context/AuthContext.tsx` - Contexto de autenticación

---

**Fecha de revisión:** $(date)
**Revisado por:** AI Assistant
**Estado:** ✅ Revisión completada







