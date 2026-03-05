import { supabase } from '@/scripts/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Vibration } from 'react-native';
import { useAuth } from './AuthContext';

// Configurar cómo se manejan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const reproducirSonidoListo = async () => {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/ding.wav')
    );
    await sound.playAsync();
    // Liberar el recurso cuando termine
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (e) {
    // Silenciar errores de audio
  }
};

const reproducirSonidoCocina = async () => {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/kitchen_alarm.wav')
    );
    await sound.playAsync();
    // Liberar el recurso cuando termine
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (e) {
    // Silenciar errores de audio
  }
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
  loading: boolean;
}

const OrdenesContext = createContext<OrdenesContextType | undefined>(undefined);

// ------------------- HELPERS -------------------
const uniqueOrdersById = (orders: Orden[]) => {
  const seen = new Set();
  return orders.filter(o => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
};

const mapEstadoBDToLocal = (estado: string): Orden['estado'] => {
  const validEstados: Orden['estado'][] = [
    'disponible', 'pendiente', 'en_preparacion', 'listo',
    'pendiente_por_pagar', 'entregado', 'pago', 'cancelado'
  ];
  return validEstados.includes(estado as any) ? (estado as Orden['estado']) : 'pendiente';
};

const logError = (msg: string, error: any) => {
  console.error(`❌ ${msg}:`, error);
};

const formatError = (error: any) => error?.message || String(error);

export function OrdenesProvider({ children }: { children: ReactNode }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [ordenesEntregadas, setOrdenesEntregadas] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const { usuario } = useAuth();
  const usuarioRef = useRef(usuario);
  const ordenesRef = useRef<Orden[]>([]);

  useEffect(() => {
    usuarioRef.current = usuario;
  }, [usuario]);

  useEffect(() => {
    ordenesRef.current = ordenes;
  }, [ordenes]);

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
      // Inicio carga Supabase
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
              productosNuevos: o.productos_nuevos || ordenExistente?.productosNuevos || [],
              productosListos: o.productos_listos || ordenExistente?.productosListos || [],
              productosEntregados: o.productos_entregados || ordenExistente?.productosEntregados || [],
            };
          })
          .filter((orden) => {
            const fechaCreacion = orden.fechaCreacion;
            return fechaCreacion >= inicioDiaLocal && orden.estado !== 'pago';
          })
      );

      return ordenesCargadas;
    } catch (error) {
      console.error('❌ Error en cargarOrdenesActivas:', error);
      return [];
    }
  };

  // Cargar órdenes pagadas del día (para historial)
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

      return (data || []).map(o => ({
        id: o.id,
        mesa: o.mesa,
        productos: o.productos || [],
        total: o.total,
        estado: 'pago',
        fechaCreacion: new Date(o.fecha_creacion),
        fechaEntrega: o.fecha_entrega ? new Date(o.fecha_entrega) : undefined,
        metodoPago: o.metodo_pago,
        idVenta: o.id_venta,
      })) as Orden[];
    } catch (error) {
      console.error('❌ Error cargando órdenes pagadas:', error);
      return [];
    }
  };

  useEffect(() => {
    const inicializar = async () => {
      setLoading(true);
      const ordenesStorage = await cargarOrdenesDesdeStorage();
      setOrdenes(ordenesStorage); // Mostrar caché primero

      let ordenesCargadas = await cargarOrdenesDesdeSupabase(ordenesStorage);

      if (ordenesCargadas.length === 0 && ordenesStorage.length > 0) {
        // Si no hay red pero hay storage, mantenemos storage
        ordenesCargadas = ordenesStorage;
      } else {
        // Si hay datos nuevos, actualizamos storage
        await guardarOrdenesEnStorage(ordenesCargadas);
        setOrdenes(ordenesCargadas);
      }

      const ordenesPagadas = await cargarOrdenesPagadas();
      setOrdenesEntregadas(ordenesPagadas);

      setLoading(false);
    };

    inicializar();

    const canal = supabase
      .channel('ordenes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordenes' },
        async (payload) => {


          const { inicioDia, finDia } = getInicioYFinDia();

          if (payload.eventType === 'INSERT') {
            const nueva = payload.new as any;

            if (nueva.estado === 'pago') {
              // Si llega una orden pagada (raro en insert, pero posible), agregar a entregadas
              const ordenPagada: Orden = {
                id: nueva.id,
                mesa: nueva.mesa,
                productos: nueva.productos || [],
                total: nueva.total,
                estado: 'pago',
                fechaCreacion: new Date(nueva.fecha_creacion),
                fechaEntrega: nueva.fecha_entrega ? new Date(nueva.fecha_entrega) : undefined,
                metodoPago: nueva.metodo_pago,
                idVenta: nueva.id_venta,
              };
              setOrdenesEntregadas(prev => [ordenPagada, ...prev]);
              return;
            }

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
              productosNuevos: nueva.productos_nuevos || [],
              productosListos: nueva.productos_listos || [],
              productosEntregados: nueva.productos_entregados || [],
            };

            // Solo vibra para la cocina cuando llega un nuevo pedido o algo para preparar
            if (usuarioRef.current?.rol_id === 3 && ordenNueva.estado === 'pendiente') {
              try {
                Vibration.vibrate([0, 800, 400, 800]);
              } catch (error) {
                // Silenciar error
              }
              reproducirSonidoCocina();
              // Send notification for kitchen
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Nueva Orden de Mesa 🍳',
                  body: `Mesa ${ordenNueva.mesa} ha pedido nuevos productos.`,
                  sound: true,
                },
                trigger: null,
              });
            }

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

              // Agregar a entregadas/pagadas
              const ordenPagada: Orden = {
                id: actualizada.id,
                mesa: actualizada.mesa,
                productos: actualizada.productos || [],
                total: actualizada.total,
                estado: 'pago',
                fechaCreacion: new Date(actualizada.fecha_creacion),
                fechaEntrega: actualizada.fecha_entrega ? new Date(actualizada.fecha_entrega) : undefined,
                metodoPago: actualizada.metodo_pago,
                idVenta: actualizada.id_venta,
                productosNuevos: actualizada.productos_nuevos || [],
                productosListos: actualizada.productos_listos || [],
                productosEntregados: actualizada.productos_entregados || [],
              };
              setOrdenesEntregadas(prev => {
                const existe = prev.some(o => o.id === ordenPagada.id);
                return existe ? prev : [ordenPagada, ...prev];
              });

              return;
            }

            const fechaCreacion = new Date(actualizada.fecha_creacion);
            if (fechaCreacion < inicioDia || fechaCreacion > finDia) return;

            // Sonido + Vibración para mesero cuando está listo
            if (actualizada.estado === 'listo' && (usuarioRef.current?.rol_id === 1 || usuarioRef.current?.rol_id === 2)) {
              try {
                Vibration.vibrate([0, 500, 200, 500]);
              } catch (error) {
                // Silenciar error de vibración
              }
              reproducirSonidoListo();
              // Mostrar Push Notification para Mesero
              Notifications.scheduleNotificationAsync({
                content: {
                  title: '¡Orden Lista! ✔️',
                  body: `La orden de la Mesa ${actualizada.mesa} ya está lista en cocina.`,
                  sound: true,
                },
                trigger: null,
              });
            }

            // Sonido + Vibración para la cocina cuando hay algo para preparar (nuevos productos en pedido pendiente)
            if (usuarioRef.current?.rol_id === 3 || usuarioRef.current?.rol_id === 4) {
              const ordenPrevia = ordenesRef.current.find(o => o.id === actualizada.id);
              if (ordenPrevia) {
                const estadoAnterior = ordenPrevia.estado;
                const estadoNuevo = mapEstadoBDToLocal(actualizada.estado);
                const teniaNuevos = ordenPrevia.productosNuevos?.length || 0;
                const tieneNuevos = actualizada.productos_nuevos?.length || 0;

                const esNuevoPedido = estadoNuevo === 'pendiente' && estadoAnterior !== 'pendiente';
                const tieneAlgoParaPreparar = estadoNuevo === 'pendiente' && tieneNuevos > teniaNuevos;

                if (esNuevoPedido || tieneAlgoParaPreparar) {
                  try {
                    Vibration.vibrate([0, 800, 400, 800]);
                  } catch (error) {
                    // Solo silenciamos
                  }
                  reproducirSonidoCocina();
                  Notifications.scheduleNotificationAsync({
                    content: {
                      title: '¡Actualización de Mesa! ⚠️',
                      body: `Mesa ${actualizada.mesa} ha pedido más productos.`,
                      sound: true,
                    },
                    trigger: null,
                  });
                }
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
                      productosNuevos: actualizada.productos_nuevos || o.productosNuevos,
                      productosListos: actualizada.productos_listos || o.productosListos,
                      productosEntregados: actualizada.productos_entregados || o.productosEntregados,
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
                    productosNuevos: actualizada.productos_nuevos || [],
                    productosListos: actualizada.productos_listos || [],
                    productosEntregados: actualizada.productos_entregados || [],
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
            setOrdenesEntregadas((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // ------------------- FUNCIONES CRUD -------------------

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
        // Fallback offline
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
      console.error('❌ Error en agregarOrden:', error);
      Alert.alert('Error', 'Error al crear la orden');
    }
  };

  const actualizarProductosOrden = async (id: string, productosNuevos: string[], totalNuevo: number) => {
    try {
      const nuevoEstado: Orden['estado'] = 'pendiente';

      // Calcular índices de productos nuevos antes de actualizar
      // Necesitamos obtener la orden actual para saber cuántos productos tenía
      const ordenActual = ordenes.find(o => o.id === id);
      const cantidadOriginal = ordenActual ? ordenActual.productos.length : 0;

      // Preservar los índices de productos nuevos existentes
      const productosNuevosIndices: number[] = ordenActual?.productosNuevos ? [...ordenActual.productosNuevos] : [];
      const productosListosIndices: number[] = ordenActual?.productosListos ? [...ordenActual.productosListos] : [];
      const productosEntregadosIndices: number[] = ordenActual?.productosEntregados ? [...ordenActual.productosEntregados] : [];

      for (let i = 0; i < productosNuevos.length; i++) {
        if (i >= cantidadOriginal) {
          productosNuevosIndices.push(i);
        } else {
          // Auto-tachar productos anteriores marcándolos como listos, para que cocina solo se fije en los nuevos
          if (!productosListosIndices.includes(i) && !productosEntregadosIndices.includes(i)) {
            productosListosIndices.push(i);
          }
        }
      }

      const { error } = await supabase
        .from('ordenes')
        .update({
          productos: productosNuevos,
          total: totalNuevo,
          estado: 'pendiente',
          productos_nuevos: productosNuevosIndices,
          productos_listos: productosListosIndices,
          productos_entregados: productosEntregadosIndices
        })
        .eq('id', id);

      if (error) {
        logError('Error actualizando productos en Supabase', error);
      }

      setOrdenes(prev => {
        const nuevas = prev.map(orden => {
          if (orden.id === id) {
            return {
              ...orden,
              productos: productosNuevos,
              total: totalNuevo,
              estado: 'pendiente' as const,
              productosNuevos: productosNuevosIndices,
              productosListos: productosListosIndices,
              productosEntregados: productosEntregadosIndices,
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
      let ordenAPagar = ordenes.find(orden => String(orden.id) === idString);

      // Si no está en estado local (puede haber sido filtrada), buscarla en Supabase
      if (!ordenAPagar) {
        const { data: ordenBD } = await supabase
          .from('ordenes')
          .select('*')
          .eq('id', idString)
          .single();

        if (!ordenBD) {
          Alert.alert('Error', 'Orden no encontrada');
          return;
        }

        ordenAPagar = {
          id: ordenBD.id,
          mesa: ordenBD.mesa,
          productos: ordenBD.productos || [],
          total: ordenBD.total,
          estado: mapEstadoBDToLocal(ordenBD.estado),
          fechaCreacion: new Date(ordenBD.fecha_creacion),
          fechaEntrega: ordenBD.fecha_entrega ? new Date(ordenBD.fecha_entrega) : undefined,
          metodoPago: ordenBD.metodo_pago,
          idVenta: ordenBD.id_venta,
        };
      }

      const mesaNumero = parseInt(ordenAPagar.mesa, 10);

      // 1. Actualizar estado local a 'pago' y MANTENER en la lista visualmente 5s
      setOrdenes(prev => {
        const nuevas = prev.map(o => String(o.id) === idString ? { ...o, estado: 'pago' as const } : o);
        return nuevas;
      });

      const ordenPagada: Orden = {
        ...ordenAPagar,
        estado: 'pago',
        fechaEntrega: new Date(),
        metodoPago,
        idVenta
      };

      setOrdenesEntregadas(prev => {
        const existe = prev.some(o => o.id === ordenPagada.id);
        return existe ? prev : [...prev, ordenPagada];
      });

      // 2 y 3. Actualizar BD Orden y Mesa a 'pago' en paralelo para mayor velocidad
      const promesas = [
        supabase
          .from('ordenes')
          .update({
            estado: 'pago',
            id_venta: idVenta,
            fecha_entrega: new Date().toISOString(),
          })
          .eq('id', idString)
      ];

      // Añadir promesa de mesa si el ID es válido
      if (!isNaN(mesaNumero)) {
        promesas.push(
          supabase
            .from('mesas')
            .update({ estado: 'pago', ultima_actualizacion: new Date().toISOString() })
            .eq('numero_mesa', mesaNumero)
        );
      }

      await Promise.all(promesas);

      // 4. Esperar 3 segundos y liberar la mesa a 'disponible'
      setTimeout(async () => {
        // Limpiar de estado local
        setOrdenes(prev => {
          const nuevas = prev.filter(orden => String(orden.id) !== idString);
          guardarOrdenesEnStorage(nuevas);
          return nuevas;
        });

        // Liberar mesa en BD
        if (!isNaN(mesaNumero)) {
          await supabase
            .from('mesas')
            .update({ estado: 'disponible', ultima_actualizacion: new Date().toISOString() })
            .eq('numero_mesa', mesaNumero);
        }
      }, 3000);

    } catch (error) {
      console.error('❌ Error en procesarPago:', error);
      Alert.alert('Error', 'Error al procesar pago');
    }
  };

  const actualizarEstadoOrden = async (id: string, nuevoEstado: Orden['estado']) => {
    try {
      const ordenAActualizar = ordenes.find((o) => o.id === id);
      if (!ordenAActualizar) return;

      const updateData: any = {
        estado: nuevoEstado,
      };

      if (
        nuevoEstado === 'listo' ||
        nuevoEstado === 'pendiente_por_pagar' ||
        nuevoEstado === 'entregado' ||
        nuevoEstado === 'pago'
      ) {
        // Al terminar preparación o finalizar, siempre limpiamos productos nuevos.
        updateData.productos_nuevos = [];
      }

      if (
        nuevoEstado === 'pendiente_por_pagar' ||
        nuevoEstado === 'entregado' ||
        nuevoEstado === 'pago'
      ) {
        updateData.fecha_entrega = new Date().toISOString();
      }

      // Mirror complex state logic to DB if changing to 'listo', 'entregado' or 'pendiente_por_pagar'
      if (nuevoEstado === 'listo') {
        let productosListosActualizados = ordenAActualizar.productosListos || [];
        const nuevosAListos = ordenAActualizar.productosNuevos || [];
        productosListosActualizados = [...productosListosActualizados, ...nuevosAListos];
        if (nuevosAListos.length === 0) {
          productosListosActualizados = Array.from(
            { length: ordenAActualizar.productos.length },
            (_, i) => i
          ).filter(i => !(ordenAActualizar.productosEntregados || []).includes(i));
        }
        updateData.productos_listos = productosListosActualizados;
      } else if (nuevoEstado === 'entregado' || nuevoEstado === 'pendiente_por_pagar') {
        let productosEntregadosActualizados = ordenAActualizar.productosEntregados || [];
        const nuevosAEntregar = ordenAActualizar.productosNuevos || [];
        const listosAEntregar = ordenAActualizar.productosListos || [];
        const todosEntregados = new Set([
          ...productosEntregadosActualizados,
          ...listosAEntregar,
          ...nuevosAEntregar
        ]);
        updateData.productos_entregados = Array.from(todosEntregados);
        updateData.productos_listos = [];
      }

      const { error } = await supabase
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

        // Mantener visualmente como pago por 5s
        setOrdenes((prev) => {
          return prev.map(o => o.id === id ? { ...o, estado: 'pago' } : o);
        });

        const mesaNumeroPago = parseInt(ordenAActualizar.mesa, 10);

        // 1. Actualizar mesa a PAGO inmediatamente usando número entero
        if (!isNaN(mesaNumeroPago)) {
          await supabase
            .from('mesas')
            .update({ estado: 'pago', ultima_actualizacion: new Date().toISOString() })
            .eq('numero_mesa', mesaNumeroPago);
        }

        // 2. Timeout para limpiar y liberar mesa
        setTimeout(async () => {
          setOrdenes((prev) => {
            const sinPago = prev.filter((orden) => orden.id !== id);
            guardarOrdenesEnStorage(sinPago);
            return sinPago;
          });

          // Liberar mesa
          if (!isNaN(mesaNumeroPago)) {
            await supabase
              .from('mesas')
              .update({ estado: 'disponible', ultima_actualizacion: new Date().toISOString() })
              .eq('numero_mesa', mesaNumeroPago);
          }
        }, 3000);

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
                // Mover productos listos y nuevos a entregados, manteniendo los ya entregados
                const nuevosAEntregar = orden.productosNuevos || [];
                const listosAEntregar = orden.productosListos || [];

                // Combinar todos, evitando duplicados
                const todosEntregados = new Set([
                  ...productosEntregadosActualizados,
                  ...listosAEntregar,
                  ...nuevosAEntregar
                ]);

                productosEntregadosActualizados = Array.from(todosEntregados);
                productosListosActualizados = [];
              }

              const limpiarMarcasNuevos = ['pendiente_por_pagar', 'pago', 'entregado'].includes(nuevoEstado);

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

        const mesaNumeroEstado = parseInt(ordenAActualizar.mesa, 10);
        if (!isNaN(mesaNumeroEstado)) {
          await supabase
            .from('mesas')
            .update({ estado: nuevoEstado, ultima_actualizacion: new Date().toISOString() })
            .eq('numero_mesa', mesaNumeroEstado);
        }
      }

    } catch (error) {
      console.error('❌ Error en actualizarEstadoOrden:', error);
      Alert.alert('Error', 'Error al actualizar estado');
    }
  };

  const eliminarOrden = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ordenes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando orden:', error);
        Alert.alert('Error', 'No se pudo eliminar la orden');
        return;
      }

      setOrdenes((prev) => {
        const nuevas = prev.filter((orden) => orden.id !== id);
        guardarOrdenesEnStorage(nuevas);
        return nuevas;
      });
    } catch (error) {
      console.error('❌ Error en eliminarOrden:', error);
      Alert.alert('Error', 'Error al eliminar la orden');
    }
  };

  const getOrdenesPorMesa = (mesa: string) => ordenes.filter((orden) => orden.mesa === mesa);
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
