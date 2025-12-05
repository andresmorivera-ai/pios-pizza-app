import { obtenerEstadisticasVentas, obtenerHistorialVentas } from '@/servicios-api/ventas';
import { useState } from 'react';

/**
 * Ejemplos de uso de las funciones de historial de ventas
 */

// Ejemplo 1: Obtener todas las ventas
export async function ejemploObtenerTodasLasVentas() {
  try {
    const ventas = await obtenerHistorialVentas();
    console.log('Todas las ventas:', ventas);
    return ventas;
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
  }
}

// Ejemplo 2: Obtener ventas de un día específico
export async function ejemploObtenerVentasDelDia(fecha: string) {
  try {
    const inicioDia = `${fecha}T00:00:00.000Z`;
    const finDia = `${fecha}T23:59:59.999Z`;

    const ventas = await obtenerHistorialVentas(inicioDia, finDia);
    console.log(`Ventas del ${fecha}:`, ventas);
    return ventas;
  } catch (error) {
    console.error('Error obteniendo ventas del día:', error);
  }
}

// Ejemplo 3: Obtener ventas de una mesa específica
export async function ejemploObtenerVentasDeMesa(mesa: string) {
  try {
    const ventas = await obtenerHistorialVentas(undefined, undefined, mesa);
    console.log(`Ventas de la ${mesa}:`, ventas);
    return ventas;
  } catch (error) {
    console.error('Error obteniendo ventas de la mesa:', error);
  }
}

// Ejemplo 4: Obtener estadísticas de ventas
export async function ejemploObtenerEstadisticas() {
  try {
    const estadisticas = await obtenerEstadisticasVentas();
    console.log('Estadísticas:', estadisticas);
    return estadisticas;
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
  }
}

// Ejemplo 5: Obtener estadísticas de un rango de fechas
export async function ejemploObtenerEstadisticasRango(fechaInicio: string, fechaFin: string) {
  try {
    const estadisticas = await obtenerEstadisticasVentas(fechaInicio, fechaFin);
    console.log(`Estadísticas del ${fechaInicio} al ${fechaFin}:`, estadisticas);
    return estadisticas;
  } catch (error) {
    console.error('Error obteniendo estadísticas del rango:', error);
  }
}

// Ejemplo de uso en un componente React
export function ejemploUsoEnComponente() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargarVentas = async () => {
    setCargando(true);
    try {
      const datosVentas = await obtenerHistorialVentas();
      setVentas(datosVentas);
    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setCargando(false);
    }
  };

  return {
    ventas,
    cargando,
    cargarVentas
  };
}











