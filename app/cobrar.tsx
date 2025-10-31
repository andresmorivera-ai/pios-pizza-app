import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Orden, useOrdenes } from '@/utilidades/context/OrdenesContext';
import { useColorScheme } from '@/utilidades/hooks/use-color-scheme';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function CobrarScreen() {
  const colorScheme = useColorScheme();
  const { ordenes } = useOrdenes();

  // Filtrar órdenes con estado "listo" (pendientes de pago)
  const ordenesPendientes = ordenes.filter(orden => orden.estado === 'listo');

  // Navegar a detalles de cobro
  const handleCobrarOrden = (orden: Orden) => {
    router.push({
      pathname: '/detalles-cobro',
      params: {
        ordenId: orden.id,
        mesa: orden.mesa,
        total: orden.total.toString(),
        productos: JSON.stringify(orden.productos)
      }
    });
  };

  // Renderizar cada orden pendiente
  const renderOrden = ({ item }: { item: Orden }) => (
    <View style={styles.ordenCard}>
      <View style={styles.ordenHeader}>
        <View style={styles.mesaContainer}>
          <IconSymbol name="table.furniture.fill" size={20} color="#8B4513" />
          <ThemedText style={styles.mesaText}>Mesa {item.mesa}</ThemedText>
        </View>
        <ThemedText style={styles.totalText}>${item.total.toLocaleString()}</ThemedText>
      </View>
      
      <View style={styles.ordenInfo}>
        <ThemedText style={styles.itemsText}>
          {item.productos.length} {item.productos.length === 1 ? 'item' : 'items'}
        </ThemedText>
        <ThemedText style={styles.fechaText}>
          {item.fechaCreacion.toLocaleString()}
        </ThemedText>
      </View>

      <TouchableOpacity 
        style={styles.cobrarButton} 
        onPress={() => handleCobrarOrden(item)}
      >
        <IconSymbol name="creditcard.fill" size={20} color="#fff" />
        <ThemedText style={styles.cobrarButtonText}>Cobrar $</ThemedText>
      </TouchableOpacity>
    </View>
  );


  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Mesas por pagar
        </ThemedText>
      </ThemedView>

      {/* Lista de órdenes pendientes */}
      {ordenesPendientes.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <IconSymbol name="checkmark.circle.fill" size={64} color="#32CD32" />
          <ThemedText style={styles.emptyTitle}>No hay órdenes pendientes</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Todas las órdenes han sido cobradas
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.listContainer}>
          {ordenesPendientes.map((orden) => (
            <View key={orden.id}>
              {renderOrden({ item: orden })}
            </View>
          ))}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -100, // Mueve el contenido hacia arriba para centrarlo mejor
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8B4513',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 20,
  },
  ordenCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
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
  mesaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mesaText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#32CD32',
  },
  ordenInfo: {
    marginBottom: 16,
  },
  itemsText: {
    fontSize: 14,
    color: '#8B4513',
    marginBottom: 4,
  },
  fechaText: {
    fontSize: 12,
    color: '#8B4513',
    opacity: 0.7,
  },
  cobrarButton: {
    backgroundColor: '#32CD32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  cobrarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
