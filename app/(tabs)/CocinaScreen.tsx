import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Orden, useOrdenes } from '@/utilidades/context/OrdenesContext';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

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
  const [ordenExpandida, setOrdenExpandida] = useState<string | null>(null);
  const [detallesFake, setDetallesFake] = useState<Record<string, string[]>>({});
  const [ordenesVisibles, setOrdenesVisibles] = useState<Orden[]>([]);

  // Filtrar solo órdenes activas (mostrar todo excepto pagadas y pendiente_por_pagar sin productos nuevos)
  useEffect(() => {
    const nuevas = ordenes.filter(o => {
      // Excluir órdenes pagadas
      if (o.estado === 'pago') return false;

      // Si está en "pendiente_por_pagar" pero tiene productos nuevos, mostrarla
      if (o.estado === 'pendiente_por_pagar' && o.productosNuevos && o.productosNuevos.length > 0) return true;

      // Si está en "pendiente_por_pagar" sin productos nuevos, ocultarla
      if (o.estado === 'pendiente_por_pagar') return false;

      // Mostrar todas las demás (pendiente, en_preparacion, listo, entregado)
      return true;
    });
    const nuevosDetalles: Record<string, string[]> = {};

    setDetallesFake(nuevosDetalles);
    setOrdenesVisibles(nuevas);
  }, [ordenes]);

  const getEstadoColor = (estado: Orden['estado']) => {
    switch (estado) {
      case 'pendiente': return '#FF8C00';
      case 'en_preparacion': return '#2196F3';
      case 'listo': return '#4CAF50';
      default: return '#FF8C00';
    }
  };

  const getEstadoTexto = (estado: Orden['estado']) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'en_preparacion': return 'En preparación';
      case 'listo': return 'Listo';
      default: return 'Pendiente';
    }
  };

  const handleExpandirOrden = async (orden: Orden) => {
    const isExpanded = ordenExpandida === orden.id;
    if (isExpanded) {
      // Contraer si ya está expandida
      setOrdenExpandida(null);
      return;
    }

    // Cambiar automáticamente a “en_preparación” si estaba pendiente
    if (orden.estado === 'pendiente') {
      await actualizarEstadoOrden(orden.id, 'en_preparacion');
    }

    // Expandir y contraer las demás
    setOrdenExpandida(orden.id);
  };

  const handleMarcarListo = async (orden: Orden) => {
    console.log('🍳 Marcando orden como lista:', orden.id, 'Estado actual:', orden.estado);
    await actualizarEstadoOrden(orden.id, 'listo');
    setTimeout(() => {
      setOrdenesVisibles((prev) => prev.filter((o) => o.id !== orden.id));
      if (ordenExpandida === orden.id) setOrdenExpandida(null);
    }, 1000);
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
      <ScrollView style={styles.lista}>
        {ordenesVisibles.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="list.clipboard" size={64} color="#ccc" />
            <ThemedText style={styles.emptyTexto}>No hay órdenes pendientes</ThemedText>
          </View>
        ) : (
          ordenesVisibles.map((orden) => {
            const expandida = ordenExpandida === orden.id;
            const detalles = detallesFake[orden.id] || [];

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
                    <IconSymbol name="table.furniture" size={20} color="#FF8C00" />
                    <ThemedText style={styles.mesaTexto}>Mesa {orden.mesa}</ThemedText>
                  </View>
                  <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(orden.estado) }]}>
                    <ThemedText style={styles.estadoTexto}>{getEstadoTexto(orden.estado)}</ThemedText>
                  </View>
                </View>

                {/* Si está expandida, muestra los productos, pasos y botón */}
                {expandida && (
                  <>
                    <View style={styles.productosContainer}>
                      {orden.productos && orden.productos.length > 0 ? (
                        orden.productos.map((producto, i) => {
                          const partes = producto.split(' X');
                          const nombre = partes[0].split(' $')[0].trim();
                          const cantidad = partes[1];
                          const esProductoNuevo = orden.productosNuevos?.includes(i);
                          const esProductoListo = orden.productosListos?.includes(i);
                          const esProductoEntregado = orden.productosEntregados?.includes(i);

                          return (
                            <View key={i} style={styles.productoItemContainer}>
                              <View style={styles.productoItemInfo}>
                                <ThemedText style={styles.productoItem}>• {nombre}</ThemedText>
                                {esProductoNuevo && (
                                  <View style={styles.productoStatus}>
                                    <ThemedText style={[styles.productoStatusText, styles.nuevoTexto]}>
                                      Nuevo!
                                    </ThemedText>
                                  </View>
                                )}
                                {esProductoListo && !esProductoNuevo && (
                                  <View style={styles.productoStatus}>
                                    <ThemedText style={[styles.productoStatusText, styles.listoTexto]}>
                                      Listo
                                    </ThemedText>
                                  </View>
                                )}
                                {esProductoEntregado && !esProductoNuevo && !esProductoListo && (
                                  <View style={styles.productoStatus}>
                                    <ThemedText style={[styles.productoStatusText, styles.entregadoTexto]}>
                                      Entregado
                                    </ThemedText>
                                  </View>
                                )}
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

                    <View style={styles.detallesContainer}>
                      {detalles.map((paso, i) => (
                        <ThemedText key={i} style={styles.detalleItem}>• {paso}</ThemedText>
                      ))}
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
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFF8E1', // Un tono crema más suave
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#E65100',
    letterSpacing: 0.5,
  },
  subtitulo: {
    fontSize: 14,
    color: '#F57C00',
    fontWeight: '500',
    marginTop: 2,
  },
  lista: { paddingHorizontal: 20, marginTop: 15 },
  ordenCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
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
  mesaInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mesaTexto: { fontSize: 18, fontWeight: 'bold', color: '#5D4037' },
  estadoBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  estadoTexto: { color: '#fff', fontSize: 12, fontWeight: '600' },
  productosContainer: { marginTop: 15, marginBottom: 8, paddingLeft: 4 },
  productoItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  productoItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  productoItem: {
    fontSize: 15,
    color: '#3E2723',
    fontWeight: '600',
  },
  productoStatus: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 8,
  },
  productoStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  nuevoTexto: {
    color: '#D84315',
  },
  entregadoTexto: { color: '#4CAF50' },
  listoTexto: { color: '#4CAF50' },
  cantidadBadge: {
    backgroundColor: '#FF7043',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cantidadBadgeTexto: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  detallesContainer: { marginTop: 10 },
  detalleItem: { fontSize: 14, color: '#666', marginBottom: 5, fontStyle: 'italic' },
  botonListo: {
    marginTop: 15,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  textoListo: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTexto: { color: '#888', marginTop: 10, fontSize: 16 },
});