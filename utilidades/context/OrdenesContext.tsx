import { createContext, ReactNode, useContext, useState } from 'react';

export interface Orden {
  id: string;
  mesa: string;
  productos: string[];
  total: number;
  estado: 'pendiente' | 'en_preparacion' | 'listo' | 'entregado';
  fechaCreacion: Date;
  fechaEntrega?: Date;
  metodoPago?: 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta';
  productosNuevos?: number[]; // Índices de productos que son nuevos
  idVenta?: string; // ID único de la venta generado por el sistema
}

interface OrdenesContextType {
  ordenes: Orden[];
  ordenesEntregadas: Orden[];
  agregarOrden: (mesa: string, productos: string[], total: number) => void;
  actualizarProductosOrden: (id: string, productosNuevos: string[], totalNuevo: number) => void;
  actualizarEstadoOrden: (id: string, nuevoEstado: Orden['estado']) => void;
  procesarPago: (id: string, metodoPago: 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta', idVenta?: string) => void;
  eliminarOrden: (id: string) => void;
  getOrdenesPorMesa: (mesa: string) => Orden[];
  getOrdenActivaPorMesa: (mesa: string) => Orden | null;
  getOrdenesPendientes: () => Orden[];
}

const OrdenesContext = createContext<OrdenesContextType | undefined>(undefined);

export function OrdenesProvider({ children }: { children: ReactNode }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [ordenesEntregadas, setOrdenesEntregadas] = useState<Orden[]>([]);

  const agregarOrden = (mesa: string, productos: string[], total: number) => {
    const nuevaOrden: Orden = {
      id: `orden-${Date.now()}`,
      mesa,
      productos,
      total,
      estado: 'pendiente',
      fechaCreacion: new Date(),
    };
    
    setOrdenes(prev => [...prev, nuevaOrden]);
  };

  const actualizarProductosOrden = (id: string, productosNuevos: string[], totalNuevo: number) => {
    setOrdenes(prev =>
      prev.map(orden => {
        if (orden.id === id) {
          // Encontrar índices de productos nuevos (los que están al final)
          const productosOriginales = orden.productos.length;
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
      })
    );
  };

  const procesarPago = (id: string, metodoPago: 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta', idVenta?: string) => {
    const ordenAPagar = ordenes.find(orden => orden.id === id);
    if (ordenAPagar) {
      const ordenPagada: Orden = {
        ...ordenAPagar,
        estado: 'entregado',
        fechaEntrega: new Date(),
        metodoPago,
        idVenta
      };
      setOrdenesEntregadas(prev => [...prev, ordenPagada]);
    }

    // Actualizar la orden actual con el método de pago y estado entregado
    setOrdenes(prev => 
      prev.map(orden => 
        orden.id === id 
          ? { ...orden, estado: 'entregado', metodoPago, idVenta } 
          : orden
      )
    );

    // Programar eliminación después de 10 segundos
    setTimeout(() => {
      eliminarOrden(id);
    }, 10000);
  };

  const actualizarEstadoOrden = (id: string, nuevoEstado: Orden['estado']) => {
    // Si el nuevo estado es "entregado", guardar en historial antes de actualizar
    if (nuevoEstado === 'entregado') {
      const ordenAEntregar = ordenes.find(orden => orden.id === id);
      if (ordenAEntregar) {
        const ordenEntregada: Orden = {
          ...ordenAEntregar,
          estado: 'entregado',
          fechaEntrega: new Date()
        };
        setOrdenesEntregadas(prev => [...prev, ordenEntregada]);
      }
    }

    setOrdenes(prev => 
      prev.map(orden => 
        orden.id === id ? { ...orden, estado: nuevoEstado } : orden
      )
    );

    // Si el nuevo estado es "entregado", programar eliminación después de 5 segundos
    if (nuevoEstado === 'entregado') {
      setTimeout(() => {
        eliminarOrden(id);
      }, 5000); // 5 segundos
    }
  };

  const eliminarOrden = (id: string) => {
    setOrdenes(prev => prev.filter(orden => orden.id !== id));
  };

  const getOrdenesPorMesa = (mesa: string) => {
    return ordenes.filter(orden => orden.mesa === mesa);
  };

  const getOrdenActivaPorMesa = (mesa: string): Orden | null => {
    // Buscar órdenes que no estén entregadas
    const ordenActiva = ordenes.find(
      orden => orden.mesa === mesa && orden.estado !== 'entregado'
    );
    return ordenActiva || null;
  };

  const getOrdenesPendientes = () => {
    return ordenes.filter(orden => orden.estado === 'pendiente');
  };

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
  };

  return (
    <OrdenesContext.Provider value={value}>
      {children}
    </OrdenesContext.Provider>
  );
}

export function useOrdenes() {
  const context = useContext(OrdenesContext);
  if (context === undefined) {
    throw new Error('useOrdenes debe ser usado dentro de un OrdenesProvider');
  }
  return context;
}

