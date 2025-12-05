import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { supabase } from '@/scripts/lib/supabase';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Interfaces
interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  tamano: string;
}

interface TamanoOpcion {
  nombre: string;
  precio: number;
}

interface ProductoSeleccionado {
  nombre: string;
  tamano: string;
  precio: number;
  cantidad: number;
  descripcion?: string;
}

interface ClienteRecurrente {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  referencia: string;
  fecha_registro: string;
  cantidad_pedidos: number;
}

interface DireccionCliente {
  nombre: string;
  telefono: string;
  direccion: string;
  referencia: string;
}

export default function DomiciliosScreen() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSugerenciaVisible, setModalSugerenciaVisible] = useState(false);
  const [productoParaTamano, setProductoParaTamano] = useState<Producto | null>(null);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<Producto | null>(null);
  const [cantidadIcopores, setCantidadIcopores] = useState<number>(0);
  const [clientesRecurrentes, setClientesRecurrentes] = useState<ClienteRecurrente[]>([]);
  const [clienteSugerido, setClienteSugerido] = useState<ClienteRecurrente | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteRecurrente | null>(null);
  const [guardandoPedido, setGuardandoPedido] = useState(false);
  const insets = useSafeAreaInsets();



  // Orden personalizado de categorías
  const ordenCategorias = ['pollo', 'adicional', 'bebidas', 'combo', 'postre'];

  // Precio del icopor
  const PRECIO_ICOPOR = 500;

  // Cargar clientes recurrentes desde Supabase
  useEffect(() => {
    cargarClientesRecurrentes();
  }, []);

  const cargarClientesRecurrentes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes_recurrentes')
        .select('*')
        .eq('activo', true)
        .order('cantidad_pedidos', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error cargando clientes:', error);
      } else if (data) {
        setClientesRecurrentes(data);
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };


  // Cargar productos desde Supabase
  useEffect(() => {
    const obtenerProductos = async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error cargando productos:', error);
        Alert.alert('Error', 'No se pudieron cargar los productos.');
      } else if (data) {
        const productosNormalizados = data.map(p => ({
          ...p,
          categoria: p.categoria.trim().toLowerCase()
        }));
        setProductos(productosNormalizados);
        
        if (productosNormalizados.length > 0) {
          const categoriasDisponibles = [...new Set(productosNormalizados.map(p => p.categoria))];
          const primeraCategoria = ordenCategorias.find(c => categoriasDisponibles.includes(c)) || categoriasDisponibles[0];
          setCategoriaSeleccionada(primeraCategoria);
        }
      }
    };

    obtenerProductos();
  }, []);

  // Obtener categorías únicas y ordenarlas
  const categoriasUnicas = [...new Set(productos.map(p => p.categoria))];
  const categorias = categoriasUnicas.sort((a, b) => {
    const indexA = ordenCategorias.indexOf(a);
    const indexB = ordenCategorias.indexOf(b);
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  const normalizarNombre = (nombre: string) => {
    return nombre.trim().toLowerCase();
  };

  const productosUnicos = productos.reduce((acc, producto) => {
    if (producto.categoria !== categoriaSeleccionada) return acc;
    
    const nombreNormalizado = normalizarNombre(producto.nombre);
    const existente = acc.find(p => normalizarNombre(p.nombre) === nombreNormalizado);
    
    if (!existente) {
      acc.push(producto);
    }
    
    return acc;
  }, [] as Producto[]);

  const obtenerVariantes = (nombreProducto: string): Producto[] => {
    const nombreNormalizado = normalizarNombre(nombreProducto);
    return productos.filter(p => 
      normalizarNombre(p.nombre) === nombreNormalizado && 
      p.categoria === categoriaSeleccionada
    );
  };

  const handleSeleccionarProducto = (producto: Producto) => {
    setProductoParaTamano(producto);
    setModalVisible(true);
  };

  const handleAgregarConTamano = (tamanoOpcion: TamanoOpcion, variante: Producto) => {
    if (productoParaTamano) {
      const productoNuevo: ProductoSeleccionado = {
        nombre: productoParaTamano.nombre,
        tamano: tamanoOpcion.nombre,
        precio: tamanoOpcion.precio || productoParaTamano.precio,
        cantidad: 1,
        descripcion: variante.descripcion,
      };
      
      setProductosSeleccionados(prev => {
        const productoExistente = prev.find(p => 
          p.nombre === productoNuevo.nombre && p.tamano === productoNuevo.tamano
        );
        
        if (productoExistente) {
          return prev.map(p => 
            p.nombre === productoNuevo.nombre && p.tamano === productoNuevo.tamano
              ? { ...p, cantidad: p.cantidad + 1 }
              : p
          );
        } else {
          return [...prev, productoNuevo];
        }
      });
      
      setModalVisible(false);
      setProductoParaTamano(null);
      setVarianteSeleccionada(null);
    }
  };

  const handleIncrementarCantidad = (index: number) => {
    setProductosSeleccionados(prev =>
      prev.map((p, i) =>
        i === index ? { ...p, cantidad: p.cantidad + 1 } : p
      )
    );
  };

  const handleDecrementarCantidad = (index: number) => {
    setProductosSeleccionados(prev =>
      prev.map((p, i) =>
        i === index && p.cantidad > 1
          ? { ...p, cantidad: p.cantidad - 1 }
          : p
      )
    );
  };

  const handleEliminarProducto = (index: number) => {
    setProductosSeleccionados(prev => prev.filter((_, i) => i !== index));
  };

  const handleIncrementarIcopores = () => {
    setCantidadIcopores(prev => prev + 1);
  };

  const handleDecrementarIcopores = () => {
    if (cantidadIcopores > 0) {
      setCantidadIcopores(prev => prev - 1);
    }
  };

  const calcularSubtotal = (): number => {
    return productosSeleccionados.reduce((total, producto) => {
      return total + (producto.precio * producto.cantidad);
    }, 0);
  };

  const calcularTotalIcopores = (): number => {
    return cantidadIcopores * PRECIO_ICOPOR;
  };

  const calcularTotal = (): number => {
    return calcularSubtotal() + calcularTotalIcopores();
  };

 
  // Confirmar y guardar pedido en Supabase - FORMATO CORREGIDO
  const handleConfirmarPedido = async () => {
    if (productosSeleccionados.length === 0) {
      Alert.alert('Error', 'Por favor selecciona al menos un producto.');
      return;
    }


    if (guardandoPedido) {
      return;
    }

    setGuardandoPedido(true);

    try {
      const subtotal = calcularSubtotal();
      const totalIcopores = calcularTotalIcopores();
      const totalPedido = calcularTotal();




      // 2. Preparar datos de productos en formato string (IGUAL QUE CREAR-ORDEN)
      // Formato: "Producto (tamaño) $20000 X2"
      const productosFormateados = productosSeleccionados.map(
        p => `${p.nombre} (${p.tamano}) $${p.precio} X${p.cantidad}`
      );

      // Si hay icopores, agregarlos en el mismo formato
      if (cantidadIcopores > 0) {
        productosFormateados.push(
          `Icopor (Unitario) $${PRECIO_ICOPOR} X${cantidadIcopores}`
        );
      }

      // 3. Crear orden en tabla ordenes (MISMO FORMATO QUE CREAR-ORDEN)
      const { data: ordenData, error: ordenError } = await supabase
        .from('ordenesgenerales')
        .insert({
          tipo: `Llevar`,
          productos: productosFormateados, // Array de strings, no objetos
          total: totalPedido,
          estado: 'pendiente'
        })
        .select()
        .single();

      if (ordenError) {
        console.error('Error creando orden:', ordenError);
        Alert.alert('Error', 'No se pudo crear la orden.');
        setGuardandoPedido(false);
        return;
      }


      // 4. Recargar clientes recurrentes
      await cargarClientesRecurrentes();

      // 5. Mostrar mensaje de éxito
      const listaProductos = productosSeleccionados
        .map((producto, index) => 
          `${index + 1}. ${producto.nombre} (${producto.tamano}) - $${producto.precio.toLocaleString('es-CO')} X${producto.cantidad}`
        )
        .join('\n');

      const resumenIcopores = cantidadIcopores > 0 
        ? `\n\n🥡 Icopores: ${cantidadIcopores} X $${PRECIO_ICOPOR.toLocaleString('es-CO')} = $${totalIcopores.toLocaleString('es-CO')}` 
        : '';

      const mensajeClienteRecurrente = clienteSeleccionado 
        ? `\n🎉 Cliente recurrente - Pedido #${clienteSeleccionado.cantidad_pedidos + 1}\n\n`
        : '\n✨ Cliente nuevo registrado\n\n';

      Alert.alert(
        '✅ Pedido Guardado',
        `\n${listaProductos}${resumenIcopores}\n\n💰 Total: $${totalPedido.toLocaleString('es-CO')}`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Limpiar formulario
              setProductosSeleccionados([]);
              setCantidadIcopores(0);
              setGuardandoPedido(false);
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error general:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar el pedido.');
      setGuardandoPedido(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={[styles.header, { paddingTop: Math.max(insets.top + 60, 60) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#8B4513" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          Pedidos Generales
        </ThemedText>
      </ThemedView>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
        >
          

          {/* Botones de Categorías */}
          <ThemedView style={styles.categoriasContainer}>
            <ThemedText style={styles.seccionTitulo}>🍕 Categorías</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasScroll}>
              {categorias.map((categoria) => (
                <TouchableOpacity
                  key={categoria}
                  style={[
                    styles.categoriaButton,
                    categoriaSeleccionada === categoria && styles.categoriaButtonActiva
                  ]}
                  onPress={() => setCategoriaSeleccionada(categoria)}
                >
                  <ThemedText style={[
                    styles.categoriaTexto,
                    categoriaSeleccionada === categoria && styles.categoriaTextoActiva
                  ]}>
                    {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>

          {/* Productos de la categoría seleccionada */}
          <ThemedView style={styles.productosSection}>
            <ThemedText style={styles.seccionTitulo}>
              Productos - {categoriaSeleccionada.charAt(0).toUpperCase() + categoriaSeleccionada.slice(1)}
            </ThemedText>
            <ThemedView style={styles.productosGrid}>
              {productosUnicos.map((producto) => {
                const variantes = obtenerVariantes(producto.nombre);
                const precios = variantes.map(v => v.precio);
                const precioMin = Math.min(...precios);
                const precioMostrar = variantes.length > 1
                  ? `Desde $${precioMin.toLocaleString('es-CO')}`
                  : `$${producto.precio.toLocaleString('es-CO')}`;
                
                return (
                  <TouchableOpacity
                    key={producto.id}
                    style={styles.productoCard}
                    onPress={() => handleSeleccionarProducto(producto)}
                  >
                    <ThemedText style={styles.productoNombre}>{producto.nombre}</ThemedText>
                    <ThemedText style={styles.productoPrecio}>{precioMostrar}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ThemedView>
          </ThemedView>

          {/* Icopores */}
          <ThemedView style={styles.icoporesSection}>
            <ThemedText style={styles.seccionTitulo}>🥡 Icopores</ThemedText>
            <ThemedView style={styles.icoporesCard}>
              <ThemedView style={styles.icoporesInfo}>
                <ThemedText style={styles.icoporesTexto}>Icopor</ThemedText>
                <ThemedText style={styles.icoporesPrecio}>
                  ${PRECIO_ICOPOR.toLocaleString('es-CO')} c/u
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.cantidadContainer}>
                <TouchableOpacity
                  style={styles.cantidadButton}
                  onPress={handleDecrementarIcopores}
                >
                  <ThemedText style={styles.cantidadButtonTexto}>-</ThemedText>
                </TouchableOpacity>
                
                <ThemedText style={styles.cantidadTexto}>{cantidadIcopores}</ThemedText>
                
                <TouchableOpacity
                  style={styles.cantidadButton}
                  onPress={handleIncrementarIcopores}
                >
                  <ThemedText style={styles.cantidadButtonTexto}>+</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
            
            {cantidadIcopores > 0 && (
              <ThemedText style={styles.totalIcoporesTexto}>
                Total Icopores: ${calcularTotalIcopores().toLocaleString('es-CO')}
              </ThemedText>
            )}
          </ThemedView>

          {/* Productos Seleccionados */}
          {productosSeleccionados.length > 0 && (
            <ThemedView style={styles.seleccionadosSection}>
              <ThemedText style={styles.seccionTitulo}>
                🛒 Productos Seleccionados ({productosSeleccionados.length})
              </ThemedText>
              {productosSeleccionados.map((producto, index) => {
                const precioTotal = producto.precio * producto.cantidad;
                return (
                  <ThemedView key={index} style={styles.seleccionadoItem}>
                    <ThemedView style={styles.seleccionadoInfo}>
                      <ThemedText style={styles.seleccionadoNombre}>{producto.nombre}</ThemedText>
                      <ThemedText style={styles.seleccionadoTamano}>
                        {producto.tamano} - ${producto.precio.toLocaleString('es-CO')} c/u
                      </ThemedText>
                      <ThemedText style={styles.seleccionadoPrecioTotal}>
                        Subtotal: ${precioTotal.toLocaleString('es-CO')}
                      </ThemedText>
                    </ThemedView>
                    
                    <ThemedView style={styles.accionesContainer}>
                      <ThemedView style={styles.cantidadContainer}>
                        <TouchableOpacity
                          style={styles.cantidadButton}
                          onPress={() => handleDecrementarCantidad(index)}
                        >
                          <ThemedText style={styles.cantidadButtonTexto}>-</ThemedText>
                        </TouchableOpacity>
                        
                        <ThemedText style={styles.cantidadTexto}>{producto.cantidad}</ThemedText>
                        
                        <TouchableOpacity
                          style={styles.cantidadButton}
                          onPress={() => handleIncrementarCantidad(index)}
                        >
                          <ThemedText style={styles.cantidadButtonTexto}>+</ThemedText>
                        </TouchableOpacity>
                      </ThemedView>
                      
                      <TouchableOpacity
                        style={styles.eliminarButton}
                        onPress={() => handleEliminarProducto(index)}
                      >
                        <IconSymbol name="trash" size={20} color="#DC3545" />
                      </TouchableOpacity>
                    </ThemedView>
                  </ThemedView>
                );
              })}
            </ThemedView>
          )}

          {/* Resumen de Totales */}
          {(productosSeleccionados.length > 0 || cantidadIcopores > 0) && (
            <ThemedView style={styles.resumenSection}>
              <ThemedText style={styles.seccionTitulo}>💰 Resumen</ThemedText>
              
              <ThemedView style={styles.resumenItem}>
                <ThemedText style={styles.resumenLabel}>Subtotal Productos:</ThemedText>
                <ThemedText style={styles.resumenValor}>
                  ${calcularSubtotal().toLocaleString('es-CO')}
                </ThemedText>
              </ThemedView>
              
              {cantidadIcopores > 0 && (
                <ThemedView style={styles.resumenItem}>
                  <ThemedText style={styles.resumenLabel}>Icopores ({cantidadIcopores}):</ThemedText>
                  <ThemedText style={styles.resumenValor}>
                    ${calcularTotalIcopores().toLocaleString('es-CO')}
                  </ThemedText>
                </ThemedView>
              )}
              
              <ThemedView style={styles.resumenDivider} />
              
              <ThemedView style={styles.resumenItem}>
                <ThemedText style={styles.resumenTotal}>TOTAL:</ThemedText>
                <ThemedText style={styles.resumenTotalValor}>
                  ${calcularTotal().toLocaleString('es-CO')}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          )}

          {/* Botones de acción */}
          <ThemedView style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.confirmButton, guardandoPedido && styles.confirmButtonDisabled]} 
              onPress={handleConfirmarPedido}
              disabled={guardandoPedido}
            >
              <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
              <ThemedText style={styles.confirmButtonText}>
                {guardandoPedido ? 'Guardando...' : 'Confirmar Pedido'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => router.back()}
              disabled={guardandoPedido}
            >
              <IconSymbol name="xmark.circle.fill" size={24} color="#fff" />
              <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
      

      {/* Modal de Selección de Tamaño */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitulo}>
              Selecciona el tamaño
            </ThemedText>
            {productoParaTamano && (
              <ThemedText style={styles.modalProducto}>
                {productoParaTamano.nombre}
              </ThemedText>
            )}
            
            {varianteSeleccionada && (
              <ThemedText style={styles.modalDescripcion}>
                {varianteSeleccionada.descripcion}
              </ThemedText>
            )}
            
            <ThemedView style={styles.tamanosContainer}>
              {productoParaTamano && obtenerVariantes(productoParaTamano.nombre).map((variante) => {
                const tamanoStr = variante.tamano.split(':')[0].trim();
                const isSelected = varianteSeleccionada?.id === variante.id;
                
                return (
                  <TouchableOpacity
                    key={variante.id}
                    style={[
                      styles.tamanoButton,
                      isSelected && styles.tamanoButtonSelected
                    ]}
                    onPress={() => setVarianteSeleccionada(variante)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.tamanoTexto}>
                      {tamanoStr.charAt(0).toUpperCase() + tamanoStr.slice(1)}
                    </ThemedText>
                    {variante.precio > 0 && (
                      <ThemedText style={styles.tamanoPrecio}>
                        ${variante.precio.toLocaleString('es-CO')}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ThemedView>

            <ThemedView style={styles.modalBotonesContainer}>
              {varianteSeleccionada && (
                <TouchableOpacity
                  style={styles.modalAgregarButton}
                  onPress={() => {
                    const tamanoStr = varianteSeleccionada.tamano.split(':')[0].trim();
                    handleAgregarConTamano(
                      { nombre: tamanoStr, precio: varianteSeleccionada.precio },
                      varianteSeleccionada
                    );
                  }}
                >
                  <ThemedText style={styles.modalAgregarTexto}>Agregar</ThemedText>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.modalCerrarButton}
                onPress={() => {
                  setModalVisible(false);
                  setVarianteSeleccionada(null);
                }}
              >
                <ThemedText style={styles.modalCerrarTexto}>Cancelar</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  seccionCliente: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 15,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  clienteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientesCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  clientesCountTexto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  clienteSeleccionadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#C8E6C9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#81C784',
  },
  clienteSeleccionadoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  clienteSeleccionadoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
    flex: 1,
  },
  telefonoEncontradoIndicador: {
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 8,
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 12,
  },
  categoriasContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  categoriasScroll: {
    flexDirection: 'row',
  },
  categoriaButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  categoriaButtonActiva: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  categoriaTexto: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '600',
  },
  categoriaTextoActiva: {
    color: '#fff',
  },
  productosSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  productosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productoCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    minHeight: 100,
    justifyContent: 'space-between',
  },
  productoNombre: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
    textAlign: 'center',
  },
  productoPrecio: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8C00',
    textAlign: 'center',
  },
  icoporesSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  icoporesCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  icoporesInfo: {
    flex: 1,
    backgroundColor: '#E3F2FD',
  },
  icoporesTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 4,
  },
  icoporesPrecio: {
    fontSize: 14,
    color: '#666',
  },
  totalIcoporesTexto: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'right',
    marginTop: 4,
  },
  seleccionadosSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  seleccionadoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  seleccionadoInfo: {
    flex: 1,
  },
  seleccionadoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 4,
  },
  seleccionadoTamano: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  seleccionadoPrecioTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginTop: 4,
  },
  accionesContainer: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-end',
  },
  cantidadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  cantidadButton: {
    backgroundColor: '#FF8C00',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cantidadButtonTexto: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cantidadTexto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    paddingHorizontal: 16,
    minWidth: 40,
    textAlign: 'center',
  },
  eliminarButton: {
    padding: 8,
  },
  resumenSection: {
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resumenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  resumenLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  resumenValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  resumenDivider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 12,
  },
  resumenTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  resumenTotalValor: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#28A745',
  },
  actionsContainer: {
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28A745',
    padding: 16,
    borderRadius: 15,
    gap: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#95D5A0',
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545',
    padding: 16,
    borderRadius: 15,
    gap: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalSugerenciaContent: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 24,
    width: '92%',
    maxWidth: 450,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalSugerenciaHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalSugerenciaTitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 12,
    textAlign: 'center',
  },
  clienteSugeridoInfo: {
    marginBottom: 20,
  },
  clienteSugeridoTexto: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  clienteSugeridoCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  clienteSugeridoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clienteSugeridoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    width: 80,
  },
  clienteSugeridoValor: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  pedidosHistorialBadge: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  pedidosHistorialTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976D2',
  },
  clienteSugeridoPregunta: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    textAlign: 'center',
    marginTop: 16,
  },
  modalSugerenciaBotones: {
    gap: 12,
  },
  modalSugerenciaAceptarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modalSugerenciaAceptarTexto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSugerenciaRechazarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E8E8',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  modalSugerenciaRechazarTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 28,
    width: '90%',
    maxWidth: 420,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalProducto: {
    fontSize: 20,
    color: '#FF8C00',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '700',
  },
  modalDescripcion: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  tamanosContainer: {
    marginBottom: 20,
  },
  tamanoButton: {
    backgroundColor: '#FF8C00',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  tamanoButtonSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#FF9500',
    elevation: 5,
  },
  tamanoTexto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  tamanoPrecio: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalBotonesContainer: {
    gap: 12,
  },
  modalAgregarButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modalAgregarTexto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCerrarButton: {
    backgroundColor: '#E8E8E8',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalCerrarTexto: {
    fontSize: 17,
    fontWeight: '700',
    color: '#666',
  },
});
