import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { useAuth } from '@/utilidades/context/AuthContext';
import { Orden, useOrdenes } from '@/utilidades/context/OrdenesContext';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';


export default function PedidosScreen() {
  const { ordenes, actualizarEstadoOrden, eliminarOrden } = useOrdenes();
  const { usuario, logout } = useAuth(); 
  const esAdmin = usuario?.rol_id === 1;
  const esMesero = usuario?.rol_id === 2;
  const esCajera = usuario?.rol_id === 3;
  const esCocinera = usuario?.rol_id === 4

  const ocultarBoton = esAdmin || esCajera || esCocinera;
  // Calcular total de una orden (fallback para órdenes antiguas)
  const calcularTotalOrden = (orden: Orden): number => {
    if (orden.total) return orden.total;
    
    return orden.productos.reduce((total, producto) => {
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

  const getEstadoColor = (estado: Orden['estado']) => {
    switch (estado) {
      case 'disponible':
        return '#9E9E9E';
      case 'pendiente':
        return '#FF8C00';
      case 'en_preparacion':
        return '#2196F3';
      case 'listo':
        return '#4CAF50';
      case 'entregado':
        return '#9C27B0';
      case 'pago':
        return '#28A745';
      default:
        return '#FF8C00';
    }
  };

  const getEstadoTexto = (estado: Orden['estado']) => {
    switch (estado) {
      case 'disponible':
        return 'Disponible';
      case 'pendiente':
        return 'Pendiente';
      case 'en_preparacion':
        return 'En Preparación';
      case 'listo':
        return 'Listo';
      case 'entregado':
        return 'Entregado';
      case 'pago':
        return 'Pagado';
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
      case 'entregado':
        nuevoEstado = 'pago';
        tituloBoton = 'Registrar Pago';
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

  const renderOrden = (orden: Orden) => {
    const totalOrden = calcularTotalOrden(orden);
    
    return (
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

        {/* Total de la orden */}
        <ThemedView style={styles.totalContainer}>
          <ThemedText style={styles.totalLabel}>Total:</ThemedText>
          <ThemedText style={styles.totalValor}>
            ${totalOrden.toLocaleString('es-CO')}
          </ThemedText>
        </ThemedView>

      <ThemedView style={styles.productosContainer}>
        <ThemedText style={styles.productosTitulo}>Productos:</ThemedText>
        {orden.productos.map((producto, index) => {
          // Separar la cantidad si existe (formato: "Producto (tamaño) $20000 X2")
          const partes = producto.split(' X');
          const productoConPrecio = partes[0]; // "Producto (tamaño) $20000"
          const cantidad = partes[1];
          
          // Limpiar el nombre del producto (quitar precio)
          const productoLimpio = productoConPrecio.split(' $')[0].trim(); // "Producto (tamaño)"
          
          // Verificar si este producto es nuevo
          const esProductoNuevo = orden.productosNuevos?.includes(index) || false;
          
          return (
            <ThemedView key={index} style={styles.productoItemContainer}>
              <ThemedView style={styles.productoItemHeader}>
                <ThemedText style={styles.productoItem}>
                  • {productoLimpio}
                </ThemedText>
                {esProductoNuevo && (
                  <ThemedText style={styles.nuevoTexto}>NUEVO!</ThemedText>
                )}
              </ThemedView>
              {cantidad && (
                <ThemedView style={styles.cantidadBadge}>
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
        <ThemedView style={styles.horaContainer}>
          <ThemedText style={styles.fechaTexto}>
            {orden.fechaCreacion.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </ThemedText>
          
          {/* Botón para agregar más productos */}
          <TouchableOpacity
            style={styles.agregarMasButton}
            onPress={() => router.push({
              pathname: '/crear-orden',
              params: { mesa: orden.mesa }
            })}
          >
            <IconSymbol name="plus.circle.fill" size={34} color="#4CAF50" />
          </TouchableOpacity>
        </ThemedView>
        
        <ThemedView style={styles.botonesContainer}>
          {orden.estado !== 'pago' && (
            <TouchableOpacity 
              style={[
                styles.accionButton,
                { backgroundColor: getEstadoColor(orden.estado) }
              ]}
              onPress={() => handleCambiarEstado(orden)}
            >
              <IconSymbol name="checkmark.circle.fill" size={16} color="#fff" />
              <ThemedText style={styles.accionButtonTexto}>
                {
                 
                 orden.estado === 'pendiente' ? 'Comenzar' : 
                 orden.estado === 'en_preparacion' ? 'Listo' : 
                 orden.estado === 'listo' ? 'Entregar' : 'Pagar'
                }
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
  };

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
    paddingTop: 20, 
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
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
  },
  totalValor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28A745',
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
  productoItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nuevoTexto: {
    color: '#FF0000',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  productoItem: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  cantidadBadge: {
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
  ordenFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  horaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fechaTexto: {
    fontSize: 12,
    color: '#999',
  },
  agregarMasButton: {
    padding: 8,
    marginLeft: 10,
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