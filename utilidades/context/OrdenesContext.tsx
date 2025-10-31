import { supabase } from '@/scripts/lib/supabase';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// ------------------- INTERFACES -------------------
export interface Orden {
  id: string;
  mesa: string;
  productos: string[];
  total: number;
  estado: 'disponible' | 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'pago';
  fechaCreacion: Date;
  fechaEntrega?: Date;
}

interface OrdenesContextType {
  ordenes: Orden[];
  ordenesEntregadas: Orden[];
  agregarOrden: (mesa: string, productos: string[], total: number) => Promise<void>;
  actualizarProductosOrden: (id: string, productosNuevos: string[], totalNuevo: number) => Promise<void>;
  actualizarEstadoOrden: (id: string, nuevoEstado: Orden['estado']) => Promise<void>;
  eliminarOrden: (id: string) => Promise<void>;
  getOrdenesPorMesa: (mesa: string) => Orden[];
  getOrdenActivaPorMesa: (mesa: string) => Orden | null;
  getOrdenesPendientes: () => Orden[];
}

// ------------------- CONTEXTO -------------------
const OrdenesContext = createContext<OrdenesContextType | undefined>(undefined);

export function OrdenesProvider({ children }: { children: ReactNode }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [ordenesEntregadas, setOrdenesEntregadas] = useState<Orden[]>([]);

  //  Cargar órdenes desde Supabase al iniciar
  useEffect(() => {
    const cargarOrdenes = async () => {
      const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .neq('estado', 'pago') // 🔹 NO cargar órdenes pagadas
        .order('fecha_creacion', { ascending: false });

      if (error) {
        console.error('Error cargando órdenes:', error);
        return;
      }

      const ordenesCargadas = data.map((o) => ({
        id: o.id,
        mesa: o.mesa,
        productos: o.productos || [],
        total: o.total,
        estado: o.estado,
        fechaCreacion: new Date(o.fecha_creacion),
        fechaEntrega: o.fecha_entrega ? new Date(o.fecha_entrega) : undefined,
      }));

      setOrdenes(ordenesCargadas);
    };

    cargarOrdenes();

    //  Suscripción en tiempo real a cambios en "ordenes"
    const canal = supabase
      .channel('ordenes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordenes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const nueva = payload.new as any;
            
            //  NO agregar órdenes pagadas
            if (nueva.estado === 'pago') return;
            
            const ordenNueva: Orden = {
              id: nueva.id,
              mesa: nueva.mesa,
              productos: nueva.productos || [],
              total: nueva.total,
              estado: nueva.estado,
              fechaCreacion: new Date(nueva.fecha_creacion),
              fechaEntrega: nueva.fecha_entrega ? new Date(nueva.fecha_entrega) : undefined,
            };
            setOrdenes((prev) => [ordenNueva, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const actualizada = payload.new as any;
            
            // 🔹 Si se actualiza a "pago", eliminar del local
            if (actualizada.estado === 'pago') {
              setOrdenes((prev) => prev.filter((o) => o.id !== actualizada.id));
              return;
            }
            
            setOrdenes((prev) =>
              prev.map((o) => (o.id === actualizada.id ? { ...o, ...actualizada } : o))
            );
          } else if (payload.eventType === 'DELETE') {
            setOrdenes((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // ------------------- FUNCIONES -------------------

  //  Crear una nueva orden localmente
  const agregarOrden = async (mesa: string, productos: string[], total: number) => {
    const nuevaOrden: Orden = {
      id: `orden-${Date.now()}`,
      mesa,
      productos,
      total,
      estado: 'pendiente',
      fechaCreacion: new Date(),
    };

    setOrdenes((prev) => [nuevaOrden, ...prev]);

    //  Actualizar estado de la mesa en tiempo real
    await supabase
      .from('mesas')
      .update({ estado: 'pendiente' })
      .eq('numero_mesa', mesa);
  };

  //  Actualizar productos en una orden
  const actualizarProductosOrden = async (id: string, productosNuevos: string[], totalNuevo: number) => {
    setOrdenes((prev) =>
      prev.map((orden) =>
        orden.id === id ? { ...orden, productos: productosNuevos, total: totalNuevo } : orden
      )
    );
  };

  //  Cambiar estado de una orden y guardar si llega a "entregado"
const actualizarEstadoOrden = async (id: string, nuevoEstado: Orden['estado']) => {
  const ordenAActualizar = ordenes.find((o) => o.id === id);
  if (!ordenAActualizar) return;

  // Actualiza el estado localmente
  setOrdenes((prev) =>
    prev.map((orden) => (orden.id === id ? { ...orden, estado: nuevoEstado } : orden))
  );

  //  Actualizar el estado de la mesa en tiempo real
  await supabase
    .from('mesas')
    .update({ estado: nuevoEstado })
    .eq('numero_mesa', ordenAActualizar.mesa);

  //  Si la orden llega a "entregado", guardarla en Supabase
  if (nuevoEstado === 'pago') {
    const fechaEntrega = new Date();

    const { error } = await supabase.from('ordenes').insert([
      {
        mesa: ordenAActualizar.mesa,
        productos: ordenAActualizar.productos,
        total: ordenAActualizar.total,
        estado: nuevoEstado,
        fecha_creacion: ordenAActualizar.fechaCreacion.toISOString(),
        fecha_entrega: fechaEntrega.toISOString(),
      },
    ]);

    if (error) {
      console.error('Error guardando orden en Supabase:', error);
      return;
    }

    const ordenEntregada: Orden = { ...ordenAActualizar, estado: nuevoEstado, fechaEntrega };
    setOrdenesEntregadas((prev) => [...prev, ordenEntregada]);

    // Eliminar visualmente después de 5 segundos
    setTimeout(() => eliminarOrden(id), 5000);
  }

  //  Si la orden llega a "pago", actualizar en Supabase y volver mesa a "disponible"
  if (nuevoEstado === 'pago') {
    // Actualizar estado a "pago" en Supabase
    await supabase
      .from('ordenes')
      .update({ estado: 'pago' })
      .eq('id', id);

    // Volver mesa a "disponible"
    await supabase
      .from('mesas')
      .update({ estado: 'disponible' })
      .eq('numero_mesa', ordenAActualizar.mesa);

    // Eliminar localmente después de 3 segundos
    setTimeout(() => {
      setOrdenes((prev) => prev.filter((orden) => orden.id !== id));
    }, 3000);
  }
};

  //  Eliminar localmente (y de Supabase si ya guardada)
  const eliminarOrden = async (id: string) => {
    setOrdenes((prev) => prev.filter((orden) => orden.id !== id));
    await supabase.from('ordenes').delete().eq('id', id);
  };

  //  Filtros
  const getOrdenesPorMesa = (mesa: string) => ordenes.filter((orden) => orden.mesa === mesa);
  const getOrdenActivaPorMesa = (mesa: string) =>
    ordenes.find((orden) => orden.mesa === mesa && orden.estado !== 'pago') || null;
  const getOrdenesPendientes = () => ordenes.filter((orden) => orden.estado === 'pendiente');

  // ------------------- VALUE -------------------
  const value = {
    ordenes,
    ordenesEntregadas,
    agregarOrden,
    actualizarProductosOrden,
    actualizarEstadoOrden,
    eliminarOrden,
    getOrdenesPorMesa,
    getOrdenActivaPorMesa,
    getOrdenesPendientes,
  };

  return <OrdenesContext.Provider value={value}>{children}</OrdenesContext.Provider>;
}

export function useOrdenes() {
  const context = useContext(OrdenesContext);
  if (context === undefined)
    throw new Error('useOrdenes debe ser usado dentro de un OrdenesProvider');
  return context;
}