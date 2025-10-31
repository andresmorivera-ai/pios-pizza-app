import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { supabase } from '@/scripts/lib/supabase';
import { useOrdenes } from '@/utilidades/context/OrdenesContext';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

// Interfaces
interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  tamano: string; // "1/2:10,entero:20" (tamano:precio separado por comas)
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
  esNuevo?: boolean; // Flag para productos agregados durante actualización
}




export default function CrearOrdenScreen() {
  const { mesa } = useLocalSearchParams();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [productoParaTamano, setProductoParaTamano] = useState<Producto | null>(null);
  const { agregarOrden, actualizarProductosOrden, getOrdenActivaPorMesa } = useOrdenes();
  
  // Detectar si la mesa tiene una orden en curso
  const ordenEnCurso = getOrdenActivaPorMesa(mesa as string);

  // Orden personalizado de categorías
  const ordenCategorias = ['pollo', 'adicional', 'bebidas', 'combo', 'postre'];

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
        // Normalizar categorías (trim y lowercase)
        const productosNormalizados = data.map(p => ({
          ...p,
          categoria: p.categoria.trim().toLowerCase()
        }));
        setProductos(productosNormalizados);
        
        // Seleccionar primera categoría según el orden personalizado
        if (productosNormalizados.length > 0) {
          const categoriasDisponibles = [...new Set(productosNormalizados.map(p => p.categoria))];
          const primeraCategoria = ordenCategorias.find(c => categoriasDisponibles.includes(c)) || categoriasDisponibles[0];
          setCategoriaSeleccionada(primeraCategoria);
        }
      }
    };

    obtenerProductos();
  }, []);

  // Cargar productos existentes si hay orden en curso
  useEffect(() => {
    if (ordenEnCurso) {
      // Parsear productos existentes y convertirlos a ProductoSeleccionado
      const productosExistentes: ProductoSeleccionado[] = ordenEnCurso.productos.map(prodStr => {
        // Formato: "Producto (tamaño) $20000 X2"
        const nombreMatch = prodStr.match(/^(.+?)\s*\(/);
        const tamanoMatch = prodStr.match(/\((.+?)\)/);
        const precioMatch = prodStr.match(/\$(\d+)/);
        const cantidadMatch = prodStr.match(/X(\d+)/);
        
        return {
          nombre: nombreMatch ? nombreMatch[1].trim() : '',
          tamano: tamanoMatch ? tamanoMatch[1] : '',
          precio: precioMatch ? parseInt(precioMatch[1]) : 0,
          cantidad: cantidadMatch ? parseInt(cantidadMatch[1]) : 1,
          esNuevo: false // Los productos existentes no son nuevos
        };
      });
      
      setProductosSeleccionados(productosExistentes);
    }
  }, [ordenEnCurso]);

  // Obtener categorías únicas y ordenarlas según ordenCategorias
  const categoriasUnicas = [...new Set(productos.map(p => p.categoria))];
  const categorias = categoriasUnicas.sort((a, b) => {
    const indexA = ordenCategorias.indexOf(a);
    const indexB = ordenCategorias.indexOf(b);
    
    // Si ambas están en el orden personalizado, usar ese orden
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // Si solo una está, la que está va primero
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    // Si ninguna está, orden alfabético
    return a.localeCompare(b);
  });

  // Agrupar productos por nombre base (sin espacios ni diferencias)
  const normalizarNombre = (nombre: string) => {
    return nombre.trim().toLowerCase();
  };

  // Obtener productos únicos por nombre para mostrar en el grid
  const productosUnicos = productos.reduce((acc, producto) => {
    if (producto.categoria !== categoriaSeleccionada) return acc;
    
    const nombreNormalizado = normalizarNombre(producto.nombre);
    const existente = acc.find(p => normalizarNombre(p.nombre) === nombreNormalizado);
    
    if (!existente) {
      acc.push(producto);
    }
    
    return acc;
  }, [] as Producto[]);

  // Obtener todas las variantes de un producto
  const obtenerVariantes = (nombreProducto: string): Producto[] => {
    const nombreNormalizado = normalizarNombre(nombreProducto);
    return productos.filter(p => 
      normalizarNombre(p.nombre) === nombreNormalizado && 
      p.categoria === categoriaSeleccionada
    );
  };

  // Estado para la variante seleccionada en el modal
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<Producto | null>(null);

  // Convertir variantes a opciones de tamaño
  const variantesAOpciones = (variantes: Producto[]): TamanoOpcion[] => {
    return variantes.map(variante => {
      // Extraer el nombre del tamaño del campo tamano
      const tamanoStr = variante.tamano.split(':')[0].trim();
      return {
        nombre: tamanoStr,
        precio: variante.precio
      };
    });
  };

  // Abrir modal para seleccionar tamaño
  const handleSeleccionarProducto = (producto: Producto) => {
    setProductoParaTamano(producto);
    setModalVisible(true);
  };

  // Agregar producto con tamaño seleccionado
  const handleAgregarConTamano = (tamanoOpcion: TamanoOpcion, variante: Producto) => {
    if (productoParaTamano) {
      const productoNuevo: ProductoSeleccionado = {
        nombre: productoParaTamano.nombre,
        tamano: tamanoOpcion.nombre,
        precio: tamanoOpcion.precio || productoParaTamano.precio,
        cantidad: 1,
        descripcion: variante.descripcion,
        esNuevo: !!ordenEnCurso // Si hay orden en curso, es un producto nuevo
      };
      
      setProductosSeleccionados(prev => {
        // Si hay orden en curso, siempre agregar como nuevo producto (no sumar cantidades)
        if (ordenEnCurso) {
          return [...prev, productoNuevo];
        }
        
        // Si es orden nueva, usar la lógica de suma de cantidades
        const productoExistente = prev.find(p => 
          p.nombre === productoNuevo.nombre && p.tamano === productoNuevo.tamano
        );
        
        if (productoExistente) {
          // Si existe, incrementar la cantidad
          return prev.map(p => 
            p.nombre === productoNuevo.nombre && p.tamano === productoNuevo.tamano
              ? { ...p, cantidad: p.cantidad + 1 }
              : p
          );
        } else {
          // Si no existe, agregar como nuevo producto
          return [...prev, productoNuevo];
        }
      });
      
      setModalVisible(false);
      setProductoParaTamano(null);
      setVarianteSeleccionada(null);
    }
  };

  // Incrementar cantidad
  const handleIncrementarCantidad = (index: number) => {
    setProductosSeleccionados(prev => {
      const producto = prev[index];
      
      // Si hay orden en curso (actualización) Y el producto NO es nuevo, agregar como nuevo producto
      if (ordenEnCurso && !producto.esNuevo) {
        const productoNuevo: ProductoSeleccionado = {
          ...producto,
          cantidad: 1,
          esNuevo: true
        };
        return [...prev, productoNuevo];
      }
      
      // Si es orden nueva O el producto ya es nuevo, usar la lógica normal de incrementar cantidad
      return prev.map((p, i) =>
        i === index ? { ...p, cantidad: p.cantidad + 1 } : p
      );
    });
  };

  // Decrementar cantidad
  const handleDecrementarCantidad = (index: number) => {
    setProductosSeleccionados(prev => {
      const producto = prev[index];
      
      // Si hay orden en curso (actualización) Y el producto NO es nuevo, eliminar el último producto nuevo del mismo tipo
      if (ordenEnCurso && !producto.esNuevo) {
        // Buscar el último producto nuevo del mismo tipo (mismo nombre y tamaño)
        const productosDelMismoTipo = prev.filter((p, i) => 
          i > index && p.nombre === producto.nombre && p.tamano === producto.tamano && p.esNuevo
        );
        
        if (productosDelMismoTipo.length > 0) {
          // Encontrar el índice del último producto nuevo del mismo tipo
          const ultimoIndice = prev.findLastIndex((p, i) => 
            i > index && p.nombre === producto.nombre && p.tamano === producto.tamano && p.esNuevo
          );
          
          if (ultimoIndice !== -1) {
            return prev.filter((_, i) => i !== ultimoIndice);
          }
        }
        
        // Si no hay productos nuevos del mismo tipo, no hacer nada
        return prev;
      }
      
      // Si es orden nueva O el producto ya es nuevo, usar la lógica normal de decrementar cantidad
      return prev.map((p, i) =>
        i === index && p.cantidad > 1
          ? { ...p, cantidad: p.cantidad - 1 }
          : p
      );
    });
  };

  // Eliminar producto de la selección
  const handleEliminarProducto = (index: number) => {
    setProductosSeleccionados(prev => prev.filter((_, i) => i !== index));
  };

  // Calcular total de la orden
  const calcularTotal = (): number => {
    return productosSeleccionados.reduce((total, producto) => {
      return total + (producto.precio * producto.cantidad);
    }, 0);
  };

  // Confirmar orden
  const handleConfirmarOrden = () => {
    if (productosSeleccionados.length > 0) {
      // Calcular total
      const totalOrden = calcularTotal();
      
      // Convertir a formato string con cantidad y precio incluidos
      const productosFormateados = productosSeleccionados.map(
        p => `${p.nombre} (${p.tamano}) $${p.precio} X${p.cantidad}`
      );
      
      // Si hay orden en curso, actualizar; si no, crear nueva
      if (ordenEnCurso) {
        actualizarProductosOrden(ordenEnCurso.id, productosFormateados, totalOrden);
        
        const listaProductos = productosSeleccionados
          .map((producto, index) => `${index + 1}. ${producto.nombre} - ${producto.tamano} X${producto.cantidad}`)
          .join('\n');

        Alert.alert(
          'Orden Actualizada',
          `Orden actualizada para Mesa ${mesa}:\n\n${listaProductos}\n\nTotal: $${totalOrden.toLocaleString('es-CO')}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        agregarOrden(mesa as string, productosFormateados, totalOrden);

        const listaProductos = productosSeleccionados
          .map((producto, index) => `${index + 1}. ${producto.nombre} - ${producto.tamano} X${producto.cantidad}`)
          .join('\n');

        Alert.alert(
          'Orden Confirmada',
          `Orden para Mesa ${mesa}:\n\n${listaProductos}\n\nTotal: $${totalOrden.toLocaleString('es-CO')}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } else {
      Alert.alert('Error', 'Por favor selecciona al menos un producto.');
    }
  };


  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <Link href="/(tabs)/seleccionar-mesa" style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#8B4513" />
        </Link>
        <ThemedText type="title" style={styles.title}>
          Crear Orden
        </ThemedText>
      </ThemedView>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Información de la mesa */}
        <ThemedView style={styles.mesaInfo}>
          <IconSymbol name="table.furniture" size={32} color="#FF8C00" />
          <ThemedText style={styles.mesaText}>Mesa {mesa}</ThemedText>
        </ThemedView>

        {/* Aviso de Orden en Curso */}
        {ordenEnCurso && (
          <ThemedView style={styles.avisoOrdenEnCurso}>
            <ThemedText style={styles.avisoTitulo}>⚠️ ORDEN EN CURSO ⚠️</ThemedText>
            <ThemedText style={styles.avisoSubtitulo}>
              Esta mesa ya tiene productos. Puedes agregar más o modificar cantidades.
            </ThemedText>
          </ThemedView>
        )}

        {/* Botones de Categorías */}
        <ThemedView style={styles.categoriasContainer}>
          <ThemedText style={styles.seccionTitulo}>Categorías</ThemedText>
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

        {/* Productos Seleccionados */}
        {productosSeleccionados.length > 0 && (
          <ThemedView style={styles.seleccionadosSection}>
            <ThemedText style={styles.seccionTitulo}>
              Productos Seleccionados ({productosSeleccionados.length})
            </ThemedText>
            {productosSeleccionados.map((producto, index) => {
              const precioTotal = producto.precio * producto.cantidad;
              return (
                <ThemedView key={index} style={styles.seleccionadoItem}>
                  <ThemedView style={styles.seleccionadoInfo}>
                    <ThemedView style={styles.seleccionadoHeader}>
                      <ThemedText style={styles.seleccionadoNombre}>{producto.nombre}</ThemedText>
                    </ThemedView>
                    <ThemedText style={styles.seleccionadoTamano}>
                      {producto.tamano} - ${producto.precio.toLocaleString('es-CO')} c/u
                    </ThemedText>
                    <ThemedText style={styles.seleccionadoPrecioTotal}>
                      Total: ${precioTotal.toLocaleString('es-CO')}
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
                    
                    <ThemedView style={styles.accionesDerecha}>
                      {producto.esNuevo && (
                        <ThemedView style={styles.nuevoBadge}>
                          <ThemedText style={styles.nuevoBadgeText}>NUEVO!</ThemedText>
                        </ThemedView>
                      )}
                      
                      <TouchableOpacity
                        style={styles.eliminarButton}
                        onPress={() => handleEliminarProducto(index)}
                      >
                        <IconSymbol name="trash" size={20} color="#DC3545" />
                      </TouchableOpacity>
                    </ThemedView>
                  </ThemedView>
                </ThemedView>
              );
            })}
          </ThemedView>
        )}

        {/* Botones de acción */}
        <ThemedView style={styles.actionsContainer}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmarOrden}>
            <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
            <ThemedText style={styles.confirmButtonText}>
              {ordenEnCurso ? 'Actualizar Orden' : 'Confirmar Orden'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <IconSymbol name="xmark.circle.fill" size={24} color="#fff" />
            <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>

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
            
            {/* Descripción de la variante seleccionada */}
            {varianteSeleccionada && (
              <ThemedText style={styles.modalDescripcion}>
                {varianteSeleccionada.descripcion}
              </ThemedText>
            )}
            
            <ThemedView style={styles.tamanosContainer}>
              {productoParaTamano && obtenerVariantes(productoParaTamano.nombre).map((variante, index) => {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  mesaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    gap: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  mesaText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  avisoOrdenEnCurso: {
    alignItems: 'center',
    backgroundColor: '#FFCDD2',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#C62828',
  },
  avisoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B71C1C',
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  avisoSubtitulo: {
    fontSize: 13,
    color: '#D32F2F',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  categoriasContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 12,
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
  seleccionadoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nuevoBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  nuevoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  seleccionadoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
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
  accionesDerecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  actionsContainer: {
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8C00',
    padding: 16,
    borderRadius: 15,
    gap: 12,
    elevation: 4,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
