import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Orden, useOrdenes } from '@/utilidades/context/OrdenesContext';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function PedidosScreen() {
  const { ordenes, actualizarEstadoOrden, eliminarOrden } = useOrdenes();

  const getEstadoColor = (estado: Orden['estado']) => {
    switch (estado) {
      case 'pendiente':
        return '#FF8C00';
      case 'en_preparacion':
        return '#2196F3';
      case 'listo':
        return '#4CAF50';
      case 'entregado':
        return '#9E9E9E';
      default:
        return '#FF8C00';
    }
  };

  const getEstadoTexto = (estado: Orden['estado']) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_preparacion':
        return 'En Preparación';
      case 'listo':
        return 'Listo';
      case 'entregado':
        return 'Entregado';
      default:
        return 'Pendiente';
    }
  };

  const handleCambiarEstado = (orden: Orden) => {
    let nuevoEstado: Orden['estado'];
    let tituloBoton: string;

    switch (orden.estado) {
      case 'pendiente':
        nuevoEstado = 'en_preparacion';
        tituloBoton = 'Comenzar Preparación';
        break;
      case 'en_preparacion':
        nuevoEstado = 'listo';
        tituloBoton = 'Marcar como Listo';
        break;
      case 'listo':
        nuevoEstado = 'entregado';
        tituloBoton = 'Marcar como Entregado';
        break;
      default:
        return;
    }

    Alert.alert(
      'Cambiar Estado',
      `¿${tituloBoton} para Mesa ${orden.mesa}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: () => actualizarEstadoOrden(orden.id, nuevoEstado)
        }
      ]
    );
  };

  const handleEliminarOrden = (orden: Orden) => {
    Alert.alert(
      'Eliminar Orden',
      `¿Estás seguro de eliminar la orden de Mesa ${orden.mesa}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => eliminarOrden(orden.id)
        }
      ]
    );
  };

  const renderOrden = (orden: Orden) => (
    <ThemedView key={orden.id} style={styles.ordenCard}>
      <ThemedView style={styles.ordenHeader}>
        <ThemedView style={styles.mesaInfo}>
          <IconSymbol name="table.furniture" size={20} color="#FF8C00" />
          <ThemedText style={styles.mesaTexto}>Mesa {orden.mesa}</ThemedText>
        </ThemedView>
        
        <ThemedView style={[
          styles.estadoBadge,
          { backgroundColor: getEstadoColor(orden.estado) }
        ]}>
          <ThemedText style={styles.estadoTexto}>
            {getEstadoTexto(orden.estado)}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.productosContainer}>
        <ThemedText style={styles.productosTitulo}>Productos:</ThemedText>
        {orden.productos.map((producto, index) => (
          <ThemedText key={index} style={styles.productoItem}>
            • {producto}
          </ThemedText>
        ))}
      </ThemedView>

      <ThemedView style={styles.ordenFooter}>
        <ThemedText style={styles.fechaTexto}>
          {orden.fechaCreacion.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </ThemedText>
        
        <ThemedView style={styles.botonesContainer}>
          {orden.estado !== 'entregado' && (
            <TouchableOpacity 
              style={[
                styles.accionButton,
                { backgroundColor: getEstadoColor(orden.estado) }
              ]}
              onPress={() => handleCambiarEstado(orden)}
            >
              <IconSymbol name="checkmark.circle.fill" size={16} color="#fff" />
              <ThemedText style={styles.accionButtonTexto}>
                {orden.estado === 'pendiente' ? 'Comenzar' : 
                 orden.estado === 'en_preparacion' ? 'Listo' : 'Entregar'}
              </ThemedText>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.eliminarButton}
            onPress={() => handleEliminarOrden(orden)}
          >
            <IconSymbol name="trash" size={16} color="#fff" />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Pedidos
        </ThemedText>
        <ThemedView style={styles.contadorContainer}>
          <ThemedText style={styles.contadorTexto}>
            {ordenes.length} órdenes
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Lista de órdenes */}
      <ScrollView style={styles.listaOrdenes} showsVerticalScrollIndicator={false}>
        {ordenes.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <IconSymbol name="list.clipboard" size={64} color="#ccc" />
            <ThemedText style={styles.emptyStateTexto}>
              No hay órdenes pendientes
            </ThemedText>
            <ThemedText style={styles.emptyStateSubtexto}>
              Las órdenes aparecerán aquí cuando se creen
            </ThemedText>
          </ThemedView>
        ) : (
          ordenes.map(renderOrden)
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Blanco
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  contadorContainer: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  contadorTexto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listaOrdenes: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20, // Espacio adicional para el primer recuadro
  },
  ordenCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ordenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mesaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mesaTexto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  estadoTexto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  productosContainer: {
    marginBottom: 12,
  },
  productosTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 6,
  },
  productoItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  ordenFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fechaTexto: {
    fontSize: 12,
    color: '#999',
  },
  botonesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  accionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  accionButtonTexto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  eliminarButton: {
    backgroundColor: '#F44336',
    padding: 8,
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyStateTexto: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B4513',
    marginTop: 16,
  },
  emptyStateSubtexto: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});