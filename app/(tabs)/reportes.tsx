import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { obtenerHistorialVentas, VentaCompleta } from '@/servicios-api/ventas';
import { Orden, useOrdenes } from '@/utilidades/context/OrdenesContext';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReportesScreen() {
  const { ordenes, ordenesEntregadas } = useOrdenes();
  const [ordenesExpandidas, setOrdenesExpandidas] = useState<Set<string>>(new Set());
  const [ventas, setVentas] = useState<VentaCompleta[]>([]);
  const [cargandoVentas, setCargandoVentas] = useState(true);
  const insets = useSafeAreaInsets();

  // Cargar ventas desde Supabase
  useEffect(() => {
    const cargarVentas = async () => {
      try {
        setCargandoVentas(true);
        // Obtener ventas del día actual
        const hoy = new Date();
        const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
        
        const ventasCargadas = await obtenerHistorialVentas(
          inicioDia.toISOString(),
          finDia.toISOString()
        );
        
        setVentas(ventasCargadas);
        console.log('📦 Ventas cargadas desde Supabase:', ventasCargadas.length);
        if (ventasCargadas.length > 0) {
          console.log('📦 Primera venta cargada:', ventasCargadas[0]);
        }
      } catch (error) {
        console.error('Error cargando ventas:', error);
      } finally {
        setCargandoVentas(false);
      }
    };

    cargarVentas();
    
    // Recargar cada 5 segundos para mantener actualizado
    const interval = setInterval(cargarVentas, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filtrar solo órdenes que fueron pagadas (tienen método de pago) - fallback local
  const ordenesPagadas = ordenesEntregadas.filter(orden => orden.metodoPago);

  // Convertir ventas de Supabase al formato de Orden para mostrar
  const ventasComoOrdenes: Orden[] = ventas.map(venta => {
    // Convertir productos de VentaCompleta (ProductoVenta[]) al formato de string de Orden
    const productosFormateados = venta.productos.map(p => {
      // Formato: "Producto (tamaño) $precio Xcantidad"
      return `${p.nombre} $${p.precioUnitario} X${p.cantidad}`;
    });
    
    return {
      id: venta.id,
      mesa: venta.mesa,
      productos: productosFormateados,
      total: venta.total,
      estado: 'pago' as const,
      fechaCreacion: new Date(venta.fecha_hora),
      fechaEntrega: new Date(venta.fecha_hora),
      metodoPago: venta.metodo_pago as 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta',
      idVenta: venta.id_venta,
    };
  });

  // Usar ventas de Supabase si hay, sino usar órdenes locales como fallback
  const ordenesParaMostrar = ventasComoOrdenes.length > 0 ? ventasComoOrdenes : ordenesPagadas;

  // Calcular ganancias totales (suma de todas las ventas de Supabase o órdenes locales)
  const totalGanancias = ventas.reduce((total, venta) => total + (venta.total || 0), 0) || 
    ordenesPagadas.reduce((total, orden) => total + (orden.total || 0), 0);

  // Placeholder para gastos (por implementar después)
  const totalGastos = 0;

  // Calcular balance/utilidad
  const balance = totalGanancias - totalGastos;

  // Calcular estadísticas básicas
  const totalOrdenes = ordenes.length + ordenesEntregadas.length;
  const ordenesCanceladas = ordenes.filter(o => o.estado === 'cancelado').length;
  const totalOrdenesPagadas = ventas.length || ordenesPagadas.length;

  // Productos más pedidos (incluye órdenes actuales y entregadas)
  const productosCount: Record<string, number> = {};
  [...ordenes, ...ordenesEntregadas].forEach(orden => {
    orden.productos.forEach(producto => {
      productosCount[producto] = (productosCount[producto] || 0) + 1;
    });
  });

  const productosMasPedidos = Object.entries(productosCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Función para obtener información del método de pago
  const getMetodoPagoInfo = (metodoPago?: string) => {
    switch (metodoPago) {
      case 'daviplata':
        return { nombre: 'Daviplata', color: '#FF6B35', icono: 'phone.fill' };
      case 'nequi':
        return { nombre: 'Nequi', color: '#00BFA5', icono: 'phone.fill' };
      case 'efectivo':
        return { nombre: 'Efectivo', color: '#4CAF50', icono: 'banknote.fill' };
      case 'tarjeta':
        return { nombre: 'Tarjeta', color: '#2196F3', icono: 'creditcard.fill' };
      default:
        return { nombre: 'No especificado', color: '#999', icono: 'questionmark.circle' };
    }
  };

  const renderEstadistica = (titulo: string, valor: number, icono: string, color: string) => (
    <ThemedView key={titulo} style={[styles.estadisticaCard, { borderLeftColor: color }]}>
      <ThemedView style={styles.estadisticaHeader}>
        <IconSymbol name={icono as any} size={24} color={color} />
        <ThemedText style={styles.estadisticaTitulo}>{titulo}</ThemedText>
      </ThemedView>
      <ThemedText style={[styles.estadisticaValor, { color }]}>{valor}</ThemedText>
    </ThemedView>
  );

  const renderProductoMasPedido = (producto: string, cantidad: number, index: number) => {
    // Limpiar el nombre del producto (quitar precio y cantidad)
    // Formato: "Pollo Asado (1/2) $20000 X4" → "Pollo Asado (1/2)"
    const nombreLimpio = producto.split(' $')[0].trim();
    
    return (
      <ThemedView key={producto} style={styles.productoItem}>
        <ThemedView style={styles.productoRanking}>
          <ThemedText style={styles.productoNumero}>#{index + 1}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.productoInfo}>
          <ThemedText style={styles.productoNombre}>{nombreLimpio}</ThemedText>
          <ThemedText style={styles.productoCantidad}>{cantidad} pedidos</ThemedText>
        </ThemedView>
        {index === 0 && (
          <ThemedText style={styles.coronaIcono}>👑</ThemedText>
        )}
      </ThemedView>
    );
  };

  // Toggle expandir/colapsar orden
  const toggleOrdenExpandida = (ordenId: string) => {
    setOrdenesExpandidas(prev => {
      const nuevaSet = new Set(prev);
      if (nuevaSet.has(ordenId)) {
        nuevaSet.delete(ordenId);
      } else {
        nuevaSet.add(ordenId);
      }
      return nuevaSet;
    });
  };

  // Calcular total de una orden (fallback para órdenes antiguas)
  const calcularTotalOrden = (productos: string[]): number => {
    return productos.reduce((total, producto) => {
      // Formato nuevo: "Producto (tamaño) $20000 X2"
      const precioMatch = producto.match(/\$(\d+)/);
      const cantidadMatch = producto.match(/X(\d+)/);
      
      if (precioMatch) {
        const precioUnitario = parseInt(precioMatch[1]);
        const cantidad = cantidadMatch ? parseInt(cantidadMatch[1]) : 1;
        return total + (precioUnitario * cantidad);
      }
      
      return total;
    }, 0);
  };

  const renderOrdenEntregada = (orden: Orden) => {
    const isExpandida = ordenesExpandidas.has(orden.id);
    // Usar total guardado o calcular si no existe (órdenes antiguas)
    const totalVenta = orden.total || calcularTotalOrden(orden.productos);
    const metodoPagoInfo = getMetodoPagoInfo(orden.metodoPago);
    
    return (
      <ThemedView key={orden.id} style={styles.ordenEntregadaCard}>
        {/* Vista Compacta - Siempre visible */}
        <ThemedView style={styles.ordenCompacta}>
          <ThemedView style={styles.ordenCompactaRow}>
            <ThemedView style={styles.mesaBadge}>
              <IconSymbol name="table.furniture" size={16} color="#fff" />
              <ThemedText style={styles.mesaBadgeTexto}>Mesa {orden.mesa}</ThemedText>
            </ThemedView>
            
            {/* ID de Venta */}
            {orden.idVenta && (
              <ThemedText style={styles.idVentaTexto}>ID: {orden.idVenta}</ThemedText>
            )}
            
            <ThemedText style={styles.ordenTotalVenta}>
              ${totalVenta.toLocaleString('es-CO')}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.ordenInfoRow}>
            <ThemedText style={styles.ordenHora}>
              {orden.fechaEntrega?.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              })} - {orden.fechaEntrega?.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit'
              })}
            </ThemedText>
            
            <ThemedView style={[styles.metodoPagoBadge, { backgroundColor: metodoPagoInfo.color }]}>
              <IconSymbol name={metodoPagoInfo.icono as any} size={14} color="#fff" />
              <ThemedText style={styles.metodoPagoTexto}>{metodoPagoInfo.nombre}</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* Botón Detalles */}
        <TouchableOpacity
          style={styles.detallesButton}
          onPress={() => toggleOrdenExpandida(orden.id)}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.detallesTexto}>Detalles</ThemedText>
          <IconSymbol 
            name={isExpandida ? "chevron.up" : "chevron.down"} 
            size={18} 
            color="#8B4513" 
          />
        </TouchableOpacity>

        {/* Vista Expandida - Solo cuando está expandida */}
        {isExpandida && (
          <ThemedView style={styles.ordenExpandida}>
            <ThemedView style={styles.divider} />
            
            <ThemedView style={styles.ordenProductos}>
              <ThemedText style={styles.ordenProductosTitulo}>Productos:</ThemedText>
              {orden.productos.map((producto, index) => {
                // Separar cantidad si existe
                const partes = producto.split(' X');
                const productoConPrecio = partes[0]; // "Producto (tamaño) $20000"
                const cantidad = partes[1];
                
                // Limpiar el nombre del producto (quitar precio)
                const productoLimpio = productoConPrecio.split(' $')[0].trim(); // "Producto (tamaño)"
                
                return (
                  <ThemedView key={index} style={styles.productoDetalleContainer}>
                    <ThemedText style={styles.ordenProductoItem}>
                      • {productoLimpio}
                    </ThemedText>
                    {cantidad && (
                      <ThemedView style={styles.cantidadBadgeReporte}>
                        <ThemedText style={styles.cantidadBadgeTexto}>
                          X{cantidad}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                );
              })}
            </ThemedView>

            <ThemedView style={styles.ordenFooter}>
              <IconSymbol name="checkmark.circle.fill" size={16} color="#28A745" />
              <ThemedText style={styles.ordenEstadoTexto}>Entregada</ThemedText>
            </ThemedView>
          </ThemedView>
        )}
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={[styles.header, { paddingTop: Math.max(insets.top + 60, 60) }]}>
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

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
      >
        {/* Dashboard Financiero */}
        <ThemedView style={styles.dashboardFinanciero}>
          {/* Tarjeta de Ventas - Clickeable */}
          <TouchableOpacity 
            style={styles.tarjetaGanancias}
            onPress={() => router.push('/desglose-ventas')}
            activeOpacity={0.7}
          >
            <ThemedView style={styles.tarjetaHeader}>
              <IconSymbol name="arrow.up.circle.fill" size={32} color="#28A745" />
              <ThemedText style={styles.tarjetaTitulo}>Ventas</ThemedText>
            </ThemedView>
            <ThemedText style={styles.tarjetaValor}>
              ${totalGanancias.toLocaleString('es-CO')}
            </ThemedText>
            <ThemedView style={styles.tarjetaFooter}>
              <IconSymbol name="checkmark.circle" size={14} color="#28A745" />
              <ThemedText style={styles.tarjetaSubtexto}>
                {totalOrdenesPagadas} órdenes pagadas
              </ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#28A745" style={{ marginLeft: 'auto' }} />
            </ThemedView>
          </TouchableOpacity>

          {/* Tarjeta de Gastos */}
          <ThemedView style={styles.tarjetaGastos}>
            <ThemedView style={styles.tarjetaHeader}>
              <IconSymbol name="arrow.down.circle.fill" size={32} color="#DC3545" />
              <ThemedText style={styles.tarjetaTituloGastos}>Gastos</ThemedText>
            </ThemedView>
            <ThemedText style={styles.tarjetaValorGastos}>
              ${totalGastos.toLocaleString('es-CO')}
            </ThemedText>
            <ThemedView style={styles.tarjetaFooter}>
              <IconSymbol name="info.circle" size={14} color="#999" />
              <ThemedText style={styles.tarjetaSubtextoGastos}>
                Próximamente disponible
              </ThemedText>
            </ThemedView>
          </ThemedView>

          {/* Tarjeta de Balance/Utilidad */}
          <ThemedView style={styles.tarjetaBalance}>
            <ThemedView style={styles.tarjetaHeader}>
              <IconSymbol name="chart.line.uptrend.xyaxis" size={30} color="#FF8C00" />
              <ThemedText style={styles.tarjetaTituloBalance}>Balance</ThemedText>
            </ThemedView>
            <ThemedText style={styles.tarjetaValorBalance}>
              ${balance.toLocaleString('es-CO')}
            </ThemedText>
            <ThemedView style={styles.balanceBarra}>
              <ThemedView style={[styles.barraGanancias, { width: totalGastos === 0 ? '100%' : `${(totalGanancias / (totalGanancias + totalGastos)) * 100}%` }]} />
            </ThemedView>
            <ThemedView style={styles.balanceInfo}>
              <ThemedText style={styles.balanceInfoTexto}>
                <ThemedText style={styles.balanceGanancia}>▲ Ganancias Netas </ThemedText>
                {totalGastos > 0 && <ThemedText style={styles.balanceGasto}>▼ Gastos</ThemedText>}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* Estadísticas de Órdenes */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Estado de Órdenes</ThemedText>
          <ThemedView style={styles.estadisticasGrid}>
            {renderEstadistica('Total', totalOrdenes, 'list.clipboard.fill', '#FF8C00')}
            {renderEstadistica('Canceladas', ordenesCanceladas, 'xmark.circle.fill', '#DC3545')}
            {renderEstadistica('Pagadas', totalOrdenesPagadas, 'checkmark.circle.fill', '#28A745')}
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

        {/* Historial de Ventas */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Historial de Ventas</ThemedText>
          {cargandoVentas ? (
            <ThemedView style={styles.emptyState}>
              <ActivityIndicator size="large" color="#FF8C00" />
              <ThemedText style={styles.emptyStateTexto}>
                Cargando ventas...
              </ThemedText>
            </ThemedView>
          ) : ordenesParaMostrar.length > 0 ? (
            <ThemedView style={styles.ordenesEntregadasLista}>
              {ordenesParaMostrar.slice().reverse().map(renderOrdenEntregada)}
            </ThemedView>
          ) : (
            <ThemedView style={styles.emptyState}>
              <IconSymbol name="creditcard" size={48} color="#ccc" />
              <ThemedText style={styles.emptyStateTexto}>
                No hay ventas registradas aún
              </ThemedText>
              <ThemedText style={styles.emptyStateSubtexto}>
                El historial aparecerá cuando se procesen pagos
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
  dashboardFinanciero: {
    marginBottom: 20,
  },
  tarjetaGanancias: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#28A745',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tarjetaGastos: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#DC3545',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tarjetaBalance: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#FF8C00',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tarjetaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tarjetaTitulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28A745',
  },
  tarjetaTituloGastos: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC3545',
  },
  tarjetaTituloBalance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  tarjetaValor: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#28A745',
    marginBottom: 6,
  },
  tarjetaValorGastos: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#DC3545',
    marginBottom: 6,
  },
  tarjetaValorBalance: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginBottom: 6,
  },
  tarjetaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '100%',
  },
  tarjetaSubtexto: {
    fontSize: 13,
    color: '#28A745',
    fontWeight: '500',
  },
  tarjetaSubtextoGastos: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  balanceBarra: {
    height: 6,
    backgroundColor: '#FFE0B2',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barraGanancias: {
    height: '100%',
    backgroundColor: '#28A745',
    borderRadius: 8,
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  balanceInfoTexto: {
    fontSize: 12,
  },
  balanceGanancia: {
    color: '#28A745',
    fontWeight: 'bold',
  },
  balanceGasto: {
    color: '#DC3545',
    fontWeight: 'bold',
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
    paddingRight: 8,
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
  coronaIcono: {
    fontSize: 32,
    marginLeft: 12,
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
  ordenesEntregadasLista: {
    gap: 12,
  },
  ordenEntregadaCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
  },
  ordenCompacta: {
    marginBottom: 8,
  },
  ordenCompactaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mesaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mesaBadgeTexto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ordenTotalVenta: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28A745',
  },
  idVentaTexto: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'center',
  },
  ordenHora: {
    fontSize: 13,
    color: '#999',
  },
  detallesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 4,
  },
  detallesTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
  },
  ordenExpandida: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 12,
  },
  productoDetalleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cantidadBadgeReporte: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  cantidadBadgeTexto: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  ordenProductos: {
    marginBottom: 12,
  },
  ordenProductosTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 6,
  },
  ordenProductoItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  ordenFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ordenEstadoTexto: {
    fontSize: 13,
    color: '#28A745',
    fontWeight: '600',
  },
  ordenInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metodoPagoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metodoPagoTexto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
