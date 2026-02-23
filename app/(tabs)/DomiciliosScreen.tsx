import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Layout } from '@/configuracion/constants/Layout';
import { supabase } from '@/scripts/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
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

interface OrdenGeneral {
  id: string;
  tipo: string;
  referencia: string;
  productos: string[];
  total: number;
  estado: string;
  creado_en: string;
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

  // Estados para información del cliente
  const [datosCliente, setDatosCliente] = useState<DireccionCliente>({
    nombre: '',
    telefono: '',
    direccion: '',
    referencia: ''
  });

  // Orden personalizado de categorías
  const ordenCategorias = ['pollos', 'bebidas', 'jugos naturales', 'combos', 'hamburguesas', 'arroz', 'adicional', 'postre'];

  // Precio del icopor
  const PRECIO_ICOPOR = 500;

  const [pedidosEnCurso, setPedidosEnCurso] = useState<OrdenGeneral[]>([]);

  const cargarPedidosEnCurso = async () => {
    try {
      const { data, error } = await supabase
        .from('ordenesgenerales')
        .select('*')
        .like('tipo', 'Domicilio -%')
        .neq('estado', 'pagado')
        .neq('estado', 'cancelado')
        .order('creado_en', { ascending: false });

      if (error) {
        console.error('Error cargando pedidos en curso:', error);
      } else if (data) {
        setPedidosEnCurso(data);
      }
    } catch (error) {
      console.error('Error cargando pedidos en curso:', error);
    }
  };

  // Recargar clientes recurrentes cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      cargarClientesRecurrentes();
      cargarPedidosEnCurso();
    }, [])
  );

  // Cargar clientes recurrentes desde Supabase
  useEffect(() => {
    cargarClientesRecurrentes();
    cargarPedidosEnCurso();
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

  // Buscar cliente por teléfono mientras se escribe
  useEffect(() => {
    if (datosCliente.telefono.length === 10 && !clienteSeleccionado) {
      const clienteEncontrado = clientesRecurrentes.find(
        c => c.telefono === datosCliente.telefono
      );

      if (clienteEncontrado) {
        setClienteSugerido(clienteEncontrado);
        setModalSugerenciaVisible(true);
      }
    }
  }, [datosCliente.telefono, clientesRecurrentes]);

  const aceptarSugerenciaCliente = () => {
    if (clienteSugerido) {
      setDatosCliente({
        nombre: clienteSugerido.nombre,
        telefono: clienteSugerido.telefono,
        direccion: clienteSugerido.direccion,
        referencia: clienteSugerido.referencia
      });
      setClienteSeleccionado(clienteSugerido);
      setModalSugerenciaVisible(false);
    }
  };

  const rechazarSugerenciaCliente = () => {
    setModalSugerenciaVisible(false);
    setClienteSugerido(null);
  };

  const limpiarSeleccionCliente = () => {
    setDatosCliente({
      nombre: '',
      telefono: '',
      direccion: '',
      referencia: ''
    });
    setClienteSeleccionado(null);
    setClienteSugerido(null);
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

  const validarDatosCliente = (): boolean => {
    if (!datosCliente.nombre.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del cliente');
      return false;
    }
    if (!datosCliente.telefono.trim()) {
      Alert.alert('Error', 'Por favor ingresa el teléfono del cliente');
      return false;
    }

    if (datosCliente.telefono.length < 10) {
      Alert.alert('Error', 'El teléfono debe tener al menos 10 dígitos');
      return false;
    }
    if (!datosCliente.direccion.trim()) {
      Alert.alert('Error', 'Por favor ingresa la dirección de entrega');
      return false;
    }
    return true;
  };

  // Confirmar y guardar pedido en Supabase - FORMATO CORREGIDO
  const handleConfirmarPedido = async () => {
    if (productosSeleccionados.length === 0) {
      Alert.alert('Error', 'Por favor selecciona al menos un producto.');
      return;
    }

    if (!validarDatosCliente()) {
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

      // GUARDAR DATOS ANTES DE LIMPIAR
      const productosParaMensaje = [...productosSeleccionados];
      const icoporesParaMensaje = cantidadIcopores;
      const clienteRecurrenteInfo = clienteSeleccionado;
      const datosClienteParaMensaje = { ...datosCliente };

      // 1. Buscar o crear cliente
      const { data: clienteData, error: clienteError } = await supabase
        .rpc('buscar_o_crear_cliente', {
          p_telefono: datosCliente.telefono.trim(),
          p_nombre: datosCliente.nombre.trim(),
          p_direccion: datosCliente.direccion.trim(),
          p_referencia: datosCliente.referencia.trim() || null
        });

      if (clienteError) {
        console.error('Error con cliente:', clienteError);
        Alert.alert('Error', 'No se pudo registrar el cliente.');
        setGuardandoPedido(false);
        return;
      }

      const clienteId = clienteData;

      // 2. Preparar datos de productos en formato string
      const productosFormateados = productosSeleccionados.map(
        p => `${p.nombre} (${p.tamano}) $${p.precio} X${p.cantidad}`
      );

      if (cantidadIcopores > 0) {
        productosFormateados.push(
          `Icopor (Unitario) $${PRECIO_ICOPOR} X${cantidadIcopores}`
        );
      }

      // 3. Crear orden en tabla ordenes
      const { data: ordenData, error: ordenError } = await supabase
        .from('ordenesgenerales')
        .insert({
          tipo: `Domicilio - ${datosCliente.nombre.trim()}`,
          referencia: `${datosCliente.nombre.trim().toUpperCase()} - ${datosCliente.telefono.trim()} - ${datosCliente.direccion.trim()}- ${datosCliente.referencia.trim() || 'Sin referencia'}`,
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


      // 4. LIMPIAR FORMULARIO ANTES DE RECARGAR
      setProductosSeleccionados([]);
      setCantidadIcopores(0);
      setDatosCliente({
        nombre: '',
        telefono: '',
        direccion: '',
        referencia: ''
      });
      setClienteSeleccionado(null);
      setClienteSugerido(null);

      // 5. AHORA SÍ RECARGAR CLIENTES
      await cargarClientesRecurrentes();

      // 6. Mostrar mensaje con los datos guardados anteriormente
      const listaProductos = productosParaMensaje
        .map((producto, index) =>
          `${index + 1}. ${producto.nombre} (${producto.tamano}) - $${producto.precio.toLocaleString('es-CO')} X${producto.cantidad}`
        )
        .join('\n');

      const resumenIcopores = icoporesParaMensaje > 0
        ? `\n\n🥡 Icopores: ${icoporesParaMensaje} X $${PRECIO_ICOPOR.toLocaleString('es-CO')} = $${(icoporesParaMensaje * PRECIO_ICOPOR).toLocaleString('es-CO')}`
        : '';

      const mensajeClienteRecurrente = clienteRecurrenteInfo
        ? `\n🎉 Cliente recurrente - Pedido #${clienteRecurrenteInfo.cantidad_pedidos + 1}\n\n`
        : '\n✨ Cliente nuevo registrado\n\n';

      Alert.alert(
        '✅ Pedido Guardado',
        `${mensajeClienteRecurrente}Cliente: ${datosClienteParaMensaje.nombre}\nTeléfono: ${datosClienteParaMensaje.telefono}\nDirección: ${datosClienteParaMensaje.direccion}\n${datosClienteParaMensaje.referencia ? `Referencia: ${datosClienteParaMensaje.referencia}\n` : ''}\n${listaProductos}${resumenIcopores}\n\n💰 Total: $${totalPedido.toLocaleString('es-CO')}`,
        [
          {
            text: 'OK',
            onPress: () => {
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
          🛵 Pedidos a Domicilio
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
          {/* Pedidos en Curso */}
          {pedidosEnCurso.length > 0 && (
            <ThemedView style={styles.seccionPedidosCurso}>
              <ThemedView style={styles.pedidosCursoHeader}>
                <ThemedView style={styles.tituloBadge}>
                  <IconSymbol name="list.clipboard.fill" size={20} color="#FF8C00" />
                  <ThemedText style={styles.seccionTituloBadge}>Pedidos en Curso</ThemedText>
                </ThemedView>
                <ThemedView style={styles.clientesCountBadge}>
                  <ThemedText style={styles.clientesCountTexto}>{pedidosEnCurso.length}</ThemedText>
                </ThemedView>
              </ThemedView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pedidosCursoScroll}>
                {pedidosEnCurso.map((pedido) => {
                  const isPreparando = pedido.estado === 'preparando';
                  const isListo = pedido.estado === 'listo';
                  const parts = pedido.referencia.split('-');
                  const nombre = parts[0]?.trim() || '';
                  const telefono = parts[1]?.trim() || '';
                  const direccion = parts[2]?.trim() || '';
                  const referencia = parts.slice(3).join('-').trim() || '';

                  const copiarDireccion = async () => {
                    const dirCompleta = direccion + (referencia ? `, ${referencia}` : '');
                    await Clipboard.setStringAsync(dirCompleta);
                    Alert.alert('¡Copiado!', 'Dirección copiada al portapapeles');
                  };

                  return (
                    <ThemedView key={pedido.id} style={styles.pedidoCursoCard}>
                      <ThemedView style={styles.pedidoCursoHeaderCont}>
                        <ThemedText style={styles.pedidoCursoNombre} numberOfLines={1}>{nombre}</ThemedText>
                        <ThemedView style={[styles.pedidoCursoEstadoBadge, isPreparando || isListo ? styles.estadoPreparando : styles.estadoPendiente, isListo ? styles.estadoListo : null]}>
                          <ThemedText style={styles.pedidoCursoEstadoTexto}>{pedido.estado.toUpperCase().replace(/_/g, ' ')}</ThemedText>
                        </ThemedView>
                      </ThemedView>
                      <ThemedView style={styles.pedidoCursoDetalleContainer}>
                        <IconSymbol name="phone.fill" size={16} color="#8B4513" />
                        <ThemedText style={styles.pedidoCursoDetalleTexto}>{telefono}</ThemedText>
                      </ThemedView>
                      <ThemedView style={styles.pedidoCursoDetalleContainerDir}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1, paddingRight: 10 }}>
                          <IconSymbol name="location.fill" size={16} color="#FF8C00" style={{ marginTop: 2 }} />
                          <ThemedText style={styles.pedidoCursoDetalleTextoDir} numberOfLines={3}>
                            {direccion}{referencia ? ` - ${referencia}` : ''}
                          </ThemedText>
                        </View>
                        <TouchableOpacity onPress={copiarDireccion} style={styles.copiarButton}>
                          <Ionicons name="copy-outline" size={20} color="#FFF" />
                        </TouchableOpacity>
                      </ThemedView>
                    </ThemedView>
                  );
                })}
              </ScrollView>
            </ThemedView>
          )}

          {/* Información del Cliente */}
          <ThemedView style={styles.seccionCliente}>
            <ThemedView style={styles.clienteHeader}>
              <ThemedView style={styles.tituloBadge}>
                <IconSymbol name="person.crop.circle.badge.plus" size={20} color="#FF8C00" />
                <ThemedText style={styles.seccionTituloBadge}>Información del Cliente</ThemedText>
              </ThemedView>
              {clientesRecurrentes.length > 0 && (
                <ThemedView style={styles.clientesCountBadge}>
                  <IconSymbol name="person.2.fill" size={16} color="#fff" />
                  <ThemedText style={styles.clientesCountTexto}>
                    {"Clientes: " + clientesRecurrentes.length}
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>

            {clienteSeleccionado && (
              <ThemedView style={styles.clienteSeleccionadoBadge}>
                <ThemedView style={styles.clienteSeleccionadoInfo}>
                  <IconSymbol name="checkmark.circle.fill" size={20} color="#2E7D32" />
                  <ThemedText style={styles.clienteSeleccionadoTexto}>
                    Cliente recurrente • {clienteSeleccionado.cantidad_pedidos} {clienteSeleccionado.cantidad_pedidos === 1 ? 'pedido' : 'pedidos'}
                  </ThemedText>
                </ThemedView>
                <TouchableOpacity onPress={limpiarSeleccionCliente}>
                  <IconSymbol name="xmark.circle.fill" size={20} color="#666" />
                </TouchableOpacity>
              </ThemedView>
            )}

            <ThemedView style={styles.inputContainer}>
              <IconSymbol name="phone.fill" size={20} color="#FF8C00" />
              <TextInput
                style={styles.input}
                placeholder="Teléfono (10 dígitos)"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                maxLength={10}

                value={datosCliente.telefono}
                onChangeText={(text) => setDatosCliente(prev => ({ ...prev, telefono: text }))}
              />
              {datosCliente.telefono.length >= 10 && clientesRecurrentes.find(c => c.telefono === datosCliente.telefono) && !clienteSeleccionado && (
                <ThemedView style={styles.telefonoEncontradoIndicador}>
                  <IconSymbol name="checkmark.circle.fill" size={20} color="#4CAF50" />
                </ThemedView>
              )}
            </ThemedView>

            <ThemedView style={styles.inputContainer}>
              <IconSymbol name="person.fill" size={20} color="#FF8C00" />
              <TextInput
                style={styles.input}
                placeholder="Nombre completo del cliente"
                placeholderTextColor="#999"
                value={datosCliente.nombre}
                onChangeText={(text) => setDatosCliente(prev => ({ ...prev, nombre: text }))}
              />
            </ThemedView>

            <ThemedView style={styles.inputContainer}>
              <IconSymbol name="location.fill" size={20} color="#FF8C00" />
              <TextInput
                style={styles.input}
                placeholder="Dirección de entrega"
                placeholderTextColor="#999"
                value={datosCliente.direccion}
                onChangeText={(text) => setDatosCliente(prev => ({ ...prev, direccion: text }))}
                multiline
              />
            </ThemedView>

            <ThemedView style={styles.inputContainer}>
              <IconSymbol name="info.circle.fill" size={20} color="#FF8C00" />
              <TextInput
                style={styles.input}
                placeholder="Referencia (opcional): Ej. Casa blanca, conjunto X"
                placeholderTextColor="#999"
                value={datosCliente.referencia}
                onChangeText={(text) => setDatosCliente(prev => ({ ...prev, referencia: text }))}
                multiline
              />
            </ThemedView>
          </ThemedView>

          {/* Botones de Categorías */}
          <ThemedView style={styles.categoriasContainer}>
            <ThemedView style={styles.tituloBadge}>
              <IconSymbol name="tag.fill" size={20} color="#FF8C00" />
              <ThemedText style={styles.seccionTituloBadge}>Categorías</ThemedText>
            </ThemedView>
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
            <ThemedView style={styles.tituloBadge}>
              <IconSymbol name="cart.fill" size={20} color="#FF8C00" />
              <ThemedText style={styles.seccionTituloBadge}>
                Productos - {categoriaSeleccionada.charAt(0).toUpperCase() + categoriaSeleccionada.slice(1)}
              </ThemedText>
            </ThemedView>
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
            <ThemedView style={styles.tituloBadge}>
              <IconSymbol name="takeoutbag.and.cup.and.straw.fill" size={20} color="#FF8C00" />
              <ThemedText style={styles.seccionTituloBadge}>Icopores</ThemedText>
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
              <ThemedView style={styles.tituloBadge}>
                <IconSymbol name="bag.fill" size={20} color="#FF8C00" />
                <ThemedText style={styles.seccionTituloBadge}>
                  Productos Seleccionados ({productosSeleccionados.length})
                </ThemedText>
              </ThemedView>
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
              <ThemedView style={styles.tituloBadge}>
                <IconSymbol name="dollarsign.circle.fill" size={20} color="#FF8C00" />
                <ThemedText style={styles.seccionTituloBadge}>Resumen</ThemedText>
              </ThemedView>

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

      {/* Modal de Sugerencia de Cliente */}
      <Modal
        visible={modalSugerenciaVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={rechazarSugerenciaCliente}
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.modalSugerenciaContent}>
            <ThemedView style={styles.modalSugerenciaHeader}>
              <IconSymbol name="person.crop.circle.fill.badge.checkmark" size={48} color="#4CAF50" />
              <ThemedText style={styles.modalSugerenciaTitulo}>
                ¡Cliente Encontrado!
              </ThemedText>
            </ThemedView>

            {clienteSugerido && (
              <ThemedView style={styles.clienteSugeridoInfo}>
                <ThemedText style={styles.clienteSugeridoTexto}>
                  Ya tenemos información de este número:
                </ThemedText>

                <ThemedView style={styles.clienteSugeridoCard}>
                  <ThemedView style={styles.clienteSugeridoItem}>
                    <IconSymbol name="person.fill" size={18} color="#FF8C00" />
                    <ThemedText style={styles.clienteSugeridoLabel}>Nombre:</ThemedText>
                    <ThemedText style={styles.clienteSugeridoValor}>{clienteSugerido.nombre}</ThemedText>
                  </ThemedView>

                  <ThemedView style={styles.clienteSugeridoItem}>
                    <IconSymbol name="phone.fill" size={18} color="#FF8C00" />
                    <ThemedText style={styles.clienteSugeridoLabel}>Teléfono:</ThemedText>
                    <ThemedText style={styles.clienteSugeridoValor}>{clienteSugerido.telefono}</ThemedText>
                  </ThemedView>

                  <ThemedView style={styles.clienteSugeridoItem}>
                    <IconSymbol name="location.fill" size={18} color="#FF8C00" />
                    <ThemedText style={styles.clienteSugeridoLabel}>Dirección:</ThemedText>
                    <ThemedText style={styles.clienteSugeridoValor}>{clienteSugerido.direccion}</ThemedText>
                  </ThemedView>

                  {clienteSugerido.referencia && (
                    <ThemedView style={styles.clienteSugeridoItem}>
                      <IconSymbol name="info.circle.fill" size={18} color="#FF8C00" />
                      <ThemedText style={styles.clienteSugeridoLabel}>Referencia:</ThemedText>
                      <ThemedText style={styles.clienteSugeridoValor}>{clienteSugerido.referencia}</ThemedText>
                    </ThemedView>
                  )}

                  <ThemedView style={styles.pedidosHistorialBadge}>
                    <ThemedText style={styles.pedidosHistorialTexto}>
                      📦 {clienteSugerido.cantidad_pedidos} {clienteSugerido.cantidad_pedidos === 1 ? 'pedido anterior' : 'pedidos anteriores'}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>

                <ThemedText style={styles.clienteSugeridoPregunta}>
                  ¿Deseas usar esta información?
                </ThemedText>
              </ThemedView>
            )}

            <ThemedView style={styles.modalSugerenciaBotones}>
              <TouchableOpacity
                style={styles.modalSugerenciaAceptarButton}
                onPress={aceptarSugerenciaCliente}
              >
                <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
                <ThemedText style={styles.modalSugerenciaAceptarTexto}>Sí, usar datos</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSugerenciaRechazarButton}
                onPress={rechazarSugerenciaCliente}
              >
                <IconSymbol name="xmark.circle" size={20} color="#666" />
                <ThemedText style={styles.modalSugerenciaRechazarTexto}>No, ingresar nuevos</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Modal>

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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  backButton: {
    padding: Layout.spacing.m,
    backgroundColor: '#F8F9FA',
    borderRadius: 50,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: '900',
    color: '#8B4513',
    flex: 1,
    letterSpacing: -0.5,
  },
  scrollContent: {
    flex: 1,
  },
  seccionCliente: {
    backgroundColor: '#FFF8F0',
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.xl,
    gap: Layout.spacing.m,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  clienteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
    backgroundColor: '#FFF8F0',
  },
  tituloBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  seccionTituloBadge: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  clientesCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#339AF0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    elevation: 2,
    shadowColor: '#339AF0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
    backgroundColor: '#EBFBEE',
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: Layout.spacing.m,
    borderWidth: 1,
    borderColor: '#B2F2BB',
  },
  clienteSeleccionadoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.s,
    flex: 1,
  },
  clienteSeleccionadoTexto: {
    fontSize: Layout.fontSize.m,
    fontWeight: '700',
    color: '#2B8A3E',
    flex: 1,
  },
  telefonoEncontradoIndicador: {
    marginLeft: Layout.spacing.s,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: Layout.spacing.m,
    paddingVertical: Layout.spacing.s,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: Layout.fontSize.m,
    color: '#333',
    paddingVertical: Layout.spacing.s,
  },
  categoriasContainer: {
    marginBottom: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.l,
  },
  categoriasScroll: {
    flexDirection: 'row',
  },
  categoriaButton: {
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    marginRight: 10,
  },
  categoriaButtonActiva: {
    backgroundColor: '#FF8C00',
    elevation: 3,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
    borderRadius: 16,
    padding: Layout.spacing.m,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    minHeight: 110,
    justifyContent: 'space-between',
  },
  productoNombre: {
    fontSize: Layout.fontSize.m,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
    textAlign: 'center',
  },
  productoPrecio: {
    fontSize: Layout.fontSize.m,
    fontWeight: '800',
    color: '#FF8C00',
    textAlign: 'center',
    backgroundColor: '#FFF4E6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  icoporesSection: {
    marginBottom: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.l,
  },
  icoporesCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.l,
    padding: Layout.spacing.m,
    marginBottom: Layout.spacing.s,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  icoporesInfo: {
    flex: 1,
  },
  icoporesTexto: {
    fontSize: Layout.fontSize.l,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 4,
  },
  icoporesPrecio: {
    fontSize: Layout.fontSize.m,
    color: '#666',
  },
  totalIcoporesTexto: {
    fontSize: Layout.fontSize.m,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'right',
    marginTop: 4,
  },
  seleccionadosSection: {
    marginBottom: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.l,
  },
  seleccionadoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Layout.spacing.m,
    marginBottom: Layout.spacing.s,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50',
  },
  seleccionadoInfo: {
    flex: 1,
  },
  seleccionadoNombre: {
    fontSize: Layout.fontSize.l,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 4,
  },
  seleccionadoTamano: {
    fontSize: Layout.fontSize.s,
    color: '#666',
    marginTop: 2,
  },
  seleccionadoPrecioTotal: {
    fontSize: Layout.fontSize.m,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cantidadButtonTexto: {
    color: '#fff',
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
  },
  cantidadTexto: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#8B4513',
    paddingHorizontal: 16,
    minWidth: 40,
    textAlign: 'center',
  },
  eliminarButton: {
    padding: Layout.spacing.s,
  },
  resumenSection: {
    backgroundColor: '#F5F5F5',
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.xl,
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
    fontSize: Layout.fontSize.m,
    color: '#666',
    fontWeight: '500',
  },
  resumenValor: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  resumenDivider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: Layout.spacing.m,
  },
  resumenTotal: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  resumenTotalValor: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: '#28A745',
  },
  actionsContainer: {
    gap: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28A745',
    paddingVertical: 16,
    paddingHorizontal: Layout.spacing.xl,
    borderRadius: 50,
    gap: 12,
    elevation: 6,
    shadowColor: '#28A745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  confirmButtonDisabled: {
    backgroundColor: '#95D5A0',
    opacity: 0.7,
    elevation: 0,
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
    paddingVertical: 16,
    paddingHorizontal: Layout.spacing.xl,
    borderRadius: 50,
    gap: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.l,
  },
  modalSugerenciaContent: {
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
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
    marginBottom: Layout.spacing.l,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalSugerenciaTitulo: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: Layout.spacing.m,
    textAlign: 'center',
  },
  clienteSugeridoInfo: {
    marginBottom: Layout.spacing.l,
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
    gap: Layout.spacing.m,
  },
  clienteSugeridoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F5F5',
  },
  clienteSugeridoLabel: {
    fontSize: Layout.fontSize.m,
    fontWeight: '600',
    color: '#8B4513',
    width: 80,
  },
  clienteSugeridoValor: {
    fontSize: Layout.fontSize.m,
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
    fontSize: Layout.fontSize.s,
    fontWeight: '600',
    color: '#1976D2',
  },
  clienteSugeridoPregunta: {
    fontSize: Layout.fontSize.l,
    fontWeight: '600',
    color: '#8B4513',
    textAlign: 'center',
    marginTop: Layout.spacing.m,
  },
  modalSugerenciaBotones: {
    gap: Layout.spacing.m,
  },
  modalSugerenciaAceptarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: Layout.spacing.l,
    borderRadius: Layout.borderRadius.l,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modalSugerenciaAceptarTexto: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSugerenciaRechazarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E8E8',
    paddingVertical: 14,
    paddingHorizontal: Layout.spacing.l,
    borderRadius: Layout.borderRadius.l,
    gap: 8,
  },
  modalSugerenciaRechazarTexto: {
    fontSize: Layout.fontSize.l,
    fontWeight: '600',
    color: '#666',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.xl,
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
    marginBottom: 10,
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
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  tamanosContainer: {
    marginBottom: Layout.spacing.l,
  },
  tamanoButton: {
    backgroundColor: '#FF8C00',
    paddingVertical: 18,
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
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  tamanoPrecio: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalBotonesContainer: {
    gap: Layout.spacing.m,
  },
  modalAgregarButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: Layout.spacing.m,
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
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCerrarButton: {
    backgroundColor: '#E8E8E8',
    paddingVertical: Layout.spacing.m,
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
    fontWeight: '700',
    color: '#666',
  },
  seccionPedidosCurso: {
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.l,
    gap: Layout.spacing.s,
  },
  pedidosCursoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
  },
  pedidosCursoScroll: {
    flexDirection: 'row',
    paddingBottom: Layout.spacing.s,
  },
  pedidoCursoCard: {
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.l,
    marginRight: Layout.spacing.m,
    width: 280,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  pedidoCursoHeaderCont: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: Layout.spacing.s,
  },
  pedidoCursoNombre: {
    fontSize: Layout.fontSize.l,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
    marginRight: Layout.spacing.s,
  },
  pedidoCursoEstadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoPendiente: {
    backgroundColor: '#FFCC80',
  },
  estadoPreparando: {
    backgroundColor: '#4FC3F7',
  },
  estadoListo: {
    backgroundColor: '#81C784',
  },
  pedidoCursoEstadoTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 10,
  },
  pedidoCursoDetalleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.s,
    gap: Layout.spacing.s,
  },
  pedidoCursoDetalleTexto: {
    fontSize: Layout.fontSize.m,
    color: '#444',
    fontWeight: '600',
  },
  pedidoCursoDetalleContainerDir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8E1',
    padding: Layout.spacing.s,
    borderRadius: Layout.borderRadius.m,
    marginTop: Layout.spacing.s,
  },
  pedidoCursoDetalleTextoDir: {
    fontSize: Layout.fontSize.m,
    color: '#555',
    marginLeft: Layout.spacing.s,
    lineHeight: 20,
  },
  copiarButton: {
    backgroundColor: '#FF8C00',
    padding: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});
