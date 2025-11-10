import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { guardarVenta, ProductoVenta } from '@/servicios-api/ventas';
import { useOrdenes } from '@/utilidades/context/OrdenesContext';
import { useColorScheme } from '@/utilidades/hooks/use-color-scheme';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const metodosPago = [
  { id: 'daviplata', nombre: 'Daviplata', icono: 'phone.fill', color: '#FF6B35', imagen: require('../assets/iconodaviplata.png') },
  { id: 'nequi', nombre: 'Nequi', icono: 'phone.fill', color: '#00BFA5', imagen: require('../assets/icononequi.png') },
  { id: 'efectivo', nombre: 'Efectivo', icono: 'banknote.fill', color: '#4CAF50', imagen: require('../assets/iconoefectivo.png') },
  { id: 'tarjeta', nombre: 'Tarjeta', icono: 'creditcard.fill', color: '#2196F3', imagen: require('../assets/iconotarjeta.png') },
];

export default function DetallesCobroScreen() {
  const colorScheme = useColorScheme();
  const { ordenes, procesarPago } = useOrdenes();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<string>('');
  const [procesando, setProcesando] = useState(false);
  const [productosExpandidos, setProductosExpandidos] = useState(false);
  const [transaccionConfirmada, setTransaccionConfirmada] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [metodoActual, setMetodoActual] = useState<any>(null);
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [vueltasCalculadas, setVueltasCalculadas] = useState<number>(0);
  const [billetesCount, setBilletesCount] = useState({
    2000: 0,
    5000: 0,
    10000: 0,
    20000: 0,
    50000: 0,
    100000: 0,
  });

  const ordenId = params.ordenId as string;
  const mesa = params.mesa as string;
  const total = parseFloat(params.total as string);
  const productos: string[] = JSON.parse(params.productos as string);

  // Usar el total directamente
  const totalFinal = total;
  
  // Determinar si hay 3 o más productos
  const tieneMuchosProductos = productos.length >= 3;
  const productosAMostrar = productosExpandidos ? productos : productos.slice(0, 3);
  
  console.log('Productos totales:', productos.length);
  console.log('Productos a mostrar:', productosAMostrar.length);
  console.log('Expandidos:', productosExpandidos);

  // Función para procesar productos y convertirlos al formato de la base de datos
  const procesarProductosParaBD = (): ProductoVenta[] => {
    return productos.map(producto => {
      // Separar la cantidad si existe (formato: "Producto (tamaño) $20000 X2")
      const partes = producto.split(' X');
      const productoConPrecio = partes[0]; // "Producto (tamaño) $20000"
      const cantidad = parseInt(partes[1] || '1');
      
      // Extraer precio del producto
      const precioMatch = productoConPrecio.match(/\$(\d+)/);
      const precioUnitario = precioMatch ? parseInt(precioMatch[1]) : 0;
      
      // Limpiar el nombre del producto (quitar precio)
      const productoLimpio = productoConPrecio.split(' $')[0].trim();
      
      return {
        nombre: productoLimpio,
        cantidad: cantidad,
        precioUnitario: precioUnitario,
        subtotal: precioUnitario * cantidad,
      };
    });
  };

  // Manejar selección de método de pago
  const handleSeleccionarMetodo = (metodoId: string) => {
    setMetodoSeleccionado(metodoId);
    
    // Encontrar el método actual y mostrar modal
    const metodo = metodosPago.find(m => m.id === metodoId);
    setMetodoActual(metodo);
    setModalVisible(true);
  };

  // Manejar confirmación desde el modal
  const handleConfirmarModal = () => {
    // Validar efectivo
    if (metodoActual?.id === 'efectivo') {
      const montoRecibidoSinFormato = montoRecibido.replace(/[^0-9]/g, '');
      const montoRecibidoNumero = parseFloat(montoRecibidoSinFormato || '0');
      if (montoRecibidoNumero < total) {
        Alert.alert('Error', 'El monto recibido es menor al total a pagar');
        return;
      }
      if (montoRecibidoNumero === 0) {
        Alert.alert('Error', 'Por favor ingresa el monto recibido');
        return;
      }
    }
    
    setTransaccionConfirmada(true);
    setModalVisible(false);
  };

  // Manejar cancelación desde el modal
  const handleCancelarModal = () => {
    setMetodoSeleccionado('');
    setTransaccionConfirmada(false);
    setModalVisible(false);
    setMontoRecibido('');
    setVueltasCalculadas(0);
    setBilletesCount({
      2000: 0,
      5000: 0,
      10000: 0,
      20000: 0,
      50000: 0,
      100000: 0,
    });
  };

  // Calcular vueltas para efectivo
  const calcularVueltas = (monto: string) => {
    const montoNumero = parseFloat(monto);
    if (montoNumero >= total) {
      const vueltas = montoNumero - total;
      setVueltasCalculadas(vueltas);
    } else {
      setVueltasCalculadas(0);
    }
  };

  // Formatear número con separadores de miles
  const formatearNumero = (numero: string) => {
    // Remover comas existentes y caracteres no numéricos
    const numeroLimpio = numero.replace(/[^0-9]/g, '');
    if (numeroLimpio === '') return '';
    
    // Convertir a número y formatear con comas
    const numeroFormateado = parseInt(numeroLimpio).toLocaleString();
    return numeroFormateado;
  };

  // Manejar cambio en el monto recibido
  const handleMontoChange = (monto: string) => {
    // Formatear el número con separadores de miles
    const montoFormateado = formatearNumero(monto);
    setMontoRecibido(montoFormateado);
    
    // Para cálculos, usar el número sin formato
    const montoNumerico = monto.replace(/[^0-9]/g, '');
    calcularVueltas(montoNumerico);
    
    // Si el input está vacío, reiniciar contadores
    if (montoNumerico === '' || montoNumerico === '0') {
      setBilletesCount({
        2000: 0,
        5000: 0,
        10000: 0,
        20000: 0,
        50000: 0,
        100000: 0,
      });
    }
  };

  // Agregar billete al monto
  const agregarBillete = (valor: number) => {
    // Obtener el monto actual sin formato
    const montoActualSinFormato = montoRecibido.replace(/[^0-9]/g, '');
    const montoActual = parseFloat(montoActualSinFormato || '0');
    const nuevoMonto = montoActual + valor;
    handleMontoChange(nuevoMonto.toString());
    
    // Actualizar contador de billetes
    setBilletesCount(prev => ({
      ...prev,
      [valor]: prev[valor as keyof typeof prev] + 1
    }));
  };


  // Procesar pago
  const handleProcesarPago = async () => {
    if (!metodoSeleccionado) {
      Alert.alert('Error', 'Por favor selecciona un método de pago');
      return;
    }

    if (!transaccionConfirmada) {
      Alert.alert('Error', 'Por favor confirma que la transacción se realizó');
      return;
    }

    setProcesando(true);

    try {
      // Guardar la venta en la base de datos primero
      const productosParaBD = procesarProductosParaBD();
      const resultadoVenta = await guardarVenta({
        mesa: mesa,
        total: total,
        metodoPago: metodoSeleccionado,
        productos: productosParaBD,
      });

      console.log('Venta guardada con ID:', resultadoVenta.idVenta);

      // Procesar el pago usando la nueva función con el ID de venta
      procesarPago(ordenId, metodoSeleccionado as 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta', resultadoVenta.idVenta);

      // Mostrar confirmación
      Alert.alert(
        'Pago Exitoso',
        `Orden cobrada exitosamente por $${total.toLocaleString()} usando ${metodosPago.find(m => m.id === metodoSeleccionado)?.nombre}\n\nID de Venta: ${resultadoVenta.idVenta}`,
        [
          {
            text: 'OK',
            onPress: () => router.push('/')
          }
        ]
      );
    } catch (error) {
      console.error('Error procesando pago:', error);
      Alert.alert('Error', 'No se pudo procesar el pago. Inténtalo de nuevo.');
    } finally {
      setProcesando(false);
    }
  };

  // Renderizar cada producto de la orden con precio
  const renderProducto = ({ item }: { item: string }) => {
    // Separar la cantidad si existe (formato: "Producto (tamaño) $20000 X2")
    const partes = item.split(' X');
    const productoConPrecio = partes[0]; // "Producto (tamaño) $20000"
    const cantidad = partes[1];
    
    // Extraer precio del producto
    const precioMatch = productoConPrecio.match(/\$(\d+)/);
    const precio = precioMatch ? precioMatch[1] : '0';
    
    // Limpiar el nombre del producto (quitar precio)
    const productoLimpio = productoConPrecio.split(' $')[0].trim(); // "Producto (tamaño)"
    
    return (
      <View key={item} style={styles.productoItemContainer}>
        <View style={styles.productoInfo}>
          <ThemedText style={styles.productoItem}>
            • {productoLimpio}
          </ThemedText>
          <ThemedText style={styles.productoPrecio}>
            ${parseInt(precio).toLocaleString()}
          </ThemedText>
        </View>
        {cantidad && (
          <View style={styles.cantidadBadge}>
            <ThemedText style={styles.cantidadBadgeTexto}>
              X{cantidad}
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  // Renderizar método de pago
  const renderMetodoPago = ({ item }: { item: typeof metodosPago[0] }) => (
    <TouchableOpacity
      style={[
        styles.metodoCard,
        metodoSeleccionado === item.id && styles.metodoSeleccionado
      ]}
      onPress={() => handleSeleccionarMetodo(item.id)}
    >
      <View style={[
        styles.metodoIcon,
        (item.id === 'efectivo' || item.id === 'tarjeta') && styles.metodoIconGrande
      ]}>
        <Image 
          source={item.imagen} 
          style={[
            styles.metodoImagen,
            (item.id === 'efectivo' || item.id === 'tarjeta') && styles.metodoImagenGrande
          ]}
          onError={() => console.log('Error cargando imagen:', item.nombre)}
        />
      </View>
      <ThemedText style={styles.metodoNombre}>{item.nombre}</ThemedText>
      {metodoSeleccionado === item.id && transaccionConfirmada && (
        <IconSymbol name="checkmark.circle.fill" size={20} color="#32CD32" />
      )}
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header fijo */}
      <ThemedView style={[styles.header, { paddingTop: Math.max(insets.top + 25, 25) }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <IconSymbol name="arrow.left" size={20} color="#8B4513" />
        </TouchableOpacity>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title" style={styles.title}>Detalles de Cobro</ThemedText>
          <ThemedView style={styles.mesaBadge}>
            <IconSymbol name="table.furniture.fill" size={16} color="#fff" />
            <ThemedText style={styles.mesaBadgeText}>Mesa {mesa}</ThemedText>
          </ThemedView>
        </ThemedView>
        <View style={styles.placeholder} />
      </ThemedView>

      {/* Contenido deslizable */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Información de la orden */}
        <ThemedView style={styles.ordenInfo}>
        </ThemedView>

        {/* Lista de productos */}
        <ThemedView style={styles.itemsSection}>
          <ThemedText style={styles.sectionTitle}>Productos de la Orden</ThemedText>
          <View style={styles.productosContainer}>
            <View style={[
              styles.productosList,
              productosExpandidos ? styles.productosListExpanded : styles.productosListCollapsed
            ]}>
              {productosAMostrar.map((producto, index) => (
                <View key={index}>
                  {renderProducto({ item: producto })}
                </View>
              ))}
            </View>
            
            {/* Botón ver más/menos cuando hay muchos productos */}
            {tieneMuchosProductos && (
              <TouchableOpacity 
                style={styles.verMasButton}
                onPress={() => {
                  console.log('Botón presionado, estado actual:', productosExpandidos);
                  setProductosExpandidos(!productosExpandidos);
                }}
              >
                <ThemedText style={styles.verMasText}>
                  {productosExpandidos ? 'ver menos' : 'ver más...'}
                </ThemedText>
                <IconSymbol 
                  name={productosExpandidos ? "chevron.up" : "chevron.down"} 
                  size={16} 
                  color="#8B4513" 
                />
              </TouchableOpacity>
            )}
          </View>
        </ThemedView>

        {/* Resumen de precios */}
        <ThemedView style={styles.resumenSection}>
          <View style={[styles.resumenRow, styles.totalRow]}>
            <ThemedText style={styles.totalLabel}>Total:</ThemedText>
            <ThemedText style={styles.totalValue}>${totalFinal.toLocaleString()}</ThemedText>
          </View>
        </ThemedView>

        {/* Métodos de pago */}
        <ThemedView style={styles.metodosSection}>
          <ThemedText style={styles.sectionTitle}>Métodos de Pago</ThemedText>
          <View style={styles.metodosGrid}>
            {metodosPago.map((metodo) => (
              <View key={metodo.id} style={styles.metodoRow}>
                {renderMetodoPago({ item: metodo })}
              </View>
            ))}
          </View>
        </ThemedView>

        {/* Botón de procesar pago */}
        <ThemedView style={[styles.buttonContainer, { 
          paddingBottom: Math.max(insets.bottom + 15, 15) 
        }]}>
                  <TouchableOpacity
                    style={[
                      styles.procesarButton,
                      (!metodoSeleccionado || !transaccionConfirmada || procesando) && styles.procesarButtonDisabled
                    ]}
                    onPress={handleProcesarPago}
                    disabled={!metodoSeleccionado || !transaccionConfirmada || procesando}
                  >
            <IconSymbol name="creditcard.fill" size={20} color="#fff" />
            <ThemedText style={styles.procesarButtonText}>
              {procesando ? 'Procesando...' : 'Procesar Pago'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>

      {/* Modal personalizado con imagen */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCancelarModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Imagen del método de pago */}
            {metodoActual && (
              <View style={styles.modalImageContainer}>
                <Image source={metodoActual.imagen} style={styles.modalImagen} />
              </View>
            )}

            {/* Título */}
            <ThemedText style={styles.modalTitulo}>
              {metodoActual?.nombre}
            </ThemedText>

            {/* Mensaje específico según el método */}
            {metodoActual?.id === 'daviplata' && (
              <View style={styles.modalContent}>
                <ThemedText style={styles.modalSubtitulo}>Número de Daviplata:</ThemedText>
                <ThemedText style={styles.modalNumero}>300-123-4567</ThemedText>
                <ThemedText style={styles.modalInstruccion}>
                  Recibe el pago en tu cuenta Daviplata y confirma cuando esté listo.
                </ThemedText>
              </View>
            )}

            {metodoActual?.id === 'nequi' && (
              <View style={styles.modalContent}>
                <ThemedText style={styles.modalSubtitulo}>Número de Nequi:</ThemedText>
                <ThemedText style={styles.modalNumero}>300-987-6543</ThemedText>
                <ThemedText style={styles.modalInstruccion}>
                  Recibe el pago en tu cuenta Nequi y confirma cuando esté listo.
                </ThemedText>
              </View>
            )}

            {metodoActual?.id === 'tarjeta' && (
              <View style={styles.modalContent}>
                <ThemedText style={styles.modalSubtitulo}>💡 Instrucciones:</ThemedText>
                <ThemedText style={styles.modalPaso}>1. Ingresa el valor <ThemedText style={styles.modalPasoValor}>${total.toLocaleString()}</ThemedText> en el datáfono</ThemedText>
                <ThemedText style={styles.modalPaso}>2. Pasa la tarjeta del cliente</ThemedText>
                <ThemedText style={styles.modalPaso}>3. Espera la aprobación</ThemedText>
                <ThemedText style={styles.modalPaso}>4. Confirma cuando esté listo</ThemedText>
              </View>
            )}

            {metodoActual?.id === 'efectivo' && (
              <View style={styles.modalContent}>
                <ThemedText style={styles.modalSubtitulo}>💰 Cálculo de Vueltas</ThemedText>
                
                {/* Total de la cuenta */}
                <View style={styles.efectivoTotalContainer}>
                  <ThemedText style={styles.efectivoLabel}>Total a pagar:</ThemedText>
                  <ThemedText style={styles.efectivoTotal}>${total.toLocaleString()}</ThemedText>
                </View>

                {/* Campo para monto recibido */}
                <View style={styles.efectivoInputContainer}>
                  <ThemedText style={styles.efectivoLabel}>¿Cuánto dio el cliente?</ThemedText>
                  <TextInput
                    style={styles.efectivoInput}
                    value={montoRecibido}
                    onChangeText={handleMontoChange}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Botones de billetes */}
                <View style={styles.billetesContainer}>
                  <ThemedText style={styles.billetesTitulo}>Billetes:</ThemedText>
                  <View style={styles.billetesGrid}>
                    <TouchableOpacity style={styles.billeteButton} onPress={() => agregarBillete(2000)}>
                      <ThemedText style={styles.billeteText}>$2,000</ThemedText>
                      <ThemedText style={styles.billeteCount}>x{billetesCount[2000]}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.billeteButton} onPress={() => agregarBillete(5000)}>
                      <ThemedText style={styles.billeteText}>$5,000</ThemedText>
                      <ThemedText style={styles.billeteCount}>x{billetesCount[5000]}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.billeteButton} onPress={() => agregarBillete(10000)}>
                      <ThemedText style={styles.billeteText}>$10,000</ThemedText>
                      <ThemedText style={styles.billeteCount}>x{billetesCount[10000]}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.billeteButton} onPress={() => agregarBillete(20000)}>
                      <ThemedText style={styles.billeteText}>$20,000</ThemedText>
                      <ThemedText style={styles.billeteCount}>x{billetesCount[20000]}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.billeteButton} onPress={() => agregarBillete(50000)}>
                      <ThemedText style={styles.billeteText}>$50,000</ThemedText>
                      <ThemedText style={styles.billeteCount}>x{billetesCount[50000]}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.billeteButton} onPress={() => agregarBillete(100000)}>
                      <ThemedText style={styles.billeteText}>$100,000</ThemedText>
                      <ThemedText style={styles.billeteCount}>x{billetesCount[100000]}</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Resultado de vueltas */}
                {vueltasCalculadas > 0 && (
                  <View style={styles.vueltasContainer}>
                    <View style={styles.vueltasHeader}>
                      <IconSymbol name="arrow.left" size={20} color="#2031a8" />
                      <ThemedText style={styles.vueltasLabel}>Vueltas a dar:</ThemedText>
                    </View>
                    <ThemedText style={styles.vueltasValor}>${vueltasCalculadas.toLocaleString()}</ThemedText>
                  </View>
                )}

                {parseFloat(montoRecibido.replace(/[^0-9]/g, '') || '0') < total && montoRecibido !== '' && (
                  <View style={styles.faltaContainer}>
                    <ThemedText style={styles.faltaText}>⚠️ Falta: ${(total - parseFloat(montoRecibido.replace(/[^0-9]/g, ''))).toLocaleString()}</ThemedText>
                  </View>
                )}
              </View>
            )}

            {/* Botones */}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancelar}
                onPress={handleCancelarModal}
              >
                <ThemedText style={styles.modalButtonTextCancelar}>Cancelar</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonConfirmar}
                onPress={handleConfirmarModal}
              >
                <ThemedText style={styles.modalButtonTextConfirmar}>Confirmar Pago</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#000000',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mesaBadge: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  mesaBadgeText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  ordenInfo: {
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  mesaContainer: {
    backgroundColor: '#FF8C00',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    alignSelf: 'flex-start',
  },
  mesaText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  itemsSection: {
    paddingHorizontal: 20,
    marginBottom: 5,
    flex: 0,
  },
  productosContainer: {
    // Contenedor flexible para los productos
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#A0522D',
    marginBottom: 8,
  },
  productosList: {
    // Contenedor para los productos
  },
  productosListCollapsed: {
    maxHeight: 120,
    overflow: 'hidden',
  },
  productosListExpanded: {
    // Sin límite de altura cuando está expandido
    maxHeight: undefined,
  },
  verMasButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 8,
  },
  verMasText: {
    fontSize: 16,
    color: '#19e3dc',
    fontWeight: '600',
  },
  productoItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productoInfo: {
    flex: 1,
  },
  productoItem: {
    fontSize: 16,
    color: '#666',
  },
  productoPrecio: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '800',
    marginTop: 4,
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
  resumenSection: {
    paddingHorizontal: 20,
    marginBottom: 1,
  },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resumenLabel: {
    fontSize: 16,
    color: '#8B4513',
  },
  resumenValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  totalValue: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#32CD32',
  },
  metodosSection: {
    paddingHorizontal: 20,
    marginBottom: 1,
  },
  metodosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metodoRow: {
    width: '48%',
    marginBottom: 16,
  },
  metodoCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    margin: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  metodoSeleccionado: {
    borderColor: '#32CD32',
    backgroundColor: '#F0FFF0',
  },
  metodoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metodoImagen: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  metodoImagenGrande: {
    width: 90,
    height: 70,
  },
  metodoIconGrande: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  metodoNombre: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8B4513',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  procesarButton: {
    backgroundColor: '#32CD32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  procesarButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  procesarButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalImagen: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  modalTitulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalContent: {
    width: '100%',
    marginBottom: 25,
  },
  modalSubtitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalNumero: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInstruccion: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalPaso: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    paddingLeft: 10,
  },
  modalPasoValor: {
    fontSize: 14,
    color: '#FF8C00',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 10,
  },
  modalButtonCancelar: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtonTextCancelar: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirmar: {
    flex: 1,
    backgroundColor: '#32CD32',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonTextConfirmar: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos para manejo de efectivo
  efectivoTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  efectivoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
  },
  efectivoTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#32CD32',
  },
  efectivoInputContainer: {
    marginBottom: 20,
  },
  efectivoInput: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#fff',
    marginTop: 8,
  },
  billetesContainer: {
    marginBottom: 20,
  },
  billetesTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 10,
  },
  billetesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  billeteButton: {
    backgroundColor: '#FF8C00',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    minWidth: '30%',
    alignItems: 'center',
    marginBottom: 8,
  },
  billeteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  billeteCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    opacity: 0.9,
  },
  vueltasContainer: {
    backgroundColor: '#dff5f4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  vueltasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  vueltasLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2031a8',
  },
  vueltasValor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0b0f2b',
  },
  faltaContainer: {
    backgroundColor: '#FFE8E8',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  faltaText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D32F2F',
  },
});
