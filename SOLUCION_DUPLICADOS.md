# 🔧 Solución: Pedidos Duplicados y Error de Keys

## 🔍 Problema Identificado

Hay **dos formas de guardar ventas** en la base de datos:

### 1. Tabla `ventas` + `venta_productos` (Forma Normalizada - CORRECTA)
- **Tabla `ventas`**: Guarda el resumen de la venta (ID, mesa, total, método de pago)
- **Tabla `venta_productos`**: Guarda cada producto individualmente con el ID de la venta
- ✅ Esta es la forma correcta y normalizada

### 2. Tabla `ordenes` (Formato JSON)
- Guarda todo en un campo JSON: `productos: ["pollo asado (entero) $3500 X1", ...]`
- También tiene `id_venta` cuando se paga
- ⚠️ Esta es para órdenes activas, NO para historial de ventas

## ❌ Problema Actual

En `reportes.tsx` se están cargando datos de **AMBAS fuentes**:

1. Se cargan ventas de la tabla `ventas` (correcto)
2. También se usan `ordenesEntregadas` del contexto (puede causar duplicados)
3. Si una venta existe en ambas tablas, aparece duplicada

## ✅ Solución

**Usar SOLO la tabla `ventas` como fuente de verdad para ventas completadas:**

- ✅ **Tabla `ventas`**: Para mostrar historial de ventas (reportes, desglose)
- ✅ **Tabla `ordenes`**: Solo para órdenes activas (pendientes, en preparación, listo, entregado)
- ❌ **NO usar `ordenesEntregadas`** para mostrar ventas en reportes

## 🔧 Cambios Necesarios

1. En `reportes.tsx`: Usar SOLO `ventas` de la tabla `ventas`
2. Eliminar el uso de `ordenesEntregadas` para mostrar ventas
3. La tabla `ordenes` solo debe usarse para órdenes activas





