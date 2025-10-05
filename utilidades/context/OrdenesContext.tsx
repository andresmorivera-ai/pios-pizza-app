import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface Orden {
  id: string;
  mesa: string;
  productos: string[];
  estado: 'pendiente' | 'en_preparacion' | 'listo' | 'entregado';
  fechaCreacion: Date;
}

interface OrdenesContextType {
  ordenes: Orden[];
  agregarOrden: (mesa: string, productos: string[]) => void;
  actualizarEstadoOrden: (id: string, nuevoEstado: Orden['estado']) => void;
  eliminarOrden: (id: string) => void;
  getOrdenesPorMesa: (mesa: string) => Orden[];
  getOrdenesPendientes: () => Orden[];
}

const OrdenesContext = createContext<OrdenesContextType | undefined>(undefined);

export function OrdenesProvider({ children }: { children: ReactNode }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);

  const agregarOrden = (mesa: string, productos: string[]) => {
    const nuevaOrden: Orden = {
      id: `orden-${Date.now()}`,
      mesa,
      productos,
      estado: 'pendiente',
      fechaCreacion: new Date(),
    };
    
    setOrdenes(prev => [...prev, nuevaOrden]);
  };

  const actualizarEstadoOrden = (id: string, nuevoEstado: Orden['estado']) => {
    setOrdenes(prev => 
      prev.map(orden => 
        orden.id === id ? { ...orden, estado: nuevoEstado } : orden
      )
    );
  };

  const eliminarOrden = (id: string) => {
    setOrdenes(prev => prev.filter(orden => orden.id !== id));
  };

  const getOrdenesPorMesa = (mesa: string) => {
    return ordenes.filter(orden => orden.mesa === mesa);
  };

  const getOrdenesPendientes = () => {
    return ordenes.filter(orden => orden.estado === 'pendiente');
  };

  const value = {
    ordenes,
    agregarOrden,
    actualizarEstadoOrden,
    eliminarOrden,
    getOrdenesPorMesa,
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
