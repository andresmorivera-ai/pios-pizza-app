import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Layout } from '@/configuracion/constants/Layout';
import { supabase } from '@/scripts/lib/supabase';
import { useOrdenes } from '@/utilidades/context/OrdenesContext';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Interfaces
interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  tamaño: string; // "1/2:10,entero:20" (tamano:precio separado por comas)
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

// Interfaz de Orden General simplificada para carga
interface OrdenGeneralCarga {
  id: string;
  tipo: string;
  productos: string[];
  total: number;
  referencia?: string;
}

export default function CrearOrdenScreen() {
  const params = useLocalSearchParams();
  const mesa = params.mesa as string | undefined;
  const idOrden = params.idOrden as string | undefined; // ID de la orden general (domicilio/llevar)
  const tipoOrden = params.tipo as string | undefined; // Tipo: 'domicilios' o 'llevar'

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [productoParaTamano, setProductoParaTamano] = useState<Producto | null>(null);
  const { agregarOrden, actualizarProductosOrden, getOrdenActivaPorMesa } = useOrdenes();
  const insets = useSafeAreaInsets();

  // Detectar si es una orden de MESA o una orden GENERAL (Domicilio/Llevar)
  const esOrdenMesa = !!mesa;
  const esOrdenGeneral = !!idOrden && !!tipoOrden;

  // Detectar si la mesa tiene una orden en curso (solo para mesas)
  const ordenMesaEnCurso = esOrdenMesa ? getOrdenActivaPorMesa(mesa) : null;
  const [ordenGeneralEnCurso, setOrdenGeneralEnCurso] = useState<OrdenGeneralCarga | null>(null); // Nuevo estado para orden general
  const ordenEnCurso = esOrdenMesa ? ordenMesaEnCurso : ordenGeneralEnCurso;

  // Orden personalizado de categorías
  const ordenCategorias = ['pollos', 'bebidas', 'jugos naturales', 'combos', 'hamburguesas', 'arroz', 'adicional', 'postre'];

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

  // Función para parsear la cadena de producto a objeto ProductoSeleccionado
  const parsearProducto = (prodStr: string, esNuevo: boolean): ProductoSeleccionado => {
    // Formato: "Producto (tamaño) $20000 X2"
    const nombreMatch = prodStr.match(/^(.+?)\s*\((.+?)\)\s*\$(\d+)\s*X(\d+)$/);

    if (nombreMatch) {
      return {
        nombre: nombreMatch[1].trim(),
        tamano: nombreMatch[2],
        precio: parseInt(nombreMatch[3]),
        cantidad: parseInt(nombreMatch[4]),
        esNuevo: esNuevo
      };
    }

    // Fallback o formato simplificado si el formato completo no coincide
    const partes = prodStr.split(' X');
    const cantidad = partes.length > 1 ? parseInt(partes[1]) : 1;

    const prodPrecio = partes[0].split(' $');
    const precio = prodPrecio.length > 1 ? parseInt(prodPrecio[1]) : 0;

    const prodTamano = prodPrecio[0].split('(');
    const nombre = prodTamano[0].trim();
    const tamano = prodTamano.length > 1 ? prodTamano[1].replace(')', '').trim() : 'Unidad';

    return {
      nombre,
      tamano,
      precio,
      cantidad,
      esNuevo
    };
  };

  // Cargar productos existentes si hay orden en curso (Mesa o General)
  useEffect(() => {
    // Lógica para Orden General existente
    if (esOrdenGeneral && idOrden) {
      const cargarOrdenGeneral = async () => {
        const { data, error } = await supabase
          .from('ordenesgenerales')
          .select('id, tipo, productos, total, referencia')
          .eq('id', idOrden)
          .single();

        if (error) {
          console.error('Error cargando orden general:', error);
          Alert.alert('Error', 'No se pudo cargar la orden general para actualizar.');
          return;
        }

        if (data) {
          setOrdenGeneralEnCurso(data as OrdenGeneralCarga);
          const productosExistentes: ProductoSeleccionado[] = data.productos.map((prodStr: string) =>
            parsearProducto(prodStr, false)
          );
          setProductosSeleccionados(productosExistentes);
        }
      };
      cargarOrdenGeneral();
      return;
    }

    // Lógica para Orden de Mesa existente
    if (ordenMesaEnCurso) {
      const productosExistentes: ProductoSeleccionado[] = ordenMesaEnCurso.productos.map(prodStr =>
        parsearProducto(prodStr, false)
      );
      setProductosSeleccionados(productosExistentes);
    }
  }, [ordenMesaEnCurso, esOrdenGeneral, idOrden]);

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
      // Extraer el nombre del tamaño del campo tamaño
      const tamanoStr = (variante.tamaño || '').split(':')[0].trim() || 'Único';
      return {
        nombre: tamanoStr,
        precio: variante.precio
      };
    });
  };

  // Abrir modal para seleccionar tamaño
  const handleSeleccionarProducto = (producto: Producto) => {
    setProductoParaTamano(producto);
    setVarianteSeleccionada(null); // Resetear la variante seleccionada
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
        esNuevo: !!ordenEnCurso // Si hay orden en curso (Mesa o General), es un producto nuevo para esa "ronda"
      };

      setProductosSeleccionados(prev => {
        // Si hay orden en curso (Mesa o General), siempre agregar como nuevo producto
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

      // Si hay orden en curso (actualización) Y el producto NO es nuevo, agregar como NUEVO producto
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
        const productosNuevosDelMismoTipo = prev.filter((p) =>
          p.nombre === producto.nombre && p.tamano === producto.tamano && p.esNuevo
        );

        if (productosNuevosDelMismoTipo.length > 0) {
          // Encontrar el índice del último producto nuevo del mismo tipo
          const ultimoIndice = prev.findLastIndex((p) =>
            p.nombre === producto.nombre && p.tamano === producto.tamano && p.esNuevo
          );

          if (ultimoIndice !== -1) {
            return prev.filter((_, i) => i !== ultimoIndice);
          }
        }

        // Si no hay productos nuevos del mismo tipo, no hacer nada (no se puede reducir el producto original)
        return prev;
      }

      // Si es orden nueva O el producto ya es nuevo, usar la lógica normal de decrementar cantidad
      return prev.map((p, i) =>
        i === index && p.cantidad > 1
          ? { ...p, cantidad: p.cantidad - 1 }
          : p
      ).filter(p => p.cantidad > 0); // Eliminar si la cantidad llega a 0
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
  const handleConfirmarOrden = async () => {
    if (productosSeleccionados.length > 0) {
      const totalOrden = calcularTotal();

      // Convertir a formato string con cantidad y precio incluidos
      const productosFormateados = productosSeleccionados.map(
        p => `${p.nombre} (${p.tamano}) $${p.precio} X${p.cantidad}`
      );

      const listaProductos = productosSeleccionados
        .map((producto, index) => `${index + 1}. ${producto.nombre} - ${producto.tamano} X${producto.cantidad}`)
        .join('\n');

      if (esOrdenMesa) {
        // Lógica de Mesa
        if (ordenMesaEnCurso) {
          // Actualizar Orden de Mesa existente
          actualizarProductosOrden(ordenMesaEnCurso.id, productosFormateados, totalOrden);
          Alert.alert(
            'Orden Actualizada',
            `Orden actualizada para Mesa ${mesa}:\n\n${listaProductos}\n\nTotal: $${totalOrden.toLocaleString('es-CO')}`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else {
          // Crear Orden de Mesa nueva
          agregarOrden(mesa as string, productosFormateados, totalOrden);
          Alert.alert(
            'Orden Confirmada',
            `Orden para Mesa ${mesa}:\n\n${listaProductos}\n\nTotal: $${totalOrden.toLocaleString('es-CO')}`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } else if (esOrdenGeneral) {
        // Lógica de Orden General (Domicilio/Llevar)
        if (ordenGeneralEnCurso) {
          // Actualizar Orden General existente
          try {
            // Obtener orden actual para preservar índices existentes
            const { data: ordenActual } = await supabase
              .from('ordenesgenerales')
              .select('productos, productos_nuevos')
              .eq('id', idOrden)
              .single();

            const cantidadOriginal = ordenActual ? ordenActual.productos.length : 0;
            const productosNuevosIndices: number[] = ordenActual?.productos_nuevos ? [...ordenActual.productos_nuevos] : [];

            for (let i = 0; i < productosFormateados.length; i++) {
              if (i >= cantidadOriginal) {
                productosNuevosIndices.push(i);
              }
            }

            const { error } = await supabase
              .from('ordenesgenerales')
              .update({
                productos: productosFormateados,
                total: totalOrden,
                estado: 'pendiente', // Reiniciar estado a pendiente al actualizar
                productos_nuevos: productosNuevosIndices
              })
              .eq('id', idOrden);

            if (error) throw error;

            Alert.alert(
              'Orden Actualizada',
              `Orden de ${tipoOrden} actualizada:\n\n${listaProductos}\n\nTotal: $${totalOrden.toLocaleString('es-CO')}`,
              [{ text: 'OK', onPress: () => router.back() }]
            );
          } catch (error) {
            console.error('Error actualizando orden general:', error);
            Alert.alert('Error', 'No se pudo actualizar la orden general.');
          }

        } else {
          // Crear Orden General nueva (esta pantalla no se usa para crear, solo actualizar, pero lo dejamos como fallback si se reutiliza)
          Alert.alert('Error de Lógica', 'Esta pantalla solo debe usarse para actualizar órdenes generales, no para crearlas.');
        }
      }
    } else {
      Alert.alert('Error', 'Por favor selecciona al menos un producto.');
    }
  };

  // Determinar el título y el icono de la cabecera
  const tituloPantalla = esOrdenMesa ? `Mesa ${mesa}` :
    esOrdenGeneral ? (tipoOrden === 'domicilios' ? 'Domicilio' : 'Para Llevar') :
      'Crear Orden';

  const iconoInfo = esOrdenMesa ? 'table.furniture' :
    tipoOrden === 'domicilios' ? 'car.fill' :
      'bag.fill';

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={[styles.header, { paddingTop: Math.max(insets.top + 60, 60) }]}>
        <Link href="/(tabs)/pedidos" style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#8B4513" />
        </Link>
        <ThemedText type="title" style={styles.title}>
          {esOrdenMesa ? 'Actualizar Orden' : 'Agregar Productos'}
        </ThemedText>
      </ThemedView>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Información de la mesa/orden general */}
        <ThemedView style={styles.mesaInfo}>
          <IconSymbol name={iconoInfo} size={32} color="#FF8C00" />
          <ThemedText style={styles.mesaText}>
            {tituloPantalla}
          </ThemedText>
        </ThemedView>

        {/* Aviso de Orden en Curso */}
        {ordenEnCurso && (
          <ThemedView style={styles.avisoOrdenEnCurso}>
            <ThemedText style={styles.avisoTitulo}>⚠️ ORDEN EN CURSO ⚠️</ThemedText>
            <ThemedText style={styles.avisoSubtitulo}>
              Esta orden ya tiene productos. Puedes agregar más o modificar cantidades.
            </ThemedText>
            {ordenGeneralEnCurso?.referencia && (
              <ThemedText style={styles.avisoSubtitulo}>
                **Ref:** {ordenGeneralEnCurso.referencia}
              </ThemedText>
            )}
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
        <ThemedView style={[styles.actionsContainer, {
          paddingBottom: Math.max(insets.bottom + 30, 30)
        }]}>
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
    width: Layout.isTablet ? '31%' : '48%',
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.m,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    minHeight: Layout.verticalScale(100),
    justifyContent: 'space-between',
  },
  productoNombre: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: Layout.spacing.s,
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
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: Layout.spacing.s,
  },
  modalProducto: {
    fontSize: Layout.fontSize.xl,
    color: '#FF8C00',
    textAlign: 'center',
    marginBottom: Layout.spacing.m,
    fontWeight: '700',
  },
  modalDescripcion: {
    fontSize: Layout.fontSize.m,
    color: '#666',
    textAlign: 'center',
    marginBottom: Layout.spacing.l,
    fontStyle: 'italic',
    paddingHorizontal: Layout.spacing.s,
    lineHeight: Layout.moderateScale(22),
  },
  tamanosContainer: {
    marginBottom: Layout.spacing.l,
  },
  tamanoButton: {
    backgroundColor: '#FF8C00',
    paddingVertical: Layout.verticalScale(18),
    paddingHorizontal: Layout.spacing.l,
    borderRadius: Layout.borderRadius.xl,
    marginBottom: Layout.spacing.m,
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
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  tamanoPrecio: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.m,
  },
  modalBotonesContainer: {
    gap: Layout.spacing.m,
  },
  modalAgregarButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: Layout.verticalScale(16),
    paddingHorizontal: Layout.spacing.l,
    borderRadius: Layout.borderRadius.xl,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modalAgregarTexto: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCerrarButton: {
    backgroundColor: '#E8E8E8',
    paddingVertical: Layout.verticalScale(16),
    paddingHorizontal: Layout.spacing.l,
    borderRadius: Layout.borderRadius.xl,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalCerrarTexto: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#666',
  },
});