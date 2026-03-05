import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Layout } from '@/configuracion/constants/Layout';
import { supabase } from '@/scripts/lib/supabase';
import { useOrdenes } from '@/utilidades/context/OrdenesContext';
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
  TouchableOpacity,
  View
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
  const { getOrdenActivaPorMesa, actualizarProductosOrden } = useOrdenes();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSugerenciaVisible, setModalSugerenciaVisible] = useState(false);
  const [productoParaTamano, setProductoParaTamano] = useState<Producto | null>(null);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<Producto | null>(null);
  const [cantidadIcopores, setCantidadIcopores] = useState<number>(1);
  const [clientesRecurrentes, setClientesRecurrentes] = useState<ClienteRecurrente[]>([]);
  const [clienteSugerido, setClienteSugerido] = useState<ClienteRecurrente | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteRecurrente | null>(null);
  const [guardandoPedido, setGuardandoPedido] = useState(false);
  const [mesas, setMesas] = useState<any[]>([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<number | null>(null);
  const [modalMesaVisible, setModalMesaVisible] = useState(false);
  const [modalDetallesVisible, setModalDetallesVisible] = useState(false);
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

  // Cargar clientes recurrentes y mesas desde Supabase
  useEffect(() => {
    cargarClientesRecurrentes();

    const cargarMesas = async () => {
      try {
        const { data } = await supabase.from('mesas').select('*').order('numero_mesa', { ascending: true });
        if (data) setMesas(data);
      } catch (err) {
        console.error('Error cargando mesas', err);
      }
    };
    cargarMesas();
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


  // Confirmar y guardar pedido en Supabase
  const handleConfirmarPedido = async () => {
    if (productosSeleccionados.length === 0) {
      Alert.alert('Error', 'Por favor selecciona al menos un producto.');
      return;
    }

    if (guardandoPedido) return;
    setGuardandoPedido(true);

    try {
      const totalPedido = calcularTotal();
      const totalIcopores = calcularTotalIcopores();

      // Preparar productos en formato string
      const productosFormateados = productosSeleccionados.map(
        p => `${p.nombre} (${p.tamano}) $${p.precio} X${p.cantidad}`
      );
      if (cantidadIcopores > 0) {
        productosFormateados.push(`Icopor (Unitario) $${PRECIO_ICOPOR} X${cantidadIcopores}`);
      }

      // ─── Si hay mesa seleccionada, buscar su orden activa en el contexto ───
      if (mesaSeleccionada !== null) {
        const ordenMesa = getOrdenActivaPorMesa(String(mesaSeleccionada));

        if (ordenMesa) {
          // ✅ La mesa tiene orden activa → fusionar y enviar a cocina los nuevos productos
          const productosPrefijados = productosFormateados.map(p => `[Llevar] ${p}`);
          const productosCombinados = [...ordenMesa.productos, ...productosPrefijados];
          const totalCombinado = ordenMesa.total + totalPedido;

          // Calcular índices de los productos nuevos para que cocina los vea resaltados
          const cantidadOriginal = ordenMesa.productos.length;
          const indicesNuevos: number[] = ordenMesa.productosNuevos ? [...ordenMesa.productosNuevos] : [];
          for (let i = cantidadOriginal; i < productosCombinados.length; i++) {
            indicesNuevos.push(i);
          }

          // Auto-tachar (marcar como listos) los productos antiguos para que cocina solo se fije en los nuevos
          const listosExistentes: number[] = ordenMesa.productosListos ? [...ordenMesa.productosListos] : [];
          const entregadosExistentes: number[] = ordenMesa.productosEntregados || [];
          for (let i = 0; i < cantidadOriginal; i++) {
            if (!listosExistentes.includes(i) && !entregadosExistentes.includes(i)) {
              listosExistentes.push(i);
            }
          }

          // IMPORTANTE: actualizar estado a 'pendiente' y marcar productos_nuevos
          // para que la cocina reciba y prepare el pedido para llevar
          const { error: errorUpdate } = await supabase
            .from('ordenes')
            .update({
              productos: productosCombinados,
              total: totalCombinado,
              estado: 'pendiente',
              productos_nuevos: indicesNuevos,
              productos_listos: listosExistentes
            })
            .eq('id', ordenMesa.id);

          if (errorUpdate) {
            console.error('Error fusionando con orden de mesa:', errorUpdate);
            Alert.alert('Error', 'No se pudo agregar a la orden de la mesa.');
            setGuardandoPedido(false);
            return;
          }

          Alert.alert(
            '✅ Enviado a Cocina - Mesa ' + mesaSeleccionada,
            `🍳 Los productos para llevar fueron enviados a cocina para preparación.\n\n` +
            productosSeleccionados.map((p, i) => `${i + 1}. ${p.nombre} (${p.tamano}) x${p.cantidad}`).join('\n') +
            (cantidadIcopores > 0 ? `\n🥡 Icopores: ${cantidadIcopores}x` : '') +
            `\n\n💰 Nuevo total Mesa ${mesaSeleccionada}: $${totalCombinado.toLocaleString('es-CO')}`,
            [{
              text: 'OK', onPress: () => {
                setProductosSeleccionados([]);
                setCantidadIcopores(1);
                setMesaSeleccionada(null);
                setGuardandoPedido(false);
                router.back();
              }
            }]
          );
          return;
        }
        // Si la mesa no tiene orden activa, guardar en ordenesgenerales indicando la mesa
      }



      // ─── Sin mesa activa o sin mesa seleccionada → guardar en ordenesgenerales ───
      const tipoPedido = mesaSeleccionada ? `Llevar - Mesa ${mesaSeleccionada}` : 'Llevar';

      const { error: ordenError } = await supabase
        .from('ordenesgenerales')
        .insert({
          tipo: tipoPedido,
          productos: productosFormateados,
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

      const listaProductos = productosSeleccionados
        .map((p, i) => `${i + 1}. ${p.nombre} (${p.tamano}) - $${p.precio.toLocaleString('es-CO')} X${p.cantidad}`)
        .join('\n');
      const resumenIcopores = cantidadIcopores > 0
        ? `\n\n🥡 Icopores: ${cantidadIcopores}x = $${totalIcopores.toLocaleString('es-CO')}`
        : '';

      Alert.alert(
        '✅ Pedido Guardado',
        `\n${listaProductos}${resumenIcopores}\n\n💰 Total: $${totalPedido.toLocaleString('es-CO')}`,
        [{
          text: 'OK', onPress: () => {
            setProductosSeleccionados([]);
            setCantidadIcopores(1);
            setMesaSeleccionada(null);
            setGuardandoPedido(false);
            router.back();
          }
        }]
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

          {/* Selección de Mesa */}
          <ThemedView style={styles.icoporesSection}>
            <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.m, gap: 8 }}>
              <IconSymbol name="table.furniture.fill" size={24} color="#FF8C00" />
              <ThemedText style={[styles.seccionTitulo, { marginBottom: 0 }]}>Asociar a Mesa (Opcional)</ThemedText>
            </ThemedView>
            <TouchableOpacity
              style={[styles.icoporesCard, { borderWidth: 1, borderColor: '#FFE0B2', backgroundColor: '#FFF3E0' }]}
              onPress={() => setModalMesaVisible(true)}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.icoporesTexto, { color: '#E65100', flex: 1 }]}>
                {mesaSeleccionada ? `Mesa ${mesaSeleccionada}` : 'Ninguna mesa seleccionada'}
              </ThemedText>
              <ThemedView style={{ backgroundColor: '#FF8C00', padding: 8, borderRadius: 20 }}>
                <IconSymbol name="chevron.right" size={20} color="#fff" />
              </ThemedView>
            </TouchableOpacity>
          </ThemedView>

          {/* Icopores */}
          <ThemedView style={styles.icoporesSection}>
            <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.m, gap: 8 }}>
              <IconSymbol name="takeoutbag.and.cup.and.straw.fill" size={24} color="#FF8C00" />
              <ThemedText style={[styles.seccionTitulo, { marginBottom: 0 }]}>Icopores</ThemedText>
            </ThemedView>
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
              {/* Header resumen */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.m, gap: 8 }}>
                <IconSymbol name="dollarsign.circle.fill" size={28} color="#FF8C00" />
                <ThemedText style={{ fontSize: Layout.fontSize.xl, fontWeight: 'bold', color: '#8B4513', backgroundColor: 'transparent' }}>Resumen del Pedido</ThemedText>
              </View>

              <View style={styles.resumenItem}>
                <ThemedText style={[styles.resumenLabel, { backgroundColor: 'transparent' }]}>Subtotal Productos</ThemedText>
                <ThemedText style={[styles.resumenValor, { backgroundColor: 'transparent' }]}>
                  ${calcularSubtotal().toLocaleString('es-CO')}
                </ThemedText>
              </View>

              {cantidadIcopores > 0 && (
                <View style={styles.resumenItem}>
                  <ThemedText style={[styles.resumenLabel, { backgroundColor: 'transparent' }]}>Icopores ({cantidadIcopores}x)</ThemedText>
                  <ThemedText style={[styles.resumenValor, { backgroundColor: 'transparent' }]}>
                    ${calcularTotalIcopores().toLocaleString('es-CO')}
                  </ThemedText>
                </View>
              )}

              <View style={styles.resumenDivider} />

              <View style={styles.resumenItem}>
                <ThemedText style={[styles.resumenTotal, { backgroundColor: 'transparent' }]}>TOTAL A PAGAR</ThemedText>
                <ThemedText style={[styles.resumenTotalValor, { backgroundColor: 'transparent' }]}>
                  ${calcularTotal().toLocaleString('es-CO')}
                </ThemedText>
              </View>

              {/* Botón Detalles */}
              <TouchableOpacity
                style={{ marginTop: Layout.spacing.m, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFD580', paddingVertical: 10, borderRadius: 12 }}
                onPress={() => setModalDetallesVisible(true)}
              >
                <IconSymbol name="list.bullet.rectangle.fill" size={20} color="#E65100" />
                <ThemedText style={{ color: '#E65100', fontWeight: 'bold', fontSize: Layout.fontSize.m, backgroundColor: 'transparent' }}>Ver Detalles del Pedido</ThemedText>
              </TouchableOpacity>
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

      {/* Modal de Selección de Mesa */}
      <Modal
        visible={modalMesaVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalMesaVisible(false)}
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { padding: 0, overflow: 'hidden', backgroundColor: '#fff' }]}>
            {/* Header */}
            <ThemedView style={{ backgroundColor: '#FFF8F0', padding: 20, width: '100%', borderBottomWidth: 1, borderBottomColor: '#FFE0B2', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <ThemedText style={[styles.modalTitulo, { marginBottom: 0, color: '#E65100' }]}>🪑 Asociar Mesa</ThemedText>
              <TouchableOpacity onPress={() => setModalMesaVisible(false)} style={{ padding: 4 }}>
                <IconSymbol name="xmark.circle.fill" size={28} color="#FF8C00" />
              </TouchableOpacity>
            </ThemedView>

            {/* Opciones */}
            <ScrollView style={{ width: '100%', maxHeight: 400 }} contentContainerStyle={{ padding: 20 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 16,
                  backgroundColor: mesaSeleccionada === null ? '#FF8C00' : '#FFF3E0',
                  borderColor: mesaSeleccionada === null ? '#E65100' : '#FFE0B2',
                  borderWidth: 1, borderRadius: 16, marginBottom: 12,
                  elevation: mesaSeleccionada === null ? 3 : 0, shadowColor: '#FF8C00', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }
                }}
                onPress={() => setMesaSeleccionada(null)}
                activeOpacity={0.8}
              >
                <IconSymbol name="xmark.circle" size={24} color={mesaSeleccionada === null ? '#FFF' : '#FF8C00'} style={{ marginRight: 12 }} />
                <ThemedText style={{ fontSize: Layout.fontSize.l, fontWeight: 'bold', flex: 1, color: mesaSeleccionada === null ? '#FFF' : '#8B4513' }}>Ninguna (Llevar normal)</ThemedText>
              </TouchableOpacity>

              {mesas.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', padding: 16,
                    backgroundColor: mesaSeleccionada === m.numero_mesa ? '#FF8C00' : '#FFF3E0',
                    borderColor: mesaSeleccionada === m.numero_mesa ? '#E65100' : '#FFE0B2',
                    borderWidth: 1, borderRadius: 16, marginBottom: 12,
                    elevation: mesaSeleccionada === m.numero_mesa ? 3 : 0, shadowColor: '#FF8C00', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }
                  }}
                  onPress={() => setMesaSeleccionada(m.numero_mesa)}
                  activeOpacity={0.8}
                >
                  <IconSymbol name="table.furniture.fill" size={24} color={mesaSeleccionada === m.numero_mesa ? '#FFF' : '#FF8C00'} style={{ marginRight: 12 }} />
                  <ThemedText style={{ fontSize: Layout.fontSize.l, fontWeight: 'bold', flex: 1, color: mesaSeleccionada === m.numero_mesa ? '#FFF' : '#8B4513' }}>Mesa {m.numero_mesa}</ThemedText>
                  {m.estado !== 'disponible' && (
                    <ThemedView style={{ backgroundColor: mesaSeleccionada === m.numero_mesa ? 'rgba(255,255,255,0.3)' : '#FFCC80', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <ThemedText style={{ fontSize: Layout.fontSize.s, color: mesaSeleccionada === m.numero_mesa ? '#FFF' : '#E65100', fontWeight: 'bold' }}>{m.estado}</ThemedText>
                    </ThemedView>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Footer con Confirmar */}
            <ThemedView style={{ padding: 20, width: '100%', borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff' }}>
              <TouchableOpacity
                style={{ backgroundColor: '#4CAF50', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 2, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 }}
                onPress={() => setModalMesaVisible(false)}
              >
                <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
                <ThemedText style={{ color: '#fff', fontSize: Layout.fontSize.l, fontWeight: 'bold', backgroundColor: 'transparent' }}>Confirmar</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Modal>
      {/* Modal Detalles del Pedido */}
      <Modal
        visible={modalDetallesVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalDetallesVisible(false)}
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { padding: 0, overflow: 'hidden', backgroundColor: '#fff', maxHeight: '85%' }]}>
            {/* Header */}
            <View style={{ backgroundColor: '#FFF8F0', padding: 20, borderBottomWidth: 1, borderBottomColor: '#FFE0B2', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconSymbol name="list.bullet.rectangle.fill" size={24} color="#E65100" />
                <ThemedText style={{ fontSize: Layout.fontSize.xl, fontWeight: 'bold', color: '#E65100', backgroundColor: 'transparent' }}>Detalle del Pedido</ThemedText>
              </View>
              <TouchableOpacity onPress={() => setModalDetallesVisible(false)} style={{ padding: 4 }}>
                <IconSymbol name="xmark.circle.fill" size={28} color="#FF8C00" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Tipo de pedido */}
              <View style={{ backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <IconSymbol name="bag.fill" size={22} color="#FF8C00" />
                <ThemedText style={{ fontWeight: 'bold', color: '#8B4513', fontSize: Layout.fontSize.l, backgroundColor: 'transparent' }}>
                  {mesaSeleccionada ? `Llevar - Mesa ${mesaSeleccionada}` : 'Para Llevar'}
                </ThemedText>
              </View>

              {/* Productos */}
              <ThemedText style={{ fontSize: Layout.fontSize.l, fontWeight: 'bold', color: '#8B4513', backgroundColor: 'transparent', marginBottom: 10 }}>🛒 Productos</ThemedText>
              {productosSeleccionados.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FFF3E0' }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontWeight: 'bold', color: '#3E2723', fontSize: Layout.fontSize.m, backgroundColor: 'transparent' }}>{p.nombre}</ThemedText>
                    <ThemedText style={{ color: '#888', fontSize: Layout.fontSize.s, backgroundColor: 'transparent' }}>{p.tamano} · ${p.precio.toLocaleString('es-CO')} c/u · x{p.cantidad}</ThemedText>
                  </View>
                  <ThemedText style={{ fontWeight: 'bold', color: '#E65100', fontSize: Layout.fontSize.m, backgroundColor: 'transparent' }}>
                    ${(p.precio * p.cantidad).toLocaleString('es-CO')}
                  </ThemedText>
                </View>
              ))}

              {/* Icopores */}
              {cantidadIcopores > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FFF3E0' }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontWeight: 'bold', color: '#3E2723', fontSize: Layout.fontSize.m, backgroundColor: 'transparent' }}>Icopores</ThemedText>
                    <ThemedText style={{ color: '#888', fontSize: Layout.fontSize.s, backgroundColor: 'transparent' }}>${PRECIO_ICOPOR.toLocaleString('es-CO')} c/u · x{cantidadIcopores}</ThemedText>
                  </View>
                  <ThemedText style={{ fontWeight: 'bold', color: '#E65100', fontSize: Layout.fontSize.m, backgroundColor: 'transparent' }}>
                    ${calcularTotalIcopores().toLocaleString('es-CO')}
                  </ThemedText>
                </View>
              )}

              {/* Total */}
              <View style={{ backgroundColor: '#FFF3E0', borderRadius: 12, padding: 16, marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText style={{ fontSize: Layout.fontSize.xl, fontWeight: '900', color: '#D84315', backgroundColor: 'transparent' }}>TOTAL A PAGAR</ThemedText>
                <ThemedText style={{ fontSize: 26, fontWeight: '900', color: '#D84315', backgroundColor: 'transparent' }}>${calcularTotal().toLocaleString('es-CO')}</ThemedText>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
              <TouchableOpacity
                style={{ backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 2 }}
                onPress={() => setModalDetallesVisible(false)}
              >
                <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
                <ThemedText style={{ color: '#fff', fontSize: Layout.fontSize.l, fontWeight: 'bold', backgroundColor: 'transparent' }}>Entendido</ThemedText>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#FFF8F0',
    padding: Layout.spacing.xl,
    borderRadius: Layout.borderRadius.xl,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resumenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
  },
  resumenLabel: {
    fontSize: Layout.fontSize.m,
    color: '#8B4513',
    fontWeight: '500',
  },
  resumenValor: {
    fontSize: Layout.fontSize.l,
    fontWeight: '700',
    color: '#3E2723',
  },
  resumenDivider: {
    height: 2,
    backgroundColor: '#FFDEAD',
    marginVertical: Layout.spacing.m,
    borderRadius: 1,
    borderStyle: 'dashed',
  },
  resumenTotal: {
    fontSize: Layout.fontSize.xl,
    fontWeight: '900',
    color: '#D84315',
  },
  resumenTotalValor: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D84315',
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
