import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Layout } from '@/configuracion/constants/Layout';
import { supabase } from '@/scripts/lib/supabase';
import { useAuth } from '@/utilidades/context/AuthContext';
import { Orden, useOrdenes } from '@/utilidades/context/OrdenesContext';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

// Interfaz para órdenes generales (de la base de datos)
interface OrdenGeneral {
  id: string;
  tipo: 'Domicilio' | 'Llevar';
  referencia?: string;
  productos: string[];
  total: number;
  estado: string;
  created_at: string;
  productos_nuevos?: number[];
  productos_listos?: number[];
  productos_entregados?: number[];
}

// Interfaz unificada para la cocina
type OrdenUnificada = (Orden & { origen: 'mesa' }) | (OrdenGeneral & { origen: 'general' });

export default function CocinaScreen() {
  // Bloquear botón físico de "volver"
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const { ordenes, actualizarEstadoOrden } = useOrdenes();
  const { logout } = useAuth();
  const [ordenExpandida, setOrdenExpandida] = useState<string | null>(null);
  const [ordenesGenerales, setOrdenesGenerales] = useState<OrdenGeneral[]>([]);
  const [ordenesVisibles, setOrdenesVisibles] = useState<OrdenUnificada[]>([]);
  const [cargandoGenerales, setCargandoGenerales] = useState(false);

  // Función para cargar órdenes generales
  const cargarOrdenesGenerales = async () => {
    try {
      const { data, error } = await supabase
        .from('ordenesgenerales')
        .select('*')
        .in('estado', ['pendiente', 'en_preparacion'])
        .neq('estado', 'pago')
        .or('tipo.ilike.%domicilio%,tipo.ilike.%llevar%')
        .order('creado_en', { ascending: false });

      if (error) {
        console.error('❌ Error cargando órdenes generales:', error);
      } else if (data) {
        const generalesFiltradas: OrdenGeneral[] = data.filter(o =>
          o.tipo.toLowerCase().includes('domicilio') || o.tipo.toLowerCase().includes('llevar')
        ).map(o => ({
          ...o,
          tipo: o.tipo.toLowerCase().includes('domicilio') ? 'Domicilio' : 'Llevar'
        }));
        setOrdenesGenerales(generalesFiltradas);
      }
    } catch (error) {
      console.error('❌ Error general cargando órdenes generales:', error);
    } finally {
      setCargandoGenerales(false);
    }
  };

  // Recargar datos cuando la pantalla recibe foco (además del bloqueo del botón atrás)
  useFocusEffect(
    React.useCallback(() => {
      cargarOrdenesGenerales();
    }, [])
  );

  // Cargar órdenes generales al montar y suscribirse a cambios en tiempo real
  useEffect(() => {
    setCargandoGenerales(true);
    cargarOrdenesGenerales();

    // Polling: Recargar órdenes cada 3 segundos
    const pollingInterval = setInterval(() => {
      cargarOrdenesGenerales();
    }, 3000);

    // Suscripción en tiempo real a cambios en la tabla ordenesgenerales
    const subscription = supabase
      .channel('ordenes-cocina-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Escucha INSERT, UPDATE y DELETE
          schema: 'public',
          table: 'ordenesgenerales'
        },
        (payload) => {
          // Recargar inmediatamente cuando hay un cambio
          cargarOrdenesGenerales();
        }
      )
      .subscribe((status) => {
      });

    return () => {
      clearInterval(pollingInterval);
      subscription.unsubscribe();
    };
  }, []);

  // Unificar y filtrar las órdenes
  useEffect(() => {
    // 1. Filtrar órdenes de Mesa (desde el contexto) - solo pendiente y en_preparacion
    const ordenesMesaVisibles: OrdenUnificada[] = ordenes
      .filter(o => {
        // Excluir órdenes en estado listo o posterior
        if (o.estado === 'listo' || o.estado === 'pago') return false;
        if (o.estado === 'pendiente_por_pagar' && o.productosNuevos && o.productosNuevos.length > 0) return true;
        if (o.estado === 'pendiente_por_pagar') return false;
        // Solo mostrar pendiente y en_preparacion
        return o.estado === 'pendiente' || o.estado === 'en_preparacion';
      })
      .map(o => ({ ...o, origen: 'mesa' as const }));

    // 2. Mapear órdenes Generales (desde Supabase) - ya filtradas en la query
    const ordenesGeneralVisibles: OrdenUnificada[] = ordenesGenerales
      .map(o => ({ ...o, origen: 'general' as const }));

    // 3. Unir y establecer las órdenes visibles
    setOrdenesVisibles([...ordenesGeneralVisibles, ...ordenesMesaVisibles]);
  }, [ordenes, ordenesGenerales]);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return '#FF8C00';
      case 'en_preparacion': return '#2196F3';
      case 'listo': return '#4CAF50';
      default: return '#FF8C00';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'en_preparacion': return 'En preparación';
      case 'listo': return 'Listo';
      default: return 'Pendiente';
    }
  };

  const actualizarEstadoGeneralEnDB = async (ordenId: string, nuevoEstado: string) => {
    // Actualizar el estado local inmediatamente para feedback instantáneo
    setOrdenesGenerales(prev =>
      prev.map(o => o.id === ordenId ? { ...o, estado: nuevoEstado } : o)
    );

    const { error } = await supabase
      .from('ordenesgenerales')
      .update({ estado: nuevoEstado })
      .eq('id', ordenId);

    if (error) {
      console.error('Error actualizando estado en DB:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado de la orden general.');
      // Revertir el cambio local si hubo error
      cargarOrdenesGenerales();
    }
  };

  const handleExpandirOrden = async (orden: OrdenUnificada) => {
    const isExpanded = ordenExpandida === orden.id;
    if (isExpanded) {
      setOrdenExpandida(null);
      return;
    }

    // Cambiar automáticamente a "en_preparación" si estaba pendiente
    if (orden.estado === 'pendiente') {
      if (orden.origen === 'mesa') {
        await actualizarEstadoOrden(orden.id, 'en_preparacion');
      } else {
        await actualizarEstadoGeneralEnDB(orden.id, 'en_preparacion');
      }
    }

    setOrdenExpandida(orden.id);
  };

  const handleMarcarListo = async (orden: OrdenUnificada) => {

    if (orden.origen === 'mesa') {
      await actualizarEstadoOrden(orden.id, 'listo');
      // Remover inmediatamente de la vista
      setOrdenesVisibles((prev) => prev.filter((o) => o.id !== orden.id));
      if (ordenExpandida === orden.id) setOrdenExpandida(null);
    } else {
      await actualizarEstadoGeneralEnDB(orden.id, 'listo');
      // Remover inmediatamente de la vista
      setOrdenesVisibles((prev) => prev.filter((o) => o.id !== orden.id));
      if (ordenExpandida === orden.id) setOrdenExpandida(null);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const getOrdenInfo = (orden: OrdenUnificada) => {
    if (orden.origen === 'mesa') {
      return {
        texto: `Mesa ${orden.mesa}`,
        tipoOrden: 'Mesa',
        simbolo: 'table.furniture',
        color: '#FF8C00'
      };
    } else {
      const tipoOrden = orden.tipo;
      const simbolo = tipoOrden === 'Domicilio' ? 'car.fill' : 'bag.fill';
      return {
        texto: tipoOrden,
        tipoOrden: tipoOrden,
        simbolo: simbolo,
        color: '#9C27B0'
      };
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <IconSymbol name="flame.fill" size={28} color="#FF4500" />
          </View>
          <View>
            <ThemedText type="title" style={styles.title}>Cocina</ThemedText>
            <ThemedText style={styles.subtitulo}>
              {ordenesVisibles.length} órdenes activas
            </ThemedText>
          </View>
        </View>
      </View>

      {/* LISTA DE ÓRDENES */}
      <ScrollView style={styles.lista} contentContainerStyle={styles.listaContent}>
        <View style={styles.gridContainer}>
          {ordenesVisibles.length === 0 && !cargandoGenerales ? (
            <View style={styles.emptyState}>
              <IconSymbol name="list.clipboard" size={64} color="#ccc" />
              <ThemedText style={styles.emptyTexto}>No hay órdenes pendientes</ThemedText>
            </View>
          ) : cargandoGenerales ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyTexto}>Cargando órdenes...</ThemedText>
            </View>
          ) : (
            ordenesVisibles.map((orden) => {
              const expandida = ordenExpandida === orden.id;
              const info = getOrdenInfo(orden);
              const esMesa = orden.origen === 'mesa';
              const productosNuevos = orden.origen === 'mesa' ? (orden as Orden).productosNuevos : (orden as OrdenGeneral).productos_nuevos;
              const productosListos = orden.origen === 'mesa' ? (orden as Orden).productosListos : (orden as OrdenGeneral).productos_listos;
              const productosEntregados = orden.origen === 'mesa' ? (orden as Orden).productosEntregados : (orden as OrdenGeneral).productos_entregados;

              return (
                <TouchableOpacity
                  key={orden.id}
                  activeOpacity={0.9}
                  onPress={() => handleExpandirOrden(orden)}
                  style={[styles.ordenCard, expandida && styles.ordenExpandida]}
                >
                  {/* Encabezado */}
                  <View style={styles.ordenHeader}>
                    <View style={styles.mesaInfo}>
                      <IconSymbol name={info.simbolo as any} size={20} color={info.color} />
                      <View>
                        <ThemedText style={styles.mesaTexto}>{info.texto}</ThemedText>
                        <ThemedText style={styles.tipoOrdenTexto}>
                          {info.tipoOrden === 'Mesa' ? 'Para Mesa' :
                            info.tipoOrden === 'Domicilio' ? 'Para Domicilio' :
                              'Para Llevar'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(orden.estado) }]}>
                      <ThemedText style={styles.estadoTexto}>{getEstadoTexto(orden.estado)}</ThemedText>
                    </View>
                  </View>

                  {/* Si está expandida, muestra los productos y botón */}
                  {expandida && (
                    <>
                      {orden.origen === 'general' && 'referencia' in orden && orden.referencia && (
                        <View style={styles.referenciaContainer}>
                          <IconSymbol name="info.circle" size={16} color="#666" />
                          <ThemedText style={styles.referenciaTexto}>
                            Referencia: {orden.referencia}
                          </ThemedText>
                        </View>
                      )}

                      <View style={styles.productosContainer}>
                        {orden.productos && orden.productos.length > 0 ? (
                          orden.productos.map((producto, i) => {
                            const partes = producto.split(' X');
                            const nombre = partes[0].split(' $')[0].trim();
                            const cantidad = partes[1];
                            const esProductoNuevo = productosNuevos?.includes(i);
                            const esProductoListo = productosListos?.includes(i);
                            const esProductoEntregado = productosEntregados?.includes(i);

                            return (
                              <View key={i} style={styles.productoItemContainer}>
                                <View style={[styles.productoItemInfo, { flexWrap: 'wrap' }]}>
                                  <ThemedText style={styles.productoItem}>• {nombre}</ThemedText>
                                  {esProductoEntregado ? (
                                    <View style={styles.productoStatus}>
                                      <ThemedText style={[styles.productoStatusText, styles.entregadoTexto]}>
                                        Entregado
                                      </ThemedText>
                                    </View>
                                  ) : esProductoListo ? (
                                    <View style={styles.productoStatus}>
                                      <ThemedText style={[styles.productoStatusText, styles.listoTexto]}>
                                        Listo
                                      </ThemedText>
                                    </View>
                                  ) : esProductoNuevo ? (
                                    <View style={styles.productoStatus}>
                                      <ThemedText style={[styles.productoStatusText, { color: '#D32F2F' }]}>
                                        Nuevo!
                                      </ThemedText>
                                    </View>
                                  ) : null}
                                </View>
                                {cantidad && (
                                  <View style={styles.cantidadBadge}>
                                    <ThemedText style={styles.cantidadBadgeTexto}>X{cantidad}</ThemedText>
                                  </View>
                                )}
                              </View>
                            );
                          })
                        ) : (
                          <ThemedText style={styles.productoItem}>No hay productos</ThemedText>
                        )}
                      </View>

                      {(orden.estado === 'pendiente' || orden.estado === 'en_preparacion') && (
                        <TouchableOpacity style={styles.botonListo} onPress={() => handleMarcarListo(orden)}>
                          <ThemedText style={styles.textoListo}>Marcar como Listo</ThemedText>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })
          )}

        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: Layout.verticalScale(60),
    paddingBottom: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.l,
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: Layout.icon.xxl,
    height: Layout.icon.xxl,
    borderRadius: Layout.borderRadius.xl,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.m,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: '800',
    color: '#E65100',
    letterSpacing: 0.5,
  },
  subtitulo: {
    fontSize: Layout.fontSize.m,
    color: '#F57C00',
    fontWeight: '500',
    marginTop: 2,
  },
  lista: {
    marginTop: Layout.spacing.m,
  },
  listaContent: {
    paddingHorizontal: Layout.spacing.l,
    paddingBottom: Layout.spacing.xl,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.m,
  },
  ordenCard: {
    width: Layout.isTablet ? '31%' : '100%',
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.m,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  ordenExpandida: {
    backgroundColor: '#FFF8F0',
    borderColor: '#FFB74D',
    borderWidth: 2,
    elevation: 4,
  },
  ordenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mesaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    flex: 1,
  },
  mesaTexto: { fontSize: Layout.fontSize.xl, fontWeight: 'bold', color: '#8B4513' },
  tipoOrdenTexto: {
    fontSize: Layout.fontSize.s,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  estadoBadge: { paddingHorizontal: Layout.spacing.m, paddingVertical: Layout.spacing.xs, borderRadius: Layout.borderRadius.l },
  estadoTexto: { color: '#fff', fontSize: Layout.fontSize.s, fontWeight: '600' },
  productosContainer: { marginTop: Layout.spacing.m, marginBottom: Layout.spacing.s, paddingLeft: 4 },
  productoItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  productoItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    flex: 1,
  },
  productoItem: {
    fontSize: Layout.fontSize.m,
    color: '#3E2723',
    fontWeight: '600',
  },
  productoStatus: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: Layout.spacing.s,
  },
  productoStatusText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: 'bold',
  },
  nuevoTexto: {
    color: '#D84315',
  },
  entregadoTexto: { color: '#4CAF50' },
  listoTexto: { color: '#4CAF50' },
  cantidadBadge: {
    backgroundColor: '#FF7043',
    borderRadius: Layout.borderRadius.m,
    paddingHorizontal: Layout.spacing.s,
    paddingVertical: 4,
  },
  cantidadBadgeTexto: { color: '#fff', fontWeight: 'bold', fontSize: Layout.fontSize.s },
  detallesContainer: { marginTop: 10 },
  detalleItem: { fontSize: Layout.fontSize.m, color: '#666', marginBottom: 5, fontStyle: 'italic' },
  botonListo: {
    marginTop: Layout.spacing.m,
    backgroundColor: '#4CAF50',
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.l,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  textoListo: { color: '#fff', fontWeight: 'bold', fontSize: Layout.fontSize.l },
  emptyState: { alignItems: 'center', marginTop: Layout.verticalScale(80), width: '100%' },
  emptyTexto: { color: '#888', marginTop: 10, fontSize: Layout.fontSize.l },
  referenciaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    backgroundColor: '#f0f0f0',
    padding: Layout.spacing.s,
    borderRadius: Layout.borderRadius.m,
    marginBottom: Layout.spacing.s,
  },
  referenciaTexto: {
    fontSize: Layout.fontSize.s,
    color: '#666',
    flex: 1,
  },
});
