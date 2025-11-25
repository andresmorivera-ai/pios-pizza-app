import { supabase } from '@/scripts/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Vibration } from 'react-native';
import { useAuth } from './AuthContext';

const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
};

const logError = (context: string, error: unknown) => {
  console.error(`${context}: ${formatError(error)}`);
};

const uniqueOrdersById = (ordenes: Orden[]) => {
  const seen = new Set<string>();
  return ordenes.filter(orden => {
    if (seen.has(orden.id)) return false;
    seen.add(orden.id);
    return true;
  });
};

const mapEstadoBDToLocal = (estado: string): Orden['estado'] => {
  if (estado === 'entregado') return 'pendiente_por_pagar';
  return estado as Orden['estado'];
};

// ------------------- INTERFACES -------------------
export interface Orden {
  id: string;
  mesa: string;
  productos: string[];
  total: number;
  estado:
  | 'disponible'
  | 'pendiente'
  | 'en_preparacion'
  | 'listo'
  | 'pendiente_por_pagar'
  | 'entregado'
  | 'pago'
  | 'cancelado';
  fechaCreacion: Date;
  fechaEntrega?: Date;
  metodoPago?: 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta';
  productosNuevos?: number[];
  productosListos?: number[];
  productosEntregados?: number[];
  idVenta?: string;
}

const STORAGE_KEY = 'ordenes_del_dia';

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
}

const OrdenesContext = createContext<OrdenesContextType | undefined>(undefined);

export function OrdenesProvider({ children }: { children: ReactNode }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [ordenesEntregadas, setOrdenesEntregadas] = useState<Orden[]>([]);
  const { usuario } = useAuth();
  const usuarioRef = useRef(usuario);

  useEffect(() => {
    usuarioRef.current = usuario;
  }, [usuario]);

  const getInicioYFinDia = () => {
    const hoy = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
    return { inicioDia, finDia };
  };

  const guardarOrdenesEnStorage = async (ordenesParaGuardar: Orden[]) => {
    try {
      const hoy = new Date();
      const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

      const ordenesDelDia = ordenesParaGuardar.filter(orden => {
        const fechaCreacion = orden.fechaCreacion;
        return fechaCreacion >= inicioDia && orden.estado !== 'pago';
      });

      const ordenesUnicas = uniqueOrdersById(ordenesDelDia);
      const ordenesSerializadas = ordenesUnicas.map(orden => ({
        ...orden,
        fechaCreacion: orden.fechaCreacion.toISOString(),
        fechaEntrega: orden.fechaEntrega ? orden.fechaEntrega.toISOString() : undefined,
      }));

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ordenesSerializadas));
    } catch (error) {
      logError('Error guardando órdenes en AsyncStorage', error);
    }
  };

  const cargarOrdenesDesdeStorage = async (): Promise<Orden[]> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return [];

      const ordenesSerializadas = JSON.parse(data);
      const hoy = new Date();
      const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

      const ordenesDelDia = ordenesSerializadas
        .map((o: any) => ({
          ...o,
          fechaCreacion: new Date(o.fechaCreacion),
          fechaEntrega: o.fechaEntrega ? new Date(o.fechaEntrega) : undefined,
        }))
        .filter((orden: Orden) => {
          return orden.fechaCreacion >= inicioDia && orden.estado !== 'pago';
        });

      return ordenesDelDia;
    } catch (error) {
      logError('Error cargando órdenes desde AsyncStorage', error);
      return [];
    }
  };

  const cargarOrdenesDesdeSupabase = async (ordenesLocales: Orden[] = []): Promise<Orden[]> => {
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
        logError('Error cargando órdenes desde Supabase', error);
        return [];
      }

      if (!data) return [];

      const hoy = new Date();
      const inicioDiaLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

      const ordenesCargadas = uniqueOrdersById(
        data
          .map((o) => {
            const ordenExistente = ordenesLocales.find(orden => orden.id === o.id);
            return {
              id: o.id,
              mesa: o.mesa,
              productos: o.productos || [],
              total: o.total,
              estado: mapEstadoBDToLocal(o.estado),
              fechaCreacion: new Date(o.fecha_creacion),
              fechaEntrega: o.fecha_entrega ? new Date(o.fecha_entrega) : undefined,
              metodoPago: o.metodo_pago,
              idVenta: o.id_venta,
              productosNuevos: ordenExistente?.productosNuevos,
              productosEntregados: ordenExistente?.productosEntregados,
            };
          })
          .filter((orden) => {
            const fechaCreacion = orden.fechaCreacion;
            return fechaCreacion >= inicioDiaLocal && orden.estado !== 'pago';
          })
      );

      return ordenesCargadas;
    } catch (error) {
      logError('Error en cargarOrdenesDesdeSupabase', error);
      return [];
    }
  };

  useEffect(() => {
    const cargarOrdenes = async () => {
      const ordenesStorage = await cargarOrdenesDesdeStorage();
      let ordenesCargadas = await cargarOrdenesDesdeSupabase(ordenesStorage);

      if (ordenesCargadas.length === 0 && ordenesStorage.length > 0) {
        ordenesCargadas = ordenesStorage;
      } else {
        await guardarOrdenesEnStorage(ordenesCargadas);
      }

      setOrdenes(ordenesCargadas);
    };

    cargarOrdenes();

    const canal = supabase
      .channel('ordenes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordenes' },
        async (payload) => {
          const { inicioDia, finDia } = getInicioYFinDia();

          if (payload.eventType === 'INSERT') {
            const nueva = payload.new as any;

            if (nueva.estado === 'pago') return;

            const fechaCreacion = new Date(nueva.fecha_creacion);
            if (fechaCreacion < inicioDia || fechaCreacion > finDia) return;

            const ordenNueva: Orden = {
              id: nueva.id,
              mesa: nueva.mesa,
              productos: nueva.productos || [],
              total: nueva.total,
              estado: mapEstadoBDToLocal(nueva.estado),
              fechaCreacion: fechaCreacion,
              fechaEntrega: nueva.fecha_entrega ? new Date(nueva.fecha_entrega) : undefined,
              metodoPago: nueva.metodo_pago,
              idVenta: nueva.id_venta,
            };

            setOrdenes((prev) => {
              const nuevas = uniqueOrdersById([ordenNueva, ...prev]);
              guardarOrdenesEnStorage(nuevas);
              return nuevas;
            });
          } else if (payload.eventType === 'UPDATE') {
            const actualizada = payload.new as any;

            if (actualizada.estado === 'pago') {
              setOrdenes((prev) => {
                const nuevas = prev.filter((o) => o.id !== actualizada.id);
                guardarOrdenesEnStorage(nuevas);
                return nuevas;
              });
              return;
            }

            const fechaCreacion = new Date(actualizada.fecha_creacion);
            if (fechaCreacion < inicioDia || fechaCreacion > finDia) return;

            // Vibración para mesero cuando está listo
            if (actualizada.estado === 'listo' && usuarioRef.current?.rol_id === 2) {
              try {
                Vibration.vibrate([0, 500, 200, 500]);
              } catch (error) {
                // Silenciar error de vibración
              }
            }

            setOrdenes((prev) => {
              const ordenExistente = prev.find((o) => o.id === actualizada.id);

              if (ordenExistente) {
                const estadoLocal = mapEstadoBDToLocal(actualizada.estado);
                const nuevas = prev.map((o) =>
                  o.id === actualizada.id
                    ? {
                      ...o,
                      estado: estadoLocal,
                      productos: actualizada.productos || o.productos,
                      total: actualizada.total || o.total,
                      fechaEntrega: actualizada.fecha_entrega ? new Date(actualizada.fecha_entrega) : o.fechaEntrega,
                      metodoPago: actualizada.metodo_pago || o.metodoPago,
                      idVenta: actualizada.id_venta || o.idVenta,
                    }
                    : o
                );
                guardarOrdenesEnStorage(nuevas);
                return nuevas;
              } else {
                if (actualizada.estado !== 'pago') {
                  const nuevaOrden: Orden = {
                    id: actualizada.id,
                    mesa: actualizada.mesa,
                    productos: actualizada.productos || [],
                    total: actualizada.total,
                    estado: mapEstadoBDToLocal(actualizada.estado),
                    fechaCreacion: new Date(actualizada.fecha_creacion),
                    fechaEntrega: actualizada.fecha_entrega ? new Date(actualizada.fecha_entrega) : undefined,
                    metodoPago: actualizada.metodo_pago,
                    idVenta: actualizada.id_venta,
                  };
                  const nuevas = uniqueOrdersById([nuevaOrden, ...prev]);
                  guardarOrdenesEnStorage(nuevas);
                  return nuevas;
                }
              }

              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            setOrdenes((prev) => {
              const nuevas = prev.filter((o) => o.id !== payload.old.id);
              guardarOrdenesEnStorage(nuevas);
              return nuevas;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const agregarOrden = async (mesa: string, productos: string[], total: number) => {
    try {
      const fechaCreacion = new Date();

      const { data: nuevaOrdenBD, error } = await supabase
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
        logError('Error guardando orden en Supabase', error);
        const nuevaOrden: Orden = {
          id: `orden-${Date.now()}`,
          mesa,
          productos,
          total,
          estado: 'pendiente',
          fechaCreacion,
        };
        setOrdenes((prev) => {
          const nuevas = uniqueOrdersById([nuevaOrden, ...prev]);
          guardarOrdenesEnStorage(nuevas);
          return nuevas;
        });
        return;
      }

      const nuevaOrden: Orden = {
        id: nuevaOrdenBD.id,
        mesa,
        productos,
        total,
        estado: 'pendiente',
        fechaCreacion: new Date(nuevaOrdenBD.fecha_creacion),
      };

      setOrdenes((prev) => {
        const nuevas = uniqueOrdersById([nuevaOrden, ...prev]);
        guardarOrdenesEnStorage(nuevas);
        return nuevas;
      });

      await supabase
        .from('mesas')
        .update({ estado: 'pendiente' })
        .eq('numero_mesa', mesa);
    } catch (error) {
      logError('Error en agregarOrden', error);
    }
  };

  const actualizarProductosOrden = async (id: string, productosNuevos: string[], totalNuevo: number) => {
    try {
      const nuevoEstado: Orden['estado'] = 'pendiente';

      const { error } = await supabase
        .from('ordenes')
        .update({
          productos: productosNuevos,
          total: totalNuevo,
          estado: nuevoEstado,
        })
        .eq('id', id);

      if (error) {
        logError('Error actualizando productos en Supabase', error);
      }

      setOrdenes(prev => {
        const nuevas = prev.map(orden => {
          if (orden.id === id) {
            const cantidadOriginal = orden.productos.length;
            const productosNuevosIndices: number[] = [];
            const productosListosIndices: number[] = [];
            const productosEntregadosIndices: number[] = [];

            for (let i = 0; i < productosNuevos.length; i++) {
              if (i >= cantidadOriginal) {
                productosNuevosIndices.push(i);
              } else {
                if (orden.productosEntregados?.includes(i)) {
                  productosEntregadosIndices.push(i);
                } else if (orden.productosListos?.includes(i)) {
                  productosListosIndices.push(i);
                }
              }
            }

            return {
              ...orden,
              productos: productosNuevos,
              total: totalNuevo,
              productosNuevos: productosNuevosIndices,
              productosListos: productosListosIndices,
              productosEntregados: productosEntregadosIndices,
              estado: nuevoEstado,
            };
          }
          return orden;
        });
        guardarOrdenesEnStorage(nuevas);
        return nuevas;
      });
    } catch (error) {
      logError('Error en actualizarProductosOrden', error);
    }
  };

  const procesarPago = async (id: string, metodoPago: 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta', idVenta?: string) => {
    try {
      const idString = String(id);
      const ordenAPagar = ordenes.find(orden => String(orden.id) === idString);

      if (!ordenAPagar) {
        Alert.alert('Error', 'Orden no encontrada');
        return;
      }

      setOrdenes(prev => {
        const nuevas = prev.filter(orden => String(orden.id) !== idString);
        guardarOrdenesEnStorage(nuevas);
        return nuevas;
      });

      const ordenPagada: Orden = {
        ...ordenAPagar,
        estado: 'pago',
        fechaEntrega: new Date(),
        metodoPago,
        idVenta
      };

      setOrdenesEntregadas(prev => [...prev, ordenPagada]);

      const { error } = await supabase
        .from('ordenes')
        .delete()
        .eq('id', idString);

      if (error) {
        logError('Error eliminando orden de Supabase', error);
      }

      await supabase
        .from('mesas')
        .update({ estado: 'disponible' })
        .eq('numero_mesa', ordenAPagar.mesa);
    } catch (error) {
      logError('Error en procesarPago', error);
    }
  };

  const actualizarEstadoOrden = async (id: string, nuevoEstado: Orden['estado']) => {
    try {
      const ordenAActualizar = ordenes.find((o) => o.id === id);
      if (!ordenAActualizar) return;

      const estadoParaBD = nuevoEstado === 'pendiente_por_pagar' ? 'entregado' : nuevoEstado;
      const updateData: any = {
        estado: estadoParaBD,
      };

      if (
        nuevoEstado === 'pendiente_por_pagar' ||
        nuevoEstado === 'entregado' ||
        nuevoEstado === 'pago'
      ) {
        updateData.fecha_entrega = new Date().toISOString();
      }

      const { data: ordenActualizadaBD, error } = await supabase
        .from('ordenes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logError('Error actualizando estado en Supabase', error);
        const mensaje = formatError(error);
        Alert.alert('Error', `No se pudo actualizar el estado: ${mensaje}`);
        return;
      }

      if (nuevoEstado === 'pago') {
        const ordenActualizada: Orden = {
          ...ordenAActualizar,
          estado: 'pago',
          fechaEntrega: new Date(),
        };

        setOrdenesEntregadas((prevEntregadas) => [...prevEntregadas, ordenActualizada]);

        setOrdenes((prev) => {
          const sinPago = prev.filter((orden) => orden.id !== id);
          guardarOrdenesEnStorage(sinPago);
          return sinPago;
        });
      } else {
        setOrdenes((prev) => {
          const nuevas = prev.map((orden) => {
            if (orden.id === id) {
              const necesitaFechaEntrega =
                nuevoEstado === 'pendiente_por_pagar' || nuevoEstado === 'entregado';

              let productosListosActualizados = orden.productosListos || [];
              if (nuevoEstado === 'listo') {
                const nuevosAListos = orden.productosNuevos || [];
                productosListosActualizados = [...productosListosActualizados, ...nuevosAListos];

                if (nuevosAListos.length === 0) {
                  productosListosActualizados = Array.from(
                    { length: orden.productos.length },
                    (_, i) => i
                  ).filter(i => !(orden.productosEntregados || []).includes(i));
                }
              }

              let productosEntregadosActualizados = orden.productosEntregados || [];
              if (nuevoEstado === 'entregado' || nuevoEstado === 'pendiente_por_pagar') {
                productosEntregadosActualizados = [...(orden.productosListos || [])];
                productosListosActualizados = [];
              }

              const limpiarMarcasNuevos = ['listo', 'pendiente_por_pagar', 'pago'].includes(nuevoEstado);

              const ordenActualizada = {
                ...orden,
                estado: nuevoEstado,
                fechaEntrega: necesitaFechaEntrega ? new Date() : orden.fechaEntrega,
                productosNuevos: limpiarMarcasNuevos ? [] : orden.productosNuevos,
                productosListos: productosListosActualizados,
                productosEntregados: productosEntregadosActualizados,
              };
              return ordenActualizada;
            }
            return orden;
          });
          guardarOrdenesEnStorage(nuevas);
          return nuevas;
        });
      }

      if (nuevoEstado === 'pago') {
        await supabase
          .from('mesas')
          .update({ estado: 'disponible' })
          .eq('numero_mesa', ordenAActualizar.mesa);
      } else {
        await supabase
          .from('mesas')
          .update({ estado: estadoParaBD })
          .eq('numero_mesa', ordenAActualizar.mesa);
      }
    } catch (error) {
      logError('Error en actualizarEstadoOrden', error);
    }
  };

  const eliminarOrden = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ordenes')
        .delete()
        .eq('id', id);

      if (error) {
        logError('Error eliminando orden de Supabase', error);
      }

      setOrdenes((prev) => {
        const nuevas = prev.filter((orden) => orden.id !== id);
        guardarOrdenesEnStorage(nuevas);
        return nuevas;
      });
    } catch (error) {
      logError('Error en eliminarOrden', error);
    }
  };

  const getOrdenesPorMesa = (mesa: string) => ordenes.filter((orden) => orden.mesa === mesa);
  const getOrdenActivaPorMesa = (mesa: string) =>
    ordenes.find((orden) => orden.mesa === mesa && orden.estado !== 'pago') || null;
  const getOrdenesPendientes = () => ordenes.filter((orden) => orden.estado === 'pendiente');

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

  return <OrdenesContext.Provider value={value}>{children}</OrdenesContext.Provider>;
}

export function useOrdenes() {
  const context = useContext(OrdenesContext);
  if (context === undefined)
    throw new Error('useOrdenes debe ser usado dentro de un OrdenesProvider');
  return context;
}