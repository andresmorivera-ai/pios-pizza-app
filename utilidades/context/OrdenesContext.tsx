import { supabase } from '@/scripts/lib/supabase';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

// ------------------- INTERFACES -------------------
export interface Orden {
  id: string;
  mesa: string;
  productos: string[];
  total: number;
  estado: 'disponible' | 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'pendiente_por_pagar' | 'pago';
  fechaCreacion: Date;
  fechaEntrega?: Date;
  metodoPago?: 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta';
  productosNuevos?: number[];
  idVenta?: string;
}

interface OrdenesContextType {
  ordenes: Orden[];
  ordenesEntregadas: Orden[];
  agregarOrden: (mesa: string, productos: string[], total: number) => Promise<void>;
  actualizarProductosOrden: (id: string, productosNuevos: string[], totalNuevo: number) => Promise<void>;
  actualizarEstadoOrden: (id: string, nuevoEstado: Orden['estado']) => Promise<void>;
  procesarPago: (id: string, metodoPago: 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta', idVenta?: string) => Promise<void>;
  eliminarOrden: (id: string) => Promise<void>;
  getOrdenesPorMesa: (mesa: string) => Orden[];
  getOrdenActivaPorMesa: (mesa: string) => Orden | null;
  getOrdenesPendientes: () => Orden[];
  loading: boolean;
}

// ------------------- CONTEXTO -------------------
const OrdenesContext = createContext<OrdenesContextType | undefined>(undefined);

export function OrdenesProvider({ children }: { children: ReactNode }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [ordenesEntregadas, setOrdenesEntregadas] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);

  // ------------------- FUNCIONES AUXILIARES -------------------

  // Obtener inicio y fin del día actual (hora local)
  const getInicioYFinDia = () => {
    const hoy = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
    return { inicioDia, finDia };
  };

  // Convertir datos de Supabase a Orden
  const convertirDeSupabase = (o: any): Orden => ({
    id: o.id,
    mesa: o.mesa,
    productos: o.productos || [],
    total: o.total,
    estado: o.estado,
    fechaCreacion: new Date(o.fecha_creacion),
    fechaEntrega: o.fecha_entrega ? new Date(o.fecha_entrega) : undefined,
    metodoPago: o.metodo_pago,
    idVenta: o.id_venta,
  });

  // Cargar órdenes activas desde Supabase (solo del día actual, sin estado 'pago')
  const cargarOrdenesActivas = async () => {
    try {
      const { inicioDia, finDia } = getInicioYFinDia();

      const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .neq('estado', 'pago')
        .gte('fecha_creacion', inicioDia.toISOString())
        .lte('fecha_creacion', finDia.toISOString())
        .order('fecha_creacion', { ascending: false });

      if (error) {
        console.error('❌ Error cargando órdenes activas:', error);
        return [];
      }

      const ordenesCargadas = (data || []).map(convertirDeSupabase);
      
      console.log('📦 Órdenes activas cargadas:', ordenesCargadas.length);
      
      return ordenesCargadas;
    } catch (error) {
      console.error('❌ Error en cargarOrdenesActivas:', error);
      return [];
    }
  };

  // Cargar órdenes pagadas del día
  const cargarOrdenesPagadas = async () => {
    try {
      const { inicioDia, finDia } = getInicioYFinDia();

      const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .eq('estado', 'pago')
        .gte('fecha_creacion', inicioDia.toISOString())
        .lte('fecha_creacion', finDia.toISOString())
        .order('fecha_entrega', { ascending: false });

      if (error) {
        console.error('❌ Error cargando órdenes pagadas:', error);
        return [];
      }

      const ordenesPagadas = (data || []).map(convertirDeSupabase);
      
      console.log('💰 Órdenes pagadas cargadas:', ordenesPagadas.length);
      
      return ordenesPagadas;
    } catch (error) {
      console.error('❌ Error en cargarOrdenesPagadas:', error);
      return [];
    }
  };

  // Cargar todas las órdenes al iniciar
  useEffect(() => {
    const inicializar = async () => {
      setLoading(true);
      
      const [activas, pagadas] = await Promise.all([
        cargarOrdenesActivas(),
        cargarOrdenesPagadas()
      ]);
      
      setOrdenes(activas);
      setOrdenesEntregadas(pagadas);
      setLoading(false);
    };

    inicializar();

    // Suscripción en tiempo real a cambios en "ordenes"
    const canal = supabase
      .channel('ordenes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordenes' },
        async (payload) => {
          console.log('🔔 Evento realtime recibido:', payload.eventType);
          
          const { inicioDia, finDia } = getInicioYFinDia();

          if (payload.eventType === 'INSERT') {
            const nueva = payload.new as any;
            
            // Verificar si es del día actual
            const fechaCreacion = new Date(nueva.fecha_creacion);
            if (fechaCreacion < inicioDia || fechaCreacion > finDia) {
              console.log('⏭️ Orden no es del día actual, ignorando');
              return;
            }

            const ordenNueva = convertirDeSupabase(nueva);
            
            // Agregar a la lista correspondiente según estado
            if (nueva.estado === 'pago') {
              console.log('💰 Nueva orden pagada:', ordenNueva.id);
              setOrdenesEntregadas((prev) => [ordenNueva, ...prev]);
            } else {
              console.log('📦 Nueva orden activa:', ordenNueva.id);
              setOrdenes((prev) => [ordenNueva, ...prev]);
            }
          } 
          
          else if (payload.eventType === 'UPDATE') {
            const actualizada = payload.new as any;
            
            // Verificar si es del día actual
            const fechaCreacion = new Date(actualizada.fecha_creacion);
            if (fechaCreacion < inicioDia || fechaCreacion > finDia) {
              console.log('⏭️ Orden no es del día actual, ignorando');
              return;
            }

            const ordenActualizada = convertirDeSupabase(actualizada);
            
            // Si cambió a "pago", mover de activas a pagadas
            if (actualizada.estado === 'pago') {
              console.log('💰 Orden cambió a pagada:', ordenActualizada.id);
              
              setOrdenes((prev) => prev.filter((o) => o.id !== actualizada.id));
              setOrdenesEntregadas((prev) => {
                const existe = prev.some((o) => o.id === ordenActualizada.id);
                return existe ? prev : [ordenActualizada, ...prev];
              });
            } 
            // Si cambió de "pago" a otro estado, mover de pagadas a activas
            else if (payload.old && (payload.old as any).estado === 'pago') {
              console.log('📦 Orden cambió de pagada a activa:', ordenActualizada.id);
              
              setOrdenesEntregadas((prev) => prev.filter((o) => o.id !== actualizada.id));
              setOrdenes((prev) => {
                const existe = prev.some((o) => o.id === ordenActualizada.id);
                return existe ? prev : [ordenActualizada, ...prev];
              });
            }
            // Actualizar en la lista correspondiente
            else {
              console.log('🔄 Actualizando orden:', ordenActualizada.id);
              
              setOrdenes((prev) => {
                const existe = prev.some((o) => o.id === actualizada.id);
                if (existe) {
                  return prev.map((o) => 
                    o.id === actualizada.id ? ordenActualizada : o
                  );
                } else {
                  // Si no existe en activas y no está pagada, agregarla
                  return [ordenActualizada, ...prev];
                }
              });
            }
          } 
          
          else if (payload.eventType === 'DELETE') {
            const eliminada = payload.old as any;
            console.log('🗑️ Orden eliminada:', eliminada.id);
            
            setOrdenes((prev) => prev.filter((o) => o.id !== eliminada.id));
            setOrdenesEntregadas((prev) => prev.filter((o) => o.id !== eliminada.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // ------------------- FUNCIONES CRUD -------------------

  // Crear una nueva orden
  const agregarOrden = async (mesa: string, productos: string[], total: number) => {
    try {
      const fechaCreacion = new Date();

      const { data, error } = await supabase
        .from('ordenes')
        .insert([
          {
            mesa,
            productos,
            total,
            estado: 'pendiente',
            fecha_creacion: fechaCreacion.toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando orden:', error);
        Alert.alert('Error', 'No se pudo crear la orden');
        return;
      }

      console.log('✅ Orden creada exitosamente:', data.id);

      // Actualizar estado de la mesa
      await supabase
        .from('mesas')
        .update({ estado: 'pendiente' })
        .eq('numero_mesa', mesa);

    } catch (error) {
      console.error('❌ Error en agregarOrden:', error);
      Alert.alert('Error', 'Error al crear la orden');
    }
  };

  // Actualizar productos de una orden
  const actualizarProductosOrden = async (id: string, productosNuevos: string[], totalNuevo: number) => {
    try {
      // Obtener productos originales
      const ordenActual = ordenes.find(o => o.id === id);
      const productosOriginales = ordenActual?.productos.length || 0;

      const { error } = await supabase
        .from('ordenes')
        .update({
          productos: productosNuevos,
          total: totalNuevo,
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error actualizando productos:', error);
        Alert.alert('Error', 'No se pudieron actualizar los productos');
        return;
      }

      console.log('✅ Productos actualizados exitosamente');

      // Actualizar localmente los índices de productos nuevos
      setOrdenes(prev => prev.map(orden => {
        if (orden.id === id) {
          const productosNuevosIndices = [];
          for (let i = productosOriginales; i < productosNuevos.length; i++) {
            productosNuevosIndices.push(i);
          }
          return { 
            ...orden, 
            productos: productosNuevos, 
            total: totalNuevo,
            productosNuevos: productosNuevosIndices
          };
        }
        return orden;
      }));

    } catch (error) {
      console.error('❌ Error en actualizarProductosOrden:', error);
      Alert.alert('Error', 'Error al actualizar productos');
    }
  };

  // Cambiar estado de una orden
  const actualizarEstadoOrden = async (id: string, nuevoEstado: Orden['estado']) => {
    try {
      const ordenAActualizar = ordenes.find((o) => o.id === id);
      if (!ordenAActualizar) {
        console.log('⚠️ Orden no encontrada:', id);
        return;
      }

      console.log(`🔄 Actualizando orden ${id} a estado "${nuevoEstado}"`);

      const updateData: any = {
        estado: nuevoEstado,
      };

      // Si el estado es "entregado" o "pago", agregar fecha de entrega
      if (nuevoEstado === 'listo' || nuevoEstado === 'pago') {
        updateData.fecha_entrega = new Date().toISOString();
      }

      const { error } = await supabase
        .from('ordenes')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('❌ Error actualizando estado:', error);
        Alert.alert('Error', `No se pudo actualizar el estado: ${error.message}`);
        return;
      }

      console.log(`✅ Estado actualizado exitosamente a: ${nuevoEstado}`);

      // Actualizar estado de la mesa
      if (nuevoEstado === 'pago') {
        await supabase
          .from('mesas')
          .update({ estado: 'disponible' })
          .eq('numero_mesa', ordenAActualizar.mesa);
      } else {
        await supabase
          .from('mesas')
          .update({ estado: nuevoEstado })
          .eq('numero_mesa', ordenAActualizar.mesa);
      }

    } catch (error) {
      console.error('❌ Error en actualizarEstadoOrden:', error);
      Alert.alert('Error', 'Error al actualizar estado');
    }
  };

  // Procesar pago de una orden
  const procesarPago = async (id: string, metodoPago: 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta', idVenta?: string) => {
    try {
      const ordenAPagar = ordenes.find(orden => orden.id === id);
      if (!ordenAPagar) {
        console.log('⚠️ Orden no encontrada para pagar:', id);
        return;
      }

      console.log(`💰 Procesando pago de orden ${id} con ${metodoPago}`);

      const { error } = await supabase
        .from('ordenes')
        .update({
          estado: 'pago',
          metodo_pago: metodoPago,
          id_venta: idVenta,
          fecha_entrega: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error procesando pago:', error);
        Alert.alert('Error', 'No se pudo procesar el pago');
        return;
      }

      console.log('✅ Pago procesado exitosamente');

      // Actualizar mesa a disponible
      await supabase
        .from('mesas')
        .update({ estado: 'disponible' })
        .eq('numero_mesa', ordenAPagar.mesa);

    } catch (error) {
      console.error('❌ Error en procesarPago:', error);
      Alert.alert('Error', 'Error al procesar el pago');
    }
  };

  // Eliminar una orden
  const eliminarOrden = async (id: string) => {
    try {
      console.log(`🗑️ Eliminando orden ${id}`);

      const { error } = await supabase
        .from('ordenes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando orden:', error);
        Alert.alert('Error', 'No se pudo eliminar la orden');
        return;
      }

      console.log('✅ Orden eliminada exitosamente');

    } catch (error) {
      console.error('❌ Error en eliminarOrden:', error);
      Alert.alert('Error', 'Error al eliminar la orden');
    }
  };

  // ------------------- FILTROS -------------------
  const getOrdenesPorMesa = (mesa: string) => 
    ordenes.filter((orden) => orden.mesa === mesa);
  
  const getOrdenActivaPorMesa = (mesa: string) =>
    ordenes.find((orden) => orden.mesa === mesa && orden.estado !== 'pago') || null;
  
  const getOrdenesPendientes = () => 
    ordenes.filter((orden) => orden.estado === 'pendiente');

  // ------------------- VALUE -------------------
  const value = {
    ordenes,
    ordenesEntregadas,
    agregarOrden,
    actualizarProductosOrden,
    actualizarEstadoOrden,
    procesarPago,
    eliminarOrden,
    getOrdenesPorMesa,
    getOrdenActivaPorMesa,
    getOrdenesPendientes,
    loading,
  };

  return <OrdenesContext.Provider value={value}>{children}</OrdenesContext.Provider>;
}

export function useOrdenes() {
  const context = useContext(OrdenesContext);
  if (context === undefined)
    throw new Error('useOrdenes debe ser usado dentro de un OrdenesProvider');
  return context;
}