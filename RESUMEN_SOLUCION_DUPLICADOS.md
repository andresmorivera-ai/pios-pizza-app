# ✅ Solución Aplicada: Pedidos Duplicados y Error de Keys

## 🔍 Problema Identificado

Tenías razón: hay **dos formas de guardar ventas** en la base de datos:

### 1. Tabla `ventas` + `venta_productos` (Forma Normalizada)
- ✅ **Tabla `ventas`**: Guarda el resumen (ID, mesa, total, método de pago)
- ✅ **Tabla `venta_productos`**: Guarda cada producto individualmente
- ✅ Esta es la **fuente de verdad** para ventas completadas

### 2. Tabla `ordenes` (Formato JSON)
- Guarda productos en JSON: `productos: ["pollo asado (entero) $3500 X1", ...]`
- Tiene `id_venta` cuando se paga
- ⚠️ Esta es para **órdenes activas**, NO para historial de ventas

## ❌ Problema

En `reportes.tsx` se estaban cargando datos de **AMBAS fuentes**:
- Se cargaban ventas de la tabla `ventas` ✅
- También se usaban `ordenesEntregadas` del contexto ❌
- Esto causaba **duplicados** y **errores de keys**

## ✅ Solución Aplicada

### Cambios en `app/(tabs)/reportes.tsx`:

1. **Eliminado el uso de `ordenesEntregadas` para mostrar ventas**
   - Antes: `ordenesParaMostrar = ventasComoOrdenes.length > 0 ? ventasComoOrdenes : ordenesPagadas`
   - Ahora: `ordenesParaMostrar = ventasComoOrdenes` (SOLO tabla `ventas`)

2. **Cálculo de ganancias solo de tabla `ventas`**
   - Antes: Sumaba de `ventas` O `ordenesPagadas`
   - Ahora: Solo suma de `ventas`

3. **Total de órdenes pagadas solo de tabla `ventas`**
   - Antes: `ventas.length || ordenesPagadas.length`
   - Ahora: `ventas.length`

## 📊 Arquitectura Correcta

### Tabla `ventas` (Fuente de Verdad para Ventas)
- ✅ Usar para: Historial de ventas, reportes, desglose de ventas
- ✅ Contiene: Resumen de venta + productos en tabla relacionada

### Tabla `ordenes` (Para Órdenes Activas)
- ✅ Usar para: Órdenes pendientes, en preparación, listo, entregado
- ✅ NO usar para: Mostrar historial de ventas completadas

## 🎯 Resultado

- ✅ **No más duplicados**: Solo se muestran ventas de la tabla `ventas`
- ✅ **No más errores de keys**: Cada venta tiene un ID único
- ✅ **Fuente de verdad única**: Tabla `ventas` es la única fuente para ventas completadas

## 📝 Nota

- `ordenesEntregadas` todavía se usa para:
  - Contar total de órdenes (activas + entregadas)
  - Calcular productos más pedidos (de todas las órdenes)
  - Pero **NO** para mostrar el historial de ventas

## ✅ Verificación

Después de estos cambios:
1. Recarga la app
2. Ve a Reportes
3. No deberías ver pedidos duplicados
4. No deberías ver el error de keys duplicadas





