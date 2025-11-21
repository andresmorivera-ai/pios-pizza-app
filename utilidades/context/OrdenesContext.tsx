import { supabase } from '@/scripts/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

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
  productosNuevos?: number[]; // Índices de productos que son nuevos
  productosListos?: number[]; // Índices de productos que Cocina marcó como listos
  productosEntregados?: number[]; // Índices de productos que el mesero ya entregó
  idVenta?: string; // ID único de la venta generado por el sistema
}

// Clave para AsyncStorage
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

// ------------------- CONTEXTO -------------------
const OrdenesContext = createContext<OrdenesContextType | undefined>(undefined);

export function OrdenesProvider({ children }: { children: ReactNode }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [ordenesEntregadas, setOrdenesEntregadas] = useState<Orden[]>([]);

  // ------------------- FUNCIONES AUXILIARES -------------------

  // Obtener inicio y fin del día actual (hora local)
  const getInicioYFinDia = () => {
    const hoy = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
    return { inicioDia, finDia };
  };

  // Guardar órdenes en AsyncStorage
  const guardarOrdenesEnStorage = async (ordenesParaGuardar: Orden[]) => {
    try {
      // Solo guardar órdenes del día actual que no estén pagadas
      const hoy = new Date();
      const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      
      const ordenesDelDia = ordenesParaGuardar.filter(orden => {
        const fechaCreacion = orden.fechaCreacion;
        return fechaCreacion >= inicioDia && orden.estado !== 'pago';
      });

      // Convertir fechas a strings para JSON
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

  // Cargar órdenes desde AsyncStorage
  const cargarOrdenesDesdeStorage = async (): Promise<Orden[]> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return [];

      const ordenesSerializadas = JSON.parse(data);
      const hoy = new Date();
      const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

      // Filtrar solo órdenes del día actual y convertir fechas
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

  // Cargar órdenes desde Supabase (solo del día actual)
  const cargarOrdenesDesdeSupabase = async (ordenesLocales: Orden[] = []): Promise<Orden[]> => {
    try {
      const { inicioDia, finDia } = getInicioYFinDia();

      // Convertir fechas locales a ISO string para la consulta
      // Supabase almacena en UTC, así que usamos ISO strings que se convierten automáticamente
      const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .neq('estado', 'pago') // NO cargar órdenes pagadas
        .gte('fecha_creacion', inicioDia.toISOString()) // Desde inicio del día
        .lte('fecha_creacion', finDia.toISOString()) // Hasta fin del día
        .order('fecha_creacion', { ascending: false });

      if (error) {
        logError('Error cargando órdenes desde Supabase', error);
        return [];
      }

      if (!data) return [];

      // Filtrar solo las que son realmente del día actual (por si acaso hay diferencia de zona horaria)
      const hoy = new Date();
      const inicioDiaLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

      const ordenesCargadas = uniqueOrdersById(
        data
          .map((o) => {
            // Preservar productosNuevos y productosEntregados si existen en AsyncStorage
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
            // Verificar que la orden es del día actual (comparación local)
            const fechaCreacion = orden.fechaCreacion;
            return fechaCreacion >= inicioDiaLocal && orden.estado !== 'pago';
          })
      );

      // Debug: Log para ver qué órdenes se cargaron
      console.log('📦 Órdenes cargadas desde Supabase:', ordenesCargadas.length);
      const estadosCargados = ordenesCargadas.reduce((acc, o) => {
        acc[o.estado] = (acc[o.estado] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('📊 Estados de órdenes cargadas:', estadosCargados);

      return ordenesCargadas;
    } catch (error) {
      logError('Error en cargarOrdenesDesdeSupabase', error);
      return [];
    }
  };

  // Cargar órdenes al iniciar (desde Supabase, con respaldo de AsyncStorage)
  useEffect(() => {
    const cargarOrdenes = async () => {
      // Primero cargar desde AsyncStorage para preservar productosNuevos/productosEntregados
      const ordenesStorage = await cargarOrdenesDesdeStorage();
      
      // Luego cargar desde Supabase y combinar con los datos locales
      let ordenesCargadas = await cargarOrdenesDesdeSupabase(ordenesStorage);

      // Si no hay órdenes en Supabase, usar las de AsyncStorage
      if (ordenesCargadas.length === 0 && ordenesStorage.length > 0) {
        console.log('No hay órdenes en Supabase, usando AsyncStorage...');
        ordenesCargadas = ordenesStorage;
      } else {
        // Si hay órdenes en Supabase, sincronizar AsyncStorage
        await guardarOrdenesEnStorage(ordenesCargadas);
      }

      setOrdenes(ordenesCargadas);
    };

    cargarOrdenes();

    //  Suscripción en tiempo real a cambios en "ordenes"
    const canal = supabase
      .channel('ordenes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordenes' },
        async (payload) => {
          const { inicioDia, finDia } = getInicioYFinDia();

          if (payload.eventType === 'INSERT') {
            const nueva = payload.new as any;
            
            //  NO agregar órdenes pagadas
            if (nueva.estado === 'pago') return;

            // Solo agregar si es del día actual
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
            
            // 🔹 Si se actualiza a "pago", eliminar del local
            if (actualizada.estado === 'pago') {
              console.log('🔔 Evento tiempo real: Orden marcada como pago, eliminando:', actualizada.id);
              setOrdenes((prev) => {
                const nuevas = prev.filter((o) => o.id !== actualizada.id);
                console.log('🗑️ Órdenes después de eliminar (tiempo real):', nuevas.length);
                guardarOrdenesEnStorage(nuevas);
                return nuevas;
              });
              return;
            }

            // Solo actualizar si es del día actual
            const fechaCreacion = new Date(actualizada.fecha_creacion);
            if (fechaCreacion < inicioDia || fechaCreacion > finDia) return;
            
            setOrdenes((prev) => {
              const ordenExistente = prev.find((o) => o.id === actualizada.id);
              
              // Si la orden existe, actualizarla
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
                // Si la orden no existe en el estado local pero es del día actual y no está pagada, agregarla
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
            console.log('🔔 Evento tiempo real: Orden eliminada de BD:', payload.old.id);
            setOrdenes((prev) => {
              const nuevas = prev.filter((o) => o.id !== payload.old.id);
              console.log('🗑️ Órdenes después de eliminar (DELETE tiempo real):', nuevas.length);
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

  // ------------------- FUNCIONES -------------------

  //  Crear una nueva orden y guardarla en Supabase inmediatamente
  const agregarOrden = async (mesa: string, productos: string[], total: number) => {
    try {
      const fechaCreacion = new Date();

      // Guardar en Supabase primero
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
        // Si falla Supabase, crear orden local temporal
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

      // Usar el UUID de Supabase como ID
      const nuevaOrden: Orden = {
        id: nuevaOrdenBD.id, // ✅ UUID de Supabase
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

      //  Actualizar estado de la mesa en tiempo real
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
      // Actualizar en Supabase
      const ordenActual = ordenes.find((orden) => orden.id === id);
      // Cambiar a "pendiente" cuando se agregan productos para que Cocina sepa que hay algo nuevo
      const nuevoEstado = 'pendiente';

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

      // Actualizar localmente
      setOrdenes(prev => {
        const nuevas = prev.map(orden => {
          if (orden.id === id) {
            // Identificar qué productos son nuevos (los que están después de los originales)
            const cantidadOriginal = orden.productos.length;
            const productosNuevosIndices: number[] = [];
            const productosListosIndices: number[] = [];
            const productosEntregadosIndices: number[] = [];
            
            // Los productos nuevos son los que están después del índice original
            for (let i = 0; i < productosNuevos.length; i++) {
              if (i >= cantidadOriginal) {
                // Este producto es nuevo
                productosNuevosIndices.push(i);
              } else {
                // Preservar el estado de los productos originales
                if (orden.productosEntregados?.includes(i)) {
                  productosEntregadosIndices.push(i);
                } else if (orden.productosListos?.includes(i)) {
                  productosListosIndices.push(i);
                }
              }
            }
            
            console.log('🔄 Actualizando productos:', {
              estadoAnterior: orden.estado,
              productosOriginales: cantidadOriginal,
              productosNuevosTotal: productosNuevos.length,
              nuevosIndices: productosNuevosIndices,
              listosIndices: productosListosIndices,
              entregadosIndices: productosEntregadosIndices,
              productosOriginalesArray: orden.productos,
              productosNuevosArray: productosNuevos,
            });
            
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
      console.log('💰💰💰 PROCESARPAGO LLAMADO - ID:', id, 'Tipo:', typeof id);
      console.log('💰 Estado actual de ordenes:', ordenes.length);
      
      // Convertir id a string para asegurar la comparación
      const idString = String(id);
      const ordenAPagar = ordenes.find(orden => String(orden.id) === idString);
      
      if (!ordenAPagar) {
        console.log('⚠️⚠️⚠️ ORDEN NO ENCONTRADA:', id);
        console.log('⚠️ IDs disponibles:', ordenes.map(o => `${o.id} (tipo: ${typeof o.id})`));
        Alert.alert('Error', 'Orden no encontrada');
        return;
      }

      console.log('✅ Orden encontrada:', ordenAPagar.mesa, ordenAPagar.estado);

      // PRIMERO eliminar localmente para que desaparezca inmediatamente
      console.log('🗑️🗑️🗑️ ELIMINANDO ORDEN DEL ESTADO LOCAL');
      setOrdenes(prev => {
        const nuevas = prev.filter(orden => String(orden.id) !== idString);
        console.log('🗑️ Órdenes ANTES:', prev.length, 'DESPUÉS:', nuevas.length);
        console.log('🗑️ IDs restantes:', nuevas.map(o => `${o.mesa}(${String(o.id).substring(0,8)})`));
        guardarOrdenesEnStorage(nuevas);
        return nuevas;
      });

      // Guardar en ordenesEntregadas
      const ordenPagada: Orden = {
        ...ordenAPagar,
        estado: 'pago',
        fechaEntrega: new Date(),
        metodoPago,
        idVenta
      };
      
      setOrdenesEntregadas(prev => [...prev, ordenPagada]);

      // DESPUÉS eliminar de Supabase
      console.log('🗑️ Eliminando orden de Supabase (ya está pagada)');
      const { error } = await supabase
        .from('ordenes')
        .delete()
        .eq('id', idString);

      if (error) {
        logError('Error eliminando orden de Supabase', error);
        // No hacer return aquí porque ya eliminamos localmente
      } else {
        console.log('✅ Orden eliminada de Supabase');
      }

      // Volver mesa a "disponible"
      console.log('🪑 Liberando mesa:', ordenAPagar.mesa);
      await supabase
        .from('mesas')
        .update({ estado: 'disponible' })
        .eq('numero_mesa', ordenAPagar.mesa);
      
      console.log('✅ Pago procesado completamente');
    } catch (error) {
      logError('Error en procesarPago', error);
    }
  };

  //  Cambiar estado de una orden y actualizar en Supabase
  const actualizarEstadoOrden = async (id: string, nuevoEstado: Orden['estado']) => {
    try {
      const ordenAActualizar = ordenes.find((o) => o.id === id);
      if (!ordenAActualizar) {
        console.log('⚠️ Orden no encontrada para actualizar:', id);
        return;
      }

      console.log(`🔄 Actualizando orden ${id} de "${ordenAActualizar.estado}" a "${nuevoEstado}"`);

      // Actualizar en Supabase (actualizar la orden existente, no insertar nueva)
      const estadoParaBD = nuevoEstado === 'pendiente_por_pagar' ? 'entregado' : nuevoEstado;
      const updateData: any = {
        estado: estadoParaBD,
      };

      // Si el estado es "pendiente_por_pagar", "entregado" o "pago", agregar fecha de entrega
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
        .single(); // ✅ Actualizar la orden existente y obtener el resultado

      if (error) {
        logError('❌ Error actualizando estado en Supabase', error);
        const mensaje = formatError(error);
        Alert.alert('Error', `No se pudo actualizar el estado: ${mensaje}`);
        return;
      }

      console.log(`✅ Estado actualizado en Supabase: ${nuevoEstado}`);
      console.log('✅ Orden actualizada en BD:', ordenActualizadaBD);

      // Actualizar localmente
      if (nuevoEstado === 'pago') {
        // Si es "pago", agregar a ordenesEntregadas y eliminar de activas
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
        // Para otros estados (incluyendo "entregado"), solo actualizar
        console.log(`📝 Actualizando estado local a: ${nuevoEstado}`);
        setOrdenes((prev) => {
          const nuevas = prev.map((orden) => {
            if (orden.id === id) {
              const necesitaFechaEntrega =
                nuevoEstado === 'pendiente_por_pagar' || nuevoEstado === 'entregado';
              
              // Si cambia a "listo", solo los productos "nuevos" pasan a "listos"
              // Los productos "entregados" se mantienen como están
              let productosListosActualizados = orden.productosListos || [];
              if (nuevoEstado === 'listo') {
                // Agregar los productos nuevos a la lista de listos
                const nuevosAListos = orden.productosNuevos || [];
                productosListosActualizados = [...productosListosActualizados, ...nuevosAListos];
                
                // Si no había productos nuevos, marcar todos los que no están entregados
                if (nuevosAListos.length === 0) {
                  productosListosActualizados = Array.from(
                    { length: orden.productos.length },
                    (_, i) => i
                  ).filter(i => !(orden.productosEntregados || []).includes(i));
                }
              }
              
              // Si cambia a "entregado" o "pendiente_por_pagar", mover productos listos a entregados
              let productosEntregadosActualizados = orden.productosEntregados || [];
              if (nuevoEstado === 'entregado' || nuevoEstado === 'pendiente_por_pagar') {
                // Los productos que estaban listos ahora pasan a entregados
                productosEntregadosActualizados = [...(orden.productosListos || [])];
                // Limpiar la lista de listos porque ya fueron entregados
                productosListosActualizados = [];
              }
              
              // Limpiar marcas de "nuevo" cuando se marca como listo, pendiente_por_pagar o pago
              const limpiarMarcasNuevos = ['listo', 'pendiente_por_pagar', 'pago'].includes(nuevoEstado);
              
              const ordenActualizada = {
                ...orden,
                estado: nuevoEstado,
                fechaEntrega: necesitaFechaEntrega ? new Date() : orden.fechaEntrega,
                productosNuevos: limpiarMarcasNuevos ? [] : orden.productosNuevos,
                productosListos: productosListosActualizados,
                productosEntregados: productosEntregadosActualizados,
              };
              console.log(`✅ Orden actualizada localmente:`, ordenActualizada);
              return ordenActualizada;
            }
            return orden;
          });
          console.log(`📊 Total órdenes después de actualizar: ${nuevas.length}`);
          console.log(`📊 Órdenes por estado:`, nuevas.reduce((acc, o) => {
            acc[o.estado] = (acc[o.estado] || 0) + 1;
            return acc;
          }, {} as Record<string, number>));
          guardarOrdenesEnStorage(nuevas);
          return nuevas;
        });
      }

      // Actualizar el estado de la mesa en tiempo real
      if (nuevoEstado === 'pago') {
        // Volver mesa a "disponible" cuando se paga
        await supabase
          .from('mesas')
          .update({ estado: 'disponible' })
          .eq('numero_mesa', ordenAActualizar.mesa);
      } else {
        // Actualizar estado de la mesa según el estado de la orden
        await supabase
          .from('mesas')
          .update({ estado: estadoParaBD })
          .eq('numero_mesa', ordenAActualizar.mesa);
      }
    } catch (error) {
      logError('Error en actualizarEstadoOrden', error);
    }
  };

  //  Eliminar orden (localmente y en Supabase)
  const eliminarOrden = async (id: string) => {
    try {
      // Eliminar de Supabase
      const { error } = await supabase
        .from('ordenes')
        .delete()
        .eq('id', id);

      if (error) {
        logError('Error eliminando orden de Supabase', error);
      }

      // Eliminar localmente
      setOrdenes((prev) => {
        const nuevas = prev.filter((orden) => orden.id !== id);
        guardarOrdenesEnStorage(nuevas);
        return nuevas;
      });
    } catch (error) {
      logError('Error en eliminarOrden', error);
    }
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