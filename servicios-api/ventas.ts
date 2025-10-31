import { supabase } from '../scripts/lib/supabase';

// Tipos para las ventas
export interface ProductoVenta {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface VentaData {
  mesa: string;
  total: number;
  metodoPago: string;
  productos: ProductoVenta[];
}

export interface VentaCompleta {
  id: string;
  id_venta: string;
  fecha_hora: string;
  mesa: string;
  total: number;
  metodo_pago: string;
  estado: string;
  productos: ProductoVenta[];
}

/**
 * Genera un ID único para la venta con formato DDMMNNN
 * Ejemplo: 2410001 (primera venta del 24 de octubre)
 */
export async function generarIdVenta(): Promise<string> {
  try {
    const hoy = new Date();
    const dia = hoy.getDate().toString().padStart(2, '0');
    const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
    const fechaString = dia + mes; // Ejemplo: "2410"
    
    // Obtener el inicio y fin del día actual
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
    
    // Contar ventas del día actual
    const { data: ventasHoy, error } = await supabase
      .from('ventas')
      .select('id_venta')
      .gte('fecha_hora', inicioDia.toISOString())
      .lt('fecha_hora', finDia.toISOString());
    
    if (error) {
      console.error('Error obteniendo ventas del día:', error);
      throw error;
    }
    
    // Encontrar el siguiente número
    const numerosHoy = ventasHoy
      ?.map(v => {
        // Extraer solo los últimos 3 dígitos del ID
        const numeroStr = v.id_venta.substring(4);
        return parseInt(numeroStr);
      })
      .filter(n => !isNaN(n)) || [];
    
    const siguienteNumero = Math.max(0, ...numerosHoy) + 1;
    
    return fechaString + siguienteNumero.toString().padStart(3, '0');
  } catch (error) {
    console.error('Error generando ID de venta:', error);
    throw error;
  }
}

/**
 * Guarda una venta completa en la base de datos
 */
export async function guardarVenta(ventaData: VentaData): Promise<{ venta: any; idVenta: string }> {
  try {
    // Generar ID único
    const idVenta = await generarIdVenta();
    
    console.log('Guardando venta con ID:', idVenta);
    
    // Insertar la venta principal
    const { data: venta, error: ventaError } = await supabase
      .from('ventas')
      .insert({
        id_venta: idVenta,
        mesa: ventaData.mesa,
        total: ventaData.total,
        metodo_pago: ventaData.metodoPago,
        estado: 'completada'
      })
      .select()
      .single();

    if (ventaError) {
      console.error('Error insertando venta:', ventaError);
      throw ventaError;
    }

    // Preparar productos para insertar
    const productosConVentaId = ventaData.productos.map(producto => ({
      venta_id: venta.id,
      id_venta: idVenta,
      producto_nombre: producto.nombre,
      cantidad: producto.cantidad,
      precio_unitario: producto.precioUnitario,
      subtotal: producto.subtotal,
    }));

    // Insertar los productos de la venta
    const { error: productosError } = await supabase
      .from('venta_productos')
      .insert(productosConVentaId);

    if (productosError) {
      console.error('Error insertando productos:', productosError);
      throw productosError;
    }

    console.log('Venta guardada exitosamente:', idVenta);
    return { venta, idVenta };
  } catch (error) {
    console.error('Error guardando venta:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de ventas con filtros opcionales
 */
export async function obtenerHistorialVentas(
  fechaInicio?: string, 
  fechaFin?: string,
  mesa?: string
): Promise<VentaCompleta[]> {
  try {
    let query = supabase
      .from('ventas')
      .select(`
        id,
        id_venta,
        fecha_hora,
        mesa,
        total,
        metodo_pago,
        estado,
        venta_productos (
          producto_nombre,
          cantidad,
          precio_unitario,
          subtotal
        )
      `)
      .order('fecha_hora', { ascending: false });

    // Aplicar filtros
    if (fechaInicio) {
      query = query.gte('fecha_hora', fechaInicio);
    }
    if (fechaFin) {
      query = query.lte('fecha_hora', fechaFin);
    }
    if (mesa) {
      query = query.eq('mesa', mesa);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error obteniendo historial:', error);
      throw error;
    }

    // Transformar los datos para que sean más fáciles de usar
    const ventasCompletas: VentaCompleta[] = data?.map(venta => ({
      id: venta.id,
      id_venta: venta.id_venta,
      fecha_hora: venta.fecha_hora,
      mesa: venta.mesa,
      total: venta.total,
      metodo_pago: venta.metodo_pago,
      estado: venta.estado,
      productos: venta.venta_productos || []
    })) || [];

    return ventasCompletas;
  } catch (error) {
    console.error('Error obteniendo historial de ventas:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de ventas
 */
export async function obtenerEstadisticasVentas(fechaInicio?: string, fechaFin?: string) {
  try {
    let query = supabase
      .from('ventas')
      .select('total, metodo_pago, fecha_hora');

    if (fechaInicio) {
      query = query.gte('fecha_hora', fechaInicio);
    }
    if (fechaFin) {
      query = query.lte('fecha_hora', fechaFin);
    }

    const { data, error } = await query;
    
    if (error) throw error;

    const estadisticas = {
      totalVentas: data?.length || 0,
      totalIngresos: data?.reduce((sum, venta) => sum + venta.total, 0) || 0,
      ventasPorMetodo: data?.reduce((acc, venta) => {
        acc[venta.metodo_pago] = (acc[venta.metodo_pago] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {}
    };

    return estadisticas;
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw error;
  }
}

