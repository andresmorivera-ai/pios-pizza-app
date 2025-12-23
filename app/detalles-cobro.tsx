import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Layout } from '@/configuracion/constants/Layout';
import { supabase } from '@/scripts/lib/supabase';
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


      // Verificar si es una orden general (Domicilio o Llevar)
      const esOrdenGeneral = mesa.toLowerCase().includes('domicilio') || mesa.toLowerCase().includes('llevar');

      if (esOrdenGeneral) {
        // Actualizar estado en ordenesgenerales
        const { error } = await supabase
          .from('ordenesgenerales')
          .update({ estado: 'pago' })
          .eq('id', ordenId);

        if (error) {
          console.error('Error actualizando orden general:', error);
          throw error;
        }
      } else {
        // Procesar el pago usando la función del contexto (solo para mesas)
        // IMPORTANTE: Usar venta.id (UUID) no idVenta (string personalizado)
        await procesarPago(ordenId, metodoSeleccionado as 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta', resultadoVenta.venta.id);
      }

      // Esperar un momento para que se propague el cambio (Removido para mayor velocidad)
      // await new Promise(resolve => setTimeout(resolve, 500));

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
            <ScrollView
              style={{ width: '100%', maxHeight: '85%' }}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
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
                  {/* Fila compacta: Total y Input Side-by-Side */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, gap: 10 }}>
                    <View style={{ flex: 1, backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#32CD32' }}>
                      <ThemedText style={{ fontSize: 16, color: '#2E7D32', fontWeight: 'bold' }}>Total a Pagar:</ThemedText>
                      <ThemedText style={{ fontSize: 28, fontWeight: 'bold', color: '#1B5E20', marginTop: 4 }}>${total.toLocaleString()}</ThemedText>
                    </View>

                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <ThemedText style={{ fontSize: 14, color: '#8B4513', fontWeight: 'bold', marginBottom: 5 }}>Recibido:</ThemedText>
                      <TextInput
                        style={{
                          width: '100%', borderWidth: 2, borderColor: '#ddd', borderRadius: 10,
                          padding: 8, fontSize: 18, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#fff'
                        }}
                        value={montoRecibido}
                        onChangeText={handleMontoChange}
                        placeholder="0"
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>

                  {/* Resultados Compactos */}
                  {(vueltasCalculadas > 0 || (parseFloat(montoRecibido.replace(/[^0-9]/g, '') || '0') < total && montoRecibido !== '')) && (
                    <View style={{ marginBottom: 15 }}>
                      {vueltasCalculadas > 0 && (
                        <View style={{ backgroundColor: '#dff5f4', padding: 10, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: '#2031a8' }}>Vueltas:</ThemedText>
                          <ThemedText style={{ fontSize: 22, fontWeight: 'bold', color: '#0b0f2b' }}>${vueltasCalculadas.toLocaleString()}</ThemedText>
                        </View>
                      )}

                      {parseFloat(montoRecibido.replace(/[^0-9]/g, '') || '0') < total && montoRecibido !== '' && (
                        <View style={{ backgroundColor: '#FFE8E8', padding: 8, borderRadius: 10, alignItems: 'center' }}>
                          <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: '#D32F2F' }}>Falta: ${(total - parseFloat(montoRecibido.replace(/[^0-9]/g, ''))).toLocaleString()}</ThemedText>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Grid de Billetes Compacto */}
                  <View style={{ marginBottom: 5 }}>
                    <View style={styles.billetesGrid}>
                      {[2000, 5000, 10000, 20000, 50000, 100000].map((valor) => (
                        <TouchableOpacity
                          key={valor}
                          style={styles.billeteButton}
                          onPress={() => agregarBillete(valor)}
                        >
                          <ThemedText style={styles.billeteText}>${(valor / 1000)}k</ThemedText>
                          {billetesCount[valor as keyof typeof billetesCount] > 0 && (
                            <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                              <ThemedText style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{billetesCount[valor as keyof typeof billetesCount]}</ThemedText>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Botones Fijos al pie */}
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
                <ThemedText style={styles.modalButtonTextConfirmar}>Confirmar</ThemedText>
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
    paddingHorizontal: Layout.spacing.l,
    paddingBottom: Layout.spacing.s,
  },
  backButton: {
    padding: Layout.spacing.s,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: '#000000',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.m,
  },
  mesaBadge: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
  },
  mesaBadgeText: {
    color: '#fff',
    fontSize: Layout.fontSize.l,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  ordenInfo: {
    paddingHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.xs,
  },
  mesaContainer: {
    backgroundColor: '#FF8C00',
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.xs,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    alignSelf: 'flex-start',
  },
  mesaText: {
    color: '#fff',
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
  },
  itemsSection: {
    paddingHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.xs,
    flex: 0,
  },
  productosContainer: {
    // Contenedor flexible para los productos
  },
  sectionTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: '600',
    color: '#A0522D',
    marginBottom: Layout.spacing.s,
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
    gap: Layout.spacing.xs,
    paddingVertical: Layout.spacing.s,
    marginTop: Layout.spacing.s,
  },
  verMasText: {
    fontSize: Layout.fontSize.m,
    color: '#19e3dc',
    fontWeight: '600',
  },
  productoItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.xs,
  },
  productoInfo: {
    flex: 1,
  },
  productoItem: {
    fontSize: Layout.fontSize.m,
    color: '#666',
  },
  productoPrecio: {
    fontSize: Layout.fontSize.m,
    color: '#8B4513',
    fontWeight: '800',
    marginTop: Layout.spacing.xs,
  },
  cantidadBadge: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: Layout.spacing.s,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.l,
    marginLeft: Layout.spacing.s,
  },
  cantidadBadgeTexto: {
    fontSize: Layout.fontSize.s,
    fontWeight: 'bold',
    color: '#fff',
  },
  resumenSection: {
    paddingHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.xs,
  },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Layout.spacing.s,
  },
  resumenLabel: {
    fontSize: Layout.fontSize.m,
    color: '#8B4513',
  },
  resumenValue: {
    fontSize: Layout.fontSize.m,
    fontWeight: '600',
    color: '#8B4513',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: Layout.spacing.s,
    paddingTop: Layout.spacing.m,
  },
  totalLabel: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  totalValue: {
    fontSize: Layout.fontSize.xxxl,
    fontWeight: 'bold',
    color: '#32CD32',
  },
  metodosSection: {
    paddingHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.xs,
  },
  metodosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metodoRow: {
    width: '48%',
    marginBottom: Layout.spacing.m,
  },
  metodoCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.l,
    margin: Layout.spacing.s,
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
    width: Layout.icon.xl,
    height: Layout.icon.xl,
    borderRadius: Layout.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.s,
  },
  metodoImagen: {
    width: Layout.icon.l,
    height: Layout.icon.l,
    resizeMode: 'contain',
  },
  metodoImagenGrande: {
    width: 90,
    height: 70,
  },
  metodoIconGrande: {
    width: 80,
    height: 80,
    borderRadius: Layout.borderRadius.xxl,
  },
  metodoNombre: {
    fontSize: Layout.fontSize.l,
    fontWeight: '600',
    color: '#8B4513',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: Layout.spacing.l,
    paddingTop: 0,
  },
  procesarButton: {
    backgroundColor: '#32CD32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.xl,
    borderRadius: Layout.borderRadius.l,
    gap: Layout.spacing.s,
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
    fontSize: Layout.fontSize.l,
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
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    maxHeight: '85%', // Prevent full screen takeover
  },
  modalImageContainer: {
    width: 60,
    height: 60,
    borderRadius: Layout.borderRadius.xl,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
  },
  modalImagen: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  modalTitulo: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: Layout.spacing.m,
    textAlign: 'center',
  },
  modalContent: {
    width: '100%',
    marginBottom: Layout.spacing.xl,
  },
  modalSubtitulo: {
    fontSize: Layout.fontSize.m,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: Layout.spacing.s,
    textAlign: 'center',
  },
  modalNumero: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginBottom: Layout.spacing.m,
    textAlign: 'center',
  },
  modalInstruccion: {
    fontSize: Layout.fontSize.m,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalPaso: {
    fontSize: Layout.fontSize.m,
    color: '#666',
    marginBottom: Layout.spacing.s,
    paddingLeft: Layout.spacing.s,
  },
  modalPasoValor: {
    fontSize: Layout.fontSize.m,
    color: '#FF8C00',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Layout.spacing.m,
    width: '100%',
    marginTop: Layout.spacing.s,
  },
  modalButtonCancelar: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.l,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtonTextCancelar: {
    color: '#666',
    fontSize: Layout.fontSize.m,
    fontWeight: '600',
  },
  modalButtonConfirmar: {
    flex: 1,
    backgroundColor: '#32CD32',
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.l,
    alignItems: 'center',
  },
  modalButtonTextConfirmar: {
    color: '#fff',
    fontSize: Layout.fontSize.m,
    fontWeight: 'bold',
  },
  // Estilos para manejo de efectivo
  efectivoTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.m,
    marginBottom: Layout.spacing.m,
  },
  efectivoLabel: {
    fontSize: Layout.fontSize.m,
    fontWeight: '600',
    color: '#8B4513',
  },
  efectivoTotal: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#32CD32',
  },
  efectivoInputContainer: {
    marginBottom: Layout.spacing.l,
  },
  efectivoInput: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: Layout.borderRadius.m,
    padding: Layout.spacing.m,
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#fff',
    marginTop: Layout.spacing.s,
  },
  billetesContainer: {
    marginBottom: Layout.spacing.l,
  },
  billetesTitulo: {
    fontSize: Layout.fontSize.m,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: Layout.spacing.s,
  },
  billetesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  billeteButton: {
    backgroundColor: '#FF8C00',
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.m,
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.m,
    elevation: 3,
    minHeight: 50,
    overflow: 'visible',
  },
  billeteText: {
    color: '#fff',
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
  },
  billeteCount: {
    color: '#fff',
    fontSize: Layout.fontSize.s,
    fontWeight: '600',
    marginTop: Layout.spacing.xs,
    opacity: 0.9,
  },
  vueltasContainer: {
    backgroundColor: '#dff5f4',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.m,
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
  },
  vueltasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    marginBottom: Layout.spacing.xs,
  },
  vueltasLabel: {
    fontSize: Layout.fontSize.m,
    fontWeight: '600',
    color: '#2031a8',
  },
  vueltasValor: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: '#0b0f2b',
  },
  faltaContainer: {
    backgroundColor: '#FFE8E8',
    padding: Layout.spacing.s,
    borderRadius: Layout.borderRadius.m,
    alignItems: 'center',
  },
  faltaText: {
    fontSize: Layout.fontSize.l,
    fontWeight: '600',
    color: '#D32F2F',
  },
});
