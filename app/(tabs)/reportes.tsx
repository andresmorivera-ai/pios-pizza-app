import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { useOrdenes } from '@/utilidades/context/OrdenesContext';
import { ScrollView, StyleSheet } from 'react-native';

export default function ReportesScreen() {
  const { ordenes } = useOrdenes();

  // Calcular estadísticas básicas
  const totalOrdenes = ordenes.length;
  const ordenesCanceladas = ordenes.filter(o => o.estado === 'cancelado').length;
  const ordenesEntregadas = ordenes.filter(o => o.estado === 'entregado').length;

  // Productos más pedidos
  const productosCount: Record<string, number> = {};
  ordenes.forEach(orden => {
    orden.productos.forEach(producto => {
      productosCount[producto] = (productosCount[producto] || 0) + 1;
    });
  });

  const productosMasPedidos = Object.entries(productosCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const renderEstadistica = (titulo: string, valor: number, icono: string, color: string) => (
    <ThemedView key={titulo} style={[styles.estadisticaCard, { borderLeftColor: color }]}>
      <ThemedView style={styles.estadisticaHeader}>
        <IconSymbol name={icono as any} size={24} color={color} />
        <ThemedText style={styles.estadisticaTitulo}>{titulo}</ThemedText>
      </ThemedView>
      <ThemedText style={[styles.estadisticaValor, { color }]}>{valor}</ThemedText>
    </ThemedView>
  );

  const renderProductoMasPedido = (producto: string, cantidad: number, index: number) => (
    <ThemedView key={producto} style={styles.productoItem}>
      <ThemedView style={styles.productoRanking}>
        <ThemedText style={styles.productoNumero}>#{index + 1}</ThemedText>
      </ThemedView>
      <ThemedView style={styles.productoInfo}>
        <ThemedText style={styles.productoNombre}>{producto}</ThemedText>
        <ThemedText style={styles.productoCantidad}>{cantidad} pedidos</ThemedText>
      </ThemedView>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Reportes
        </ThemedText>
        <ThemedView style={styles.fechaContainer}>
          <IconSymbol name="calendar" size={20} color="#8B4513" />
          <ThemedText style={styles.fechaTexto}>
            {new Date().toLocaleDateString('es-ES')}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Estadísticas de Órdenes */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Estado de Órdenes</ThemedText>
          <ThemedView style={styles.estadisticasGrid}>
            {renderEstadistica('Total', totalOrdenes, 'list.clipboard.fill', '#FF8C00')}
            {renderEstadistica('Canceladas', ordenesCanceladas, 'xmark.circle.fill', '#DC3545')}
            {renderEstadistica('Entregadas', ordenesEntregadas, 'hand.raised.fill', '#28A745')}
          </ThemedView>
        </ThemedView>

        {/* Productos Más Pedidos */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Productos Más Pedidos</ThemedText>
          {productosMasPedidos.length > 0 ? (
            <ThemedView style={styles.productosLista}>
              {productosMasPedidos.map(([producto, cantidad], index) => 
                renderProductoMasPedido(producto, cantidad, index)
              )}
            </ThemedView>
          ) : (
            <ThemedView style={styles.emptyState}>
              <IconSymbol name="chart.bar" size={48} color="#ccc" />
              <ThemedText style={styles.emptyStateTexto}>
                No hay datos de productos
              </ThemedText>
              <ThemedText style={styles.emptyStateSubtexto}>
                Los reportes aparecerán cuando se creen órdenes
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

      </ScrollView>
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
  fechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  fechaTexto: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 16,
  },
  estadisticasGrid: {
    gap: 12,
  },
  estadisticaCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  estadisticaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  estadisticaTitulo: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '600',
  },
  estadisticaValor: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  productosLista: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productoRanking: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  productoNumero: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productoInfo: {
    flex: 1,
  },
  productoNombre: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '600',
  },
  productoCantidad: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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