import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { PieChart } from '@/componentes/ui/PieChart';
import { Layout } from '@/configuracion/constants/Layout';
import { obtenerVentasPorMetodoPago, VentasPorMetodoPago } from '@/servicios-api/ventas';
import { router, useLocalSearchParams } from 'expo-router';
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
  const { fechaInicio, fechaFin } = useLocalSearchParams<{ fechaInicio: string; fechaFin: string }>();
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

      // Obtener ventas del rango seleccionado o del día actual por defecto
      let inicioDia: Date;
      let finDia: Date;

      if (fechaInicio && fechaFin) {
        inicioDia = new Date(fechaInicio);
        finDia = new Date(fechaFin);
      } else {
        const hoy = new Date();
        inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
      }

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
            <ThemedView style={styles.totalBadge}>
              <ThemedText style={styles.totalLabel}>Total de Ventas</ThemedText>
              <ThemedText style={styles.totalValue}>
                ${totalGeneral.toLocaleString('es-CO')}
              </ThemedText>
              <ThemedText style={styles.chartSubtitle}>
                {ventas.reduce((sum, v) => sum + v.cantidad, 0)} {ventas.reduce((sum, v) => sum + v.cantidad, 0) === 1 ? 'venta' : 'ventas'} totales
              </ThemedText>
            </ThemedView>
            <ThemedText style={styles.chartTitle}>Distribución por Método de Pago</ThemedText>
            <View style={styles.chartWrapper}>
              <PieChart
                data={datosGrafico}
                size={Layout.moderateScale(310)}
                strokeWidth={25}
              />
            </View>
            <View style={styles.chartLegend}>
              {ventas.map(venta => {
                const color = METODOS_PAGO_COLORS[venta.metodoPago] || METODOS_PAGO_COLORS.desconocido;
                const info = METODOS_PAGO_INFO[venta.metodoPago] || METODOS_PAGO_INFO.desconocido;
                return (
                  <View key={`${venta.metodoPago}-legend`} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <ThemedText style={styles.legendText}>
                      {info.nombre} · {venta.porcentaje.toFixed(1)}%
                    </ThemedText>
                  </View>
                );
              })}
            </View>
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
    paddingHorizontal: Layout.spacing.l,
    paddingBottom: Layout.spacing.l,
  },
  backButton: {
    padding: Layout.spacing.s,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
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
    gap: Layout.spacing.m,
  },
  loadingText: {
    fontSize: Layout.fontSize.m,
    color: '#8B4513',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xxxl,
    gap: Layout.spacing.m,
  },
  errorText: {
    fontSize: Layout.fontSize.m,
    color: '#DC3545',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.l,
    marginTop: Layout.spacing.s,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: Layout.fontSize.m,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xxxl,
  },
  emptyText: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: Layout.spacing.m,
  },
  emptySubtext: {
    fontSize: Layout.fontSize.m,
    color: '#666',
    marginTop: Layout.spacing.s,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.l,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
    marginBottom: Layout.spacing.xl,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: Layout.spacing.xl,
    textAlign: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.l,
  },
  totalBadge: {
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
    paddingVertical: Layout.spacing.m,
    width: '100%',
    backgroundColor: '#FFF8F0',
    borderRadius: Layout.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#FFE2C6',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 6,
  },
  totalLabel: {
    fontSize: Layout.fontSize.m,
    color: '#8B4513',
    fontWeight: '600',
    marginBottom: Layout.spacing.s,
    textAlign: 'center',
  },
  totalValue: {
    fontSize: Layout.fontSize.xxxl,
    color: '#8B4513',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  chartSubtitle: {
    fontSize: Layout.fontSize.m,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Layout.spacing.xs,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Layout.spacing.m,
    marginTop: Layout.spacing.m,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 999,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.xs,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  legendDot: {
    width: Layout.icon.xs,
    height: Layout.icon.xs,
    borderRadius: 6,
    marginRight: Layout.spacing.s,
  },
  legendText: {
    fontSize: Layout.fontSize.m,
    color: '#333',
    fontWeight: '600',
  },
  metodosContainer: {
    marginBottom: Layout.spacing.l,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: Layout.spacing.m,
  },
  metodoPagoCard: {
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.m,
    marginBottom: Layout.spacing.m,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metodoPagoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  metodoPagoIconContainer: {
    width: Layout.icon.xxl,
    height: Layout.icon.xxl,
    borderRadius: Layout.borderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Layout.spacing.m,
    borderWidth: 2,
  },
  metodoPagoImagen: {
    width: Layout.icon.l,
    height: Layout.icon.l,
    resizeMode: 'contain',
  },
  metodoPagoInfo: {
    flex: 1,
  },
  metodoPagoNombre: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: Layout.spacing.xs,
  },
  metodoPagoCantidad: {
    fontSize: Layout.fontSize.m,
    color: '#666',
  },
  metodoPagoPorcentajeContainer: {
    alignItems: 'flex-end',
  },
  metodoPagoPorcentajeGrande: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
  },
  metodoPagoStats: {
    marginTop: Layout.spacing.s,
  },
  metodoPagoBarContainer: {
    height: Layout.spacing.s,
    backgroundColor: '#f0f0f0',
    borderRadius: Layout.borderRadius.s,
    marginBottom: Layout.spacing.s,
    overflow: 'hidden',
  },
  metodoPagoBar: {
    height: '100%',
    borderRadius: Layout.borderRadius.s,
  },
  metodoPagoValores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metodoPagoTotalLabel: {
    fontSize: Layout.fontSize.m,
    color: '#666',
    fontWeight: '600',
  },
  metodoPagoTotal: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
  },
});
