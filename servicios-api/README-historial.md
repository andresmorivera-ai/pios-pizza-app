# Sistema de Historial de Ventas

Este sistema permite guardar y consultar el historial completo de ventas en Supabase.

## Estructura de Base de Datos

### Tabla `ventas`
- `id`: UUID único (clave primaria)
- `id_venta`: ID único con formato DDMMNNN (ej: 2410001)
- `fecha_hora`: Timestamp de la venta
- `mesa`: Número de mesa
- `total`: Total de la venta
- `metodo_pago`: Método de pago usado
- `estado`: Estado de la venta (completada/cancelada)

### Tabla `venta_productos`
- `id`: UUID único (clave primaria)
- `venta_id`: Referencia a la venta principal
- `id_venta`: ID de venta para consultas rápidas
- `producto_nombre`: Nombre del producto
- `cantidad`: Cantidad vendida
- `precio_unitario`: Precio por unidad
- `subtotal`: Subtotal del producto

## Funciones Disponibles

### `generarIdVenta()`
Genera un ID único para la venta con formato DDMMNNN.
- **Ejemplo**: 2410001 (primera venta del 24 de octubre)

### `guardarVenta(ventaData)`
Guarda una venta completa en la base de datos.

**Parámetros:**
```typescript
{
  mesa: string;
  total: number;
  metodoPago: string;
  productos: ProductoVenta[];
}
```

**Ejemplo de uso:**
```typescript
const resultado = await guardarVenta({
  mesa: "Mesa 3",
  total: 45000,
  metodoPago: "efectivo",
  productos: [
    {
      nombre: "Hamburguesa Clásica",
      cantidad: 2,
      precioUnitario: 15000,
      subtotal: 30000
    },
    {
      nombre: "Coca Cola",
      cantidad: 1,
      precioUnitario: 5000,
      subtotal: 5000
    }
  ]
});
```

### `obtenerHistorialVentas(fechaInicio?, fechaFin?, mesa?)`
Obtiene el historial de ventas con filtros opcionales.

**Parámetros opcionales:**
- `fechaInicio`: Fecha de inicio (ISO string)
- `fechaFin`: Fecha de fin (ISO string)
- `mesa`: Número de mesa específica

**Ejemplos:**
```typescript
// Todas las ventas
const todasLasVentas = await obtenerHistorialVentas();

// Ventas de hoy
const hoy = new Date().toISOString().split('T')[0];
const ventasHoy = await obtenerHistorialVentas(`${hoy}T00:00:00.000Z`, `${hoy}T23:59:59.999Z`);

// Ventas de una mesa específica
const ventasMesa3 = await obtenerHistorialVentas(undefined, undefined, "Mesa 3");
```

### `obtenerEstadisticasVentas(fechaInicio?, fechaFin?)`
Obtiene estadísticas de ventas.

**Retorna:**
```typescript
{
  totalVentas: number;
  totalIngresos: number;
  ventasPorMetodo: Record<string, number>;
}
```

## Integración Automática

El sistema se integra automáticamente en la pantalla de detalles de cobro. Cuando se procesa un pago exitoso:

1. Se genera un ID único de venta
2. Se guarda la venta en la tabla `ventas`
3. Se guardan todos los productos en la tabla `venta_productos`
4. Se muestra el ID de venta en la confirmación

## Formato de ID de Venta

El ID sigue el formato: **DDMMNNN**
- **DD**: Día del mes (01-31)
- **MM**: Mes (01-12)
- **NNN**: Número secuencial del día (001-999)

**Ejemplos:**
- 2410001: Primera venta del 24 de octubre
- 2410002: Segunda venta del 24 de octubre
- 2510001: Primera venta del 25 de octubre

## Manejo de Errores

Todas las funciones incluyen manejo de errores y logging detallado. Los errores se registran en la consola para facilitar el debugging.

## Próximas Mejoras

- [ ] Pantalla de reportes de ventas
- [ ] Exportación de datos a Excel/PDF
- [ ] Gráficos de ventas por período
- [ ] Análisis de productos más vendidos
- [ ] Reportes por método de pago

