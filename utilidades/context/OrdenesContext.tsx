import { supabase } from '@/scripts/lib/supabase';
<<<<<<< HEAD
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
=======
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Vibration } from 'react-native';
import { useAuth } from './AuthContext';
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8

// ------------------- INTERFACES -------------------
export interface Orden {
  id: string;
  mesa: string;
  productos: string[];
  total: number;
<<<<<<< HEAD
  estado: 'disponible' | 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'pendiente_por_pagar' | 'pago';
=======
  estado:
  | 'disponible'
  | 'pendiente'
  | 'en_preparacion'
  | 'listo'
  | 'pendiente_por_pagar'
  | 'entregado'
  | 'pago'
  | 'cancelado';
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
  fechaCreacion: Date;
  fechaEntrega?: Date;
  metodoPago?: 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta';
  productosNuevos?: number[];
<<<<<<< HEAD
  idVenta?: string;
}

=======
  productosListos?: number[];
  productosEntregados?: number[];
  idVenta?: string;
}

const STORAGE_KEY = 'ordenes_del_dia';

>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
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

const OrdenesContext = createContext<OrdenesContextType | undefined>(undefined);

export function OrdenesProvider({ children }: { children: ReactNode }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [ordenesEntregadas, setOrdenesEntregadas] = useState<Orden[]>([]);
<<<<<<< HEAD
  const [loading, setLoading] = useState(true);
=======
  const { usuario } = useAuth();
  const usuarioRef = useRef(usuario);
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8

  useEffect(() => {
    usuarioRef.current = usuario;
  }, [usuario]);

  const getInicioYFinDia = () => {
    const hoy = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
    return { inicioDia, finDia };
  };

<<<<<<< HEAD
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
=======
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
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
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

<<<<<<< HEAD
      const ordenesCargadas = (data || []).map(convertirDeSupabase);
      
      console.log('📦 Órdenes activas cargadas:', ordenesCargadas.length);
      
=======
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

>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
      return ordenesCargadas;
    } catch (error) {
      console.error('❌ Error en cargarOrdenesActivas:', error);
      return [];
    }
  };

<<<<<<< HEAD
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
=======
  useEffect(() => {
    const cargarOrdenes = async () => {
      const ordenesStorage = await cargarOrdenesDesdeStorage();
      let ordenesCargadas = await cargarOrdenesDesdeSupabase(ordenesStorage);

      if (ordenesCargadas.length === 0 && ordenesStorage.length > 0) {
        ordenesCargadas = ordenesStorage;
      } else {
        await guardarOrdenesEnStorage(ordenesCargadas);
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
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

<<<<<<< HEAD
    // Suscripción en tiempo real a cambios en "ordenes"
=======
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
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
<<<<<<< HEAD
            
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
=======

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
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

<<<<<<< HEAD
  // ------------------- FUNCIONES CRUD -------------------

  // Crear una nueva orden
=======
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
  const agregarOrden = async (mesa: string, productos: string[], total: number) => {
    try {
      const fechaCreacion = new Date();

<<<<<<< HEAD
      const { data, error } = await supabase
=======
      const { data: nuevaOrdenBD, error } = await supabase
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
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
<<<<<<< HEAD
        console.error('❌ Error creando orden:', error);
        Alert.alert('Error', 'No se pudo crear la orden');
        return;
      }

      console.log('✅ Orden creada exitosamente:', data.id);

      // Actualizar estado de la mesa
=======
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

>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
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
<<<<<<< HEAD
      // Obtener productos originales
      const ordenActual = ordenes.find(o => o.id === id);
      const productosOriginales = ordenActual?.productos.length || 0;
=======
      const nuevoEstado: Orden['estado'] = 'pendiente';
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8

      const { error } = await supabase
        .from('ordenes')
        .update({
          productos: productosNuevos,
          total: totalNuevo,
        })
        .eq('id', id);

      if (error) {
<<<<<<< HEAD
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

=======
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
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
    } catch (error) {
      console.error('❌ Error en actualizarProductosOrden:', error);
      Alert.alert('Error', 'Error al actualizar productos');
    }
  };

<<<<<<< HEAD
  // Cambiar estado de una orden
  const actualizarEstadoOrden = async (id: string, nuevoEstado: Orden['estado']) => {
    try {
      const ordenAActualizar = ordenes.find((o) => o.id === id);
      if (!ordenAActualizar) {
        console.log('⚠️ Orden no encontrada:', id);
        return;
      }

      console.log(`🔄 Actualizando orden ${id} a estado "${nuevoEstado}"`);

=======
  const actualizarEstadoOrden = async (id: string, nuevoEstado: Orden['estado']) => {
    try {
      const ordenAActualizar = ordenes.find((o) => o.id === id);
      if (!ordenAActualizar) return;

      const estadoParaBD = nuevoEstado === 'pendiente_por_pagar' ? 'entregado' : nuevoEstado;
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
      const updateData: any = {
        estado: nuevoEstado,
      };

<<<<<<< HEAD
      // Si el estado es "entregado" o "pago", agregar fecha de entrega
      if (nuevoEstado === 'listo' || nuevoEstado === 'pago') {
=======
      if (
        nuevoEstado === 'pendiente_por_pagar' ||
        nuevoEstado === 'entregado' ||
        nuevoEstado === 'pago'
      ) {
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
        updateData.fecha_entrega = new Date().toISOString();
      }

      const { error } = await supabase
        .from('ordenes')
        .update(updateData)
<<<<<<< HEAD
        .eq('id', id);

      if (error) {
        console.error('❌ Error actualizando estado:', error);
        Alert.alert('Error', `No se pudo actualizar el estado: ${error.message}`);
        return;
      }

      console.log(`✅ Estado actualizado exitosamente a: ${nuevoEstado}`);

      // Actualizar estado de la mesa
      if (nuevoEstado === 'pago') {
=======
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
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
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

<<<<<<< HEAD
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

=======
  const eliminarOrden = async (id: string) => {
    try {
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
      const { error } = await supabase
        .from('ordenes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando orden:', error);
        Alert.alert('Error', 'No se pudo eliminar la orden');
        return;
      }

<<<<<<< HEAD
      console.log('✅ Orden eliminada exitosamente');

=======
      setOrdenes((prev) => {
        const nuevas = prev.filter((orden) => orden.id !== id);
        guardarOrdenesEnStorage(nuevas);
        return nuevas;
      });
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
    } catch (error) {
      console.error('❌ Error en eliminarOrden:', error);
      Alert.alert('Error', 'Error al eliminar la orden');
    }
  };

<<<<<<< HEAD
  // ------------------- FILTROS -------------------
  const getOrdenesPorMesa = (mesa: string) => 
    ordenes.filter((orden) => orden.mesa === mesa);
  
=======
  const getOrdenesPorMesa = (mesa: string) => ordenes.filter((orden) => orden.mesa === mesa);
>>>>>>> 365bfc4e8ec5d049622ca3ce44954830a34a4ff8
  const getOrdenActivaPorMesa = (mesa: string) =>
    ordenes.find((orden) => orden.mesa === mesa && orden.estado !== 'pago') || null;
  
  const getOrdenesPendientes = () => 
    ordenes.filter((orden) => orden.estado === 'pendiente');

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