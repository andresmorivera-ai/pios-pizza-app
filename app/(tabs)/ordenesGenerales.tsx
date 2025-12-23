import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Layout } from '@/configuracion/constants/Layout';
import { supabase } from '@/scripts/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
  tamaño: string;
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
  const ordenCategorias = ['pollos', 'bebidas', 'jugos naturales', 'combos', 'hamburguesas', 'arroz', 'adicional', 'postre'];

  // Precio del icopor
  const PRECIO_ICOPOR = 500;

  // Recargar clientes recurrentes cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      cargarClientesRecurrentes();
    }, [])
  );

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
        .from('productos_actualizadosNEW')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error cargando productos:', error);
        Alert.alert('Error', 'No se pudieron cargar los productos.');
      } else if (data) {
        // Normalizar categorías y agrupar
        const productosNormalizados = data.map(p => {
          let categoria = p.categoria.trim().toLowerCase();

          // Agrupación y Mapeo de Categorías
          if (categoria.includes('arroz')) {
            categoria = 'arroz';
          } else if (categoria === 'pollo') {
            categoria = 'pollos';
          } else if (categoria === 'combo') {
            categoria = 'combos';
          } else if (categoria === 'hamburguesa') {
            categoria = 'hamburguesas';
          } else if (categoria === 'bebida') {
            categoria = 'bebidas';
          } else if (categoria === 'jugo' || categoria === 'jugos') {
            categoria = 'jugos naturales';
          }

          return {
            ...p,
            categoria
          };
        });
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
        <TouchableOpacity onPress={() => router.push("/(tabs)/seleccionar-mesa")} style={styles.backButton}>
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
                const tamanoStr = (variante.tamaño || '').split(':')[0].trim() || 'Único';
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
                    const tamanoStr = (varianteSeleccionada.tamaño || '').split(':')[0].trim() || 'Único';
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
    paddingHorizontal: Layout.spacing.l,
    paddingBottom: Layout.spacing.l,
    gap: Layout.spacing.m,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: Layout.spacing.s,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  seccionCliente: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.xl,
    gap: Layout.spacing.m,
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
    marginBottom: Layout.spacing.s,
  },
  clientesCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: Layout.spacing.s,
    paddingVertical: 6,
    borderRadius: Layout.borderRadius.xl,
    gap: 4,
  },
  clientesCountTexto: {
    color: '#fff',
    fontSize: Layout.fontSize.s,
    fontWeight: '700',
  },
  clienteSeleccionadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#C8E6C9',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: 10,
    borderRadius: Layout.borderRadius.l,
    marginBottom: Layout.spacing.s,
    borderWidth: 1,
    borderColor: '#81C784',
  },
  clienteSeleccionadoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    flex: 1,
  },
  clienteSeleccionadoTexto: {
    fontSize: Layout.fontSize.s,
    fontWeight: '600',
    color: '#2E7D32',
    flex: 1,
  },
  telefonoEncontradoIndicador: {
    marginLeft: Layout.spacing.s,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.l,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    fontSize: Layout.fontSize.m,
    color: '#333',
    paddingVertical: Layout.spacing.s,
  },
  seccionTitulo: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: Layout.spacing.m,
  },
  categoriasContainer: {
    marginBottom: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.l,
  },
  categoriasScroll: {
    flexDirection: 'row',
  },
  categoriaButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: Layout.spacing.l,
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.xl,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  categoriaButtonActiva: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  categoriaTexto: {
    fontSize: Layout.fontSize.l,
    color: '#8B4513',
    fontWeight: '600',
  },
  categoriaTextoActiva: {
    color: '#fff',
  },
  productosSection: {
    marginBottom: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.l,
  },
  productosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.m,
  },
  productoCard: {
    width: Layout.isTablet ? '31%' : '47%',
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.m,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: Layout.spacing.s,
  },
  productoNombre: {
    fontSize: Layout.fontSize.m,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 4,
  },
  productoPrecio: {
    fontSize: Layout.fontSize.m,
    color: '#E65100',
    fontWeight: '600',
  },
  icoporesSection: {
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
    backgroundColor: '#F5F5F5',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.xl,
  },
  icoporesCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.l,
    marginBottom: Layout.spacing.s,
  },
  icoporesInfo: {
    flex: 1,
  },
  icoporesTexto: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#333',
  },
  icoporesPrecio: {
    fontSize: Layout.fontSize.m,
    color: '#666',
  },
  cantidadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.m,
  },
  cantidadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cantidadButtonTexto: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#333',
  },
  cantidadTexto: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  totalIcoporesTexto: {
    textAlign: 'right',
    fontSize: Layout.fontSize.m,
    fontWeight: 'bold',
    color: '#E65100',
  },
  seleccionadosSection: {
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
  },
  seleccionadoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.l,
    marginBottom: Layout.spacing.s,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  seleccionadoInfo: {
    flex: 1,
  },
  seleccionadoNombre: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#333',
  },
  seleccionadoTamano: {
    fontSize: Layout.fontSize.s,
    color: '#666',
  },
  seleccionadoPrecioTotal: {
    fontSize: Layout.fontSize.m,
    fontWeight: 'bold',
    color: '#E65100',
    marginTop: 2,
  },
  accionesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.m,
  },
  eliminarButton: {
    padding: Layout.spacing.s,
  },
  resumenSection: {
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.xl,
    backgroundColor: '#FFF8E1',
    padding: Layout.spacing.l,
    borderRadius: Layout.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  resumenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resumenLabel: {
    fontSize: Layout.fontSize.m,
    color: '#5D4037',
  },
  resumenValor: {
    fontSize: Layout.fontSize.m,
    fontWeight: '600',
    color: '#3E2723',
  },
  resumenDivider: {
    height: 1,
    backgroundColor: '#FFE0B2',
    marginVertical: Layout.spacing.m,
  },
  resumenTotal: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#E65100',
  },
  resumenTotalValor: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#E65100',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.xl,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.xl,
    gap: 8,
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#81C784',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545',
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.l,
    borderRadius: Layout.borderRadius.xl,
    gap: 8,
    elevation: 4,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.l,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitulo: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalProducto: {
    fontSize: Layout.fontSize.l,
    color: '#E65100',
    fontWeight: '600',
    marginBottom: Layout.spacing.m,
    textAlign: 'center',
  },
  modalDescripcion: {
    fontSize: Layout.fontSize.m,
    color: '#666',
    textAlign: 'center',
    marginBottom: Layout.spacing.l,
    fontStyle: 'italic',
  },
  tamanosContainer: {
    width: '100%',
    gap: Layout.spacing.m,
    marginBottom: Layout.spacing.xl,
  },
  tamanoButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.m,
    backgroundColor: '#f5f5f5',
    borderRadius: Layout.borderRadius.l,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tamanoButtonSelected: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF8C00',
  },
  tamanoTexto: {
    fontSize: Layout.fontSize.l,
    fontWeight: '500',
    color: '#333',
  },
  tamanoPrecio: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#E65100',
  },
  modalBotonesContainer: {
    flexDirection: 'row',
    gap: Layout.spacing.m,
    width: '100%',
  },
  modalAgregarButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.l,
    alignItems: 'center',
  },
  modalAgregarTexto: {
    color: '#fff',
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
  },
  modalCerrarButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: Layout.spacing.m,
    borderRadius: Layout.borderRadius.l,
    alignItems: 'center',
  },
  modalCerrarTexto: {
    color: '#666',
    fontSize: Layout.fontSize.l,
    fontWeight: '600',
  },
  modalSugerenciaContent: {
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.l,
    width: '100%',
    maxWidth: 360,
  },
  modalSugerenciaHeader: {
    alignItems: 'center',
    marginBottom: Layout.spacing.l,
  },
  modalSugerenciaTitulo: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: Layout.spacing.m,
    textAlign: 'center',
  },
  clienteSugeridoInfo: {
    marginBottom: Layout.spacing.xl,
  },
  clienteSugeridoTexto: {
    fontSize: Layout.fontSize.m,
    color: '#666',
    textAlign: 'center',
    marginBottom: Layout.spacing.m,
  },
  clienteSugeridoCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: Layout.borderRadius.l,
    padding: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  clienteSugeridoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clienteSugeridoLabel: {
    fontSize: Layout.fontSize.m,
    fontWeight: '600',
    color: '#555',
    width: 80,
  },
  clienteSugeridoValor: {
    fontSize: Layout.fontSize.m,
    color: '#333',
    flex: 1,
  },
});
