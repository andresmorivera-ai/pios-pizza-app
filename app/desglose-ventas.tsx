import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { PieChart } from '@/componentes/ui/PieChart';
import { obtenerVentasPorMetodoPago, VentasPorMetodoPago } from '@/servicios-api/ventas';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Colores para cada método de pago
const METODOS_PAGO_COLORS: Record<string, string> = {
  daviplata: '#FF6B35',
  nequi: '#00BFA5',
  efectivo: '#4CAF50',
  tarjeta: '#2196F3',
  desconocido: '#999',
};

// Información de cada método de pago
const METODOS_PAGO_INFO: Record<string, { nombre: string; icono: string; imagen?: any }> = {
  daviplata: {
    nombre: 'Daviplata',
    icono: 'phone.fill',
    imagen: require('../assets/iconodaviplata.png'),
  },
  nequi: {
    nombre: 'Nequi',
    icono: 'phone.fill',
    imagen: require('../assets/icononequi.png'),
  },
  efectivo: {
    nombre: 'Efectivo',
    icono: 'banknote.fill',
    imagen: require('../assets/iconoefectivo.png'),
  },
  tarjeta: {
    nombre: 'Tarjeta',
    icono: 'creditcard.fill',
    imagen: require('../assets/iconotarjeta.png'),
  },
  desconocido: {
    nombre: 'Desconocido',
    icono: 'questionmark.circle',
  },
};

export default function DesgloseVentasScreen() {
  const insets = useSafeAreaInsets();
  const [ventas, setVentas] = useState<VentasPorMetodoPago[]>([]);
  const [totalGeneral, setTotalGeneral] = useState<number>(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarVentas();
  }, []);

  const cargarVentas = async () => {
    try {
      setCargando(true);
      setError(null);

      // Obtener ventas del día actual
      const hoy = new Date();
      const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

      const resultado = await obtenerVentasPorMetodoPago(
        inicioDia.toISOString(),
        finDia.toISOString()
      );

      setVentas(resultado.ventas);
      setTotalGeneral(resultado.totalGeneral);
    } catch (err) {
      console.error('Error cargando ventas:', err);
      setError('Error al cargar las ventas. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  // Preparar datos para el gráfico
  const datosGrafico = ventas.map(venta => ({
    metodoPago: venta.metodoPago,
    total: venta.total,
    porcentaje: venta.porcentaje,
    color: METODOS_PAGO_COLORS[venta.metodoPago] || METODOS_PAGO_COLORS.desconocido,
  }));

  const renderMetodoPago = (venta: VentasPorMetodoPago) => {
    const info = METODOS_PAGO_INFO[venta.metodoPago] || METODOS_PAGO_INFO.desconocido;
    const color = METODOS_PAGO_COLORS[venta.metodoPago] || METODOS_PAGO_COLORS.desconocido;

    return (
      <View key={venta.metodoPago} style={[styles.metodoPagoCard, { borderLeftColor: color, borderLeftWidth: 5 }]}>
        <View style={styles.metodoPagoHeader}>
          <View style={[styles.metodoPagoIconContainer, { backgroundColor: color + '20', borderColor: color }]}>
            {info.imagen ? (
              <Image source={info.imagen} style={styles.metodoPagoImagen} />
            ) : (
              <IconSymbol name={info.icono as any} size={28} color={color} />
            )}
          </View>
          <View style={styles.metodoPagoInfo}>
            <ThemedText style={styles.metodoPagoNombre}>{info.nombre}</ThemedText>
            <ThemedText style={styles.metodoPagoCantidad}>
              {venta.cantidad} {venta.cantidad === 1 ? 'venta' : 'ventas'}
            </ThemedText>
          </View>
          <View style={styles.metodoPagoPorcentajeContainer}>
            <ThemedText style={[styles.metodoPagoPorcentajeGrande, { color }]}>
              {venta.porcentaje.toFixed(1)}%
            </ThemedText>
          </View>
        </View>

        <View style={styles.metodoPagoStats}>
          <View style={styles.metodoPagoBarContainer}>
            <View
              style={[
                styles.metodoPagoBar,
                {
                  width: `${Math.min(venta.porcentaje, 100)}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
          <View style={styles.metodoPagoValores}>
            <ThemedText style={styles.metodoPagoTotalLabel}>Total:</ThemedText>
            <ThemedText style={[styles.metodoPagoTotal, { color }]}>
              ${venta.total.toLocaleString('es-CO')}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={[styles.header, { paddingTop: Math.max(insets.top + 25, 25) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#8B4513" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          Desglose de Ventas
        </ThemedText>
        <View style={styles.placeholder} />
      </ThemedView>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C00" />
          <ThemedText style={styles.loadingText}>Cargando ventas...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <IconSymbol name="info.circle" size={48} color="#DC3545" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={cargarVentas}>
            <ThemedText style={styles.retryButtonText}>Reintentar</ThemedText>
          </TouchableOpacity>
        </View>
      ) : ventas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="chart.bar.fill" size={64} color="#ccc" />
          <ThemedText style={styles.emptyText}>No hay ventas registradas</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Las ventas aparecerán aquí cuando se procesen pagos
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
          showsVerticalScrollIndicator={false}
        >
          {/* Gráfico Circular */}
          <ThemedView style={styles.chartContainer}>
            <ThemedText style={styles.chartTitle}>Distribución por Método de Pago</ThemedText>
            <View style={styles.chartWrapper}>
              <PieChart 
                data={datosGrafico} 
                size={300} 
                strokeWidth={25} 
              />
            </View>
            {/* Total debajo del gráfico */}
            <ThemedView style={styles.totalContainer}>
              <ThemedText style={styles.totalLabel}>Total de Ventas</ThemedText>
              <ThemedText style={styles.totalValue}>
                ${totalGeneral.toLocaleString('es-CO')}
              </ThemedText>
            </ThemedView>
            <ThemedText style={styles.chartSubtitle}>
              {ventas.reduce((sum, v) => sum + v.cantidad, 0)} {ventas.reduce((sum, v) => sum + v.cantidad, 0) === 1 ? 'venta' : 'ventas'} totales
            </ThemedText>
          </ThemedView>

          {/* Lista de Métodos de Pago */}
          <ThemedView style={styles.metodosContainer}>
            <ThemedText style={styles.sectionTitle}>Detalle por Método</ThemedText>
            {ventas.map((venta) => renderMetodoPago(venta))}
          </ThemedView>
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8B4513',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 24,
    textAlign: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  totalContainer: {
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
    width: '100%',
  },
  totalLabel: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  totalValue: {
    fontSize: 36,
    color: '#28A745',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  metodosContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 16,
  },
  metodoPagoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metodoPagoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metodoPagoIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
  },
  metodoPagoImagen: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  metodoPagoInfo: {
    flex: 1,
  },
  metodoPagoNombre: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 4,
  },
  metodoPagoCantidad: {
    fontSize: 14,
    color: '#666',
  },
  metodoPagoPorcentajeContainer: {
    alignItems: 'flex-end',
  },
  metodoPagoPorcentajeGrande: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  metodoPagoStats: {
    marginTop: 8,
  },
  metodoPagoBarContainer: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  metodoPagoBar: {
    height: '100%',
    borderRadius: 5,
  },
  metodoPagoValores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metodoPagoTotalLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  metodoPagoTotal: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});

